import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { enqueue, isTempId } from "@/lib/offline-queue";
import { createCrudApi, isOffline } from "@/lib/offline-crud";
import { isNetworkError } from "@/utils/errors";
import type { Currency, CurrencyInsert, CurrencyUpdate } from "@/types/database";

const KEY = ["currencies"] as const;

const currenciesApi = createCrudApi<Currency, CurrencyInsert, CurrencyUpdate>({
  table: "currencies",
  queryKey: KEY,
  optimistic: (input, clientId, now) => ({
    id: clientId,
    user_id: "",
    code: input.code,
    symbol: input.symbol,
    name: input.name,
    is_default: input.is_default ?? false,
    created_at: now,
  }),
});

export function useCurrencies() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("currencies")
        .select("*")
        .order("is_default", { ascending: false })
        .order("code");
      if (error) throw error;
      return data as Currency[];
    },
  });
}

export function useAddCurrency() {
  return currenciesApi.useAdd();
}

export function useDeleteCurrency() {
  return currenciesApi.useRemove("delete");
}

/**
 * Set a currency as default. Offline this enqueues two ordered updates
 * (clear old default, set new one) instead of silently dropping the change.
 */
export function useSetDefaultCurrency() {
  const qc = useQueryClient();

  const queueDefaultChange = async (id: string, previousDefaultId: string | undefined) => {
    const ops: Promise<void>[] = [];
    if (previousDefaultId && previousDefaultId !== id) {
      ops.push(
        enqueue({
          table: "currencies",
          action: "update",
          payload: { id: previousDefaultId, data: { is_default: false } },
          dependencies: isTempId(previousDefaultId) ? [previousDefaultId] : [],
        }),
      );
    }
    ops.push(
      enqueue({
        table: "currencies",
        action: "update",
        payload: { id, data: { is_default: true } },
        dependencies: isTempId(id) ? [id] : [],
      }),
    );
    await Promise.all(ops);
    return { id, optimistic: true, previousDefaultId };
  };

  return useMutation<{ id: string; optimistic: boolean; previousDefaultId?: string }, Error, string>({
    mutationFn: async (id) => {
      const rows = qc
        .getQueriesData<Currency[]>({ queryKey: KEY, exact: false })
        .flatMap(([, data]) => data ?? []);
      const previousDefaultId = rows.find((c) => c.is_default)?.id;
      // Temp IDs (optimistic rows, e.g. set-default in the reconnect→drain
      // window) must go through the queue — a direct update would match
      // nothing server-side and the follow-up invalidate would wipe the row.
      if (isOffline() || isTempId(id) || (previousDefaultId !== undefined && isTempId(previousDefaultId))) {
        return queueDefaultChange(id, previousDefaultId);
      }
      try {
        const { error: clearError } = await supabase
          .from("currencies")
          .update({ is_default: false })
          .eq("is_default", true);
        if (clearError) throw clearError;
        const { error } = await supabase.from("currencies").update({ is_default: true }).eq("id", id);
        if (error) throw error;
        return { id, optimistic: false };
      } catch (error) {
        if (isNetworkError(error)) return queueDefaultChange(id, previousDefaultId);
        throw error;
      }
    },
    onSuccess: (result) => {
      if (result.optimistic) {
        qc.setQueriesData<Currency[]>({ queryKey: KEY, exact: false }, (old) =>
          (old ?? []).map((c) =>
            c.id === result.id
              ? { ...c, is_default: true }
              : c.id === result.previousDefaultId
                ? { ...c, is_default: false }
                : c,
          ),
        );
      } else {
        qc.invalidateQueries({ queryKey: KEY });
      }
    },
  });
}
