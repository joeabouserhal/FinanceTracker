import AsyncStorage from "@react-native-async-storage/async-storage";

const QUEUE_KEY = "offline_mutation_queue";
const ID_MAP_KEY = "offline_id_map";
export const SYNC_STATE_KEY = "offline_sync_state";

export interface QueuedMutation {
  id: string;                    // stable client-generated UUID
  table: string;
  action: "insert" | "update" | "delete";
  payload: any;                  // the row data to insert/update
  dependencies?: string[];       // IDs this mutation depends on (must sync first)
  attempts: number;
  lastError?: string;
  timestamp: number;
}

// Map client-generated IDs to server-assigned IDs
type IdMap = Record<string, string>; // clientId → serverId

function genId(): string {
  return `tmp_${Math.random().toString(36).slice(2, 11)}`;
}

// ── ID Map ────────────────────────────────────────────────────────

export async function getIdMap(): Promise<IdMap> {
  const raw = await AsyncStorage.getItem(ID_MAP_KEY);
  return raw ? JSON.parse(raw) : {};
}

export async function setIdMap(map: IdMap) {
  await AsyncStorage.setItem(ID_MAP_KEY, JSON.stringify(map));
}

export async function resolveId(clientId: string): Promise<string> {
  const map = await getIdMap();
  return map[clientId] || clientId;
}

// ── Queue ────────────────────────────────────────────────────────

export async function getQueue(): Promise<QueuedMutation[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function enqueue(mutation: Omit<QueuedMutation, "id" | "attempts" | "timestamp">) {
  const queue = await getQueue();
  queue.push({
    ...mutation,
    id: genId(),
    attempts: 0,
    timestamp: Date.now(),
  });
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function updateMutation(id: string, update: Partial<QueuedMutation>) {
  const queue = await getQueue();
  const idx = queue.findIndex((m) => m.id === id);
  if (idx !== -1) {
    queue[idx] = { ...queue[idx], ...update };
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }
}

export async function dequeue(id: string) {
  const queue = await getQueue();
  const filtered = queue.filter((m) => m.id !== id);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
}

export async function clearQueue() {
  await AsyncStorage.removeItem(QUEUE_KEY);
}

export async function getQueueSize(): Promise<number> {
  const queue = await getQueue();
  return queue.length;
}

// ── Sync State ───────────────────────────────────────────────────

export interface SyncState {
  lastSync: number | null;
  lastError: string | null;
  pendingCount: number;
}

export async function getSyncState(): Promise<SyncState> {
  const queue = await getQueue();
  const raw = await AsyncStorage.getItem(SYNC_STATE_KEY);
  const stored = raw ? JSON.parse(raw) : {};
  return {
    lastSync: stored.lastSync || null,
    lastError: stored.lastError || null,
    pendingCount: queue.length,
  };
}

export async function setSyncState(state: Partial<SyncState>) {
  const current = await getSyncState();
  await AsyncStorage.setItem(SYNC_STATE_KEY, JSON.stringify({ ...current, ...state }));
}
