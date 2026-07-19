import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { enqueue } from "@/lib/offline-queue";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import type { Preset, PresetInsert, PresetUpdate } from "@/types/database";

const KEY = ["presets"] as const;

function isOffline() { return !useNetworkStatus.getState().isConnected; }

export function usePresets(type?: "income" | "expense") {
  return useQuery({
    queryKey: [...KEY, type],
    queryFn: async () => {
      let query = supabase.from("presets").select("*").eq("archived", false).order("name");
      if (type) query = query.eq("type", type);
      const { data, error } = await query;
      if (error) throw error;
      return data as Preset[];
    },
  });
}

export function useAddPreset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: PresetInsert) => {
      if (isOffline()) {
        await enqueue({ table: "presets", action: "insert", payload: input });
        return { id: `offline_${Date.now()}`, user_id: "", created_at: "", archived: false, ...input } as Preset;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase.from("presets").insert({ ...input, user_id: user.id }).select().single();
      if (error) throw error;
      return data as Preset;
    },
    onSuccess: (data) => {
      if (isOffline()) {
        qc.setQueriesData<Preset[]>({ queryKey: KEY, exact: false }, (old) => old ? [...old, data] : [data]);
      } else {
        qc.invalidateQueries({ queryKey: KEY });
      }
    },
  });
}

export function useUpdatePreset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: PresetUpdate & { id: string }) => {
      if (isOffline()) {
        await enqueue({ table: "presets", action: "update", payload: { id, data: updates } });
        return { id } as Preset;
      }
      const { data, error } = await supabase.from("presets").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data as Preset;
    },
    onSuccess: (data, variables) => {
      if (isOffline()) {
        const { id, ...updates } = variables;
        qc.setQueriesData<Preset[]>({ queryKey: KEY, exact: false }, (old) => (old ?? []).map((p: any) => p.id === id ? { ...p, ...updates } : p));
      } else {
        qc.invalidateQueries({ queryKey: KEY });
      }
    },
  });
}

export function useArchivePreset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (isOffline()) {
        await enqueue({ table: "presets", action: "update", payload: { id, data: { archived: true } } });
        return;
      }
      const { error } = await supabase.from("presets").update({ archived: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, id) => {
      if (isOffline()) {
        qc.setQueriesData<Preset[]>({ queryKey: KEY, exact: false }, (old) => (old ?? []).filter((p: any) => p.id !== id));
      } else {
        qc.invalidateQueries({ queryKey: KEY });
      }
    },
  });
}
