"use client";

import { useState } from "react";
import { useApi } from "@/lib/use-api";
import { usePreship } from "@/lib/preship-store";
import { ProjectCard } from "./project-card";
import { ProjectDialog } from "./project-dialog";
import type { Project } from "@/lib/preship-types";
import { ALPHA_STAGES } from "@/lib/preship";
import { Loader2, Plus, Boxes, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

export function ProjectsView() {
  const me = usePreship((s) => s.me);
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [scope, setScope] = useState<"mine" | "all">("mine");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);

  const url = scope === "mine" && me ? `/api/projects?founderId=${me.id}` : "/api/projects";
  const { data, loading } = useApi<{ projects: Project[] }>(url, [scope, stageFilter]);
  const all = data?.projects ?? [];
  const projects = stageFilter === "all" ? all : all.filter((p) => p.alphaStage === stageFilter);

  const openNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (p: Project) => {
    setEditing(p);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Hero */}
      <div className="overflow-hidden rounded-lg border border-[#0E1909]/12 bg-[#0E1909]">
        <div className="bg-grid-dark px-5 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Boxes size={14} className="text-[#DAFF01]" />
                <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#DAFF01]">
                  projects · your startups
                </span>
              </div>
              <h2 className="mt-1 font-display text-lg font-semibold text-white">
                Multiple projects. Separate sub-stages.
              </h2>
              <p className="mt-0.5 font-mono text-xs text-white/55">
                register each startup · set its alpha sub-stage · post & broadcast as the founder
              </p>
            </div>
            <button
              onClick={openNew}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#DAFF01] px-3.5 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-widest text-[#0E1909] transition hover:bg-[#c4e600]"
            >
              <Plus size={13} /> add a project →
            </button>
          </div>
        </div>
      </div>

      {/* Scope + stage filter */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-md border border-[#0E1909]/12 bg-white p-0.5">
          {(["mine", "all"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setScope(s)}
              className={cn(
                "rounded px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-widest transition",
                scope === s ? "bg-[#DAFF01] text-[#0E1909]" : "text-[#0E1909]/55 hover:text-[#0E1909]"
              )}
            >
              {s === "mine" ? "my projects" : "network"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-[#0E1909]/40">
            <Filter size={11} /> stage:
          </span>
          <button
            onClick={() => setStageFilter("all")}
            className={cn(
              "shrink-0 rounded border px-2 py-1 font-mono text-[10px] uppercase tracking-widest transition",
              stageFilter === "all"
                ? "border-[#0E1909] bg-[#0E1909] text-[#DAFF01]"
                : "border-[#0E1909]/15 bg-white text-[#0E1909]/55 hover:border-[#0E1909]"
            )}
          >
            all
          </button>
          {ALPHA_STAGES.map((s) => (
            <button
              key={s}
              onClick={() => setStageFilter(s)}
              className={cn(
                "shrink-0 rounded border px-2 py-1 font-mono text-[10px] uppercase tracking-widest transition",
                stageFilter === s
                  ? "border-[#0E1909] bg-[#0E1909] text-[#DAFF01]"
                  : "border-[#0E1909]/15 bg-white text-[#0E1909]/55 hover:border-[#0E1909]"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading && projects.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-[#0E1909]/40">
          <Loader2 size={18} className="animate-spin" />
          <span className="ml-2 font-mono text-xs uppercase tracking-widest">loading projects…</span>
        </div>
      ) : projects.length === 0 ? (
        <div className="terminal-card py-16 text-center">
          <Boxes size={28} className="mx-auto text-[#0E1909]/20" />
          <p className="mt-2 font-mono text-xs uppercase tracking-widest text-[#0E1909]/40">
            {scope === "mine" ? "no projects yet · add your first startup →" : "no projects in this filter"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {projects.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              isOwner={me?.id === p.founderId}
              onEdit={() => openEdit(p)}
            />
          ))}
        </div>
      )}

      <ProjectDialog open={dialogOpen} onOpenChange={setDialogOpen} project={editing} />
    </div>
  );
}
