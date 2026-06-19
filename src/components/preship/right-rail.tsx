"use client";

import { cn } from "@/lib/utils";
import { usePreship } from "@/lib/preship-store";
import { useApi } from "@/lib/use-api";
import { TerminalHeader, StatusPill, StageChip, Tag } from "./badges";
import { FounderAvatar, ProjectMark } from "./avatars";
import { FounderHoverCard } from "./founder-hover-card";
import type { Founder, Project, SynergyRequest, IdeaLabSession, FeedPost } from "@/lib/preship-types";
import { fmtRelative } from "@/lib/preship";
import { TrendingUp, Flame, Users, Calendar, ArrowRight } from "lucide-react";

export function RightRail() {
  const view = usePreship((s) => s.view);
  return (
    <aside className="hidden w-[320px] shrink-0 space-y-5 lg:sticky lg:top-[96px] lg:h-[calc(100vh-96px)] lg:block lg:overflow-y-auto lg:pb-8 scroll-thin">
      {view === "war-room" && <WarRoomRail />}
      {view === "synergy" && <SynergyRail />}
      {view === "idealab" && <IdeaLabRail />}
      {view === "projects" && <ProjectsRail />}
      {view === "profile" && <ProfileRail />}
      {(view === "search" || view === "brain-dump" || view === "settings" || view === "docs") && <GenericRail />}
    </aside>
  );
}

