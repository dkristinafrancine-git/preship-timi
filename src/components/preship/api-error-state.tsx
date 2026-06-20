"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Inline error state for a failed `useApi` fetch.
 *
 * The whole point: a failed network request must NOT look like "there is no
 * data". This renders a clearly-marked error block with a Retry button, so a
 * production failure (missing env var, DB down, network blip) is visible to the
 * user instead of masquerading as an empty list.
 *
 * Use it by gating on `error` BEFORE the empty-state branch in a view:
 *
 *   const { data, loading, error, refetch } = useApi(...);
 *   if (error && !data) return <ApiErrorState onRetry={refetch} />;
 *
 * The `&& !data` guard keeps a previously-loaded list on screen during a
 * background refetch failure (don't throw away good data).
 */
export function ApiErrorState({
  onRetry,
  message,
  className,
  compact = false,
}: {
  onRetry?: () => void;
  /** Optional override; defaults to a generic "couldn't load" message. */
  message?: string;
  className?: string;
  /** Slimmer variant for side rails / dropdowns. */
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "terminal-card flex items-center gap-3 border-[#e0463c]/30 bg-[#fff5f4] text-left",
        compact ? "px-4 py-3" : "px-5 py-5",
        className
      )}
      role="alert"
    >
      <AlertTriangle
        size={compact ? 15 : 18}
        className="shrink-0 text-[#e0463c]"
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="font-display text-[13px] font-semibold text-[#0E1909]">
          {message ?? "Couldn't load this — it's not you, it's a server hiccup."}
        </p>
        {!compact && (
          <p className="mt-0.5 font-mono text-xs text-[#0E1909]/55">
            check the connection and try again. if it persists, the team has been notified.
          </p>
        )}
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="tactile-flat flex shrink-0 items-center gap-1.5 rounded-md border border-[#0E1909]/15 bg-white px-3 py-1.5 font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909] hover:bg-[#f8f9f3]"
        >
          <RefreshCw size={12} />
          retry
        </button>
      )}
    </div>
  );
}
