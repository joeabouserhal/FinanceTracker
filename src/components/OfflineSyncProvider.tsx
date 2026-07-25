import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { getQueue, dequeue, updateMutation, getIdMap, setIdMap, type QueuedMutation } from "@/lib/offline-queue";
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

async function refreshSession(): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    return !error && !!data.session;
  } catch { return false; }
}

async function replayMutation(m: QueuedMutation): Promise<string | null> {
  // Resolve dependencies (client ID → server ID)
  let payload = m.payload;
  if (m.dependencies && m.dependencies.length > 0) {
    const idMap = await getIdMap();
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

function isAuthError(msg: string): boolean {
  return /not authenticated|jwt|token expired|refresh token/i.test(msg);
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
          if (serverId && serverId !== m.payload.id) {
            queryClient.setQueriesData<any[]>(
              { queryKey: [m.table], exact: false },
              (old) => old?.map((item: any) => item.id === m.payload.client_id ? { ...item, id: serverId } : item) || []
            );
          }
        } catch (e: any) {
          hasFailures = true;
          lastError = e.message;
          await updateMutation(m.id, { lastError: e.message });

          if (isAuthError(e.message)) {
            const refreshed = await refreshSession();
            if (refreshed) {
              // Retry this mutation once after refresh
              try {
                await updateMutation(m.id, { attempts: m.attempts + 1, lastError: undefined });
                const serverId = await replayMutation(m);
                await dequeue(m.id);
                if (serverId && serverId !== m.payload.id) {
                  queryClient.setQueriesData<any[]>(
                    { queryKey: [m.table], exact: false },
                    (old) => old?.map((item: any) => item.id === m.payload.client_id ? { ...item, id: serverId } : item) || []
                  );
                }
                hasFailures = false; // reset failure flag for this item
                continue;
              } catch (retryErr: any) {
                await updateMutation(m.id, { lastError: `Auth refresh failed: ${retryErr.message}` });
              }
            }
          }
          // Non-auth error or refresh failed — skip this mutation, continue with rest
        }
      }

      const remaining = await getQueue();
      setState({
        lastSync: Date.now(),
        lastError: hasFailures ? lastError : null,
        pendingCount: remaining.length,
      });

      if (!hasFailures) {
        queryClient.invalidateQueries();
      }

      syncing.current = false;
    })();
  }, [isConnected]);

  return <>{children}</>;
}
