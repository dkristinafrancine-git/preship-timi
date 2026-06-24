"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useApi } from "@/lib/use-api";
import type { AdminStats } from "@/lib/preship-types";
import {
  Users,
  UserCheck,
  AudioLines,
  MessageSquareWarning,
  Scale,
  Boxes,
  Mic,
} from "lucide-react";

/** Live /admin overview dashboard. Fetches the aggregate stats endpoint. */
export function AdminOverview() {
  const { data, loading, error } = useApi<AdminStats>("/api/admin/stats");

  // DEBUG: when the stats fetch fails, pull the server's debug message out of
  // the 500 response body so the real error shows on-screen. Removed once the
  // root cause is fixed.
  const [debugMsg, setDebugMsg] = useState<string | null>(null);
  useEffect(() => {
    if (!error) {
      setDebugMsg(null);
      return;
    }
    let cancelled = false;
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled && j && typeof j.debug === "string") setDebugMsg(j.debug);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [error]);

  if (loading) {
    return (
      <div className="space-y-6">
        <OverviewHeader />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-xl border border-white/10 bg-white/[0.03]"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    // DEBUG: show the server's debug message if present (Network tab also has it)
    return (
      <div className="space-y-6">
        <OverviewHeader />
        <div className="rounded-xl border border-red-400/30 bg-red-400/[0.06] p-6">
          <p className="font-mono text-xs uppercase tracking-widest text-red-300/80">
            Couldn’t load stats — {error || "unknown error"}
          </p>
          {debugMsg ? (
            <p className="mt-3 break-words font-mono text-xs text-red-200/90">
              server: {debugMsg}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  const passive = Math.max(data.users.total - data.users.active7d, 0);
  const activePct = data.users.total
    ? Math.round((data.users.active7d / data.users.total) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <OverviewHeader />

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Total users"
          value={fmt(data.users.total)}
          hint={`${data.users.foundingMembers} founding members`}
          icon={Users}
          accent
        />
        <KpiCard
          label="Active (7d)"
          value={fmt(data.users.active7d)}
          hint={`${activePct}% of total`}
          icon={UserCheck}
        />
        <KpiCard
          label="Audio minutes"
          value={fmt(data.audio.recordedMinutes + data.audio.liveMinutes)}
          hint={`${data.audio.recordedMinutes} recorded · ${data.audio.liveMinutes} live`}
          icon={AudioLines}
        />
        <KpiCard
          label="Open tickets"
          value={fmt(data.inbox.openFeedback + data.inbox.openIpInquiries)}
          hint={`${data.inbox.openFeedback} feedback · ${data.inbox.openIpInquiries} IP`}
          icon={MessageSquareWarning}
        />
      </div>

      {/* Active vs passive + secondary metrics */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold text-white/90">
              Active vs passive users
            </h3>
            <span className="font-mono text-[11px] uppercase tracking-widest text-white/40">
              seen within 7d = active
            </span>
          </div>
          <div className="mt-4 flex items-end gap-3">
            <p className="font-display text-3xl font-semibold text-[#DAFF01]">
              {fmt(data.users.active7d)}
            </p>
            <span className="mb-1 font-mono text-xs text-white/45">active</span>
            <span className="mb-1 ml-2 font-mono text-xs text-white/30">/</span>
            <p className="font-display text-3xl font-semibold text-white/50">{fmt(passive)}</p>
            <span className="mb-1 font-mono text-xs text-white/45">passive</span>
          </div>
          {/* proportion bar */}
          <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="bg-[#DAFF01]"
              style={{ width: `${activePct}%` }}
              title={`${activePct}% active`}
            />
          </div>
          <p className="mt-2 font-mono text-[11px] text-white/35">
            30-day active: {fmt(data.users.active30d)} · {fmt(data.users.total)} total accounts
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <h3 className="font-display text-sm font-semibold text-white/90">Content</h3>
          <ul className="mt-4 space-y-3">
            <MiniStat icon={Boxes} label="Projects" value={data.projects.total} />
            <MiniStat icon={MessageSquareWarning} label="Posts" value={data.content.posts} />
            <MiniStat icon={Mic} label="IdeaLab sessions" value={data.sessions.total} sub={`${data.sessions.ended} ended`} />
            <MiniStat icon={Scale} label="Open IP inquiries" value={data.inbox.openIpInquiries} />
          </ul>
        </div>
      </div>

      {/* Projects by alpha stage */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
        <h3 className="font-display text-sm font-semibold text-white/90">Projects by stage</h3>
        <ProjectStageBars stages={data.projects.byStage} />
      </div>
    </div>
  );
}

function OverviewHeader() {
  return (
    <header>
      <h1 className="font-display text-2xl font-semibold text-white">Overview</h1>
      <p className="mt-1 font-mono text-xs uppercase tracking-widest text-white/40">
        Platform health & usage
      </p>
    </header>
  );
}

function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof Users;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-5",
        accent ? "border-[#DAFF01]/20 bg-[#DAFF01]/[0.04]" : "border-white/10 bg-white/[0.03]"
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-widest text-white/40">
          {label}
        </span>
        <Icon size={16} className="text-white/30" />
      </div>
      <p className="mt-3 font-display text-3xl font-semibold text-white/90">{value}</p>
      <p className="mt-1 font-mono text-[11px] text-white/35">{hint}</p>
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  sub?: string;
}) {
  return (
    <li className="flex items-center gap-3">
      <Icon size={16} className="text-white/40" />
      <span className="flex-1 font-mono text-xs text-white/60">{label}</span>
      <span className="font-display text-sm font-semibold text-white/90">{fmt(value)}</span>
      {sub && <span className="font-mono text-[10px] text-white/30">{sub}</span>}
    </li>
  );
}

function ProjectStageBars({ stages }: { stages: { stage: string; count: number }[] }) {
  if (stages.length === 0) {
    return (
      <p className="mt-4 font-mono text-xs text-white/35">No projects yet.</p>
    );
  }
  const max = Math.max(...stages.map((s) => s.count), 1);
  return (
    <div className="mt-4 space-y-2.5">
      {stages.map((s) => (
        <div key={s.stage} className="flex items-center gap-3">
          <span className="w-40 shrink-0 truncate font-mono text-[11px] uppercase tracking-wider text-white/55">
            {s.stage}
          </span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-[#DAFF01]/70"
              style={{ width: `${Math.round((s.count / max) * 100)}%` }}
            />
          </div>
          <span className="w-8 shrink-0 text-right font-mono text-xs text-white/70">{s.count}</span>
        </div>
      ))}
    </div>
  );
}

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}
