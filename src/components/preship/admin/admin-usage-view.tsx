"use client";

import { cn } from "@/lib/utils";
import { useApi } from "@/lib/use-api";
import type { AdminStats, IdeaLabUsageBreakdown } from "@/lib/preship-types";
import { AudioLines, Mic, Radio, Clock } from "lucide-react";

/**
 * /admin/usage — recorded vs live audio minutes. Pulls the aggregate stats
 * (recorded minutes from SUM(Post.audioDuration), live minutes from
 * SUM(IdeaLabUsage.durationSecs) written by LiveKit webhooks) plus the
 * per-session live-audio breakdown.
 */
export function AdminUsageView() {
  const { data: stats, loading: statsLoading, error: statsError } = useApi<AdminStats>("/api/admin/stats");
  const { data: usageData, loading: usageLoading } = useApi<{ items: IdeaLabUsageBreakdown[] }>(
    "/api/admin/idealab/usage?days=30"
  );

  const loading = statsLoading || usageLoading;

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <AudioLines size={22} className="text-[#DAFF01]" />
        <div>
          <h1 className="font-display text-2xl font-semibold text-white">Audio Usage</h1>
          <p className="mt-0.5 font-mono text-xs uppercase tracking-widest text-white/40">
            Recorded posts · IdeaLab live minutes
          </p>
        </div>
      </header>

      {/* totals */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <UsageCard
          label="Recorded minutes"
          value={stats ? fmt(stats.audio.recordedMinutes) : "—"}
          hint="SUM of audio-post durations"
          icon={Mic}
          loading={loading}
        />
        <UsageCard
          label="Live minutes"
          value={stats ? fmt(stats.audio.liveMinutes) : "—"}
          hint="IdeaLab participant-minutes"
          icon={AudioLines}
          accent
          loading={loading}
        />
        <UsageCard
          label="Live now"
          value={stats ? fmt(stats.audio.liveParticipants) : "—"}
          hint="participants in open spans"
          icon={Radio}
          loading={loading}
        />
      </div>

      {statsError && (
        <div className="rounded-xl border border-red-400/30 bg-red-400/[0.06] p-4">
          <p className="font-mono text-xs uppercase tracking-widest text-red-300/80">
            Couldn’t load stats — {statsError}
          </p>
        </div>
      )}

      {/* per-session breakdown */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-semibold text-white/90">
            Top IdeaLab sessions (last 30d)
          </h3>
          <span className="font-mono text-[11px] uppercase tracking-widest text-white/40">
            by live minutes
          </span>
        </div>

        {loading ? (
          <div className="mt-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-md bg-white/[0.03]" />
            ))}
          </div>
        ) : (usageData?.items ?? []).length === 0 ? (
          <p className="mt-6 font-mono text-xs text-white/35">
            No live-audio usage recorded yet. Minutes appear here once IdeaLab sessions run.
          </p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-lg border border-white/10">
            <table className="w-full text-left">
              <thead className="border-b border-white/10 bg-white/[0.02]">
                <tr className="font-mono text-[10px] uppercase tracking-widest text-white/40">
                  <th className="px-4 py-2.5 font-semibold">Session</th>
                  <th className="hidden px-4 py-2.5 font-semibold sm:table-cell">Status</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Minutes</th>
                  <th className="hidden px-4 py-2.5 text-right font-semibold md:table-cell">Spans</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {(usageData?.items ?? []).map((row) => (
                  <tr key={row.sessionId} className="text-sm transition-colors hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Clock size={13} className="shrink-0 text-white/30" />
                        <div className="min-w-0">
                          <p className="truncate font-display font-medium text-white/90">{row.title}</p>
                          <p className="font-mono text-[10px] text-white/35">
                            {new Date(row.scheduledAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <SessionStatusPill status={row.status} />
                    </td>
                    <td className="px-4 py-3 text-right font-display font-semibold text-[#DAFF01]">
                      {fmt(Math.round(row.totalSeconds / 60))}
                    </td>
                    <td className="hidden px-4 py-3 text-right font-mono text-[11px] text-white/45 md:table-cell">
                      {fmt(row.participantSpans)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function UsageCard({
  label,
  value,
  hint,
  icon: Icon,
  accent,
  loading,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof Mic;
  accent?: boolean;
  loading?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-5",
        accent ? "border-[#DAFF01]/20 bg-[#DAFF01]/[0.04]" : "border-white/10 bg-white/[0.03]"
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-widest text-white/40">{label}</span>
        <Icon size={16} className={loading ? "animate-pulse text-white/20" : "text-white/30"} />
      </div>
      <p className={cn("mt-3 font-display text-3xl font-semibold", loading ? "text-white/30" : "text-white/90")}>
        {value}
      </p>
      <p className="mt-1 font-mono text-[11px] text-white/35">{hint}</p>
    </div>
  );
}

function SessionStatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    live: "bg-red-400/15 text-red-300 border-red-400/30",
    scheduled: "bg-blue-400/15 text-blue-300 border-blue-400/30",
    ended: "bg-white/10 text-white/50 border-white/20",
  };
  return (
    <span className={cn("rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest", styles[status] ?? styles.ended)}>
      {status}
    </span>
  );
}

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}
