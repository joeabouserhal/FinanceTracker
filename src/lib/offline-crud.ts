import { useMutation, useQueryClient, type QueryClient, type QueryKey } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { enqueue, genTempId, isTempId } from "@/lib/offline-queue";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useSyncStore } from "@/lib/sync-store";
import { isNetworkError } from "@/utils/errors";

/**
 * A mutation should be queued (not sent directly) when the device is
 * disconnected OR connected to a network with no internet (captive portal).
 */
export function isOffline(): boolean {
  const { isConnected, isInternetReachable } = useNetworkStatus.getState();
  return !isConnected || isInternetReachable === false;
}

/** Collect temp-ID values from an insert payload — they are FK dependencies. */
export function tempDependencies(input: Record<string, unknown>): string[] {
  return Object.values(input).filter(
    (value): value is string => typeof value === "string" && isTempId(value),
  );
}

export interface CrudConfig<T extends { id: string }, InsertT extends Record<string, unknown>> {
  table: string;
  queryKey: readonly string[];
  /** Build the optimistic row shown in the cache for an offline insert. */
  optimistic: (input: InsertT, clientId: string, now: string) => T;
  /** Where the optimistic row is placed in cached lists. */
  insertPosition?: "prepend" | "append";
  /** Also stamp `updated_at` on updates (transactions table convention). */
  touchUpdatedAt?: boolean;
}

type Snapshot<T> = [QueryKey, T[] | undefined][];

function restoreSnapshots<T>(qc: QueryClient, snapshots: Snapshot<T> | undefined) {
  if (!snapshots) return;
  for (const [key, data] of snapshots) {
    qc.setQueryData(key, data);
  }
}

/**
 * Shared offline-first CRUD factory. All five entity hooks use this so the
 * offline path (temp IDs, `client_id`, FK dependencies, optimistic cache
 * updates, rollback) behaves identically everywhere.
 */
export function createCrudApi<
  T extends { id: string },
  InsertT extends Record<string, unknown>,
  UpdateT extends Partial<T> & Record<string, unknown>,
