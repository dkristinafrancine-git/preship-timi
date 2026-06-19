"use client";

import { cn } from "@/lib/utils";

/**
 * Slim center-column header — Peerlist-style. Shows the view title, a mono
 * route code, a one-line subtitle, and an optional action (CTA button) on
 * the right. Sticky just below the global header.
 */
export function ViewHeader({
  title,
  code,
  sub,
  action,
  className,
}: {
  title: string;
  code: string;
  sub: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "sticky top-[84px] z-20 -mx-4 mb-4 border-b border-[#0E1909]/10 bg-white/95 px-4 py-3 backdrop-blur lg:-mx-6 lg:px-6",
        className
      )}
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="font-display text-xl font-semibold tracking-tight text-[#0E1909]">
          {title}
        </h1>
        <span className="font-mono text-[10px] uppercase tracking-widest text-[#0E1909]/40">
          {code}
        </span>
        <span className="hidden truncate font-mono text-xs text-[#0E1909]/50 sm:inline">
          — {sub}
        </span>
        {action && <div className="ml-auto flex items-center gap-2">{action}</div>}
      </div>
    </div>
  );
}
