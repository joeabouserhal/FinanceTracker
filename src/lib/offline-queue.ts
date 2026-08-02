import AsyncStorage from "@react-native-async-storage/async-storage";

const QUEUE_KEY = "offline_mutation_queue";
const ID_MAP_KEY = "offline_id_map";

/**
 * Prefix for client-generated row IDs (optimistic rows in the cache and
 * `client_id` values in queued inserts). Anything with this prefix is
 * provisional until the sync loop maps it to a server UUID.
 */
export const ID_PREFIX = "tmp_";

export interface QueuedMutation {
  id: string;                       // queue item id (internal, `q_` prefix)
  table: string;
  action: "insert" | "update" | "delete";
  payload: Record<string, unknown>; // insert: row data + client_id; update: { id, data }; delete: { id }
  dependencies: string[];           // client IDs this mutation depends on (must sync first)
  attempts: number;
  lastError?: string;
  timestamp: number;
}

/** Map client-generated IDs to server-assigned IDs. */
export type IdMap = Record<string, string>; // clientId → serverId

const TEMP_ID_PATTERN = /^tmp_[a-z0-9]{8,}$/;

/**
 * True only for IDs our own `genTempId` produces (or that an older build
 * produced with the same dense alphanumeric shape). Loose prefixes like
 * `startsWith("tmp_")` would treat user text such as a title starting with
 * "tmp_ " as a sync dependency and stall the queue forever.
 */
export function isTempId(id: string): boolean {
  return TEMP_ID_PATTERN.test(id);
}

/** Generate a stable client-side row ID (used for optimistic rows and client_id). */
export function genTempId(): string {
  return `${ID_PREFIX}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

function genQueueItemId(): string {
  return `q_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

// ── Serialized storage access ──────────────────────────────────────────────
// AsyncStorage has no transactions. Every read-modify-write goes through this
// in-memory mutex so a UI `enqueue` racing the sync loop's `dequeue`/
// `updateMutation` cannot interleave and lose writes.

let chain: Promise<void> = Promise.resolve();

function locked<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function readQueue(): Promise<QueuedMutation[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? (JSON.parse(raw) as QueuedMutation[]) : [];
}

async function writeQueue(queue: QueuedMutation[]) {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

// ── Queue ──────────────────────────────────────────────────────────────────

export async function getQueue(): Promise<QueuedMutation[]> {
  return locked(readQueue);
}

export async function enqueue(mutation: Omit<QueuedMutation, "id" | "attempts" | "timestamp">) {
  return locked(async () => {
    const queue = await readQueue();
    queue.push({
      ...mutation,
      id: genQueueItemId(),
      attempts: 0,
      timestamp: Date.now(),
    });
    await writeQueue(queue);
  });
}

export async function updateMutation(id: string, update: Partial<Omit<QueuedMutation, "id">>) {
  return locked(async () => {
    const queue = await readQueue();
    const idx = queue.findIndex((m) => m.id === id);
    if (idx === -1) return;
    queue[idx] = { ...queue[idx], ...update };
    await writeQueue(queue);
  });
}

export async function dequeue(id: string) {
  return locked(async () => {
    const queue = await readQueue();
    const filtered = queue.filter((m) => m.id !== id);
    if (filtered.length !== queue.length) await writeQueue(filtered);
  });
}

// ── ID map ─────────────────────────────────────────────────────────────────

export async function getIdMap(): Promise<IdMap> {
  const raw = await AsyncStorage.getItem(ID_MAP_KEY);
  return raw ? (JSON.parse(raw) as IdMap) : {};
}

export async function setIdMap(map: IdMap) {
  await AsyncStorage.setItem(ID_MAP_KEY, JSON.stringify(map));
}

/** Resolve a client ID to its server ID at replay time; non-temp IDs pass through. */
export async function resolveId(clientId: string): Promise<string> {
  if (!isTempId(clientId)) return clientId;
  const map = await getIdMap();
  return map[clientId] || clientId;
}

/**
 * Replace any payload values that are temp IDs with their server IDs.
 * Structured walk — never string-regex over serialized JSON, so titles or
 * notes containing an ID can't be corrupted.
 */
export async function resolvePayloadIds(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const map = await getIdMap();
  const resolved: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (typeof value === "string" && isTempId(value) && map[value]) {
      resolved[key] = map[value];
    } else {
      resolved[key] = value;
    }
  }
  return resolved;
}
