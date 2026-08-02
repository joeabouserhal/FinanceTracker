import { renderHook, act, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAddCurrency, useSetDefaultCurrency } from "@/hooks/useCurrencies";
import { useAddTransaction } from "@/hooks/useTransactions";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { getQueue } from "@/lib/offline-queue";
import { supabase } from "@/lib/supabase";
import type { Currency } from "@/types/database";

// Integration tests: exercise the REAL factory mutation flow (the same code
// the app runs) — offline routing, optimistic cache injection, queueing.

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

function goOffline() {
  useNetworkStatus.setState({ isConnected: false, isInternetReachable: false });
}

function goOnline() {
  useNetworkStatus.setState({ isConnected: true, isInternetReachable: true });
}

beforeEach(async () => {
  await AsyncStorage.clear();
  queryClient.clear();
  goOffline();
});

describe("useAddCurrency — offline", () => {
  it("queues the insert and shows an optimistic row immediately", async () => {
    queryClient.setQueryData<Currency[]>(["currencies"], []);
    const { result } = await renderHook(() => useAddCurrency(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        code: "LBP",
        symbol: "LL",
        name: "Lebanese Pound",
        is_default: false,
      });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const row = result.current.data!;
    expect(row.id).toMatch(/^tmp_[a-z0-9]{8,}$/);

    // injected into the currencies cache (what the Settings list renders)
    const cached = queryClient.getQueryData<Currency[]>(["currencies"]);
    expect(cached).toHaveLength(1);
    expect(cached![0]).toEqual(row);

    // queued with the same client_id and no FK dependencies
    const queue = await getQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].table).toBe("currencies");
    expect(queue[0].action).toBe("insert");
    expect(queue[0].payload).toMatchObject({ code: "LBP", client_id: row.id });
    expect(queue[0].dependencies).toEqual([]);
  });

  it("does NOT hit the server (fails closed, not online-path)", async () => {
    // If this test's mutation took the online path it would reject (fake
    // Supabase URL) — proving offline routing is what guards the queue.
    queryClient.setQueryData<Currency[]>(["currencies"], []);
    const { result } = await renderHook(() => useAddCurrency(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        code: "EUR",
        symbol: "€",
        name: "Euro",
        is_default: false,
      });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(await getQueue()).toHaveLength(1);
  });
});

describe("useAddCurrency — stale connectivity (thinks online, network gone)", () => {
  it("falls back to the queue instead of silently losing the change", async () => {
    // NetInfo state is stale: the app believes it is online, but the direct
    // Supabase call fails with a network error. The mutation must NOT fail —
    // it must queue + show the optimistic row (the fix for the reported bug).
    goOnline();
    queryClient.setQueryData<Currency[]>(["currencies"], []);
    // signed-in session (resolved locally), but the network is actually gone
    jest.spyOn(supabase.auth, "getUser").mockResolvedValue({
      data: { user: { id: "test-user" } },
      error: null,
    } as never);
    const fromSpy = jest.spyOn(supabase, "from").mockImplementation(() => {
      throw new TypeError("Network request failed");
    });
    try {
      const { result } = await renderHook(() => useAddCurrency(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          code: "EUR",
          symbol: "€",
          name: "Euro",
          is_default: false,
        });
      });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // queued AND injected — nothing lost
      const queue = await getQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].payload).toMatchObject({ code: "EUR" });
      const cached = queryClient.getQueryData<Currency[]>(["currencies"]);
      expect(cached).toHaveLength(1);
      expect(cached![0].code).toBe("EUR");
    } finally {
      fromSpy.mockRestore();
      jest.restoreAllMocks();
    }
  });
});

describe("useAddTransaction — offline with a temp FK dependency", () => {
  it("queues the insert with the temp currency as a dependency", async () => {
    queryClient.setQueryData(["currencies"], []);
    queryClient.setQueryData(["categories"], []);
    const { result } = await renderHook(() => useAddTransaction(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        type: "expense",
        amount: 2500,
        currency_id: "tmp_offlinecurr",
        category_id: "tmp_offlinecat",
        account_id: null,
        date: "2026-08-02",
        title: "Coffee",
        notes: null,
        preset_id: null,
      });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const queue = await getQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].table).toBe("transactions");
    expect(queue[0].dependencies.sort()).toEqual(["tmp_offlinecat", "tmp_offlinecurr"]);
  });
});

describe("useSetDefaultCurrency — offline", () => {
  it("enqueues clear-old + set-new and patches the cache", async () => {
    const usd: Currency = {
      id: "srv-usd",
      user_id: "u",
      code: "USD",
      symbol: "$",
      name: "US Dollar",
      is_default: true,
      created_at: "2026-01-01",
    };
    const lbp: Currency = {
      id: "tmp_newcurrency",
      user_id: "u",
      code: "LBP",
      symbol: "LL",
      name: "Lebanese Pound",
      is_default: false,
      created_at: "2026-01-01",
    };
    queryClient.setQueryData<Currency[]>(["currencies"], [usd, lbp]);
    const { result } = await renderHook(() => useSetDefaultCurrency(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync("tmp_newcurrency");
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // cache patched: LBP default, USD not
    const cached = queryClient.getQueryData<Currency[]>(["currencies"])!;
    expect(cached.find((c) => c.id === "tmp_newcurrency")?.is_default).toBe(true);
    expect(cached.find((c) => c.id === "srv-usd")?.is_default).toBe(false);

    // two ordered updates queued; set-new depends on the temp currency insert
    const queue = await getQueue();
    expect(queue).toHaveLength(2);
    const setNew = queue.find((m) => m.payload.id === "tmp_newcurrency")!;
    expect(setNew.dependencies).toEqual(["tmp_newcurrency"]);
  });
});
