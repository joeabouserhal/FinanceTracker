import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { getQueue, dequeue, updateMutation, getIdMap, setIdMap, setSyncState, type QueuedMutation } from "@/lib/offline-queue";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { queryClient } from "@/lib/query-client";
import { create } from "zustand";

interface SyncStore {
  lastSync: number | null;
  lastError: string | null;
  pendingCount: number;
  setState: (state: Partial<Pick<SyncStore, "lastSync" | "lastError" | "pendingCount">>) => void;
}

export const useSyncStore = create<SyncStore>((set) => ({
  lastSync: null,
  lastError: null,
  pendingCount: 0,
  setState: (state) => set(state),
}));

async function replayMutation(m: QueuedMutation): Promise<string | null> {
  // Resolve dependencies (client ID → server ID)
  let payload = m.payload;
  if (m.dependencies && m.dependencies.length > 0) {
    const idMap = await getIdMap();
    // Replace dependency IDs in payload
    try {
      const json = JSON.stringify(payload);
      let resolved = json;
      for (const depId of m.dependencies) {
        const serverId = idMap[depId];
        if (serverId) resolved = resolved.replace(new RegExp(depId, "g"), serverId);
      }
      payload = JSON.parse(resolved);
    } catch { /* use original payload */ }
  }

  if (m.action === "insert") {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    const { client_id, ...cleanPayload } = payload;
    const { data, error } = await supabase.from(m.table).insert({ ...cleanPayload, user_id: user.id }).select().single();
    if (error) throw error;
    // Store client → server ID mapping
    if (client_id && data?.id) {
      const idMap = await getIdMap();
      idMap[client_id] = data.id;
      await setIdMap(idMap);
    }
    return data?.id || null;
  } else if (m.action === "update") {
    const { error } = await supabase.from(m.table).update(payload.data).eq("id", payload.id);
    if (error) throw error;
  } else if (m.action === "delete") {
    const { error } = await supabase.from(m.table).delete().eq("id", payload.id);
    if (error) throw error;
  }
  return null;
}

export function OfflineSyncProvider({ children }: { children: React.ReactNode }) {
  const isConnected = useNetworkStatus((s) => s.isConnected);
  const syncing = useRef(false);
  const setState = useSyncStore((s) => s.setState);

  useEffect(() => {
    if (!isConnected || syncing.current) return;
    syncing.current = true;

    (async () => {
      const queue = await getQueue();
      setState({ pendingCount: queue.length, lastError: null });

      if (queue.length === 0) { syncing.current = false; return; }

      let hasFailures = false;
      let lastError: string | null = null;

      for (const m of queue) {
        try {
          await updateMutation(m.id, { attempts: m.attempts + 1 });
          const serverId = await replayMutation(m);
          await dequeue(m.id);
          // Update cached queries if a reconciliation happened
          if (serverId && serverId !== m.payload.id) {
            // Replace client ID with server ID in all caches
            queryClient.setQueriesData<any[]>(
              { queryKey: [m.table], exact: false },
              (old) => old?.map((item: any) => item.id === m.payload.client_id ? { ...item, id: serverId } : item) || []
            );
          }
        } catch (e: any) {
          hasFailures = true;
          lastError = e.message;
          await updateMutation(m.id, { lastError: e.message });
          // Stop processing on fatal error (auth, etc.)
          if (e.message?.includes("Not authenticated") || e.message?.includes("JWT")) {
            break;
          }
        }
      }

      const remaining = await getQueue();
      setState({
        lastSync: Date.now(),
        lastError: hasFailures ? lastError : null,
        pendingCount: remaining.length,
      });

      if (!hasFailures) {
        // Full success — refresh all queries
        queryClient.invalidateQueries();
      }

      syncing.current = false;
    })();
  }, [isConnected]);

  return <>{children}</>;
}
