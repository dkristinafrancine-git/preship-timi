"use client";

import { cn } from "@/lib/utils";
import {
  ALPHA_STAGES,
  STAGE_CODE,
  STAGE_ORDER,
  BOUNTY_TYPES,
} from "@/lib/preship";
import type { BountyType } from "@/lib/preship-types";
import { Star } from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

/* ---- Founding Member badge ---- */

/**
 * Founding Member badge — a small star icon shown next to a founder's name.
 *
 * The first-100 cohort is granted `isFoundingMember = true` via a DB column
 * (see migration 20260622000000_add_founding_member); it's revocable per-user.
 *
 * Render inline next to a name: `<h1>Maya {f.isFoundingMember && <FoundingBadge />}</h1>`.
 * Renders nothing when `show` is false so callers can mount it conditionally
 * without an extra wrapper.
 *
 * `TooltipProvider` is mounted once at the app root (Providers), so this
 * component only needs the `Tooltip` / `Trigger` / `Content` trio.
 */
export function FoundingBadge({
  show,
  className,
  size = 13,
  tooltip = "Founding Member",
}: {
  show?: boolean;
  className?: string;
  /** icon size in px (lucide convention). 13 = inline-with-text default. */
  size?: number;
  tooltip?: string;
}) {
  if (show === false) return null;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          role="img"
          aria-label={tooltip}
          className={cn(
            "inline-flex shrink-0 items-center align-middle text-[#DAFF01]",
            className
          )}
        >
          <Star size={size} className="fill-[#DAFF01]" strokeWidth={1.5} />
        </span>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="border border-[#0E1909]/15 bg-[#0E1909] font-mono text-xs font-semibold uppercase tracking-widest text-[#DAFF01]"
      >
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

/* ---- Stage chips & rail ---- */

export function StageChip({
  stage,
  className,
  active = false,
}: {
  stage: string;
  className?: string;
  active?: boolean;
}) {
  const code = STAGE_CODE[stage] ?? "—";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded border px-2.5 py-1 font-mono text-xs font-semibold uppercase tracking-widest",
        active
          ? "border-[#0E1909] bg-[#DAFF01] text-[#0E1909]"
          : "border-[#0E1909]/15 bg-[#f4ffd6] text-[#0E1909]",
        className
      )}
    >
      <span className="opacity-60">{code}</span>
      <span>{stage}</span>
    </span>
  );
}

/** Code-only stage chip — just the abbreviation (e.g. `CD`), no full name.
 *  Used in dense contexts like the war-room feed where the stage is a tag,
 *  not the focus. See StageChip for the full `CD Customer Discovery` chip. */
export function StageCode({
  stage,
  className,
}: {
  stage: string;
  className?: string;
}) {
  const code = STAGE_CODE[stage] ?? "—";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center whitespace-nowrap rounded border border-[#0E1909]/15 bg-[#f4ffd6] px-1.5 py-0.5 font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]",
        className
      )}
    >
      {code}
    </span>
  );
}

/** Horizontal alpha-stage progression rail. */
export function StageRail({
  currentStage,
  className,
  size = "md",
}: {
  currentStage: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const currentIdx = STAGE_ORDER[currentStage] ?? 0;
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {ALPHA_STAGES.map((s, i) => {
        const done = i < currentIdx;
        const isCurrent = i === currentIdx;
        return (
          <div key={s} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex w-full items-center">
              <div
                className={cn(
                  "h-[3px] flex-1 rounded-full",
                  i === 0 ? "opacity-0" : done || isCurrent ? "bg-[#DAFF01]" : "bg-[#0E1909]/12"
                )}
              />
              <div
                className={cn(
                  "flex shrink-0 items-center justify-center rounded-full border font-mono font-bold",
                  size === "sm" ? "h-4 w-4 text-[8px]" : "h-5 w-5 text-xs",
                  isCurrent
                    ? "border-[#0E1909] bg-[#DAFF01] text-[#0E1909]"
                    : done
                    ? "border-[#0E1909] bg-[#0E1909] text-[#DAFF01]"
                    : "border-[#0E1909]/20 bg-white text-[#0E1909]/40"
                )}
              >
                {done ? "✓" : STAGE_CODE[s]}
              </div>
              <div
                className={cn(
                  "h-[3px] flex-1 rounded-full",
                  i === ALPHA_STAGES.length - 1
                    ? "opacity-0"
                    : done
                    ? "bg-[#DAFF01]"
                    : "bg-[#0E1909]/12"
                )}
              />
            </div>
            {!size || size === "md" ? (
              <span
                className={cn(
                  "text-center font-mono text-[8px] uppercase tracking-wider leading-tight",
                  isCurrent ? "text-[#0E1909]" : "text-[#0E1909]/45"
                )}
              >
                {s}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/* ---- Bounty badge ---- */

export function BountyBadge({
  type,
  stake,
  className,
  size = "md",
}: {
  type: BountyType;
  stake?: number | null;
  className?: string;
  size?: "sm" | "md";
}) {
  const meta = BOUNTY_TYPES.find((b) => b.id === type);
  const label = meta?.label ?? type;
  const code = meta?.short ?? "??";
  const isBarter = type === "barter";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded border font-mono font-semibold uppercase tracking-wider",
        size === "sm" ? "px-2 py-1 text-xs" : "px-2.5 py-1 text-xs",
        isBarter
          ? "border-[#0E1909]/20 bg-white text-[#0E1909]"
          : "border-[#0E1909] bg-[#0E1909] text-[#DAFF01]",
        className
      )}
      title={label}
    >
      <span className={isBarter ? "text-[#6f8a3e]" : "opacity-70"}>{code}</span>
      <span className="hidden sm:inline">{label}</span>
      {stake != null && stake > 0 ? (
        <span
          className={cn(
            "rounded px-1.5 py-0.5 font-mono text-xs",
            isBarter ? "bg-[#DAFF01] text-[#0E1909]" : "bg-[#DAFF01] text-[#0E1909]"
          )}
        >
          {stake}%
        </span>
      ) : null}
    </span>
  );
}

/* ---- Role badge ---- */

const ROLE_META: Record<string, { label: string; code: string }> = {
  host: { label: "Host", code: "HO" },
  "co-host": { label: "Co-host", code: "CO" },
  "technical-lead": { label: "Tech Lead", code: "TL" },
  "design-lead": { label: "Design Lead", code: "DL" },
  "product-lead": { label: "Product Lead", code: "PL" },
  "marketing-lead": { label: "Marketing Lead", code: "ML" },
  participant: { label: "Participant", code: "PA" },
};

/** Derive a short uppercase code for a custom role slug (first letters of up
 *  to 2 words, uppercased). e.g. "ml-engineer" → "ME", "growth-hacker" → "GH". */
function roleCode(slug: string): string {
  const words = slug.split("-").filter(Boolean).slice(0, 2);
  const code = words.map((w) => w[0] ?? "").join("").toUpperCase();
  return code || "·";
}

export function RoleBadge({
  role,
  filled = false,
  className,
}: {
  role: string;
  filled?: boolean;
  className?: string;
}) {
  // Look up preset metadata; fall back to a derived code + spaced slug label
  // for host-defined custom roles (e.g. "ml-engineer").
  const m = ROLE_META[role] ?? {
    label: role.replace(/-/g, " "),
    code: roleCode(role),
  };
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded border px-2.5 py-1 font-mono text-xs font-semibold uppercase tracking-wider",
        filled
          ? "border-[#0E1909] bg-[#0E1909] text-[#DAFF01]"
          : "border-dashed border-[#0E1909]/30 bg-[#f4ffd6] text-[#0E1909]/70",
        className
      )}
    >
      <span className="opacity-60">{m.code}</span>
      {m.label}
    </span>
  );
}

/* ---- Category tag ---- */

export function Tag({
  children,
  className,
  active = false,
}: {
  children: React.ReactNode;
  className?: string;
  active?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center whitespace-nowrap rounded px-2 py-1 font-mono text-xs uppercase tracking-wider",
        active ? "bg-[#DAFF01] text-[#0E1909]" : "bg-[#0E1909]/5 text-[#0E1909]/65",
        className
      )}
    >
      {children}
    </span>
  );
}

