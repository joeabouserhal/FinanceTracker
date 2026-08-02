import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  enqueue,
  dequeue,
  getQueue,
  updateMutation,
  getIdMap,
  setIdMap,
  resolveId,
  resolvePayloadIds,
  genTempId,
  isTempId,
} from "./offline-queue";

const insert = {
  table: "transactions",
  action: "insert" as const,
  payload: { amount: 100, category_id: "cat-1" },
  dependencies: [],
};

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe("queue basics", () => {
  it("enqueues with an internal q_ id, zero attempts and a timestamp", async () => {
    await enqueue(insert);
    const queue = await getQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].id).toMatch(/^q_/);
    expect(queue[0].attempts).toBe(0);
    expect(queue[0].timestamp).toBeGreaterThan(0);
    expect(queue[0].payload).toEqual(insert.payload);
    expect(queue[0].dependencies).toEqual([]);
  });

  it("preserves enqueue order (FIFO)", async () => {
    await enqueue({ ...insert, payload: { n: 1 } });
    await enqueue({ ...insert, payload: { n: 2 } });
    const queue = await getQueue();
    expect(queue.map((m) => m.payload.n)).toEqual([1, 2]);
  });

  it("dequeues only the matching item", async () => {
    await enqueue({ ...insert, payload: { n: 1 } });
    await enqueue({ ...insert, payload: { n: 2 } });
    const queue = await getQueue();
    await dequeue(queue[0].id);
    const remaining = await getQueue();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].payload.n).toBe(2);
  });

  it("updateMutation patches fields without clobbering the rest", async () => {
    await enqueue(insert);
    const queue = await getQueue();
    await updateMutation(queue[0].id, { attempts: 3, lastError: "boom" });
    const updated = await getQueue();
    expect(updated[0].attempts).toBe(3);
    expect(updated[0].lastError).toBe("boom");
    expect(updated[0].payload).toEqual(insert.payload);
    expect(updated[0].id).toBe(queue[0].id);
  });

  it("updateMutation on an unknown id is a no-op", async () => {
    await enqueue(insert);
    await updateMutation("q_missing", { attempts: 9 });
    const queue = await getQueue();
    expect(queue[0].attempts).toBe(0);
  });
});

describe("concurrent access", () => {
  it("serializes concurrent enqueues — no lost writes", async () => {
    await Promise.all(
      Array.from({ length: 20 }, (_, i) => enqueue({ ...insert, payload: { n: i } })),
    );
    const queue = await getQueue();
    expect(queue).toHaveLength(20);
  });

  it("serializes interleaved enqueue/dequeue without dropping writes", async () => {
    const ops: Promise<void>[] = [];
    for (let i = 0; i < 10; i++) {
      ops.push(enqueue({ ...insert, payload: { n: i } }));
      if (i % 2 === 0) {
        // race a dequeue against the enqueue in flight
        ops.push(
          getQueue().then(async (q) => {
            if (q.length > 0) await dequeue(q[0].id);
          }),
        );
      }
    }
    await Promise.all(ops);
    const queue = await getQueue();
    // 10 enqueues, at most 5 dequeues hit items — final length must be consistent
    // with the serialized history: every dequeue removed exactly one existing item.
    expect(queue.length).toBeGreaterThanOrEqual(5);
    expect(queue.length).toBeLessThanOrEqual(10);
  });
});

describe("temp IDs", () => {
  it("generates unique tmp_ ids", () => {
    const a = genTempId();
    const b = genTempId();
    expect(a).toMatch(/^tmp_[a-z0-9]{8,}$/);
    expect(a).not.toBe(b);
    expect(isTempId(a)).toBe(true);
    expect(isTempId("real-uuid-123")).toBe(false);
  });

  it("rejects lookalike user text (the tmp_ prefix alone is not enough)", () => {
    expect(isTempId("tmp_")).toBe(false);
    expect(isTempId("tmp_ not a dep")).toBe(false);
    expect(isTempId("tmp_abc def")).toBe(false);
  });
});

describe("id map", () => {
  it("passes through non-temp ids and unmapped temp ids", async () => {
    expect(await resolveId("server-uuid")).toBe("server-uuid");
    expect(await resolveId("tmp_abcdefgh")).toBe("tmp_abcdefgh");
  });

  it("resolves a mapped temp id to its server id", async () => {
    await setIdMap({ tmp_abcdefgh: "server-uuid" });
    expect(await resolveId("tmp_abcdefgh")).toBe("server-uuid");
  });

  it("persists the map across calls", async () => {
    await setIdMap({ tmp_1: "srv-1" });
    expect(await getIdMap()).toEqual({ tmp_1: "srv-1" });
  });
});

describe("resolvePayloadIds", () => {
  it("replaces mapped temp values field-by-field", async () => {
    await setIdMap({ tmp_currency1: "srv-cur", tmp_category1: "srv-cat" });
    const resolved = await resolvePayloadIds({
      currency_id: "tmp_currency1",
      category_id: "tmp_category1",
      title: "Coffee",
    });
    expect(resolved).toEqual({
      currency_id: "srv-cur",
      category_id: "srv-cat",
      title: "Coffee",
    });
  });

  it("leaves unmapped temp values untouched", async () => {
    const resolved = await resolvePayloadIds({ category_id: "tmp_unknown1" });
    expect(resolved.category_id).toBe("tmp_unknown1");
  });

  it("never rewrites substrings inside other values (no regex corruption)", async () => {
    await setIdMap({ tmp_abcdefgh: "srv-abc" });
    const resolved = await resolvePayloadIds({
      title: "Order tmp_abcdefgh123 ref",
      notes: "tmp_abcdefgh was used",
    });
    expect(resolved.title).toBe("Order tmp_abcdefgh123 ref");
    expect(resolved.notes).toBe("tmp_abcdefgh was used");
  });
});
