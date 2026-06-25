"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { channelsForUrl, type InvalidationChannel } from "@/lib/preship-store";
import type { Comment, FeedPost, ReactionKind, SynergyOffer, SynergyRequest } from "@/lib/preship-types";

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

// --- Optimistic feed cache ----------------------------------------------
//
// The instant-feel UI: reactions and new posts update the React Query feed
// cache DIRECTLY via setQueriesData, and NEVER invalidate/refetch on the hot
// path. This is what makes a like flip and a new post appear in the same frame
// the user clicks — no round trip, no spinner. The background worker writes
// the truth; the cache converges to it on the next natural refetch (sort
// switch, navigation, manual refresh, or staleTime 5min expiry).
//
// `setQueriesData({ queryKey: ["feed"] })` patches EVERY feed query at once
// (both ?sort=newest and ?sort=trending caches), so a reaction shows in either
// tab the user has visited. Updaters are pure and defensive: a malformed cache
// entry is passed through untouched.

type FeedCache = { posts: FeedPost[] };

/** Build a new cache object by mapping posts, returning the original object
 *  reference when no post changed (so RQ skips a re-render for unaffected
 *  queries). */
function mapFeedPosts(
  cache: FeedCache | undefined,
  fn: (p: FeedPost) => FeedPost
): FeedCache | undefined {
  if (!cache || !Array.isArray(cache.posts)) return cache;
  let changed = false;
  const next = cache.posts.map((p) => {
    const np = fn(p);
    if (np !== p) changed = true;
    return np;
  });
  return changed ? { posts: next } : cache;
}

/** Patch a single post's reaction count + myReaction to the desired state.
 *  Used by FeedPost.react() to flip the UI instantly. Pure + idempotent. */
export function applyReactionOptimistic(
  qc: QueryClient,
  postId: string,
  kind: ReactionKind,
  desired: boolean
): void {
  qc.setQueriesData<FeedCache>({ queryKey: ["feed"] }, (cache) =>
    mapFeedPosts(cache, (p) => {
      if (p.id !== postId) return p;
      const has = p.myReaction.includes(kind);
      // No-op if already in the desired state (idempotent).
      if (desired === has) return p;
      const delta = desired ? 1 : -1;
      const counts = { ...p._count.reactions, [kind]: Math.max(0, p._count.reactions[kind] + delta) };
      const myReaction = desired
        ? Array.from(new Set([...p.myReaction, kind]))
        : p.myReaction.filter((k) => k !== kind);
      return { ...p, _count: { ...p._count, reactions: counts }, myReaction };
    })
  );
}

/** Insert a provisional post at the top of every feed cache. Used by
 *  PostComposer so a freshly shipped post appears instantly; reconcilePost()
 *  later swaps the temp id for the real one returned by the sync create. */
export function prependPostOptimistic(qc: QueryClient, post: FeedPost): void {
  qc.setQueriesData<FeedCache>({ queryKey: ["feed"] }, (cache) => {
    if (!cache || !Array.isArray(cache.posts)) return cache;
    // Avoid dupes if the same provisional post is prepended twice.
    if (cache.posts.some((p) => p.id === post.id)) return cache;
    return { posts: [post, ...cache.posts] };
  });
}

/** Replace a provisional post (by id) with the real one returned by the API.
 *  Position-preserving. Used by PostComposer after POST /api/posts resolves. */
export function reconcilePost(qc: QueryClient, tempId: string, real: FeedPost): void {
  qc.setQueriesData<FeedCache>({ queryKey: ["feed"] }, (cache) => {
    if (!cache || !Array.isArray(cache.posts)) return cache;
    let found = false;
    const posts = cache.posts.map((p) => {
      if (p.id !== tempId) return p;
      found = true;
      return real;
    });
    return found ? { posts } : cache;
  });
}

/** Remove a post from every feed cache (e.g. after a delete). */
export function removePostOptimistic(qc: QueryClient, postId: string): void {
  qc.setQueriesData<FeedCache>({ queryKey: ["feed"] }, (cache) => {
    if (!cache || !Array.isArray(cache.posts)) return cache;
    const next = cache.posts.filter((p) => p.id !== postId);
    return next.length === cache.posts.length ? cache : { posts: next };
  });
}

/** Hook: returns the active query client (for the bound updaters above) so
 *  components don't each call useQueryClient + the helper. */
export function useFeedCache() {
  const qc = useQueryClient();
  return {
    react: (postId: string, kind: ReactionKind, desired: boolean) =>
      applyReactionOptimistic(qc, postId, kind, desired),
    prepend: (post: FeedPost) => prependPostOptimistic(qc, post),
    reconcile: (tempId: string, real: FeedPost) => reconcilePost(qc, tempId, real),
    remove: (postId: string) => removePostOptimistic(qc, postId),
  };
}

