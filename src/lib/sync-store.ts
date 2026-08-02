import { create } from "zustand";

export interface SyncStoreState {
  lastSync: number | null;
  lastError: string | null;
  pendingCount: number;
  /** Bumped by `requestSync` to trigger a drain while already connected. */
  syncTick: number;
  setState: (state: Partial<Pick<SyncStoreState, "lastSync" | "lastError" | "pendingCount">>) => void;
  requestSync: () => void;
}

export const useSyncStore = create<SyncStoreState>((set) => ({
  lastSync: null,
  lastError: null,
  pendingCount: 0,
  syncTick: 0,
  setState: (state) => set(state),
  requestSync: () => set((s) => ({ syncTick: s.syncTick + 1 })),
}));
