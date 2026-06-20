"use client";

import { useEffect, useState, useCallback } from "react";
import { usePreship } from "@/lib/preship-store";
import { toast } from "sonner";

/**
 * Fetch hook that refetches whenever the global `tick` bumps (after mutations).
 *
 * Returns `{ data, loading, error, refetch }`.
 *
 * - `error` is set whenever the request fails (non-2xx or network error) so
 *   callers can render an explicit error state instead of silently falling
 *   through to an empty list. Previously every consumer ignored `error`, which
 *   made a server failure (e.g. a missing DATABASE_URL in production) look
 *   identical to "there is no data" — see <ApiErrorState> for the fix.
 * - `refetch()` re-runs the request on demand (used by the Retry button).
 */
export function useApi<T>(url: string | null, deps: unknown[] = []) {
  const tick = usePreship((s) => s.tick);
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // bumped to force a manual refetch (e.g. from the error-state Retry button)
  const [reloadCounter, setReloadCounter] = useState(0);

  const refetch = useCallback(() => setReloadCounter((n) => n + 1), []);

  // Data-fetch effect: synchronous setState here is the standard SWR-style
  // pattern (loading flags + async result), not cascading derived state.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    let alive = true;
    if (!url) {
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    fetch(url, { headers: { Accept: "application/json" } })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => {
        if (alive) {
          setData(d);
          setError(null);
        }
      })
      .catch((e) => {
        if (alive) setError(e instanceof Error ? e.message : "Failed to load");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [url, tick, reloadCounter, ...deps]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return { data, loading, error, refetch };
}

/** POST/PATCH/DELETE helper. Returns { ok, data, error } and bumps the store on success. */
export function useMutate() {
  const bump = usePreship((s) => s.bump);

  return useCallback(
    async <T = unknown>(
      url: string,
      opts: { method?: "POST" | "PATCH" | "DELETE"; body?: unknown } = {}
    ): Promise<{ ok: boolean; data?: T; error?: string }> => {
      try {
        const r = await fetch(url, {
          method: opts.method ?? "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: opts.body ? JSON.stringify(opts.body) : undefined,
        });
        const json = await r.json().catch(() => ({}));
        if (!r.ok) {
          const msg = (json as { error?: string }).error ?? `HTTP ${r.status}`;
          toast.error(msg);
          return { ok: false, error: msg };
        }
        bump();
        return { ok: true, data: json as T };
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Network error";
        toast.error(msg);
        return { ok: false, error: msg };
      }
    },
    [bump]
  );
}