// --- Optimistic follow cache --------------------------------------------
//
// Follow state is a single boolean per founder, cached under the
// "api" channel (GET /api/follows?founderId=<id> maps to no named channel, so
// it falls back to the "api" prefix per channelsForUrl). We patch it directly
// by query-key match so the toggle is instant; the PATCH POST stays
// synchronous (one cheap row, not a pool-pressure hot path).

/** Set the cached follow status for a founder to `following` instantly. */
export function setFollowOptimistic(
  qc: QueryClient,
  founderId: string,
  following: boolean
): void {
  // The follow query key is ["follows", "/api/follows?founderId=<id>"] — the
  // channel root comes from channelsForUrl("/api/follows") = ["follows"], NOT
  // "api". (Searching ["api"] is the bug that made optimistic follows silently
  // no-op.) We find the matching cached entry by URL substring and set it
  // directly. Done per-key (getQueriesData + setQueryData) rather than via
  // setQueriesData's updater because the installed React Query types the
  // updater as a single-arg fn, which can't read the query key it's patching.
  const matches = qc.getQueriesData<{ following: boolean }>({ queryKey: ["follows"] });
  for (const [key] of matches) {
    const url = Array.isArray(key) ? String(key[1] ?? "") : "";
    if (url.includes(`/api/follows`) && url.includes(`founderId=${founderId}`)) {
      qc.setQueryData(key, { following });
    }
  }
}

// --- Optimistic comment cache -------------------------------------------
//
// Comments for a post are cached under the "feed" channel (because
// channelsForUrl("/api/posts/...") = ["feed"]) at /api/posts/<id>/comment.
// We prepend a provisional comment, then reconcile temp→real when the sync
// POST resolves — same shape as new posts.

type CommentsCache = { comments: Comment[] };

/** Apply a pure updater to every cached comment thread for one post.
 *  getQueriesData + setQueryData per-key because the installed React Query
 *  types the setQueriesData updater as single-arg (can't read its own key). */
function updateCommentCache(
  qc: QueryClient,
  postId: string,
  fn: (c: CommentsCache) => CommentsCache
): void {
  // Channel root is "feed" (NOT "api") — channelsForUrl maps /api/posts/* to
  // the feed family. The URL-substring filter below narrows to just this post's
  // comment thread, so matching the whole feed family is fine.
  const matches = qc.getQueriesData<CommentsCache>({ queryKey: ["feed"] });
  for (const [key, cache] of matches) {
    const url = Array.isArray(key) ? String(key[1] ?? "") : "";
    if (!url.includes(`/api/posts/${postId}/comment`)) continue;
    if (!cache || !Array.isArray(cache.comments)) continue;
    const next = fn(cache);
    if (next !== cache) qc.setQueryData(key, next);
  }
}

/** Prepend a provisional comment to the cached thread for a post. */
export function prependCommentOptimistic(
  qc: QueryClient,
  postId: string,
  comment: Comment
): void {
  updateCommentCache(qc, postId, (cache) => {
    if (cache.comments.some((c) => c.id === comment.id)) return cache;
    return { comments: [...cache.comments, comment] };
  });
}

/** Swap a provisional comment (by id) for the real one. */
export function reconcileComment(
  qc: QueryClient,
  postId: string,
  tempId: string,
  real: Comment
): void {
  updateCommentCache(qc, postId, (cache) => {
    let found = false;
    const comments = cache.comments.map((c) => {
      if (c.id !== tempId) return c;
      found = true;
      return real;
    });
    return found ? { comments } : cache;
  });
}

/** Remove a comment from the cached thread (e.g. after delete, or rollback). */
export function removeCommentOptimistic(
  qc: QueryClient,
  postId: string,
  commentId: string
): void {
  updateCommentCache(qc, postId, (cache) => {
    const next = cache.comments.filter((c) => c.id !== commentId);
    return next.length === cache.comments.length ? cache : { comments: next };
  });
}

// --- Optimistic synergy cache -------------------------------------------
//
// Two caches matter for synergy:
//   1. The request LIST ("synergy" channel, /api/synergy?...) — carries each
//      request's `_count.offers` and `myOffer`. We patch these so the card's
//      handshake count + "you offered" badge update instantly on submit.
//   2. The per-request offer LIST ("synergy" channel, /api/synergy/<id>/offers)
//      — we prepend the new offer, and patch statuses on accept/decline.

type SynergyListCache = { requests: SynergyRequest[] };
type SynergyOffersCache = { offers: SynergyOffer[] };

