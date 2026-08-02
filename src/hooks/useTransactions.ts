import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/query-client";
import { createCrudApi } from "@/lib/offline-crud";
import type {
  Category,
  Currency,
  TransactionInsert,
  TransactionUpdate,
  TransactionWithRelations,
} from "@/types/database";

const KEY = ["transactions"] as const;

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

const transactionsApi = createCrudApi<TransactionWithRelations, TransactionInsert, TransactionUpdate>({
  table: "transactions",
  queryKey: KEY,
  insertPosition: "prepend",
  touchUpdatedAt: true,
  optimistic: (input, clientId, now) => {
    // Enrich the optimistic row with the joined category/currency from cache.
    const categories = queryClient
      .getQueriesData<Category[]>({ queryKey: ["categories"], exact: false })
      .flatMap(([, data]) => data ?? []);
    const currencies = queryClient
      .getQueriesData<Currency[]>({ queryKey: ["currencies"], exact: false })
      .flatMap(([, data]) => data ?? []);
    return {
      id: clientId,
      user_id: "",
      type: input.type,
      amount: input.amount,
      currency_id: input.currency_id,
      category_id: input.category_id,
      account_id: input.account_id ?? null,
      date: input.date,
      title: input.title ?? null,
      notes: input.notes ?? null,
      preset_id: input.preset_id ?? null,
      created_at: now,
      updated_at: now,
      category: categories.find((c) => c.id === input.category_id),
      currency: currencies.find((c) => c.id === input.currency_id),
      account: null,
    };
  },
});

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
  return transactionsApi.useAdd();
}

export function useUpdateTransaction() {
  return transactionsApi.useUpdate();
}

export function useDeleteTransaction() {
  return transactionsApi.useRemove("delete");
}
