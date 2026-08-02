import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import {
  getQueue,
  dequeue,
  updateMutation,
  getIdMap,
  setIdMap,
  resolveId,
  resolvePayloadIds,
  isTempId,
  type QueuedMutation,
} from "@/lib/offline-queue";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { queryClient } from "@/lib/query-client";
import { getErrorMessage } from "@/utils/errors";
import { useSyncStore } from "@/lib/sync-store";

export { useSyncStore } from "@/lib/sync-store";

async function refreshSession(): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    return !error && !!data.session;
  } catch {
    return false;
  }
}

function isAuthError(msg: string): boolean {
  return /not authenticated|jwt|token expired|refresh token/i.test(msg);
}

/** Replace an optimistic temp-ID row with its server ID across matching query caches. */
function reconcileCache(table: string, clientId: string, serverId: string) {
  queryClient.setQueriesData(
    { queryKey: [table], exact: false },
    (old: unknown) => {
      if (!Array.isArray(old)) return old;
      return old.map((item) =>
        item && typeof item === "object" && (item as { id?: unknown }).id === clientId
          ? { ...(item as object), id: serverId }
          : item,
      );
    },
  );
}

async function replayMutation(m: QueuedMutation): Promise<string | null> {
  if (m.action === "insert") {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    // Swap dependency temp IDs for their server IDs (structured, field-level).
    const payload = await resolvePayloadIds(m.payload);
    const { client_id, ...cleanPayload } = payload;
    const { data, error } = await supabase
      .from(m.table)
      .insert({ ...cleanPayload, user_id: user.id })
      .select()
      .single();
    if (error) throw error;
    if (typeof client_id === "string" && data?.id) {
      const idMap = await getIdMap();
      idMap[client_id] = data.id;
      await setIdMap(idMap);
    }
    return data?.id ?? null;
  }

  // update / delete — resolve temp IDs (both the row id and FK values inside
  // `data`) to their server IDs at replay time.
  const rowId = await resolveId(typeof m.payload.id === "string" ? m.payload.id : "");
  if (m.action === "update") {
    const data = await resolvePayloadIds((m.payload.data ?? {}) as Record<string, unknown>);
    const { error } = await supabase.from(m.table).update(data).eq("id", rowId);
    if (error) throw error;
  } else if (m.action === "delete") {
    const { error } = await supabase.from(m.table).delete().eq("id", rowId);
    if (error) throw error;
  }
  return null;
}

export function OfflineSyncProvider({ children }: { children: React.ReactNode }) {
  const isConnected = useNetworkStatus((s) => s.isConnected);
  const isInternetReachable = useNetworkStatus((s) => s.isInternetReachable);
  const syncTick = useSyncStore((s) => s.syncTick);
  const syncing = useRef(false);
  const setState = useSyncStore((s) => s.setState);

  useEffect(() => {
    if (!isConnected || isInternetReachable === false || syncing.current) return;
    syncing.current = true;

    (async () => {
      try {
        const queue = await getQueue();
        setState({ pendingCount: queue.length, lastError: null });
        if (queue.length === 0) return;

        const tables = new Set(queue.map((m) => m.table));
        let hasFailures = false;
        let lastError: string | null = null;
        const failedIds = new Set<string>();
        let progress = true;

        // Drain in rounds: each round replays everything whose dependencies
        // are already resolved. Inserts run first so dependents see fresh
        // client→server mappings in the next round. Items enqueued mid-drain
        // are picked up by the next round's fresh queue read. Items that fail
        // this drain are skipped (failedIds) but retried on the next
        // connectivity change — nothing is permanently wedged.
        while (progress) {
          progress = false;
          const current = await getQueue();
          if (current.length === 0) break;
          const idMap = await getIdMap();

          const replayable = current
            .filter(
              (m) =>
                !failedIds.has(m.id) &&
                // `?? []`: queue items persisted by older builds have no
                // dependencies field — treat them as dependency-free.
                (m.dependencies ?? []).every((dep) => !isTempId(dep) || idMap[dep]),
            )
            .sort((a, b) => (a.action === "insert" ? 0 : 1) - (b.action === "insert" ? 0 : 1));

          for (const m of replayable) {
            await updateMutation(m.id, { attempts: m.attempts + 1 });
            try {
              const serverId = await replayMutation(m);
              await dequeue(m.id);
              if (serverId && typeof m.payload.client_id === "string") {
                reconcileCache(m.table, m.payload.client_id, serverId);
              }
              progress = true;
            } catch (e) {
              const message = getErrorMessage(e);
              if (isAuthError(message)) {
                const refreshed = await refreshSession();
                if (refreshed) {
                  try {
                    const serverId = await replayMutation(m);
                    await dequeue(m.id);
                    if (serverId && typeof m.payload.client_id === "string") {
                      reconcileCache(m.table, m.payload.client_id, serverId);
                    }
                    progress = true;
                    continue;
                  } catch (retryError) {
                    await updateMutation(m.id, {
                      lastError: `Auth refresh failed: ${getErrorMessage(retryError)}`,
                    });
                  }
                }
              }
              hasFailures = true;
              lastError = message;
              failedIds.add(m.id);
              await updateMutation(m.id, { lastError: message });
            }
          }
        }

        const remaining = await getQueue();
        setState({
          lastSync: Date.now(),
          lastError: hasFailures ? lastError : null,
          pendingCount: remaining.length,
        });
        // Refresh only tables with nothing left in the queue. A table with any
        // remaining item (failed, or waiting on a dependency) keeps its cache:
        // invalidating would refetch and wipe the optimistic rows that still
        // represent pending local intent.
        for (const table of tables) {
          if (!remaining.some((m) => m.table === table)) {
            queryClient.invalidateQueries({ queryKey: [table], exact: false });
          }
        }
      } finally {
        syncing.current = false;
      }
    })();
  }, [isConnected, isInternetReachable, syncTick, setState]);

  return <>{children}</>;
}
