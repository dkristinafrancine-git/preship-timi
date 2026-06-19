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
        "sticky top-[96px] z-20 -mx-5 mb-6 border-b border-[#0E1909]/10 bg-white/95 px-5 py-4 backdrop-blur lg:-mx-8 lg:px-8",
        className
      )}
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-[#0E1909]">
          {title}
        </h1>
        <span className="font-mono text-xs uppercase tracking-widest text-[#0E1909]/45">
          {code}
        </span>
        <span className="hidden truncate font-mono text-[13px] text-[#0E1909]/55 md:inline">
          — {sub}
        </span>
        {action && <div className="ml-auto flex items-center gap-2.5">{action}</div>}
      </div>
    </div>
  );
}
