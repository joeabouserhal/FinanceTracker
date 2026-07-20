import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { enqueue } from "@/lib/offline-queue";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import type {
  Transaction,
  TransactionInsert,
  TransactionUpdate,
  TransactionWithRelations,
} from "@/types/database";

const KEY = ["transactions"] as const;

function isOffline() {
  // Default to false (online) so we try Supabase first.
  // When NetInfo confirms we're offline, isConnected flips to false.
  return !useNetworkStatus.getState().isConnected;
}

export interface TransactionFilters {
  dateFrom?: string;
  dateTo?: string;
  categoryId?: string;
  accountId?: string;
  currencyId?: string;
  type?: "income" | "expense";
}

export function useTransactions(filters?: TransactionFilters) {
  return useQuery({
    queryKey: [...KEY, filters],
    queryFn: async () => {
      let query = supabase
        .from("transactions")
        .select("*, currency:currencies(*), category:categories(*), account:accounts(*)")
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });

      if (filters?.dateFrom) query = query.gte("date", filters.dateFrom);
      if (filters?.dateTo) query = query.lte("date", filters.dateTo);
      if (filters?.categoryId) query = query.eq("category_id", filters.categoryId);
      if (filters?.accountId) query = query.eq("account_id", filters.accountId);
      if (filters?.currencyId) query = query.eq("currency_id", filters.currencyId);
      if (filters?.type) query = query.eq("type", filters.type);

      const { data, error } = await query;
      if (error) throw error;
      return data as TransactionWithRelations[];
    },
  });
}

export function useAddTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TransactionInsert) => {
      if (isOffline()) {
        await enqueue({ table: "transactions", action: "insert", payload: input });
        const offlineId = `offline_${Date.now()}`;
        return { id: offlineId, user_id: "", type: input.type, amount: input.amount, currency_id: input.currency_id, category_id: input.category_id, account_id: input.account_id, date: input.date, notes: input.notes, preset_id: input.preset_id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as Transaction;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("transactions")
        .insert({ ...input, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as Transaction;
    },
    onSuccess: (data) => {
      if (String(data.id).startsWith("offline_")) {
        // Offline: inject into ALL transaction query caches
        // Look up category/currency data from any categories/currencies query cache
        const allCats = qc.getQueriesData<any[]>({ queryKey: ["categories"], exact: false });
        const allCurs = qc.getQueriesData<any[]>({ queryKey: ["currencies"], exact: false });
        const cat = allCats.flatMap(([, d]) => d ?? []).find((c: any) => c.id === data.category_id);
        const cur = allCurs.flatMap(([, d]) => d ?? []).find((c: any) => c.id === data.currency_id);

        const fake: TransactionWithRelations = {
          ...data,
          category: cat ?? null,
          currency: cur ?? null,
          account: null,
          created_at: data.created_at || new Date().toISOString(),
          updated_at: data.updated_at || new Date().toISOString(),
        };

        // Update all transaction query caches (with and without filters)
        qc.setQueriesData<TransactionWithRelations[]>(
          { queryKey: KEY, exact: false },
          (old) => (old ? [fake, ...old] : [fake])
        );
      } else {
        qc.invalidateQueries({ queryKey: KEY });
      }
    },
  });
}

export function useUpdateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TransactionUpdate & { id: string }) => {
      if (isOffline()) {
        await enqueue({ table: "transactions", action: "update", payload: { id, data: { ...updates, updated_at: new Date().toISOString() } } });
        return { id } as Transaction;
      }
      const { data, error } = await supabase
        .from("transactions")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Transaction;
    },
    onSuccess: (data, variables) => {
      if (isOffline()) {
        // Offline update: merge the updated fields into the cached item
        const { id, ...updates } = variables;
        qc.setQueriesData<TransactionWithRelations[]>(
          { queryKey: KEY, exact: false },
          (old) => old?.map((t) => t.id === id ? { ...t, ...updates } : t) ?? []
        );
      } else {
        qc.invalidateQueries({ queryKey: KEY });
      }
    },
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (isOffline()) {
        await enqueue({ table: "transactions", action: "delete", payload: { id } });
        return;
      }
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, id) => {
      // Remove from all transaction caches
      qc.setQueriesData<TransactionWithRelations[]>(
        { queryKey: KEY, exact: false },
        (old) => old?.filter((t) => t.id !== id) ?? []
      );
    },
  });
}
