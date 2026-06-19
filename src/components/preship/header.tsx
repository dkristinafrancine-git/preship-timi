"use client";

import { cn } from "@/lib/utils";
import { usePreship, type PreshipView } from "@/lib/preship-store";
import { Button } from "@/components/ui/button";
import { Menu, Bell, HelpCircle } from "lucide-react";
import { useApi } from "@/lib/use-api";
import type { FeedPost, SynergyRequest, IdeaLabSession } from "@/lib/preship-types";
import { useMemo } from "react";
import { Logo } from "./logo";

export function Header() {
  const view = usePreship((s) => s.view);
  const setMobileNavOpen = usePreship((s) => s.setMobileNavOpen);

  return (
    <header className="sticky top-0 z-40 border-b border-[#0E1909]/10 bg-white/95 backdrop-blur">
      {/* main bar: logo left, auth right — full width, max-width constrained inner */}
      <div className="mx-auto flex h-16 max-w-[1320px] items-center gap-3 px-5 lg:px-8">
        <button
          className="rounded-md p-1.5 text-[#0E1909] hover:bg-[#0E1909]/5 lg:hidden"
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>

        <Logo />

        <div className="ml-auto flex items-center gap-2.5">
          <Button
            variant="ghost"
            size="sm"
            className="tactile-flat hidden font-mono text-xs uppercase tracking-widest text-[#0E1909]/65 hover:bg-[#0E1909]/5 hover:text-[#0E1909] md:inline-flex"
          >
            <HelpCircle size={15} className="transition-transform duration-150 hover:scale-110" /> Docs
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="tactile-flat relative hidden font-mono text-xs uppercase tracking-widest text-[#0E1909]/65 hover:bg-[#0E1909]/5 hover:text-[#0E1909] md:inline-flex"
          >
            <Bell size={15} className="transition-transform duration-150 hover:scale-110" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#DAFF01] ring-1 ring-[#0E1909]" />
          </Button>
          <Button
            size="sm"
            className="cta-ink hidden border border-[#0E1909] bg-[#0E1909] font-mono text-xs font-semibold uppercase tracking-widest text-white hover:bg-[#0E1909]/90 sm:inline-flex"
          >
            Log in
          </Button>
          <Button
            size="sm"
            className="cta-lime bg-[#DAFF01] font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909] hover:bg-[#c4e600]"
          >
            Invite founder →
          </Button>
        </div>
      </div>

      <LiveTicker view={view} />
    </header>
  );
}

/** Live ticker that shows the latest signals across the network. */
function LiveTicker({ view }: { view: PreshipView }) {
  const feed = useApi<{ posts: FeedPost[] }>("/api/feed?sort=newest");
  const synergy = useApi<{ requests: SynergyRequest[] }>("/api/synergy?status=open");
  const idealab = useApi<{ sessions: IdeaLabSession[] }>("/api/idealab?status=live");

  const items = useMemo(() => {
    const out: string[] = [];
    if (view === "war-room" && feed.data?.posts?.length) {
      feed.data.posts.slice(0, 5).forEach((p) => {
        out.push(`@${p.author.handle} posted in ${p.project?.name ?? "general"}`);
      });
    } else if (view === "synergy" && synergy.data?.requests?.length) {
      synergy.data.requests.slice(0, 5).forEach((s) => {
        out.push(`@${s.founder.handle} broadcast: ${s.title}`);
      });
    } else if (view === "idealab") {
      if (idealab.data?.sessions?.length) {
        idealab.data.sessions.forEach((s) => out.push(`LIVE: ${s.title}`));
      }
      out.push("3 sessions scheduled this week");
    }
    if (out.length === 0) {
      out.push("Preship · alpha founders shipping in the dark");
      out.push("Broadcast a bottleneck → get a handshake");
      out.push("IdeaLab rooms open 24/7 for invite-only ideation");
    }
    return [...out, ...out];
  }, [view, feed.data, synergy.data, idealab.data]);

  return (
    <div className="flex items-center gap-2 border-t border-[#0E1909]/8 bg-[#0E1909] px-4 py-1.5 lg:px-6">
      <span className="flex shrink-0 items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-widest text-[#DAFF01]">
        <span className="h-1.5 w-1.5 animate-blink rounded-full bg-[#DAFF01]" /> live
      </span>
      <div className="relative flex-1 overflow-hidden">
        <div className={cn("flex whitespace-nowrap font-mono text-xs text-[#DAFF01]/80", "animate-ticker")}>
          {items.map((it, i) => (
            <span key={i} className="mx-4 inline-flex items-center gap-2">
              <span className="text-[#DAFF01]/40">›</span>
              {it}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
