import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { getQueue, dequeue, type QueuedMutation } from "@/lib/offline-queue";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

async function replayMutation(m: QueuedMutation) {
  if (m.action === "insert") {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from(m.table).insert({ ...m.payload, user_id: user?.id });
    if (error) throw error;
  } else if (m.action === "update") {
    const { error } = await supabase.from(m.table).update(m.payload.data).eq("id", m.payload.id);
    if (error) throw error;
  } else if (m.action === "delete") {
    const { error } = await supabase.from(m.table).delete().eq("id", m.payload.id);
    if (error) throw error;
  }
}

export function OfflineSyncProvider({ children }: { children: React.ReactNode }) {
  const isConnected = useNetworkStatus((s) => s.isConnected);
  const syncing = useRef(false);

  useEffect(() => {
    if (!isConnected || syncing.current) return;
    syncing.current = true;

    (async () => {
      const queue = await getQueue();
      if (queue.length === 0) { syncing.current = false; return; }

      for (const m of queue) {
        try {
          await replayMutation(m);
          await dequeue(m.id);
        } catch {
          // Leave in queue, retry next time
          break;
        }
      }

      syncing.current = false;
      // Let React Query's refetchOnReconnect handle cache refresh
    })();
  }, [isConnected]);

  return <>{children}</>;
}
