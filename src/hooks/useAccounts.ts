import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Account } from "@/types/database";

const KEY = ["accounts"] as const;

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
