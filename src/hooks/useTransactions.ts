import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type {
  Transaction,
  TransactionInsert,
  TransactionUpdate,
  TransactionWithRelations,
} from "@/types/database";

const KEY = ["transactions"] as const;

export interface TransactionFilters {
  dateFrom?: string;
  dateTo?: string;
  categoryId?: string;
  accountId?: string;
  currencyId?: string;
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
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: TransactionUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("transactions")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Transaction;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
