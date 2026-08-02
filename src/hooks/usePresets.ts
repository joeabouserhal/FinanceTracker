import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { createCrudApi } from "@/lib/offline-crud";
import type { Preset, PresetInsert, PresetUpdate } from "@/types/database";

const KEY = ["presets"] as const;

const presetsApi = createCrudApi<Preset, PresetInsert, PresetUpdate>({
  table: "presets",
  queryKey: KEY,
  optimistic: (input, clientId, now) => ({
    id: clientId,
    user_id: "",
    name: input.name,
    type: input.type,
    default_amount: input.default_amount ?? null,
    default_currency_id: input.default_currency_id ?? null,
    default_category_id: input.default_category_id ?? null,
    default_account_id: input.default_account_id ?? null,
    archived: false,
    created_at: now,
  }),
});

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
  return presetsApi.useAdd();
}

export function useUpdatePreset() {
  return presetsApi.useUpdate();
}

export function useArchivePreset() {
  return presetsApi.useRemove("archive");
}
