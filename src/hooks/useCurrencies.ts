import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Currency, CurrencyInsert, CurrencyUpdate } from "@/types/database";

const KEY = ["currencies"] as const;

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
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CurrencyInsert) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("currencies")
        .insert({ ...input, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as Currency;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateCurrency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: CurrencyUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("currencies")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Currency;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useSetDefaultCurrency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Unset previous default
      await supabase.from("currencies").update({ is_default: false }).eq("is_default", true);
      // Set new default
      const { error } = await supabase
        .from("currencies")
        .update({ is_default: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteCurrency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("currencies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