>(config: CrudConfig<T, InsertT>) {
  const { table, queryKey } = config;
  const position = config.insertPosition ?? "append";

  /** Mutations queued while connected (temp-ID rows, connectivity races) need an immediate drain. */
  function requestSyncIfOnline() {
    if (!isOffline()) useSyncStore.getState().requestSync();
  }

  async function insertRow(input: InsertT): Promise<T> {
    const clientId = genTempId();
    await enqueue({
      table,
      action: "insert",
      payload: { ...input, client_id: clientId },
      dependencies: tempDependencies(input),
    });
    requestSyncIfOnline();
    return config.optimistic(input, clientId, new Date().toISOString());
  }

  async function updateRow(input: UpdateT & { id: string }): Promise<Partial<T> & { id: string }> {
    const { id, ...updates } = input;
    const data: Record<string, unknown> = config.touchUpdatedAt
      ? { ...updates, updated_at: new Date().toISOString() }
      : updates;
    await enqueue({
      table,
      action: "update",
      payload: { id, data },
      // Row id AND any temp FKs inside the update must resolve before replay.
      dependencies: [...tempDependencies(data), ...(isTempId(id) ? [id] : [])],
    });
    requestSyncIfOnline();
    return input;
  }

  async function removeRow(id: string, mode: "delete" | "archive") {
    if (mode === "delete") {
      await enqueue({
        table,
        action: "delete",
        payload: { id },
        dependencies: isTempId(id) ? [id] : [],
      });
    } else {
      await enqueue({
        table,
        action: "update",
        payload: { id, data: { archived: true } },
        dependencies: isTempId(id) ? [id] : [],
      });
    }
    requestSyncIfOnline();
  }

  const useAdd = () => {
    const qc = useQueryClient();
    return useMutation<T, Error, InsertT, { previous: Snapshot<T> }>({
      mutationFn: async (input) => {
        // Temp FKs in the input (e.g. an offline-created currency) must go
        // through the queue even when connected — the server can't accept them.
        if (isOffline() || tempDependencies(input).length > 0) return insertRow(input);
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) throw new Error("Not authenticated");
          const { data, error } = await supabase
            .from(table)
            .insert({ ...input, user_id: user.id })
            .select()
            .single();
          if (error) throw error;
          return data as T;
        } catch (error) {
          // Connectivity state can be stale (NetInfo hasn't flipped yet) — a
          // network failure must queue the change, never silently lose it.
          if (isNetworkError(error)) return insertRow(input);
          throw error;
        }
      },
      onMutate: async () => {
        await qc.cancelQueries({ queryKey, exact: false });
        const previous = qc.getQueriesData<T[]>({ queryKey, exact: false });
        return { previous };
      },
      onSuccess: (data) => {
        if (isTempId(data.id)) {
          // Offline insert — show the optimistic row immediately.
          qc.setQueriesData<T[]>({ queryKey, exact: false }, (old) => {
            const list = old ?? [];
            const exists = list.some((item) => item.id === data.id);
            if (exists) return list;
            return position === "prepend" ? [data, ...list] : [...list, data];
          });
        } else {
          qc.invalidateQueries({ queryKey, exact: false });
        }
      },
      onError: (_error, _input, context) => {
        restoreSnapshots(qc, context?.previous);
      },
    });
  };

  const useUpdate = () => {
    const qc = useQueryClient();
    return useMutation<Partial<T> & { id: string }, Error, UpdateT & { id: string }, { previous: Snapshot<T> }>({
      mutationFn: async (input) => {
        const { id, ...updates } = input;
        // Temp-ID rows and temp FKs in the update data only exist while their
        // inserts are unsynced — route them through the queue so the inserts
        // replay first, then this update.
        if (isTempId(id) || isOffline() || tempDependencies(updates).length > 0) {
          return updateRow(input);
        }
        const values: Record<string, unknown> = config.touchUpdatedAt
          ? { ...updates, updated_at: new Date().toISOString() }
          : updates;
        try {
          const { data, error } = await supabase
            .from(table)
            .update(values)
            .eq("id", id)
            .select()
            .single();
          if (error) throw error;
          return data as T;
        } catch (error) {
          if (isNetworkError(error)) return updateRow(input);
          throw error;
        }
      },
      onMutate: async () => {
        await qc.cancelQueries({ queryKey, exact: false });
        const previous = qc.getQueriesData<T[]>({ queryKey, exact: false });
        return { previous };
      },
      onSuccess: (_data, variables) => {
        if (isTempId(variables.id)) {
          const { id, ...updates } = variables;
          const stamp = config.touchUpdatedAt ? { updated_at: new Date().toISOString() } : {};
          qc.setQueriesData<T[]>({ queryKey, exact: false }, (old) =>
            (old ?? []).map((item) => (item.id === id ? { ...item, ...updates, ...stamp } : item)),
          );
        } else {
          qc.invalidateQueries({ queryKey, exact: false });
        }
      },
      onError: (_error, _input, context) => {
        restoreSnapshots(qc, context?.previous);
      },
    });
  };

  const useRemove = (mode: "delete" | "archive") => {
    const qc = useQueryClient();
    return useMutation<void, Error, string, { previous: Snapshot<T> }>({
      mutationFn: async (id) => {
        if (isTempId(id) || isOffline()) {
          await removeRow(id, mode);
          return;
        }
        try {
          if (mode === "archive") {
            const { error } = await supabase.from(table).update({ archived: true }).eq("id", id);
            if (error) throw error;
          } else {
            const { error } = await supabase.from(table).delete().eq("id", id);
            if (error) throw error;
          }
        } catch (error) {
          if (isNetworkError(error)) {
            await removeRow(id, mode);
            return;
          }
          throw error;
        }
      },
      onMutate: async () => {
        await qc.cancelQueries({ queryKey, exact: false });
        const previous = qc.getQueriesData<T[]>({ queryKey, exact: false });
        return { previous };
      },
      onSuccess: (_data, id) => {
        if (isTempId(id)) {
          qc.setQueriesData<T[]>({ queryKey, exact: false }, (old) =>
            (old ?? []).filter((item) => item.id !== id),
          );
        } else {
          qc.invalidateQueries({ queryKey, exact: false });
        }
      },
      onError: (_error, _input, context) => {
        restoreSnapshots(qc, context?.previous);
      },
    });
  };

  return { useAdd, useUpdate, useRemove };
}
