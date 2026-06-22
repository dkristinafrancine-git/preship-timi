"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { usePreship } from "@/lib/preship-store";
import { Button } from "@/components/ui/button";
import { Menu, HelpCircle } from "lucide-react";
import { useApi } from "@/lib/use-api";
import type { TickerEntry } from "@/app/api/ticker/route";
import { useMemo } from "react";
import { Logo } from "./logo";
import { AuthButton } from "./auth/login-modal";
import { InviteFounderModal } from "./auth/invite-founder-modal";
import { NotificationBell } from "./notifications/notification-bell";

export function Header() {
  const setMobileNavOpen = usePreship((s) => s.setMobileNavOpen);
  const router = useRouter();
  const { status } = useSession();
  const [inviteOpen, setInviteOpen] = useState(false);

  // "Invite founder" opens the email-invite form when signed in; otherwise
  // it sends the visitor to /login (the invite action needs a sender).
  function onInviteClick() {
    if (status === "authenticated") {
      setInviteOpen(true);
    } else {
      router.push("/login?callbackUrl=/");
    }
  }

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
          <div className="hidden md:block">
            <NotificationBell />
          </div>
          <AuthButton onOpenLogin={() => router.push("/login")} />
          <Button
            size="sm"
            onClick={onInviteClick}
            className="cta-lime bg-[#DAFF01] font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909] hover:bg-[#c4e600]"
          >
            Invite founder →
          </Button>
        </div>
      </div>

      <LiveTicker />
      <InviteFounderModal open={inviteOpen} onOpenChange={setInviteOpen} />
    </header>
  );
}

/** Live ticker — clickable links that navigate back to the source item. */
type TickerItem = {
  key: string;
  label: string;
  kind: "post" | "synergy" | "session" | "static";
  onClick?: () => void;
};

function LiveTicker() {
  // One lightweight fetch (4 rows × 3 kinds, no relations/counts) replaces
  // the three full-list fetches this used to make. Cache-Control on the
  // endpoint means SPA navigations don't refetch it either.
  const { data } = useApi<{ entries: TickerEntry[] }>("/api/ticker");
  const navigate = usePreship((s) => s.navigate);

  const items = useMemo<TickerItem[]>(() => {
    const out: TickerItem[] = [];
    data?.entries?.forEach((e) => {
      const onClick = () => {
        if (e.kind === "post") navigate({ view: "war-room", postId: e.id });
        else if (e.kind === "synergy") navigate({ view: "synergy", synergyId: e.id });
        else if (e.kind === "session") navigate({ view: "idealab", sessionId: e.id });
      };
      out.push({ key: `${e.kind}-${e.id}`, label: e.label, kind: e.kind, onClick });
    });

    if (out.length === 0) {
      out.push(
        { key: "s1", label: "Preship · the alpha war room — collaborate in broad daylight", kind: "static" },
        { key: "s2", label: "Broadcast a bottleneck → get a handshake", kind: "static", onClick: () => navigate({ view: "synergy" }) },
        { key: "s3", label: "IdeaLab rooms open 24/7 for invite-only ideation", kind: "static", onClick: () => navigate({ view: "idealab" }) }
      );
    }
    return out;
  }, [data, navigate]);

  // duplicate for seamless marquee loop
  const looped = [...items, ...items];

  return (
    <div className="group flex items-center gap-2 border-t border-[#0E1909]/8 bg-[#0E1909] px-4 py-1.5 lg:px-6">
      <span className="flex shrink-0 items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-widest text-[#DAFF01]">
        <span className="h-1.5 w-1.5 animate-blink rounded-full bg-[#DAFF01]" /> live
      </span>
      <div className="relative flex-1 overflow-hidden">
        <div className="flex w-max whitespace-nowrap animate-ticker group-hover:[animation-play-state:paused]">
          {looped.map((it, i) => {
            const clickable = !!it.onClick;
            const Comp = clickable ? "button" : "span";
            return (
              <Comp
                key={`${it.key}-${i}`}
                onClick={it.onClick}
                className={cn(
                  "mx-4 inline-flex items-center gap-2 font-mono text-xs",
                  clickable
                    ? "text-[#DAFF01]/85 underline-offset-2 transition-colors hover:text-[#DAFF01] hover:underline"
                    : "text-[#DAFF01]/80"
                )}
              >
                <span className="text-[#DAFF01]/40">
                  {it.kind === "post" ? "✎" : it.kind === "synergy" ? "⚡" : it.kind === "session" ? "●" : "›"}
                </span>
                <span className="max-w-[420px] truncate">{it.label}</span>
                {clickable && <span className="text-[#DAFF01]/40">→</span>}
              </Comp>
            );
          })}
        </div>
      </div>
      <span className="hidden shrink-0 font-mono text-[10px] uppercase tracking-widest text-[#DAFF01]/40 lg:inline">
        hover to pause · click to open
      </span>
    </div>
  );
}