/** Patch every synergy list entry for one request via a pure updater. */
function mapSynergyRequests(
  cache: SynergyListCache | undefined,
  requestId: string,
  fn: (r: SynergyRequest) => SynergyRequest
): SynergyListCache | undefined {
  if (!cache || !Array.isArray(cache.requests)) return cache;
  let changed = false;
  const next = cache.requests.map((r) => {
    if (r.id !== requestId) return r;
    const nr = fn(r);
    if (nr !== r) changed = true;
    return nr;
  });
  return changed ? { requests: next } : cache;
}

/** After submitting an offer: bump the request's offer count + set myOffer,
 *  across every cached synergy list. */
export function applySynergyOfferSubmitted(
  qc: QueryClient,
  requestId: string,
  myOffer: SynergyOffer
): void {
  qc.setQueriesData<SynergyListCache>({ queryKey: ["synergy"] }, (cache) =>
    mapSynergyRequests(cache, requestId, (r) => ({
      ...r,
      _count: { ...r._count, offers: r._count.offers + 1 },
      myOffer,
    }))
  );
}

/** Apply a pure updater to every cached offer list for one request. Same
 *  per-key approach as updateCommentCache (React Query updater is single-arg). */
function updateSynergyOfferCache(
  qc: QueryClient,
  requestId: string,
  fn: (c: SynergyOffersCache) => SynergyOffersCache
): void {
  const matches = qc.getQueriesData<SynergyOffersCache>({ queryKey: ["synergy"] });
  for (const [key, cache] of matches) {
    const url = Array.isArray(key) ? String(key[1] ?? "") : "";
    if (!url.includes(`/api/synergy/${requestId}/offers`)) continue;
    if (!cache || !Array.isArray(cache.offers)) continue;
    const next = fn(cache);
    if (next !== cache) qc.setQueryData(key, next);
  }
}

/** Prepend a provisional offer to the cached per-request offer list. */
export function prependSynergyOffer(
  qc: QueryClient,
  requestId: string,
  offer: SynergyOffer
): void {
  updateSynergyOfferCache(qc, requestId, (cache) => {
    if (cache.offers.some((o) => o.id === offer.id)) return cache;
    return { offers: [...cache.offers, offer] };
  });
}

/** Patch one offer's status in the cached per-request offer list (used by
 *  accept/decline so the pill flips without a refetch). Note: the atomic
 *  server transaction also declines siblings + sets the request to "matched";
 *  that multi-row change is NOT replicated here, so the list still reconciles
 *  fully on the next natural refetch. This just kills the immediate flicker. */
export function patchSynergyOfferStatus(
  qc: QueryClient,
  requestId: string,
  offerId: string,
  status: SynergyOffer["status"]
): void {
  updateSynergyOfferCache(qc, requestId, (cache) => {
    let changed = false;
    const offers = cache.offers.map((o) => {
      if (o.id !== offerId) return o;
      changed = true;
      return { ...o, status };
    });
    return changed ? { offers } : cache;
  });
}

/** Remove an offer from the cached per-request offer list (withdraw). */
export function removeSynergyOffer(
  qc: QueryClient,
  requestId: string,
  offerId: string
): void {
  updateSynergyOfferCache(qc, requestId, (cache) => {
    const next = cache.offers.filter((o) => o.id !== offerId);
    return next.length === cache.offers.length ? cache : { offers: next };
  });
}

/** Convenience hooks binding the updaters above to the active query client,
 *  so components don't each call useQueryClient. */
export function useFollowCache() {
  const qc = useQueryClient();
  return {
    set: (founderId: string, following: boolean) =>
      setFollowOptimistic(qc, founderId, following),
  };
}

export function useCommentCache() {
  const qc = useQueryClient();
  return {
    prepend: (postId: string, comment: Comment) =>
      prependCommentOptimistic(qc, postId, comment),
    reconcile: (postId: string, tempId: string, real: Comment) =>
      reconcileComment(qc, postId, tempId, real),
    remove: (postId: string, commentId: string) =>
      removeCommentOptimistic(qc, postId, commentId),
  };
}

export function useSynergyCache(requestId: string) {
  const qc = useQueryClient();
  return {
    offerSubmitted: (myOffer: SynergyOffer) =>
      applySynergyOfferSubmitted(qc, requestId, myOffer),
    prependOffer: (offer: SynergyOffer) => prependSynergyOffer(qc, requestId, offer),
    patchOfferStatus: (offerId: string, status: SynergyOffer["status"]) =>
      patchSynergyOfferStatus(qc, requestId, offerId, status),
    removeOffer: (offerId: string) => removeSynergyOffer(qc, requestId, offerId),
  };
}
