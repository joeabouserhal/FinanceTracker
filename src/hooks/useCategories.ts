import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { createCrudApi } from "@/lib/offline-crud";
import type { Category, CategoryInsert, CategoryUpdate } from "@/types/database";

const KEY = ["categories"] as const;

const categoriesApi = createCrudApi<Category, CategoryInsert, CategoryUpdate>({
  table: "categories",
  queryKey: KEY,
  optimistic: (input, clientId, now) => ({
    id: clientId,
    user_id: "",
    name: input.name,
    type: input.type,
    icon: input.icon ?? null,
    color: input.color ?? null,
    is_default: false,
    created_at: now,
  }),
});

export function useCategories(type?: "income" | "expense") {
  return useQuery({
    queryKey: [...KEY, type],
    queryFn: async () => {
      let query = supabase.from("categories").select("*").order("name");
      if (type) query = query.eq("type", type);
      const { data, error } = await query;
      if (error) throw error;
      return data as Category[];
    },
  });
}

export function useAddCategory() {
  return categoriesApi.useAdd();
}

export function useUpdateCategory() {
  return categoriesApi.useUpdate();
}

export function useArchiveCategory() {
  return categoriesApi.useRemove("delete");
}