/* ---- Status pill (open/matched/live/etc) ---- */

export function StatusPill({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const map: Record<string, { label: string; dot: string; cls: string }> = {
    open: { label: "OPEN", dot: "bg-[#DAFF01]", cls: "border-[#0E1909] bg-[#0E1909] text-[#DAFF01]" },
    matched: { label: "MATCHED", dot: "bg-[#6f8a3e]", cls: "border-[#6f8a3e] bg-[#f4ffd6] text-[#0E1909]" },
    closed: { label: "CLOSED", dot: "bg-[#0E1909]/30", cls: "border-[#0E1909]/15 bg-white text-[#0E1909]/50" },
    live: { label: "LIVE NOW", dot: "bg-[#e0463c]", cls: "border-[#e0463c] bg-[#e0463c] text-white" },
    scheduled: { label: "SCHEDULED", dot: "bg-[#DAFF01]", cls: "border-[#0E1909] bg-[#0E1909] text-[#DAFF01]" },
    ended: { label: "ENDED", dot: "bg-[#0E1909]/30", cls: "border-[#0E1909]/15 bg-white text-[#0E1909]/50" },
    pending: { label: "PENDING", dot: "bg-[#DAFF01]", cls: "border-[#0E1909]/20 bg-white text-[#0E1909]" },
    accepted: { label: "ACCEPTED", dot: "bg-[#6f8a3e]", cls: "border-[#6f8a3e] bg-[#f4ffd6] text-[#0E1909]" },
    declined: { label: "DECLINED", dot: "bg-[#0E1909]/30", cls: "border-[#0E1909]/15 bg-white text-[#0E1909]/50" },
  };
  const m = map[status] ?? { label: status.toUpperCase(), dot: "bg-[#0E1909]/30", cls: "border-[#0E1909]/15 bg-white text-[#0E1909]" };
  const isLive = status === "live";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 font-mono text-xs font-semibold uppercase tracking-widest",
        m.cls,
        isLive && "animate-softpulse",
        className
      )}
    >
      <span className={cn("h-2 w-2 rounded-full", m.dot, isLive && "animate-blink")} />
      {m.label}
    </span>
  );
}

/* ---- Terminal-style section header ---- */

export function TerminalHeader({
  label,
  right,
  className,
}: {
  label: string;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between border-b border-[#0E1909]/10 bg-[#f8f9f3] px-4 py-2.5",
        className
      )}
    >
      <div className="flex items-center gap-2.5">
        <span className="flex gap-1">
          <span className="h-2 w-2 rounded-full bg-[#0E1909]/15" />
          <span className="h-2 w-2 rounded-full bg-[#0E1909]/15" />
          <span className="h-2 w-2 rounded-full bg-[#DAFF01]" />
        </span>
        <span className="font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/70">
          {label}
        </span>
      </div>
      {right}
    </div>
  );
}

/* ---- ArrowLink ---- */

export function ArrowLink({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 font-mono text-xs font-semibold uppercase tracking-wider text-[#0E1909] transition hover:gap-1.5 hover:text-[#6f8a3e]",
        className
      )}
    >
      {children}
      <span aria-hidden>→</span>
    </button>
  );
}
