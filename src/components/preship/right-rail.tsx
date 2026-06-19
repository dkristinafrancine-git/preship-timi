"use client";

import { cn } from "@/lib/utils";
import { usePreship } from "@/lib/preship-store";
import { useApi } from "@/lib/use-api";
import { TerminalHeader, StatusPill, StageChip, Tag } from "./badges";
import { FounderAvatar, ProjectMark } from "./avatars";
import type { Founder, Project, SynergyRequest, IdeaLabSession, FeedPost } from "@/lib/preship-types";
import { fmtRelative } from "@/lib/preship";
import { TrendingUp, Flame, Users, Calendar, ArrowRight } from "lucide-react";

export function RightRail() {
  const view = usePreship((s) => s.view);
  return (
    <aside className="hidden w-80 shrink-0 space-y-4 xl:block">
      {view === "war-room" && <WarRoomRail />}
      {view === "synergy" && <SynergyRail />}
      {view === "idealab" && <IdeaLabRail />}
      {view === "projects" && <ProjectsRail />}
    </aside>
  );
}

function WarRoomRail() {
  const { data: trending } = useApi<{ posts: FeedPost[] }>("/api/feed?sort=trending");
  const { data: me } = useApi<{ user: Founder; projects: Project[] }>("/api/me");
  const trendingTop = trending?.posts?.slice(0, 4) ?? [];

  return (
    <>
      {/* Alpha founders leaderboard */}
      <div className="terminal-card">
        <TerminalHeader label="top-founders · last-30d" />
        <div className="p-3">
          <div className="mb-2 flex items-center gap-2 text-[#0E1909]/50">
            <Flame size={13} />
            <span className="font-mono text-[10px] uppercase tracking-widest">highest-intent signal</span>
          </div>
          <ul className="space-y-2.5">
            {TOP_FOUNDERS.map((f, i) => (
              <li key={f.handle} className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded font-mono text-[10px] font-bold",
                    i === 0 ? "bg-[#DAFF01] text-[#0E1909]" : "bg-[#0E1909]/8 text-[#0E1909]/60"
                  )}
                >
                  {i + 1}
                </span>
                <FounderAvatar founder={f} size={28} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-xs font-semibold text-[#0E1909]">
                    {f.name}
                  </p>
                  <p className="truncate font-mono text-[10px] text-[#0E1909]/50">@{f.handle}</p>
                </div>
                <button className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#0E1909] hover:text-[#6f8a3e]">
                  follow →
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Trending posts */}
      <div className="terminal-card">
        <TerminalHeader label="trending · now" right={<TrendingUp size={13} className="text-[#0E1909]/40" />} />
        <div className="divide-y divide-[#0E1909]/8">
          {trendingTop.map((p) => (
            <div key={p.id} className="px-3 py-2.5">
              <div className="flex items-center gap-2">
                <FounderAvatar founder={p.author} size={22} />
                <span className="truncate font-display text-xs font-medium text-[#0E1909]">
                  {p.author.name}
                </span>
                <span className="font-mono text-[10px] text-[#0E1909]/40">{fmtRelative(p.createdAt)}</span>
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-[#0E1909]/70">{p.body ?? p.audioTitle}</p>
              <div className="mt-1.5 flex items-center gap-1">
                {p._count.reactions.handshake > 0 && (
                  <Tag>↪ {p._count.reactions.handshake} handshake</Tag>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* My projects quick status */}
      {me?.projects?.length ? (
        <div className="terminal-card">
          <TerminalHeader label="my-projects · status" />
          <div className="space-y-2 p-3">
            {me.projects.slice(0, 3).map((p) => (
              <div key={p.id} className="flex items-center gap-2.5">
                <ProjectMark mark={p.logoMark} color={p.logoColor} size={30} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-xs font-semibold text-[#0E1909]">{p.name}</p>
                  <p className="truncate font-mono text-[10px] text-[#0E1909]/50">{p.tagline}</p>
                </div>
                <StageChip stage={p.alphaStage} />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}

function SynergyRail() {
  const { data } = useApi<{ requests: SynergyRequest[] }>("/api/synergy?status=open");
  const open = data?.requests ?? [];
  const byBounty: Record<string, number> = {};
  open.forEach((r) => {
    byBounty[r.bountyType] = (byBounty[r.bountyType] ?? 0) + 1;
  });
  const bountyLabels: Record<string, string> = {
    equity: "Equity stake",
    "advisor-shares": "Advisor shares",
    "revenue-share": "Revenue share",
    cofounder: "Co-founder",
    barter: "Barter",
  };

  return (
    <>
      <div className="terminal-card">
        <TerminalHeader label="synergy · live-signal" />
        <div className="space-y-3 p-4">
          <div className="grid grid-cols-2 gap-2">
            <Stat label="open broadcasts" value={open.length} />
            <Stat label="avg. stake" value={`${avgStake(open)}%`} />
          </div>
          <div>
            <p className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-[#0E1909]/50">
              bounty mix
            </p>
            <div className="space-y-1.5">
              {Object.entries(byBounty).map(([k, v]) => (
                <div key={k} className="flex items-center gap-2">
                  <span className="w-24 truncate font-mono text-[11px] text-[#0E1909]/70">
                    {bountyLabels[k] ?? k}
                  </span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#0E1909]/8">
                    <div
                      className="h-full rounded-full bg-[#DAFF01]"
                      style={{ width: `${(v / open.length) * 100}%` }}
                    />
                  </div>
                  <span className="w-4 text-right font-mono text-[11px] font-semibold text-[#0E1909]">
                    {v}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-[#0E1909]/12 bg-[#f4ffd6] p-4">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#0E1909]/60">
          how synergy works
        </p>
        <ol className="mt-2 space-y-1.5 text-xs text-[#0E1909]/80">
          <li><span className="font-mono text-[#0E1909]">01</span> Broadcast your bottleneck.</li>
          <li><span className="font-mono text-[#0E1909]">02</span> Set a bounty (equity, advisor shares, barter).</li>
          <li><span className="font-mono text-[#0E1909]">03</span> Receive handshakes from matched founders.</li>
          <li><span className="font-mono text-[#0E1909]">04</span> Pick your collaborator. Match.</li>
        </ol>
      </div>
    </>
  );
}

function IdeaLabRail() {
  const { data } = useApi<{ sessions: IdeaLabSession[] }>("/api/idealab?status=live");
  const live = data?.sessions ?? [];

  return (
    <>
      <div className="terminal-card">
        <TerminalHeader label="idealab · live-now" right={<span className="font-mono text-[10px] text-[#e0463c]">●REC</span>} />
        <div className="p-4">
          {live.length === 0 ? (
            <p className="font-mono text-xs text-[#0E1909]/50">No live rooms. Schedule one →</p>
          ) : (
            <ul className="space-y-3">
              {live.map((s) => (
                <li key={s.id} className="rounded-md border border-[#0E1909]/12 bg-[#0E1909] p-3">
                  <StatusPill status="live" />
                  <p className="mt-2 font-display text-sm font-semibold text-white">{s.title}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <FounderAvatar founder={s.host} size={20} />
                    <span className="font-mono text-[10px] text-[#DAFF01]/70">@{s.host.handle}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-[#0E1909]/12 bg-[#0E1909] p-4 text-white">
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-[#DAFF01]" />
          <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#DAFF01]">
            hosting etiquette
          </span>
        </div>
        <ul className="mt-2 space-y-1.5 text-xs text-white/80">
          <li>· Host owns the thesis. Everyone else pressure-tests it.</li>
          <li>· No pitching. Only ideation.</li>
          <li>· One prototype spec leaves every room.</li>
          <li>· Recordings stay invite-only.</li>
        </ul>
      </div>
    </>
  );
}

function ProjectsRail() {
  const { data } = useApi<{ projects: Project[] }>("/api/projects");
  const all = data?.projects ?? [];
  const byStage: Record<string, number> = {};
  all.forEach((p) => {
    byStage[p.alphaStage] = (byStage[p.alphaStage] ?? 0) + 1;
  });

  return (
    <>
      <div className="terminal-card">
        <TerminalHeader label="network · stage-distribution" />
        <div className="p-4">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-[#0E1909]/50">
            founders by alpha sub-stage
          </p>
          <div className="space-y-1.5">
            {Object.entries(byStage).map(([stage, count]) => (
              <div key={stage} className="flex items-center gap-2">
                <span className="w-32 truncate font-mono text-[11px] text-[#0E1909]/70">{stage}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#0E1909]/8">
                  <div
                    className="h-full rounded-full bg-[#DAFF01]"
                    style={{ width: `${(count / all.length) * 100}%` }}
                  />
                </div>
                <span className="w-4 text-right font-mono text-[11px] font-semibold text-[#0E1909]">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-[#0E1909]/12 bg-[#f4ffd6] p-4">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#0E1909]/60">
          alpha sub-stages
        </p>
        <ul className="mt-2 space-y-1 text-xs text-[#0E1909]/75">
          <li><b className="font-mono text-[#0E1909]">CD</b> Customer Discovery — interviews, not product.</li>
          <li><b className="font-mono text-[#0E1909]">PV</b> Problem Validation — the kill/continue call.</li>
          <li><b className="font-mono text-[#0E1909]">PT</b> Prototyping — bench numbers, not users.</li>
          <li><b className="font-mono text-[#0E1909]">CB</b> Closed Beta — invited users, real signal.</li>
          <li><b className="font-mono text-[#0E1909]">PB</b> Public Beta — open, but unstable.</li>
          <li><b className="font-mono text-[#0E1909]">PL</b> Pre-Launch — waitlist, pricing, polish.</li>
        </ul>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-[#0E1909]/10 bg-white p-2.5">
      <p className="font-mono text-[9px] uppercase tracking-widest text-[#0E1909]/50">{label}</p>
      <p className="mt-0.5 font-display text-xl font-bold text-[#0E1909]">{value}</p>
    </div>
  );
}

function avgStake(reqs: SynergyRequest[]): number {
  const withStake = reqs.filter((r) => r.stake != null && r.stake > 0);
  if (withStake.length === 0) return 0;
  return Math.round(withStake.reduce((a, r) => a + (r.stake ?? 0), 0) / withStake.length);
}

const TOP_FOUNDERS: Founder[] = [
  { id: "1", email: "", handle: "sofiawren", name: "Sofia Wren", title: "Loomwave", avatarUrl: "/avatars/sofia.svg", isCurrent: false },
  { id: "2", email: "", handle: "devrishi", name: "Devrishi K.", title: "Helm Labs", avatarUrl: "/avatars/devrishi.svg", isCurrent: false },
  { id: "3", email: "", handle: "tobidez", name: "Tobi Adebayo", title: "Stackpile", avatarUrl: "/avatars/tobi.svg", isCurrent: false },
  { id: "4", email: "", handle: "maya", name: "Maya Okafor", title: "Ledgerline", avatarUrl: "/avatars/maya.svg", isCurrent: false },
  { id: "5", email: "", handle: "kwame", name: "Kwame Mensah", title: "Draftpilot", avatarUrl: "/avatars/kwame.svg", isCurrent: false },
];
