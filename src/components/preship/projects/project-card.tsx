"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Project } from "@/lib/preship-types";
import { ProjectMark } from "../avatars";
import { StageRail, StageChip, Tag } from "../badges";
import { fmtRelative } from "@/lib/preship";
import { ArrowRight, Globe, MoreHorizontal, Pencil } from "lucide-react";

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

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="terminal-card group hover:border-[#0E1909]/25 hover:shadow-[0_6px_16px_rgba(14,25,9,0.08),0_2px_6px_rgba(14,25,9,0.05)]"
    >
      {/* header */}
      <div className="flex items-start justify-between gap-2 p-4 pb-3">
        <div className="flex items-center gap-3">
          <ProjectMark mark={project.logoMark} color={project.logoColor} size={44} />
          <div className="min-w-0">
            <h3 className="font-display text-base font-semibold text-[#0E1909]">{project.name}</h3>
            <p className="truncate font-mono text-[11px] text-[#0E1909]/55">{project.tagline}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isOwner ? (
            <button
              onClick={onEdit}
              className={cn(
                "rounded p-1.5 text-[#0E1909]/40 transition hover:bg-[#0E1909]/5 hover:text-[#0E1909]",
                hover ? "opacity-100" : "opacity-0"
              )}
            >
              <Pencil size={14} />
            </button>
          ) : null}
        </div>
      </div>

      {/* description */}
      {project.description && (
        <p className="px-4 pb-3 text-xs leading-relaxed text-[#0E1909]/65 line-clamp-2">
          {project.description}
        </p>
      )}

      {/* meta */}
      <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
        <Tag>{project.category}</Tag>
        <StageChip stage={project.alphaStage} active />
        {project.website && (
          <span className="inline-flex items-center gap-1 rounded bg-[#0E1909]/5 px-1.5 py-0.5 font-mono text-[10px] text-[#0E1909]/55">
            <Globe size={9} /> {project.website}
          </span>
        )}
      </div>

      {/* stage rail */}
      <div className="border-t border-[#0E1909]/8 bg-[#f8f9f3] px-4 py-3">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="font-mono text-[9px] font-semibold uppercase tracking-widest text-[#0E1909]/45">
            alpha sub-stage progression
          </span>
          <span className="font-mono text-[9px] uppercase tracking-widest text-[#0E1909]/35">
            created {fmtRelative(project.createdAt)} ago
          </span>
        </div>
        <StageRail currentStage={project.alphaStage} />
      </div>

      {/* footer stats */}
      <div className="flex items-center justify-between border-t border-[#0E1909]/8 px-4 py-2.5">
        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-[#0E1909]/45">
          <span>{project._count?.posts ?? 0} posts</span>
          <span>·</span>
          <span>{project._count?.synergyRequests ?? 0} broadcasts</span>
        </div>
        {project.founder && !isOwner && (
          <span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-[#0E1909]/55">
            by @{project.founder.handle} <ArrowRight size={10} />
          </span>
        )}
        {isOwner && (
          <span className="rounded bg-[#DAFF01] px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-widest text-[#0E1909]">
            your project
          </span>
        )}
      </div>
    </div>
  );
}
