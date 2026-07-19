import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { enqueue } from "@/lib/offline-queue";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import type { Category, CategoryInsert, CategoryUpdate } from "@/types/database";

const KEY = ["categories"] as const;

function isOffline() { return !useNetworkStatus.getState().isConnected; }

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
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CategoryInsert) => {
      if (isOffline()) {
        await enqueue({ table: "categories", action: "insert", payload: input });
        return { id: `offline_${Date.now()}`, user_id: "", created_at: "", type: input.type, name: input.name, icon: input.icon, color: input.color, is_default: false } as Category;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase.from("categories").insert({ ...input, user_id: user.id }).select().single();
      if (error) throw error;
      return data as Category;
    },
    onSuccess: (data) => {
      if (isOffline()) {
        qc.setQueriesData<Category[]>({ queryKey: KEY, exact: false }, (old) => old ? [...old, data] : [data]);
      } else {
        qc.invalidateQueries({ queryKey: KEY });
      }
    },
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: CategoryUpdate & { id: string }) => {
      if (isOffline()) {
        await enqueue({ table: "categories", action: "update", payload: { id, data: updates } });
        return { id } as Category;
      }
      const { data, error } = await supabase.from("categories").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data as Category;
    },
    onSuccess: (data, variables) => {
      if (isOffline()) {
        const { id, ...updates } = variables;
        qc.setQueriesData<Category[]>({ queryKey: KEY, exact: false }, (old) => (old ?? []).map((c: any) => c.id === id ? { ...c, ...updates } : c));
      } else {
        qc.invalidateQueries({ queryKey: KEY });
      }
    },
  });
}

export function useArchiveCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (isOffline()) {
        await enqueue({ table: "categories", action: "delete", payload: { id } });
        return;
      }
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, id) => {
      if (isOffline()) {
        qc.setQueriesData<Category[]>({ queryKey: KEY, exact: false }, (old) => (old ?? []).filter((c: any) => c.id !== id));
      } else {
        qc.invalidateQueries({ queryKey: KEY });
      }
    },
  });
}
