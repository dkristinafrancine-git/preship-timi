"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { usePreship, channelsForUrl } from "@/lib/preship-store";
import { toast } from "sonner";

/**
 * Module-level response cache + in-flight request dedup.
 *
 * - `cache`: keyed by full URL. Holds the last successful payload so a
 *   re-mount (or a scoped invalidate) can render instantly while we revalidate
 *   in the background (stale-while-revalidate), instead of flashing a spinner.
 * - `inflight`: a Map<url, Promise> so that N sibling components mounting the
 *   same URL in the same tick share ONE network round-trip. Previously every
 *   `useApi("/api/me")` consumer (4+ on the war-room view) fired its own fetch.
 *
 * Both live for the lifetime of the page (single-page app shell), which is the
 * right scope: this is client-cached data, never the source of truth.
 */
type Json = unknown;
const cache = new Map<string, Json>();
const inflight = new Map<string, Promise<Json>>();

function fetchJson(url: string): Promise<Json> {
  const existing = inflight.get(url);
  if (existing) return existing;
  const p = fetch(url, { headers: { Accept: "application/json" } })
    .then(async (r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return (await r.json()) as Json;
    })
    .finally(() => {
      inflight.delete(url);
    });
  // Only cache successful resolves onto `cache`; the in-flight promise is
  // shared regardless of outcome so concurrent mounts don't double-fetch.
  inflight.set(url, p);
  return p;
}

export interface UseApiResult<T> {
  data: T | null;
  /** True only when we have no cached data yet for this URL. Once we've
   *  fetched once, background revalidations keep `data` populated and
   *  `loading` false — no spinner flicker on invalidate/remount. */
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Fetch hook that:
 *  - dedups identical concurrent requests (one fetch per URL per tick),
 *  - serves cached data immediately and revalidates in the background,
 *  - refetches only when its OWN channel(s) are invalidated (not on every
 *    mutation app-wide).
 *
 * Returns `{ data, loading, error, refetch }`.
 */
export function useApi<T>(url: string | null, deps: unknown[] = []): UseApiResult<T> {
  const channels = url ? channelsForUrl(url) : [];
  // Subscribe to each channel counter this URL cares about. Reading them in
  // the effect deps array re-runs the fetch only when a relevant channel bumps.
  const invalidations = usePreship((s) => s.invalidations);
  const channelTick = channels.map((c) => invalidations[c] ?? 0).join("-");

  const [data, setData] = useState<T | null>(() => (url ? (cache.get(url) as T | undefined ?? null) : null));
  const [loading, setLoading] = useState<boolean>(() => (url ? !cache.has(url) : false));
  const [error, setError] = useState<string | null>(null);
  const [reloadCounter, setReloadCounter] = useState(0);
  const refetch = useCallback(() => setReloadCounter((n) => n + 1), []);

  // Keep a live ref to setData so we can write into the module cache from
  // the reload path without re-subscribing.
  const lastUrl = useRef<string | null>(null);

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
    // If we already have cached data, show it immediately and skip the
    // loading spinner; the revalidate happens in the background.
    const cached = cache.get(url) as T | undefined;
    if (cached !== undefined) {
      setData(cached);
      setError(null);
      setLoading(false);
    } else {
      setLoading(true);
    }
    lastUrl.current = url;

    fetchJson(url)
      .then((d) => {
        if (!alive) return;
        cache.set(url, d);
        setData(d as T);
        setError(null);
      })
      .catch((e) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Failed to load");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
    // url + channelTick cover remounts, scoped invalidations, and reloads.
    // deps is the caller's extra dependency list (e.g. sort/filter state).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, channelTick, reloadCounter, ...deps]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return { data, loading, error, refetch };
}

/** Imperatively warm the cache (e.g. from a prefetch on hover). */
export function prefetchApi(url: string): void {
  // Fire-and-forget; the result lands in `cache` on success.
  void fetchJson(url).then((d) => cache.set(url, d)).catch(() => {});
}

/** Drop a cached entry (e.g. after a confirmed delete where refetching would
 *  just re-show stale data briefly). Safe to call for an uncached URL. */
export function invalidateCacheEntry(url: string): void {
  cache.delete(url);
}

/**
 * POST/PATCH/DELETE helper. Returns { ok, data, error }.
 *
 * On success it bumps only the channel(s) that own the mutation URL (derived
 * via `channelsForUrl`), so a reaction no longer refetches the entire screen.
 * Pass `{ invalidate: ["feed","synergy"] }` to broaden scope, or
 * `{ invalidate: ["*"] }` for a global refetch (e.g. login/logout).
 */
export function useMutate() {
  const invalidate = usePreship((s) => s.invalidate);
  const bump = usePreship((s) => s.bump);

  return useCallback(
    async <T = unknown>(
      url: string,
      opts: {
        method?: "POST" | "PATCH" | "DELETE";
        body?: unknown;
        /** Override which channels get dirtied. Defaults to the URL's channels. */
        invalidate?: import("./preship-store").InvalidationChannel[];
        /** Legacy behavior: wildcard bump (refetch everything). Default false. */
        bumpAll?: boolean;
      } = {}
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
        // Scoped invalidation: only endpoints that plausibly changed refetch.
        if (opts.bumpAll) {
          bump();
        } else {
          invalidate(opts.invalidate ?? channelsForUrl(url));
        }
        return { ok: true, data: json as T };
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Network error";
        toast.error(msg);
        return { ok: false, error: msg };
      }
    },
    [invalidate, bump]
  );
}
