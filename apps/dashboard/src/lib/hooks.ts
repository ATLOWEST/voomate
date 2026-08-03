'use client';

/**
 * Data fetching for tenant-scoped pages.
 *
 * Small on purpose. Every read in this dashboard needs the same four things — an access
 * token, an organization ID, cancellation on unmount, and an error that a merchant can read —
 * and getting any of them wrong is either a 403 or a stale render from a request that resolved
 * after the user navigated away.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError, API_BASE_URL } from '@/lib/api';
import { useApiAuth } from '@/lib/session';

export interface QueryResult<T> {
  data: T | undefined;
  error: string | undefined;
  /** True only on the first load. A poll refreshing in the background must not blank the page. */
  loading: boolean;
  refetch: () => void;
}

export function useApiQuery<T>(
  /** `null` disables the query — for a page whose ID has not resolved yet. */
  path: string | null,
  options: { pollMs?: number } = {},
): QueryResult<T> {
  const { pollMs } = options;
  const auth = useApiAuth();
  const [data, setData] = useState<T>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(path !== null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((value) => value + 1), []);

  useEffect(() => {
    if (path === null) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    let live = true;

    void (async () => {
      try {
        const { accessToken, organizationId } = await auth();
        const result = await api.get<T>(path, {
          accessToken,
          organizationId,
          signal: controller.signal,
        });
        if (!live) return;
        setData(result);
        setError(undefined);
      } catch (caught) {
        // An abort is a navigation, not a failure. Surfacing it paints an error banner on a
        // page the user has already left and then flashes it on the way back.
        if (!live || controller.signal.aborted) return;
        setError(messageFor(caught));
      } finally {
        if (live) setLoading(false);
      }
    })();

    return () => {
      live = false;
      controller.abort();
    };
  }, [path, auth, tick]);

  // Polling is opt-in and caller-controlled, because the only thing worth polling here is an
  // ingestion job — and the caller is the only one who knows when it has finished.
  useEffect(() => {
    if (pollMs === undefined || path === null) return;
    const id = setInterval(() => setTick((value) => value + 1), pollMs);
    return () => clearInterval(id);
  }, [pollMs, path]);

  return { data, error, loading, refetch };
}

/**
 * A write, with its own busy and error state.
 *
 * Returns `true` on success so a caller can close a dialog only when the write actually
 * landed. Closing optimistically is how a failed save looks like a successful one.
 */
export function useApiAction<Args extends unknown[]>(
  action: (auth: { accessToken: string; organizationId: string }, ...args: Args) => Promise<void>,
): {
  run: (...args: Args) => Promise<boolean>;
  busy: boolean;
  error: string | undefined;
  clearError: () => void;
} {
  const auth = useApiAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const mounted = useMounted();

  // Held in a ref so `run` stays stable across renders even when the caller passes an inline
  // arrow function, which is the normal way to call this.
  const actionRef = useRef(action);
  actionRef.current = action;

  const run = useCallback(
    async (...args: Args): Promise<boolean> => {
      setBusy(true);
      setError(undefined);
      try {
        await actionRef.current(await auth(), ...args);
        return true;
      } catch (caught) {
        if (mounted.current) setError(messageFor(caught));
        return false;
      } finally {
        if (mounted.current) setBusy(false);
      }
    },
    [auth, mounted],
  );

  return { run, busy, error, clearError: useCallback(() => setError(undefined), []) };
}

function useMounted() {
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  return mounted;
}

/**
 * An error a merchant can act on.
 *
 * The API's messages are written for humans, so they pass through. Anything else is a network
 * or CORS failure, where "the API said X" would be a lie — the API never answered.
 */
export function messageFor(caught: unknown): string {
  if (caught instanceof ApiError) return caught.message;
  // Named from the URL we actually tried rather than a hard-coded port, so the message cannot
  // drift out of date the way a literal one already did once.
  return `Could not reach the API at ${API_BASE_URL}. Check that it is running.`;
}
