"use client";

import { cn } from "@/lib/utils";
import { usePreship, type PreshipView } from "@/lib/preship-store";
import { Logo } from "./logo";
import { FounderAvatar } from "./avatars";
import { useApi } from "@/lib/use-api";
import type { Founder, Project } from "@/lib/preship-types";
import {
  Radio,
  Zap,
  Mic,
  Boxes,
  Search,
  BookOpen,
  Settings,
  X,
} from "lucide-react";

const NAV: { id: PreshipView; label: string; code: string; icon: typeof Radio }[] = [
  { id: "war-room", label: "War Room", code: "WR", icon: Radio },
  { id: "synergy", label: "Synergy", code: "SY", icon: Zap },
  { id: "idealab", label: "IdeaLab", code: "IL", icon: Mic },
  { id: "projects", label: "Projects", code: "PR", icon: Boxes },
];

const SECONDARY = [
  { label: "Search", code: "SE", icon: Search },
  { label: "Field Notes", code: "FN", icon: BookOpen },
  { label: "Settings", code: "ST", icon: Settings },
];

export function Sidebar() {
  const view = usePreship((s) => s.view);
  const setView = usePreship((s) => s.setView);
  const mobileNavOpen = usePreship((s) => s.mobileNavOpen);
  const setMobileNavOpen = usePreship((s) => s.setMobileNavOpen);

  const { data: meData } = useApi<{ user: Founder; projects: Project[] }>("/api/me");

  return (
    <>
      {/* mobile overlay */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#0E1909]/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-[#0E1909]/10 bg-white transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          mobileNavOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between px-5 pt-5">
          <Logo />
          <button
            className="rounded p-1 text-[#0E1909]/50 hover:bg-[#0E1909]/5 lg:hidden"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="mt-6 flex-1 px-3">
          <p className="mb-2 px-2 font-mono text-[10px] font-semibold uppercase tracking-widest text-[#0E1909]/40">
            Workspace
          </p>
          <ul className="space-y-0.5">
            {NAV.map((item) => {
              const active = view === item.id;
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => setView(item.id)}
                    className={cn(
                      "group flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left transition",
                      active
                        ? "bg-[#0E1909] text-[#DAFF01]"
                        : "text-[#0E1909] hover:bg-[#f4ffd6]"
                    )}
                  >
                    <Icon size={16} className={active ? "text-[#DAFF01]" : "text-[#0E1909]/70"} />
                    <span className="flex-1 font-display text-sm font-medium">{item.label}</span>
                    <span
                      className={cn(
                        "font-mono text-[9px] font-bold uppercase tracking-widest",
                        active ? "text-[#DAFF01]/60" : "text-[#0E1909]/30"
                      )}
                    >
                      {item.code}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <p className="mb-2 mt-6 px-2 font-mono text-[10px] font-semibold uppercase tracking-widest text-[#0E1909]/40">
            Browse
          </p>
          <ul className="space-y-0.5">
            {SECONDARY.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.label}>
                  <button className="group flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left text-[#0E1909]/70 transition hover:bg-[#f4ffd6] hover:text-[#0E1909]">
                    <Icon size={16} className="text-[#0E1909]/50" />
                    <span className="flex-1 font-display text-sm font-medium">{item.label}</span>
                    <span className="font-mono text-[9px] uppercase tracking-widest text-[#0E1909]/25">
                      {item.code}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* current founder card */}
        {meData?.user && (
          <div className="m-3 rounded-lg border border-[#0E1909]/12 bg-[#f8f9f3] p-3">
            <div className="flex items-center gap-2.5">
              <FounderAvatar founder={meData.user} size={36} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-sm font-semibold text-[#0E1909]">
                  {meData.user.name}
                </p>
                <p className="truncate font-mono text-[10px] text-[#0E1909]/55">
                  @{meData.user.handle}
                </p>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-[#0E1909]/10 pt-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#0E1909]/50">
                {meData.projects.length} project{meData.projects.length === 1 ? "" : "s"}
              </span>
              <button
                onClick={() => setView("projects")}
                className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#0E1909] transition hover:text-[#6f8a3e]"
              >
                manage →
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
