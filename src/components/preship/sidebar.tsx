"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { usePreship, type PreshipView } from "@/lib/preship-store";
import { IpSupportDialog } from "./ip-support-dialog";
import {
  Radio,
  Zap,
  Mic,
  Boxes,
  Search,
  PenLine,
  Settings,
  User,
  BookText,
  Scale,
  X,
} from "lucide-react";

const NAV: { id: PreshipView; label: string; code: string; icon: typeof Radio }[] = [
  { id: "war-room", label: "War Room", code: "WR", icon: Radio },
  { id: "synergy", label: "Synergy", code: "SY", icon: Zap },
  { id: "idealab", label: "IdeaLab", code: "IL", icon: Mic },
  { id: "projects", label: "Projects", code: "PR", icon: Boxes },
  { id: "brain-dump", label: "Brain Dump", code: "BD", icon: PenLine },
  { id: "profile", label: "Profile", code: "PF", icon: User },
];

const SECONDARY: { id: PreshipView; label: string; code: string; icon: typeof Radio }[] = [
  { id: "search", label: "Search", code: "SE", icon: Search },
  { id: "docs", label: "Docs", code: "DC", icon: BookText },
  { id: "settings", label: "Settings", code: "ST", icon: Settings },
];

/**
 * Left navigation rail.
 *
 * `mode="app"` (default) is the in-app workspace: nav items switch the active
 * view via `setView`, and the current-founder card is shown at the bottom.
 *
 * `mode="landing"` is used on the public landing page: there's no logged-in
 * founder, no founder card, and every nav item routes to /login instead of
 * switching views (the destination is behind auth).
 */
export function Sidebar({ mode = "app" }: { mode?: "app" | "landing" }) {
  const isLanding = mode === "landing";
  const view = usePreship((s) => s.view);
  const setView = usePreship((s) => s.setView);
  const setMobileNavOpen = usePreship((s) => s.setMobileNavOpen);
  const mobileNavOpen = usePreship((s) => s.mobileNavOpen);
  const router = useRouter();
  const [ipOpen, setIpOpen] = useState(false);

  const goLogin = () => {
    router.push("/login?callbackUrl=/app");
    setMobileNavOpen(false);
  };

  // Shared click handler — in-app switches view; on landing, route to login.
  const onNav = (id: PreshipView) => (isLanding ? goLogin() : setView(id));

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
          // mobile: fixed drawer; lg+: sticky grid cell, scrolls under header
          "fixed inset-y-0 left-0 z-50 flex w-[220px] flex-col border-r border-[#0E1909]/10 bg-white transition-transform lg:sticky lg:top-[96px] lg:z-auto lg:h-[calc(100vh-96px)] lg:translate-x-0 lg:overflow-y-auto lg:pb-8 scroll-thin",
          mobileNavOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* mobile close row (logo lives in global header on desktop) */}
        <div className="flex items-center justify-between px-5 pt-5 lg:hidden">
          <span className="font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/50">
            navigate
          </span>
          <button
            className="rounded p-1 text-[#0E1909]/50 hover:bg-[#0E1909]/5 lg:hidden"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="mt-3 flex-1 px-4 lg:mt-6">
          <p className="mb-2.5 px-2 font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/45">
            Workspace
          </p>
          <ul className="space-y-1">
            {NAV.map((item) => {
              const active = view === item.id;
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => onNav(item.id)}
                    className={cn(
                      "tactile-flat group flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left",
                      active
                        ? "bg-[#0E1909] text-[#DAFF01] shadow-[0_2px_8px_rgba(14,25,9,0.12)]"
                        : "text-[#0E1909] hover:bg-[#f4ffd6]"
                    )}
                  >
                    <Icon size={24} className={cn("transition-transform duration-150", active ? "text-[#DAFF01]" : "text-[#0E1909]/70 group-hover:scale-110")} />
                    <span className="flex-1 font-display text-[15px] font-medium">{item.label}</span>
                    <span
                      className={cn(
                        "font-mono text-xs font-bold uppercase tracking-widest",
                        active ? "text-[#DAFF01]/60" : "text-[#0E1909]/35"
                      )}
                    >
                      {item.code}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <p className="mb-2.5 mt-7 px-2 font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/45">
            Browse
          </p>
          <ul className="space-y-1">
            {SECONDARY.map((item) => {
              const active = view === item.id;
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => onNav(item.id)}
                    className={cn(
                      "tactile-flat group flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition",
                      active
                        ? "bg-[#0E1909] text-[#DAFF01] shadow-[0_2px_8px_rgba(14,25,9,0.12)]"
                        : "text-[#0E1909]/70 hover:bg-[#f4ffd6] hover:text-[#0E1909]"
                    )}
                  >
                    <Icon size={24} className={active ? "text-[#DAFF01]" : "text-[#0E1909]/50 transition-transform duration-150 group-hover:scale-110"} />
                    <span className="flex-1 font-display text-[15px] font-medium">{item.label}</span>
                    <span className={cn("font-mono text-xs uppercase tracking-widest", active ? "text-[#DAFF01]/60" : "text-[#0E1909]/30")}>
                      {item.code}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* IP support CTA — shown on both the authed app and the landing replica.
            Opens the Trademark / Copyright / Patent intake form. */}
        <button
          onClick={() => setIpOpen(true)}
          className="m-4 block rounded-lg border border-[#0E1909]/12 bg-[#f8f9f3] p-3.5 text-left transition-all duration-200 hover:border-[#0E1909]/25 hover:shadow-[0_4px_12px_rgba(14,25,9,0.06)]"
        >
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#0E1909] text-[#DAFF01]">
              <Scale size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-[14px] font-semibold leading-tight text-[#0E1909]">
                Trademark · Copyright · Patent
              </p>
              <p className="mt-1 font-mono text-[11px] leading-snug text-[#0E1909]/55">
                Protect what you're building
              </p>
            </div>
          </div>
          <div className="mt-2.5 flex items-center justify-between border-t border-[#0E1909]/10 pt-2.5">
            <span className="font-mono text-[10px] uppercase tracking-widest text-[#0E1909]/40">
              ip support
            </span>
            <span className="font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909] hover:text-[#6f8a3e]">
              get help →
            </span>
          </div>
        </button>

        <IpSupportDialog open={ipOpen} onOpenChange={setIpOpen} />
      </aside>
    </>
  );
}
