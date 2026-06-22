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
 * Invalidation channels. Each channel is a monotonic counter; `useApi(url)`
 * subscribes to the channel(s) that own `url` (see `channelForUrl`) so that a
 * mutation only refetches the endpoints it actually affected — not every
 * `useApi` consumer on screen.
 *
 * The special channel `"*"` is a wildcard: bumping it refetches everything
 * (used only for global state changes like login/logout). Adding new channels
 * here is optional — unknown URLs fall back to their own per-URL channel, so
 * mutations are scoped even for endpoints not listed below.
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
  /** Per-channel monotonic counters. `useApi` subscribes to the ones that
   *  match its URL; a mutation bumps only the affected channels. */
  invalidations: Record<string, number>;
  /** Bump one or more channels (scoped refetch). Pass ["*"] to refetch all. */
  invalidate: (channels: InvalidationChannel[]) => void;
  /** Legacy alias kept for callers that still invoke `bump()` directly.
   *  Equivalent to a wildcard invalidate. Prefer `invalidate([...])`. */
  bump: () => void;
  // mobile sidebar open
  mobileNavOpen: boolean;
  setMobileNavOpen: (v: boolean) => void;
  // deep-link navigation (from ticker clicks)
  deepLink: DeepLink | null;
  navigate: (d: DeepLink) => void;
  clearDeepLink: () => void;
}

export const usePreship = create<PreshipStore>((set) => ({
  view: "war-room",
  setView: (v) => set({ view: v, mobileNavOpen: false }),
  me: null,
  setMe: (m) => set({ me: m }),
  invalidations: {},
  invalidate: (channels) =>
    set((s) => {
      const next = { ...s.invalidations };
      // Wildcard bumps every known channel so every consumer refetches.
      const targets = channels.includes("*")
        ? (Object.keys(next).length
            ? Object.keys(next)
            : ([
                "feed",
                "synergy",
                "idealab",
                "projects",
                "articles",
                "me",
                "notifications",
                "follows",
                "founders",
                "search",
              ] as string[]))
        : channels;
      for (const c of targets) next[c] = (next[c] ?? 0) + 1;
      return { invalidations: next };
    }),
  // Legacy: callers that previously did `bump()` get a wildcard refetch so
  // behavior is unchanged for code we haven't migrated to scoped channels.
  bump: () => set((s) => {
    const next = { ...s.invalidations };
    const all = [
      "feed", "synergy", "idealab", "projects", "articles",
      "me", "notifications", "follows", "founders", "search",
    ];
    for (const c of all) next[c] = (next[c] ?? 0) + 1;
    return { invalidations: next };
  }),
  mobileNavOpen: false,
  setMobileNavOpen: (v) => set({ mobileNavOpen: v }),
  deepLink: null,
  navigate: (d) => set({ view: d.view, deepLink: d, mobileNavOpen: false }),
  clearDeepLink: () => set({ deepLink: null }),
}));
