"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Project } from "@/lib/preship-types";
import { ProjectMark } from "../avatars";
import { StageChip, Tag } from "../badges";
import { STAGE_ORDER, ALPHA_STAGES } from "@/lib/preship";
import { ArrowRight, Globe, Pencil } from "lucide-react";

export function ProjectCard({
  project,
  isOwner,
  onEdit,
}: {
  project: Project;
  isOwner: boolean;
  onEdit: () => void;
}) {
  const [hover, setHover] = useState(false);

  // Stage progression as a single value — drives the slim bar fill. STAGE_ORDER
  // is 0-indexed, so the current stage fills up to (idx+1)/6.
  const stageIdx = STAGE_ORDER[project.alphaStage] ?? 0;
  const progress = ((stageIdx + 1) / ALPHA_STAGES.length) * 100;

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="terminal-card group hover:border-[#0E1909]/25 hover:shadow-[0_6px_16px_rgba(14,25,9,0.08),0_2px_6px_rgba(14,25,9,0.05)]"
    >
      <div className="space-y-3 p-5">
        {/* header: mark + name + tagline, edit on hover */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3.5">
            <ProjectMark
              mark={project.logoMark}
              color={project.logoColor}
              logoUrl={project.logoUrl}
              name={project.name}
              size={44}
            />
            <div className="min-w-0">
              <h3 className="truncate font-display text-lg font-semibold text-[#0E1909]">
                {project.name}
              </h3>
              <p className="truncate font-mono text-[13px] text-[#0E1909]/55">
                {project.tagline}
              </p>
            </div>
          </div>
          {isOwner && (
            <button
              onClick={onEdit}
              className={cn(
                "tactile-flat shrink-0 rounded p-1.5 text-[#0E1909]/40 hover:bg-[#0E1909]/5 hover:text-[#0E1909]",
                hover ? "opacity-100" : "opacity-0"
              )}
              aria-label="Edit project"
            >
              <Pencil size={15} />
            </button>
          )}
        </div>

        {/* description */}
        {project.description && (
          <p className="line-clamp-2 text-[13px] leading-relaxed text-[#0E1909]/65">
            {project.description}
          </p>
        )}

        {/* meta: stage chip + category + website */}
        <div className="flex flex-wrap items-center gap-2">
          <StageChip stage={project.alphaStage} active />
          <Tag>{project.category}</Tag>
          {project.website && (
            <span className="inline-flex items-center gap-1 font-mono text-xs text-[#0E1909]/50">
              <Globe size={11} className="shrink-0" />
              <span className="truncate">{project.website}</span>
            </span>
          )}
        </div>

        {/* slim stage progress — replaces the heavy 6-step rail. One line,
            lime fill, stage code at the end. Quiet, but informative. */}
        <div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-[#0E1909]/8">
            <div
              className="h-full rounded-full bg-[#DAFF01] transition-[width] duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* footer: stats + attribution / owner badge */}
      <div className="flex items-center justify-between gap-2 border-t border-[#0E1909]/8 px-5 py-3">
        <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[#0E1909]/45">
          <span>{project._count?.posts ?? 0} posts</span>
          <span className="text-[#0E1909]/20">·</span>
          <span>{project._count?.synergyRequests ?? 0} broadcasts</span>
        </div>
        {project.founder && !isOwner ? (
          <span className="flex items-center gap-1 font-mono text-xs uppercase tracking-widest text-[#0E1909]/50">
            by @{project.founder.handle} <ArrowRight size={11} />
          </span>
        ) : isOwner ? (
          <span className="rounded bg-[#DAFF01] px-2 py-1 font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]">
            your project
          </span>
        ) : null}
      </div>
    </div>
  );
}
