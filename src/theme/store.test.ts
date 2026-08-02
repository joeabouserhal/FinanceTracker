import AsyncStorage from "@react-native-async-storage/async-storage";
import { useThemeStore } from "./store";

// Matches the private THEME_STORAGE_KEY in store.ts — guards the storage contract.
const THEME_KEY = "app_theme_id";

beforeEach(async () => {
  await AsyncStorage.clear();
  useThemeStore.setState({ themeId: "brutalist", ready: false });
});

describe("theme store", () => {
  it("defaults to the brutalist theme until initialized", () => {
    expect(useThemeStore.getState().themeId).toBe("brutalist");
    expect(useThemeStore.getState().ready).toBe(false);
  });

  it("loads the persisted theme on initialize", async () => {
    await AsyncStorage.setItem(THEME_KEY, "dracula");
    await useThemeStore.getState().initialize();
    expect(useThemeStore.getState().themeId).toBe("dracula");
    expect(useThemeStore.getState().ready).toBe(true);
  });

  it("falls back to the default for unknown stored ids", async () => {
    await AsyncStorage.setItem(THEME_KEY, "not-a-theme");
    await useThemeStore.getState().initialize();
    expect(useThemeStore.getState().themeId).toBe("brutalist");
    expect(useThemeStore.getState().ready).toBe(true);
  });

  it("setTheme applies, persists, and rejects unknown ids", async () => {
    useThemeStore.getState().setTheme("catppuccin");
    expect(useThemeStore.getState().themeId).toBe("catppuccin");
    expect(await AsyncStorage.getItem(THEME_KEY)).toBe("catppuccin");

    useThemeStore.getState().setTheme("does-not-exist");
    expect(useThemeStore.getState().themeId).toBe("catppuccin");
    expect(await AsyncStorage.getItem(THEME_KEY)).toBe("catppuccin");
  });
});
