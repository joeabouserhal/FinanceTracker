import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { enqueue } from "@/lib/offline-queue";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import type { Account, AccountInsert, AccountUpdate } from "@/types/database";

const KEY = ["accounts"] as const;

function isOffline() { return !useNetworkStatus.getState().isConnected; }

export function useAccounts() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const { data, error } = await supabase.from("accounts").select("*").order("name");
      if (error) throw error;
      return data as Account[];
    },
  });
}

export function useAddAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AccountInsert) => {
      if (isOffline()) {
        await enqueue({ table: "accounts", action: "insert", payload: input });
        return { id: `offline_${Date.now()}`, user_id: "", created_at: "", archived: false, ...input } as Account;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase.from("accounts").insert({ ...input, user_id: user.id }).select().single();
      if (error) throw error;
      return data as Account;
    },
    onSuccess: (data) => {
      if (isOffline()) {
        qc.setQueriesData<Account[]>({ queryKey: KEY, exact: false }, (old) => old ? [...old, data] : [data]);
      } else {
        qc.invalidateQueries({ queryKey: KEY });
      }
    },
  });
}

export function useUpdateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: AccountUpdate & { id: string }) => {
      if (isOffline()) {
        await enqueue({ table: "accounts", action: "update", payload: { id, data: updates } });
        return { id } as Account;
      }
      const { data, error } = await supabase.from("accounts").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data as Account;
    },
    onSuccess: () => {
      if (!isOffline()) qc.invalidateQueries({ queryKey: KEY });
    },
  });
}

export function useArchiveAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (isOffline()) {
        await enqueue({ table: "accounts", action: "update", payload: { id, data: { archived: true } } });
        return;
      }
      const { error } = await supabase.from("accounts").update({ archived: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, id) => {
      if (isOffline()) {
        qc.setQueriesData<Account[]>({ queryKey: KEY, exact: false }, (old) => (old ?? []).filter((a: any) => a.id !== id));
      } else {
        qc.invalidateQueries({ queryKey: KEY });
      }
    },
  });
}
