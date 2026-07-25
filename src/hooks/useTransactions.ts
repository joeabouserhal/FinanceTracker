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

function isOffline() { return !useNetworkStatus.getState().isConnected; }
function genId(): string { return `tmp_${Math.random().toString(36).slice(2, 11)}`; }

export interface TransactionFilters {
  dateFrom?: string;
  dateTo?: string;
  categoryId?: string;
  categoryIds?: string[];
  accountId?: string;
  currencyId?: string;
  type?: "income" | "expense";
  search?: string;
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
      if (filters?.categoryIds && filters.categoryIds.length > 0) query = query.in("category_id", filters.categoryIds);
      if (filters?.accountId) query = query.eq("account_id", filters.accountId);
      if (filters?.currencyId) query = query.eq("currency_id", filters.currencyId);
      if (filters?.type) query = query.eq("type", filters.type);
      if (filters?.search) query = query.ilike("title", `%${filters.search}%`);

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
        const clientId = genId();
        await enqueue({
          table: "transactions",
          action: "insert",
          payload: { ...input, client_id: clientId },
          dependencies: [input.category_id, input.currency_id].filter((id) => id?.startsWith("tmp_")),
        });
        const now = new Date().toISOString();
        return {
          id: clientId, user_id: "", type: input.type, amount: input.amount,
          currency_id: input.currency_id, category_id: input.category_id,
          account_id: input.account_id, date: input.date, title: input.title ?? null,
          notes: input.notes, preset_id: input.preset_id,
          created_at: now, updated_at: now,
        } as Transaction;
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
      if (String(data.id).startsWith("tmp_")) {
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
      qc.setQueriesData<TransactionWithRelations[]>(
        { queryKey: KEY, exact: false },
        (old) => old?.filter((t) => t.id !== id) ?? []
      );
    },
  });
}
