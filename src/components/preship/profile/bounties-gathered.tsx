"use client";

import { cn } from "@/lib/utils";
import type { SynergyOffer } from "@/lib/preship-types";
import { FounderAvatar, ProjectMark } from "../avatars";
import { BountyBadge, StageChip, Tag, StatusPill } from "../badges";
import { fmtRelative } from "@/lib/preship";
import { Trophy, ArrowRight } from "lucide-react";

/**
 * Renders the list of bounties a founder has "gathered" — i.e. accepted
 * handshakes (their offer was accepted by the requester).
 */
export function BountiesGathered({
  bounties,
  emptyHint = "No bounties gathered yet — offer a handshake in Synergy to collect one.",
  onOpenRequest,
}: {
  bounties: SynergyOffer[];
  emptyHint?: string;
  onOpenRequest?: (requestId: string) => void;
}) {
  if (bounties.length === 0) {
    return (
      <div className="terminal-card flex flex-col items-center gap-2 px-6 py-12 text-center">
        <Trophy size={26} className="text-[#0E1909]/20" />
        <p className="max-w-sm font-mono text-xs uppercase tracking-widest text-[#0E1909]/45">
          {emptyHint}
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {bounties.map((b) => {
        const r = b.request;
        // An accepted offer should always have a parent request in the
        // payload; if it doesn't (orphaned offer, or an endpoint that didn't
        // include the relation), there's nothing to render here.
        if (!r) return null;
        const tags = r.tags ? r.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
        return (
          <li key={b.id}>
            <button
              type="button"
              onClick={() => onOpenRequest?.(r.id)}
              className="terminal-card group block w-full p-5 text-left hover:border-[#0E1909]/25"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <StatusPill status="accepted" />
                  <span className="truncate font-mono text-xs uppercase tracking-widest text-[#0E1909]/45">
                    gathered {fmtRelative(b.createdAt)} ago
                  </span>
                </div>
                <BountyBadge type={r.bountyType} stake={r.stake} />
              </div>

              <h4 className="mt-3 font-display text-base font-semibold leading-snug text-[#0E1909]">
                {r.title}
              </h4>

              <div className="mt-3 flex items-center gap-2.5">
                <FounderAvatar founder={r.founder} size={28} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-[13px] font-semibold text-[#0E1909]">
                    {r.founder.name}
                  </p>
                  <p className="truncate font-mono text-xs text-[#0E1909]/50">
                    @{r.founder.handle} · {r.founder.title}
                  </p>
                </div>
                {r.project && (
                  <div className="flex shrink-0 items-center gap-1.5 rounded-md border border-[#0E1909]/12 bg-[#f8f9f3] px-2 py-1">
                    <ProjectMark mark={r.project.logoMark} color={r.project.logoColor} logoUrl={r.project.logoUrl} name={r.project.name} size={18} />
                    <span className="font-display text-xs font-semibold text-[#0E1909]">
                      {r.project.name}
                    </span>
                    <StageChip stage={r.project.alphaStage} className="ml-1 !px-1 !py-0 hidden sm:inline-flex" />
                  </div>
                )}
              </div>

              {b.pitch && (
                <p className="mt-3 rounded-md border border-[#0E1909]/10 bg-[#f8f9f3] px-3 py-2 text-[13px] leading-relaxed text-[#0E1909]/75">
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#0E1909]/45">
                    your pitch ·{" "}
                  </span>
                  {b.pitch}
                </p>
              )}

              {tags.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {tags.map((t) => (
                    <Tag key={t}>#{t}</Tag>
                  ))}
                </div>
              )}

              <div className="mt-3 flex items-center justify-between border-t border-[#0E1909]/8 pt-3">
                <span className="font-mono text-xs uppercase tracking-widest text-[#0E1909]/45">
                  bounty fulfilled
                </span>
                <span className="flex items-center gap-1 font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909] transition-all duration-200 group-hover:gap-2 group-hover:text-[#6f8a3e]">
                  open broadcast <ArrowRight size={12} className="transition-transform duration-200 group-hover:translate-x-0.5" />
                </span>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
