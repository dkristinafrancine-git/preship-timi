"use client";

import { useState } from "react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { FounderAvatar } from "./avatars";
import { Tag, FoundingBadge } from "./badges";
import { useApi, useMutate } from "@/lib/use-api";
import type { Founder } from "@/lib/preship-types";
import { cn } from "@/lib/utils";
import { MapPin, Trophy, Boxes, UserPlus, UserCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

/**
 * Wraps a founder's name (or any trigger) so hovering reveals a helpful
 * popover: avatar, name, @handle, title, bio, location, skills, and counts.
 */
export function FounderHoverCard({
  founder,
  children,
  className,
  extraStats,
}: {
  founder: Pick<Founder, "id" | "name" | "handle" | "title" | "avatarUrl"> &
    Partial<Pick<Founder, "bio" | "location" | "skills" | "isFoundingMember">>;
  children: React.ReactNode;
  className?: string;
  extraStats?: { label: string; value: string | number; icon?: React.ReactNode }[];
}) {
  const skills = founder.skills
    ? founder.skills.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  // Defer the follow-status fetch until the card actually opens. This used to
  // fire on mount for EVERY founder name rendered (feed posts, rail, synergy
  // cards) — dozens of round-trips per screen. The dedup cache means repeated
  // opens of the same founder are instant; passing `null` until first open
  // skips the fetch entirely for cards the user never hovers.
  const [open, setOpen] = useState(false);
  const { data: followData } = useApi<{ following: boolean }>(
    open ? `/api/follows?founderId=${founder.id}` : null
  );
  const mutate = useMutate();
  const [busy, setBusy] = useState(false);
  const following = followData?.following ?? false;

  const toggleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setBusy(true);
    const res = await mutate("/api/follows", {
      method: "POST",
      body: { founderId: founder.id },
    });
    setBusy(false);
    if (res.ok) {
      const next = res.data as { following: boolean } | undefined;
      toast.success(next?.following ? "Following →" : "Unfollowed →");
    }
  };

  return (
    <HoverCard openDelay={250} closeDelay={150} open={open} onOpenChange={setOpen}>
      <HoverCardTrigger asChild>
        <span
          className={cn(
            "cursor-pointer underline-offset-2 hover:underline",
            className
          )}
        >
          {children}
        </span>
      </HoverCardTrigger>
      <HoverCardContent
        align="start"
        sideOffset={6}
        className="w-80 border-[#0E1909]/15 bg-white p-0 shadow-[0_8px_24px_rgba(14,25,9,0.12)]"
      >
        <div className="border-b border-[#0E1909]/8 bg-[#f8f9f3] px-4 py-3.5">
          <div className="flex items-center gap-3">
            <FounderAvatar founder={founder} size={48} />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 truncate font-display text-[15px] font-semibold text-[#0E1909]">
                <span className="truncate">{founder.name}</span>
                <FoundingBadge show={founder.isFoundingMember} />
              </p>
              <p className="truncate font-mono text-xs text-[#0E1909]/55">
                @{founder.handle}
              </p>
            </div>
            <button
              onClick={toggleFollow}
              disabled={busy}
              className={cn(
                "tactile-flat inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-2.5 font-mono text-[10px] font-semibold uppercase tracking-widest transition",
                following
                  ? "border-[#0E1909]/15 bg-white text-[#0E1909]/60 hover:border-[#e0463c] hover:text-[#e0463c]"
                  : "border-[#0E1909] bg-[#0E1909] text-[#DAFF01] hover:bg-[#0E1909]/90"
              )}
            >
              {busy ? (
                <Loader2 size={12} className="animate-spin" />
              ) : following ? (
                <UserCheck size={12} />
              ) : (
                <UserPlus size={12} />
              )}
              {following ? "following" : "follow"}
            </button>
          </div>
          {founder.title && (
            <p className="mt-2 font-mono text-xs text-[#0E1909]/65">{founder.title}</p>
          )}
        </div>

        <div className="space-y-3 p-4">
          {founder.bio && (
            <p className="text-[13px] leading-relaxed text-[#0E1909]/75 line-clamp-3">
              {founder.bio}
            </p>
          )}

          {founder.location && (
            <div className="flex items-center gap-1.5 font-mono text-xs text-[#0E1909]/55">
              <MapPin size={12} /> {founder.location}
            </div>
          )}

          {extraStats && extraStats.length > 0 && (
            <div className="flex items-center gap-4 border-t border-[#0E1909]/8 pt-3">
              {extraStats.map((s, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  {s.icon}
                  <span className="font-mono text-xs font-semibold text-[#0E1909]">
                    {s.value}
                  </span>
                  <span className="font-mono text-xs uppercase tracking-widest text-[#0E1909]/45">
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          )}

          {skills.length > 0 && (
            <div className="border-t border-[#0E1909]/8 pt-3">
              <p className="mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-widest text-[#0E1909]/45">
                skills
              </p>
              <div className="flex flex-wrap gap-1">
                {skills.slice(0, 8).map((s) => (
                  <Tag key={s}>{s}</Tag>
                ))}
              </div>
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

/** Convenience stat icons. */
export const StatIcons = { Trophy, Boxes };
