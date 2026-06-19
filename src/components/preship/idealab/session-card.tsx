"use client";

import { cn } from "@/lib/utils";
import type { IdeaLabSession } from "@/lib/preship-types";
import { fmtRelative } from "@/lib/preship";
import { FounderAvatar } from "../avatars";
import { StatusPill, RoleBadge } from "../badges";
import { WaveformMini } from "../waveform";
import { Calendar, Clock, Users, Star, ArrowRight } from "lucide-react";

function fmtSchedule(iso: string): { date: string; time: string; relative: string } {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const diff = d.getTime() - Date.now();
  const abs = Math.abs(diff);
  const days = Math.floor(abs / 86400000);
  const hours = Math.floor((abs % 86400000) / 3600000);
  let rel: string;
  if (days > 0) rel = `in ${days}d ${hours}h`;
  else if (hours > 0) rel = `in ${hours}h`;
  else rel = diff > 0 ? "soon" : `${fmtRelative(iso)} ago`;
  return { date, time, relative: rel };
}

export function SessionCard({
  session,
  onOpen,
}: {
  session: IdeaLabSession;
  onOpen: () => void;
}) {
  const isLive = session.status === "live";
  const isDark = session.coverColor.toLowerCase() === "#0e1909";
  const sched = fmtSchedule(session.scheduledAt);
  const roles = session.rolesOpen ? session.rolesOpen.split(",").filter(Boolean) : [];
  const seatsLeft = session.maxSeats - session._count.signups;

  return (
    <button
      onClick={onOpen}
      className={cn(
        "group block w-full overflow-hidden rounded-lg border text-left hover-lift",
        isLive
          ? "border-[#e0463c] shadow-[0_0_0_1px_rgba(224,70,60,0.2)] hover:shadow-[0_8px_24px_rgba(224,70,60,0.18),0_0_0_1px_rgba(224,70,60,0.3)]"
          : "border-[#0E1909]/15 hover:border-[#0E1909]/35"
      )}
    >
      {/* cover */}
      <div
        className={cn("relative px-5 py-4", isDark ? "bg-[#0E1909]" : "bg-[#DAFF01]")}
        style={!isDark && !isLive ? {} : { background: session.coverColor }}
      >
        <div className={cn(isDark ? "bg-grid-dark" : "")}>
          <div className="flex items-start justify-between gap-2">
            <StatusPill status={session.status} />
            <div className={cn("flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest", isDark ? "text-[#DAFF01]/60" : "text-[#0E1909]/55")}>
              <Users size={13} />
              {session._count.signups}/{session.maxSeats}
            </div>
          </div>
          <h3 className={cn("mt-2.5 line-clamp-2 font-display text-[17px] font-semibold leading-snug", isDark ? "text-white" : "text-[#0E1909]")}>
            {session.title}
          </h3>
          <div className={cn("mt-2 flex items-center gap-3 font-mono text-xs uppercase tracking-widest", isDark ? "text-[#DAFF01]/70" : "text-[#0E1909]/60")}>
            <span className="flex items-center gap-1">
              <Calendar size={12} /> {sched.date} · {sched.time}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={12} /> {sched.relative}
            </span>
          </div>
        </div>
        {isLive && (
          <div className="absolute right-4 top-4">
            <WaveformMini waveform={Array.from({ length: 18 }, () => 0.4 + Math.random() * 0.6).join(",")} className="text-[#DAFF01]" />
          </div>
        )}
      </div>

      {/* body */}
      <div className="p-5">
        <div className="flex items-center gap-2">
          <FounderAvatar founder={session.host} size={26} />
          <span className="font-display text-[13px] font-medium text-[#0E1909]">
            {session.host.name}
          </span>
          <span className="font-mono text-xs text-[#0E1909]/50">@{session.host.handle}</span>
          <span className="ml-auto font-mono text-xs uppercase tracking-widest text-[#0E1909]/45">
            host
          </span>
        </div>

        <p className="mt-3 line-clamp-2 text-[13px] leading-relaxed text-[#0E1909]/70">
          {session.thesis}
        </p>

        {roles.length > 0 && (
          <div className="mt-3">
            <p className="mb-1.5 font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/45">
              open roles
            </p>
            <div className="flex flex-wrap gap-1">
              {roles.slice(0, 4).map((r) => (
                <RoleBadge key={r} role={r as any} />
              ))}
              {roles.length > 4 && (
                <span className="rounded border border-dashed border-[#0E1909]/25 px-1.5 py-0.5 font-mono text-xs text-[#0E1909]/50">
                  +{roles.length - 4}
                </span>
              )}
            </div>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between border-t border-[#0E1909]/8 pt-2.5">
          <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-widest text-[#0E1909]/45">
            <span className="flex items-center gap-1">
              <Star size={10} /> {session._count.interests} interest
            </span>
            {session.myInterest && (
              <span className="rounded bg-[#f4ffd6] px-1.5 py-0.5 text-[#0E1909]/70">interested</span>
            )}
            {session.mySignup && (
              <span className="rounded bg-[#0E1909] px-1.5 py-0.5 text-[#DAFF01]">
                registered · {session.mySignup.role.replace("-", " ")}
              </span>
            )}
          </div>
          <span className="flex items-center gap-1 font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909] transition-all duration-200 group-hover:gap-2 group-hover:text-[#6f8a3e]">
            enter <ArrowRight size={11} className="transition-transform duration-200 group-hover:translate-x-0.5" />
          </span>
        </div>
        {seatsLeft <= 3 && seatsLeft > 0 && (
          <p className="mt-1.5 font-mono text-xs uppercase tracking-widest text-[#e0463c]">
            only {seatsLeft} seat{seatsLeft === 1 ? "" : "s"} left
          </p>
        )}
      </div>
    </button>
  );
}