function WarRoomRail() {
  const { data: trending } = useApi<{ posts: FeedPost[] }>("/api/feed?sort=trending");
  const { data: me } = useApi<{ user: Founder; projects: Project[] }>("/api/me");
  const { data: topData } = useApi<{ founders: Founder[] }>("/api/founders/top");
  const navigate = usePreship((s) => s.navigate);
  const trendingTop = trending?.posts?.slice(0, 4) ?? [];
  const topFounders = topData?.founders ?? [];

  return (
    <>
      {/* Alpha founders leaderboard */}
      <div className="terminal-card">
        <TerminalHeader label="top-founders · last-30d" />
        <div className="p-4">
          <div className="mb-3 flex items-center gap-2 text-[#0E1909]/50">
            <Flame size={14} />
            <span className="font-mono text-xs uppercase tracking-widest">highest-intent signal</span>
          </div>
          {topFounders.length === 0 ? (
            <p className="py-4 text-center font-mono text-xs text-[#0E1909]/40">no signal yet</p>
          ) : (
            <ul className="space-y-1.5">
              {topFounders.map((f, i) => (
                <li key={f.handle} className="hover-row -mx-1.5 flex items-center gap-2.5 rounded-md px-1.5 py-1.5">
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded font-mono text-xs font-bold",
                      i === 0 ? "bg-[#DAFF01] text-[#0E1909]" : "bg-[#0E1909]/8 text-[#0E1909]/60"
                    )}
                  >
                    {i + 1}
                  </span>
                  <FounderAvatar founder={f} size={30} />
                  <div className="min-w-0 flex-1">
                    <FounderHoverCard founder={f} className="block truncate font-display text-[13px] font-semibold text-[#0E1909]">
                      {f.name}
                    </FounderHoverCard>
                    <p className="truncate font-mono text-xs text-[#0E1909]/50">@{f.handle}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Trending posts */}
      <div className="terminal-card">
        <TerminalHeader label="trending · now" right={<TrendingUp size={14} className="text-[#0E1909]/40" />} />
        <div className="divide-y divide-[#0E1909]/8">
          {trendingTop.map((p) => (
            <button
              key={p.id}
              onClick={() => navigate({ view: "war-room", postId: p.id })}
              className="hover-row block w-full cursor-pointer px-4 py-3 text-left"
            >
              <div className="flex items-center gap-2">
                <FounderAvatar founder={p.author} size={24} />
                <FounderHoverCard founder={p.author} className="truncate font-display text-[13px] font-medium text-[#0E1909]">
                  {p.author.name}
                </FounderHoverCard>
                <span className="font-mono text-xs text-[#0E1909]/45">{fmtRelative(p.createdAt)}</span>
              </div>
              <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-[#0E1909]/70">{p.body ?? p.audioTitle}</p>
              <div className="mt-2 flex items-center gap-1">
                {p._count.reactions.handshake > 0 && (
                  <Tag>↪ {p._count.reactions.handshake} handshake</Tag>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* My projects quick status */}
      {me?.projects?.length ? (
        <div className="terminal-card">
          <TerminalHeader label="my-projects · status" />
          <div className="space-y-1.5 p-4">
            {me.projects.slice(0, 3).map((p) => (
              <button
                key={p.id}
                onClick={() => navigate({ view: "projects" })}
                className="hover-row -mx-1.5 flex w-full items-center gap-2.5 rounded-md px-1.5 py-1.5 text-left"
              >
                <ProjectMark mark={p.logoMark} color={p.logoColor} logoUrl={p.logoUrl} name={p.name} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-[13px] font-semibold text-[#0E1909]">{p.name}</p>
                  <p className="truncate font-mono text-xs text-[#0E1909]/50">{p.tagline}</p>
                </div>
                <StageChip stage={p.alphaStage} />
              </button>
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
            <p className="mb-2 font-mono text-xs uppercase tracking-widest text-[#0E1909]/50">
              bounty mix
            </p>
            <div className="space-y-2">
              {Object.entries(byBounty).map(([k, v]) => (
                <div key={k} className="flex items-center gap-2">
                  <span className="w-28 truncate font-mono text-xs text-[#0E1909]/70">
                    {bountyLabels[k] ?? k}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#0E1909]/8">
                    <div
                      className="h-full rounded-full bg-[#DAFF01]"
                      style={{ width: `${(v / open.length) * 100}%` }}
                    />
                  </div>
                  <span className="w-5 text-right font-mono text-xs font-semibold text-[#0E1909]">
                    {v}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-[#0E1909]/12 bg-[#f4ffd6] p-4">
        <p className="font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/60">
          how synergy works
        </p>
        <ol className="mt-2.5 space-y-2 text-[13px] leading-relaxed text-[#0E1909]/80">
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
        <TerminalHeader label="idealab · live-now" right={<span className="font-mono text-xs text-[#e0463c]">●REC</span>} />
        <div className="p-4">
          {live.length === 0 ? (
            <p className="font-mono text-[13px] text-[#0E1909]/50">No live rooms. Schedule one →</p>
          ) : (
            <ul className="space-y-3">
              {live.map((s) => (
                <li key={s.id} className="rounded-md border border-[#0E1909]/12 bg-[#0E1909] p-3.5">
                  <StatusPill status="live" />
                  <p className="mt-2.5 font-display text-[15px] font-semibold leading-snug text-white">{s.title}</p>
                  <div className="mt-2.5 flex items-center gap-2">
                    <FounderAvatar founder={s.host} size={22} />
                    <span className="font-mono text-xs text-[#DAFF01]/70">@{s.host.handle}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-[#0E1909]/12 bg-[#0E1909] p-4 text-white">
        <div className="flex items-center gap-2">
          <Calendar size={15} className="text-[#DAFF01]" />
          <span className="font-mono text-xs font-semibold uppercase tracking-widest text-[#DAFF01]">
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
          <p className="mb-2.5 font-mono text-xs uppercase tracking-widest text-[#0E1909]/50">
            founders by alpha sub-stage
          </p>
          <div className="space-y-2">
            {Object.entries(byStage).map(([stage, count]) => (
              <div key={stage} className="flex items-center gap-2">
                <span className="w-32 truncate font-mono text-xs text-[#0E1909]/70">{stage}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#0E1909]/8">
                  <div
                    className="h-full rounded-full bg-[#DAFF01]"
                    style={{ width: `${(count / all.length) * 100}%` }}
                  />
                </div>
                <span className="w-5 text-right font-mono text-xs font-semibold text-[#0E1909]">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-[#0E1909]/12 bg-[#f4ffd6] p-4">
        <p className="font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/60">
          alpha sub-stages
        </p>
        <ul className="mt-2.5 space-y-1.5 text-[13px] leading-relaxed text-[#0E1909]/75">
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
    <div className="rounded-md border border-[#0E1909]/10 bg-white p-3">
      <p className="font-mono text-xs uppercase tracking-widest text-[#0E1909]/50">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-[#0E1909]">{value}</p>
    </div>
  );
}

function ProfileRail() {
  const { data: meData } = useApi<{ user: Founder; projects: Project[] }>("/api/me");
  const { data: bountiesData } = useApi<{ bounties: SynergyRequest[] }>(
    "/api/bounties?mine=1"
  );
  const me = meData?.user;
  if (!me) return null;
  const skills = me.skills ? me.skills.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const bounties = bountiesData?.bounties ?? [];

  return (
    <>
      <div className="terminal-card">
        <TerminalHeader label="profile · snapshot" />
        <div className="space-y-3 p-4">
          <div className="grid grid-cols-2 gap-2">
            <Stat label="projects" value={meData?.projects.length ?? 0} />
            <Stat label="bounties" value={bounties.length} />
          </div>
          <div>
            <p className="mb-2 font-mono text-xs uppercase tracking-widest text-[#0E1909]/50">
              your skills · {skills.length}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {skills.length === 0 ? (
                <span className="font-mono text-xs text-[#0E1909]/40">no skills yet — add some for synergy matching</span>
              ) : (
                skills.map((s) => <Tag key={s}>{s}</Tag>)
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-[#0E1909]/12 bg-[#f4ffd6] p-4">
        <p className="font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/60">
          shareable profile
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-[#0E1909]/75">
          Your profile + gathered bounties can be shared with a single link. Toggle
          <span className="font-mono text-[#0E1909]"> bounties public </span>
          to control visibility.
        </p>
      </div>
    </>
  );
}

function avgStake(reqs: SynergyRequest[]): number {
  const withStake = reqs.filter((r) => r.stake != null && r.stake > 0);
  if (withStake.length === 0) return 0;
  return Math.round(withStake.reduce((a, r) => a + (r.stake ?? 0), 0) / withStake.length);
}

/** Generic rail for views that don't have a custom rail (search, brain-dump, settings, docs). */
function GenericRail() {
  const view = usePreship((s) => s.view);
  const label =
    view === "search" ? "search · tips" :
    view === "brain-dump" ? "brain-dump · about" :
    view === "settings" ? "settings · info" :
    "docs · index";
  return (
    <>
      <div className="terminal-card">
        <TerminalHeader label={label} />
        <div className="p-4">
          <p className="text-[13px] leading-relaxed text-[#0E1909]/70">
            {view === "search" && "Search across founders, projects, posts, synergy broadcasts, and articles. Start typing in the search bar — results update as you type."}
            {view === "brain-dump" && "Brain Dump is where founders write long-form articles about their build-in-public journey. Write teardowns, retros, hot takes, and field notes."}
            {view === "settings" && "Settings are preferences only — theme, notifications, and display. To edit your identity (name, bio, avatar, skills), go to your Profile."}
            {view === "docs" && "Docs is the Preship glossary. Every feature is defined with its goals and intended use. Start here if you're new to the alpha war room."}
          </p>
        </div>
      </div>
      <div className="rounded-lg border border-[#0E1909]/12 bg-[#f4ffd6] p-4">
        <p className="font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/60">
          the alpha war room
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-[#0E1909]/75">
          A high-velocity tactical command center where pre-launch founders collaborate, back, and trade leverage in broad daylight.
        </p>
      </div>
    </>
  );
}

