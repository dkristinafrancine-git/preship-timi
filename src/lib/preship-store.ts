"use client";

import { create } from "zustand";
import type { Founder } from "@/lib/preship-types";

export type PreshipView = "war-room" | "synergy" | "idealab" | "projects" | "profile";

/** A deep-link target — clicking a ticker item can set these to navigate
 *  the user to the relevant view + open a detail. */
interface DeepLink {
  view: PreshipView;
  postId?: string;
  synergyId?: string;
  sessionId?: string;
  founderId?: string;
}

interface PreshipStore {
  view: PreshipView;
  setView: (v: PreshipView) => void;
  me: Founder | null;
  setMe: (m: Founder | null) => void;
  // bump triggers a refetch in any useApi consumer
  tick: number;
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
  tick: 0,
  bump: () => set((s) => ({ tick: s.tick + 1 })),
  mobileNavOpen: false,
  setMobileNavOpen: (v) => set({ mobileNavOpen: v }),
  deepLink: null,
  navigate: (d) => set({ view: d.view, deepLink: d, mobileNavOpen: false }),
  clearDeepLink: () => set({ deepLink: null }),
}));
