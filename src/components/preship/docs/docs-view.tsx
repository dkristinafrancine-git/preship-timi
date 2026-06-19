"use client";

import { ViewHeader } from "../view-header";
import { TerminalHeader, Tag } from "../badges";
import {
  Radio,
  Zap,
  Mic,
  Boxes,
  PenLine,
  User,
  Target,
  Flag,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Docs view — a static glossary of Preship's features.
 *
 * Each section is a terminal-style card with the feature name as the
 * heading, a definition paragraph, and a "goals" bullet list. No API calls.
 */
type DocSection = {
  id: string;
  name: string;
  code: string;
  icon: typeof Radio;
  definition: string;
  goals: string[];
};

const SECTIONS: DocSection[] = [
  {
    id: "war-room-overview",
    name: "The Alpha War Room",
    code: "WR-00",
    icon: Flag,
    definition:
      "Preship is a structured, high-intent social network built for Alpha Stage Founders — the people who are still discovering, validating, and shipping the first versions of their products. The War Room is the room you wish you had been in all along: a room of founders broadcasting real progress, calling out real bottlenecks, and backing each other with handshakes instead of empty likes. We collaborate in broad daylight.",
    goals: [
      "Replace doomscrolling with high-signal founder progress",
      "Make every broadcast accountable to a real project + stage",
      "Reward handshakes (real commitments) over likes (cheap signals)",
    ],
  },
  {
    id: "war-room",
    name: "War Room",
    code: "WR",
    icon: Radio,
    definition:
      "The main feed of the network. Founders broadcast text or audio progress updates tied to a project and an alpha sub-stage. Every post can be liked, reposted, or met with a handshake — a signal that you're actually backing this person's next move. Comments thread under posts so peers can dig in.",
    goals: [
      "Daily progress broadcasts tied to a project + alpha stage",
      "Three reactions: like, repost, handshake (the high-intent one)",
      "Threaded comments for follow-up questions and wins",
      "Audio posts with waveform playback for talking-through updates",
    ],
  },
  {
    id: "synergy",
    name: "Synergy",
    code: "SY",
    icon: Zap,
    definition:
      "A bottleneck-broadcast + bounty + handshake marketplace. A founder posts the bottleneck blocking their next milestone, the need (what would unblock them), a bounty type (equity, advisor shares, revenue share, co-founder offer, or barter), and an optional stake. Other founders make offers — pitches to solve the bottleneck. The broadcaster accepts one, creating a handshake that shows up as a gathered bounty on their profile.",
    goals: [
      "Turn 'I'm stuck' into 'I have 3 offers to unblock me by Friday'",
      "Match by skills (your profile skills ↔ broadcast tags)",
      "Five bounty types: equity, advisor shares, revenue share, co-founder, barter",
      "Accept an offer → it lands on your profile as a gathered bounty",
    ],
  },
  {
    id: "idealab",
    name: "IdeaLab",
    code: "IL",
    icon: Mic,
    definition:
      "Invite-only audio ideation rooms. A host schedules a session around a thesis, opens specific roles (host, co-host, technical lead, design lead, product lead, marketing lead, participant), and shares an invite code. Seats are capped. Sessions go live at the scheduled time and end on demand. Founders can also mark interest before signing up.",
    goals: [
      "Small, role-bound audio rooms — not broadcast podcasts",
      "Invite codes keep rooms invite-only and high-trust",
      "Open roles fill the seats the host actually needs",
      "Live status, countdown, and end-session control for the host",
    ],
  },
  {
    id: "brain-dump",
    name: "Brain Dump",
    code: "BD",
    icon: PenLine,
    definition:
      "Long-form articles by founders, for founders. Posts have a title, subtitle, body, optional tags, and a cover color. Published articles are listed publicly; drafts are only visible to the author. Any reader can clap once per article — claps are the signal for 'this is worth re-reading'.",
    goals: [
      "Founder-perspective essays on distribution, beta lessons, discovery",
      "Drafts visible only to the author until published",
      "Single clap per reader — no infinite likes",
      "Cover-color customization for visual rhythm on the index",
    ],
  },
  {
    id: "projects",
    name: "Projects",
    code: "PR",
    icon: Boxes,
    definition:
      "Every founder has Projects, and each Project is tagged with one of six alpha sub-stages (CD → PV → PT → CB → PB → PL). A project carries a name, tagline, description, category, optional website, and an uploaded logo mark. Posts, synergy broadcasts, and IdeaLab sessions can all be tied back to a project, so the network always knows what stage a founder is shipping through.",
    goals: [
      "Stage-tagged projects so context is always one glance away",
      "Uploadable logo (auto-compressed to 400×400)",
      "Posts, broadcasts, and sessions reference the project they belong to",
      "Project list filtered by stage + category",
    ],
  },
  {
    id: "profile",
    name: "Profile",
    code: "PF",
    icon: User,
    definition:
      "Your founder identity: avatar, name, handle, title, bio, location, skills, and a shareable toggle. When 'shareable' is on, your gathered bounties are visible on your public profile link — proof that other founders have backed you. Skills you list are used to match you with synergy broadcasts.",
    goals: [
      "One identity across the network — no separate 'company' profile",
      "Skills power synergy matching — list the things you can actually help with",
      "Gathered bounties = proof of backed work, visible when shareable",
      "Copy-link to share your profile outside the network",
    ],
  },
  {
    id: "alpha-sub-stages",
    name: "Alpha Sub-Stages",
    code: "AS",
    icon: Target,
    definition:
      "Six sub-stages that describe where a project is in the alpha journey. Every Project is tagged with exactly one. The stages are progressive — you don't have to be 'shipping' to belong, you just have to be honest about where you are.",
    goals: [
      "CD — Customer Discovery: talking to users, mapping the problem",
      "PV — Problem Validation: confirming the pain is real + worth solving",
      "PT — Prototyping: building the first clickable / usable version",
      "CB — Closed Beta: a small invited group is using it for real",
      "PB — Public Beta: anyone can sign up; you're scaling usage, not polish",
      "PL — Pre-Launch: nearly ready to call it 'launched' — last mile",
    ],
  },
];

export function DocsView() {
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <ViewHeader
        title="Docs"
        code="/docs"
        sub="glossary · feature definitions · goals"
      />

      {/* Manifesto strip */}
      <div className="terminal-card">
        <TerminalHeader label="manifesto · preship" />
        <div className="space-y-3 p-5">
          <p className="font-display text-base font-semibold leading-snug text-[#0E1909]">
            Preship is the alpha war room — a room of founders broadcasting real
            progress, calling out real bottlenecks, and backing each other with
            real handshakes.
          </p>
          <p className="font-mono text-xs leading-relaxed text-[#0E1909]/60">
            We collaborate in broad daylight. Every post is tied to a project
            and a stage. Every broadcast asks for a specific unblock. Every
            handshake is a commitment, not a like.
          </p>
        </div>
      </div>

      {/* Glossary sections */}
      {SECTIONS.map((section) => {
        const Icon = section.icon;
        return (
          <section
            key={section.id}
            id={section.id}
            className="terminal-card scroll-mt-32"
          >
            <TerminalHeader
              label={`feature · ${section.code}`}
              right={<Tag>{section.code}</Tag>}
            />
            <div className="space-y-4 p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#0E1909]/12 bg-[#f8f9f3]">
                  <Icon size={17} className="text-[#0E1909]/70" />
                </span>
                <div className="min-w-0">
                  <h2 className="font-display text-lg font-semibold tracking-tight text-[#0E1909]">
                    {section.name}
                  </h2>
                  <p className="mt-0.5 font-mono text-xs uppercase tracking-widest text-[#0E1909]/45">
                    {section.code} · definition
                  </p>
                </div>
              </div>

              <p className="font-display text-[15px] leading-relaxed text-[#0E1909]/80">
                {section.definition}
              </p>

              <div>
                <p className="mb-2 flex items-center gap-1.5 font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/55">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#DAFF01] ring-1 ring-[#0E1909]" />
                  goals
                </p>
                <ul className="space-y-1.5">
                  {section.goals.map((g, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 font-mono text-[13px] leading-relaxed text-[#0E1909]/70"
                    >
                      <span
                        aria-hidden
                        className="mt-1.5 shrink-0 font-bold text-[#0E1909]/40"
                      >
                        →
                      </span>
                      <span>{g}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        );
      })}

      {/* Footer note */}
      <div
        className={cn(
          "rounded-md border border-dashed border-[#0E1909]/15 bg-[#f8f9f3] px-5 py-4 text-center"
        )}
      >
        <p className="font-mono text-xs uppercase tracking-widest text-[#0E1909]/50">
          more sections coming · this glossary grows with the product →
        </p>
      </div>
    </div>
  );
}
