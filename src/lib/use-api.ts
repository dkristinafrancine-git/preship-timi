"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { channelsForUrl, type InvalidationChannel } from "@/lib/preship-store";

/**
 * Data layer for Preship, built on @tanstack/react-query.
 *
 * The public API of `useApi` / `useMutate` is unchanged from the hand-rolled
 * version so the ~70 call sites need no edits. Under the hood, RQ gives us:
 *   - automatic request dedup (N consumers of one URL share one fetch),
 *   - a cached response that survives unmount/remount and navigation,
 *   - `placeholderData` for sort/filter switches (no spinner on re-rank),
 *   - scoped invalidation via query-key prefixes.
 *
 * Query keys: `[channel, url]` where `channel` is the resource family derived
 * from `channelsForUrl` (e.g. "feed", "synergy"). A mutation invalidates by
 * channel, so reacting to a post doesn't refetch synergy/idealab.
 */

export interface UseApiResult<T> {
  data: T | null;
  /** True only on the first-ever load of this URL — background refetches and
   *  remounts serve cached data and keep this false (no spinner flicker). */
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/** Channel prefix for a URL — the first channel that owns it, or "api" as a
 *  catch-all. This is the root of the query key, so invalidating a channel
 *  invalidates every URL in that family at once. */
function channelOf(url: string): string {
  const ch = channelsForUrl(url);
  return ch[0] ?? "api";
}

async function fetchJson(url: string): Promise<unknown> {
  const r = await fetch(url, { headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

/**
 * Fetch hook. `url` may be null to skip the fetch (used by FounderHoverCard,
 * which defers its follow-status lookup until the card opens). `deps` is
 * kept for backward compat — RQ re-derives automatically from the `url` key,
 * but callers that interpolate extra state into the URL (e.g. `?sort=...`)
 * already encode it there.
 */
export function useApi<T>(url: string | null, _deps: unknown[] = []): UseApiResult<T> {
  const query = useQuery<T>({
    queryKey: url ? [channelOf(url), url] : ["__disabled__"],
    queryFn: () => fetchJson(url!) as Promise<T>,
    enabled: url !== null,
    // keepPreviousData-equivalent in RQ v5: when the URL changes (sort switch,
    // filter change), keep showing the previous page's data while the new one
    // loads instead of flashing a spinner. Removes the "loading" flicker that
    // used to make sort toggles feel sluggish.
    placeholderData: (prev) => prev,
  });

  return {
    data: query.data ?? null,
    // `isPending` is true only when there's no cached data yet; once a fetch
    // has resolved, subsequent refetches/re-mounts use `isFetching` instead
    // (which we deliberately don't surface as `loading`).
    loading: query.isPending,
    error: query.error instanceof Error ? query.error.message : query.error ? "Failed to load" : null,
    refetch: () => {
      void query.refetch();
    },
  };
}

/** Imperatively warm the cache (e.g. from a hover prefetch). */
export function prefetchApi(url: string): void {
  // queryClient is retrieved lazily to keep this module client-only; callers
  // run it inside event handlers where the provider is guaranteed mounted.
  void prefetchApiImpl(url);
}

// Implemented below as a tiny client bridge so prefetchApi has no hook import.
async function prefetchApiImpl(url: string): Promise<void> {
  const qc = getQueryClient();
  if (!qc) return;
  await qc.prefetchQuery({
    queryKey: [channelOf(url), url],
    queryFn: () => fetchJson(url),
  });
}

/** Drop a cached entry (e.g. after a delete before the refetch lands). */
export function invalidateCacheEntry(url: string): void {
  const qc = getQueryClient();
  if (!qc) return;
  void qc.removeQueries({ queryKey: [channelOf(url), url] });
}

// --- QueryClient bridge -------------------------------------------------
// `useMutate` reads the client via the hook (it runs inside React). The
// module-level helpers (prefetchApi / invalidateCacheEntry) reach for it
// through this accessor, which is set by <Providers /> on mount.
let _queryClient: import("@tanstack/react-query").QueryClient | null = null;
export function _registerQueryClient(qc: import("@tanstack/react-query").QueryClient) {
  _queryClient = qc;
}
function getQueryClient() {
  return _queryClient;
}

/**
 * POST/PATCH/DELETE helper. Returns { ok, data, error }.
 *
 * On success it invalidates only the channel(s) that own the mutation URL
 * (derived via `channelsForUrl`), so a reaction refetches only feed — not
 * synergy, idealab, articles, etc. Pass `{ invalidate: ["feed","synergy"] }`
 * to broaden scope, or `{ invalidate: ["*"] }` for a global refetch.
 */
export function useMutate() {
  const queryClient = useQueryClient();

  return async <T = unknown>(
    url: string,
    opts: {
      method?: "POST" | "PATCH" | "DELETE";
      body?: unknown;
      /** Override which channels get dirtied. Defaults to the URL's channels. */
      invalidate?: InvalidationChannel[];
      /** Legacy: wildcard bump (refetch everything). Default false. */
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
      // Scoped invalidation: invalidate the channel prefix(es) so only queries
      // in those families refetch. Each channel is a query-key root.
      const channels: InvalidationChannel[] = opts.bumpAll
        ? ["*"]
        : (opts.invalidate ?? channelsForUrl(url));
      if (channels.includes("*")) {
        void queryClient.invalidateQueries();
      } else {
        // Invalidate every channel in one call; RQ batches the refetches.
        void Promise.all(
          channels.map((c) => queryClient.invalidateQueries({ queryKey: [c] }))
        );
      }
      return { ok: true, data: json as T };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Network error";
      toast.error(msg);
      return { ok: false, error: msg };
    }
  };
}
