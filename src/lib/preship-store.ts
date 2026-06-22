"use client";

import { create } from "zustand";
import type { Founder } from "@/lib/preship-types";

export type PreshipView = "war-room" | "synergy" | "idealab" | "projects" | "profile" | "search" | "brain-dump" | "settings" | "docs";

/** A deep-link target — clicking a ticker item can set these to navigate
 *  the user to the relevant view + open a detail. */
interface DeepLink {
  view: PreshipView;
  postId?: string;
  synergyId?: string;
  sessionId?: string;
  founderId?: string;
  articleId?: string;
}

/**
 * Invalidation channels. `useMutate(url)` derives the channel(s) that own
 * `url` and invalidates the matching React Query query-key prefix, so a
 * mutation only refetches the endpoints it actually affected — not every
 * query on screen.
 *
 * The special channel `"*"` is a wildcard: invalidating it refetches every
 * active query (used for global state changes like login/logout). URLs that
 * don't match any family fall back to the "api" prefix, so they're still
 * isolated from the named channels.
 */
export type InvalidationChannel =
  | "*"
  | "feed"
  | "synergy"
  | "idealab"
  | "projects"
  | "articles"
  | "me"
  | "notifications"
  | "follows"
  | "founders"
  | "search";

/** Map a request URL to the channel(s) a mutation against it should dirty. */
export function channelsForUrl(url: string): InvalidationChannel[] {
  // Strip query string for matching; channels are about the resource, not params.
  const path = url.split("?")[0];
  if (path.startsWith("/api/posts") || path.startsWith("/api/feed")) return ["feed"];
  if (path.startsWith("/api/synergy") || path.startsWith("/api/bounties")) return ["synergy"];
  if (path.startsWith("/api/idealab")) return ["idealab"];
  if (path.startsWith("/api/projects")) return ["projects"];
  if (path.startsWith("/api/articles")) return ["articles"];
  if (path.startsWith("/api/notifications")) return ["notifications"];
  if (path.startsWith("/api/follows") || path.startsWith("/api/me/follows")) return ["follows", "founders"];
  if (path.startsWith("/api/me")) return ["me"];
  if (path.startsWith("/api/founders")) return ["founders"];
  if (path.startsWith("/api/search")) return ["search"];
  return [];
}

interface PreshipStore {
  view: PreshipView;
  setView: (v: PreshipView) => void;
  me: Founder | null;
  setMe: (m: Founder | null) => void;
  /** Invalidate every active query. Backed by React Query once the client is
   *  registered via `_registerInvalidator` (see <Providers />). Used by
   *  auth flows (login/logout/signup/onboarding) for a global refetch. */
  bump: () => void;
  // mobile sidebar open
  mobileNavOpen: boolean;
  setMobileNavOpen: (v: boolean) => void;
  // deep-link navigation (from ticker clicks)
  deepLink: DeepLink | null;
  navigate: (d: DeepLink) => void;
  clearDeepLink: () => void;
}

// Registered by <Providers /> so the store can trigger a React Query global
// invalidation without importing the query client directly (avoids a circular
// module dependency: use-api imports from preship-store).
let _invalidateAll: (() => void) | null = null;
export function _registerInvalidator(fn: () => void) {
  _invalidateAll = fn;
}

export const usePreship = create<PreshipStore>((set) => ({
  view: "war-room",
  setView: (v) => set({ view: v, mobileNavOpen: false }),
  me: null,
  setMe: (m) => set({ me: m }),
  bump: () => {
    if (_invalidateAll) _invalidateAll();
  },
  mobileNavOpen: false,
  setMobileNavOpen: (v) => set({ mobileNavOpen: v }),
  deepLink: null,
  navigate: (d) => set({ view: d.view, deepLink: d, mobileNavOpen: false }),
  clearDeepLink: () => set({ deepLink: null }),
}));
