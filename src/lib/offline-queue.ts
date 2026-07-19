import AsyncStorage from "@react-native-async-storage/async-storage";

const QUEUE_KEY = "offline_mutation_queue";

export interface QueuedMutation {
  id: string;
  table: string;
  action: "insert" | "update" | "delete";
  payload: any;
  timestamp: number;
}

export async function getQueue(): Promise<QueuedMutation[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function enqueue(mutation: Omit<QueuedMutation, "id" | "timestamp">) {
  const queue = await getQueue();
  queue.push({
    ...mutation,
    id: Math.random().toString(36).slice(2),
    timestamp: Date.now(),
  });
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
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
