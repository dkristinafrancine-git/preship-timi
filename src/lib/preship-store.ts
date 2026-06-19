"use client";

import { create } from "zustand";
import type { Founder } from "@/lib/preship-types";

export type PreshipView = "war-room" | "synergy" | "idealab" | "projects";

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
}));
