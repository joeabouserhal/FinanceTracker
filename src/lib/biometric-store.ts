import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BIOMETRIC_STORAGE_KEY = "biometric_enabled";

interface BiometricState {
  enabled: boolean;
  /** True once the persisted value has been loaded. */
  ready: boolean;
  setEnabled: (value: boolean) => void;
  initialize: () => Promise<void>;
}

/**
 * Single owner of the biometric-lock setting, shared by Settings (toggle)
 * and BiometricGate (lock screen) so both always agree.
 */
export const useBiometricStore = create<BiometricState>((set) => ({
  enabled: false,
  ready: false,

  setEnabled: (value) => {
    set({ enabled: value });
    AsyncStorage.setItem(BIOMETRIC_STORAGE_KEY, String(value)).catch(() => {});
  },

  initialize: async () => {
    try {
      const stored = await AsyncStorage.getItem(BIOMETRIC_STORAGE_KEY);
      set({ enabled: stored === "true", ready: true });
    } catch {
      set({ ready: true });
    }
  },
}));
