import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Preset, PresetInsert, PresetUpdate } from "@/types/database";

const KEY = ["presets"] as const;

export function usePresets(type?: "income" | "expense") {
  return useQuery({
    queryKey: [...KEY, type],
    queryFn: async () => {
      let query = supabase
        .from("presets")
        .select("*")
        .eq("archived", false)
        .order("name");
      if (type) {
        query = query.eq("type", type);
      }
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("presets")
        .insert({ ...input, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as Preset;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdatePreset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: PresetUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("presets")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Preset;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useArchivePreset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("presets")
        .update({ archived: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
