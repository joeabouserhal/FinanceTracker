import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PALETTES, DEFAULT_THEME_ID, type ThemeTokens } from "./palettes";

const THEME_STORAGE_KEY = "app_theme_id";

interface ThemeState {
  themeId: string;
  /** True once the persisted theme has been loaded (splash gate). */
  ready: boolean;
  setTheme: (id: string) => void;
  initialize: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set) => ({
  themeId: DEFAULT_THEME_ID,
  ready: false,

  setTheme: (id) => {
    if (!PALETTES[id]) return;
    set({ themeId: id });
    AsyncStorage.setItem(THEME_STORAGE_KEY, id).catch(() => {});
  },

  initialize: async () => {
    try {
      const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      set({
        themeId: stored && PALETTES[stored] ? stored : DEFAULT_THEME_ID,
        ready: true,
      });
    } catch {
      set({ ready: true });
    }
  },
}));

/** Current theme tokens. Components that call this re-render on theme change. */
export function useTheme(): ThemeTokens {
  const themeId = useThemeStore((s) => s.themeId);
  return PALETTES[themeId] ?? PALETTES[DEFAULT_THEME_ID];
}
