"use client";

import { use } from "react";
import { cn } from "@/lib/utils";
import { useApi } from "@/lib/use-api";
import { FounderAvatar } from "../avatars";
import { FoundingBadge, StageChip, Tag } from "../badges";
import { ViewHeader } from "../view-header";
import { ApiErrorState } from "../api-error-state";
import { ProjectMark } from "../avatars";
import { Loader2, MapPin, Trophy, Boxes, ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";

type ByHandleFounder = {
  id: string;
  name: string;
  handle: string;
  title: string;
  bio: string | null;
  location: string | null;
  avatarUrl: string | null;
  isFoundingMember: boolean;
  skills: string | null;
  createdAt: string;
};

type ByHandleResponse = {
  founder: ByHandleFounder;
  projectCount: number;
  bountyCount: number;
};

/**
 * Read-only public founder profile for the /f/[username] route.
 *
 * Uses the lightweight /api/founders/by-handle endpoint (founder + counts).
 * Unlike the in-app ProfileView, this is display-only: no edit controls, no
 * bounties-visibility toggle. Logged-in founders can still follow via the
 * FounderHoverCard on hover.
 */
export function PublicProfileView({ handle }: { handle: string }) {
  const { data, loading, error, refetch } = useApi<ByHandleResponse>(
    `/api/founders/by-handle?handle=${encodeURIComponent(handle)}`
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-[#0E1909]/40">
        <Loader2 size={18} className="animate-spin" />
        <span className="ml-2 font-mono text-xs uppercase tracking-widest">
          loading profile…
        </span>
      </div>
    );
  }

  if (error || !data?.founder) {
    return (
      <ApiErrorState
        onRetry={refetch}
        message={
          error?.includes("404")
            ? `No founder @${handle}.`
            : "Couldn't load this profile."
        }
      />
    );
  }

  const { founder, projectCount, bountyCount } = data;
  const skills = founder.skills
    ? founder.skills.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <ViewHeader
        title={founder.name}
        code={`@${founder.handle}`}
        sub="public founder profile"
      />

      {/* identity card */}
      <div className="terminal-card">
        <div className="flex items-start gap-4 p-5">
          <FounderAvatar founder={founder} size={88} />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 font-display text-xl font-semibold text-[#0E1909]">
              <span className="truncate">{founder.name}</span>
              <FoundingBadge show={founder.isFoundingMember} />
            </p>
            <p className="font-mono text-sm text-[#0E1909]/55">@{founder.handle}</p>
            {founder.title && (
              <p className="mt-1 font-mono text-xs text-[#0E1909]/65">{founder.title}</p>
            )}
          </div>
        </div>

        {founder.bio && (
          <p className="border-t border-[#0E1909]/8 px-5 py-4 font-display text-[15px] leading-relaxed text-[#0E1909]/80">
            {founder.bio}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-4 border-t border-[#0E1909]/8 px-5 py-3.5">
          {founder.location && (
            <span className="flex items-center gap-1.5 font-mono text-xs text-[#0E1909]/55">
              <MapPin size={12} /> {founder.location}
            </span>
          )}
          <span className="flex items-center gap-1.5 font-mono text-xs text-[#0E1909]/55">
            <Boxes size={12} /> {projectCount} project{projectCount === 1 ? "" : "s"}
          </span>
          <span className="flex items-center gap-1.5 font-mono text-xs text-[#0E1909]/55">
            <Trophy size={12} /> {bountyCount} handshake{bountyCount === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      {/* skills */}
      {skills.length > 0 && (
        <div className="terminal-card p-5">
          <p className="mb-2.5 font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/50">
            skills · {skills.length}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {skills.map((s) => (
              <Tag key={s}>{s}</Tag>
            ))}
          </div>
        </div>
      )}

      {/* join CTA for viewers */}
      <div className="rounded-lg border border-[#0E1909]/12 bg-[#f4ffd6] p-5 text-center">
        <p className="font-display text-[15px] font-semibold text-[#0E1909]">
          Building something pre-launch?
        </p>
        <p className="mx-auto mt-1.5 max-w-[42ch] font-mono text-xs leading-relaxed text-[#0E1909]/65">
          Join the alpha war room — broadcast bottlenecks, match collaborators,
          and ideate in invite-only rooms.
        </p>
        <Link
          href="/signup"
          className="cta-lime mt-3.5 inline-flex h-9 items-center gap-1.5 rounded-md bg-[#DAFF01] px-4 font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909] hover:bg-[#c4e600]"
        >
          request access <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  );
}
