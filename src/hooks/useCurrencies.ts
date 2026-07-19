import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { enqueue } from "@/lib/offline-queue";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import type { Currency, CurrencyInsert, CurrencyUpdate } from "@/types/database";

const KEY = ["currencies"] as const;

function isOffline() { return !useNetworkStatus.getState().isConnected; }

export function useCurrencies() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const { data, error } = await supabase.from("currencies").select("*").order("is_default", { ascending: false }).order("code");
      if (error) throw error;
      return data as Currency[];
    },
  });
}

export function useAddCurrency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CurrencyInsert) => {
      if (isOffline()) {
        await enqueue({ table: "currencies", action: "insert", payload: input });
        return { id: `offline_${Date.now()}`, user_id: "", created_at: "", ...input } as Currency;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase.from("currencies").insert({ ...input, user_id: user.id }).select().single();
      if (error) throw error;
      return data as Currency;
    },
    onSuccess: (data) => {
      if (isOffline()) {
        qc.setQueriesData<Currency[]>({ queryKey: KEY, exact: false }, (old) => old ? [...old, data] : [data]);
      } else {
        qc.invalidateQueries({ queryKey: KEY });
      }
    },
  });
}

export function useUpdateCurrency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: CurrencyUpdate & { id: string }) => {
      if (isOffline()) {
        await enqueue({ table: "currencies", action: "update", payload: { id, data: updates } });
        return { id } as Currency;
      }
      const { data, error } = await supabase.from("currencies").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data as Currency;
    },
    onSuccess: () => {
      if (!isOffline()) qc.invalidateQueries({ queryKey: KEY });
    },
  });
}

export function useSetDefaultCurrency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (isOffline()) return;
      await supabase.from("currencies").update({ is_default: false }).eq("is_default", true);
      const { error } = await supabase.from("currencies").update({ is_default: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      if (!isOffline()) qc.invalidateQueries({ queryKey: KEY });
    },
  });
}

export function useDeleteCurrency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (isOffline()) {
        await enqueue({ table: "currencies", action: "delete", payload: { id } });
        return;
      }
      const { error } = await supabase.from("currencies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, id) => {
      if (isOffline()) {
        qc.setQueriesData<Currency[]>({ queryKey: KEY, exact: false }, (old) => (old ?? []).filter((c: any) => c.id !== id));
      } else {
        qc.invalidateQueries({ queryKey: KEY });
      }
    },
  });
}
