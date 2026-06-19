"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApi } from "@/lib/use-api";
import { useMutate } from "@/lib/use-api";
import { BOUNTY_TYPES, PROJECT_CATEGORIES } from "@/lib/preship";
import type { Founder, Project } from "@/lib/preship-types";
import { ProjectMark } from "../avatars";
import { BountyBadge } from "../badges";
import { Loader2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export function BroadcastDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { data: meData } = useApi<{ user: Founder; projects: Project[] }>("/api/me");
  const projects = meData?.projects ?? [];
  const mutate = useMutate();

  const [title, setTitle] = useState("");
  const [bottleneck, setBottleneck] = useState("");
  const [need, setNeed] = useState("");
  const [bountyType, setBountyType] = useState<string>("equity");
  const [stake, setStake] = useState<number>(5);
  const [bountyDetail, setBountyDetail] = useState("");
  const [tags, setTags] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const meta = BOUNTY_TYPES.find((b) => b.id === bountyType)!;
  const needsStake = meta.needsStake;

  const reset = () => {
    setTitle(""); setBottleneck(""); setNeed(""); setBountyType("equity");
    setStake(5); setBountyDetail(""); setTags(""); setProjectId("");
  };

  const submit = async () => {
    if (!title.trim() || !bottleneck.trim() || !need.trim()) return;
    if (needsStake && (!stake || stake <= 0 || stake > 100)) return;
    setSubmitting(true);
    const res = await mutate("/api/synergy", {
      method: "POST",
      body: {
        title: title.trim(),
        bottleneck: bottleneck.trim(),
        need: need.trim(),
        bountyType,
        stake: needsStake ? Number(stake) : null,
        bountyDetail: bountyDetail.trim() || null,
        tags: tags.trim() || null,
        projectId: projectId || null,
      },
    });
    setSubmitting(false);
    if (res.ok) {
      reset();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-0 overflow-hidden border-[#0E1909]/15 bg-white p-0 sm:rounded-lg">
        <DialogHeader className="border-b border-[#0E1909]/10 bg-[#0E1909] px-5 py-4 text-left">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-[#DAFF01]" />
            <DialogTitle className="font-display text-base font-semibold text-[#DAFF01]">
              Broadcast a bottleneck
            </DialogTitle>
          </div>
          <DialogDescription className="font-mono text-[11px] uppercase tracking-widest text-white/50">
            synergy · open a handshake request
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto p-5 scroll-thin">
          {/* Project picker */}
          <div>
            <Label className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#0E1909]/60">
              attach to project (optional)
            </Label>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                onClick={() => setProjectId("")}
                className={cn(
                  "rounded-md border px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-widest transition",
                  !projectId
                    ? "border-[#0E1909] bg-[#0E1909] text-[#DAFF01]"
                    : "border-[#0E1909]/15 bg-white text-[#0E1909]/60 hover:border-[#0E1909]"
                )}
              >
                post as founder
              </button>
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setProjectId(p.id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md border px-2 py-1 transition",
                    projectId === p.id
                      ? "border-[#0E1909] bg-[#DAFF01]"
                      : "border-[#0E1909]/15 bg-white hover:border-[#0E1909]"
                  )}
                >
                  <ProjectMark mark={p.logoMark} color={p.logoColor} size={18} />
                  <span className="font-mono text-[11px] uppercase tracking-wider text-[#0E1909]">
                    {p.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <Label className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#0E1909]/60">
              title
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Need a GTM co-founder for edge-ML runtime"
              className="mt-1.5 border-[#0E1909]/12 bg-white font-display text-sm focus-visible:ring-[#DAFF01]"
            />
          </div>

          {/* Bottleneck */}
          <div>
            <Label className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#0E1909]/60">
              the bottleneck
            </Label>
            <Textarea
              value={bottleneck}
              onChange={(e) => setBottleneck(e.target.value)}
              placeholder="What's blocking you right now? Be specific."
              className="mt-1.5 min-h-[70px] resize-none border-[#0E1909]/12 bg-white font-display text-sm focus-visible:ring-[#DAFF01]"
            />
          </div>

          {/* Need */}
          <div>
            <Label className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#0E1909]/60">
              what you need
            </Label>
            <Textarea
              value={need}
              onChange={(e) => setNeed(e.target.value)}
              placeholder="What kind of help? Be specific about the role/skill."
              className="mt-1.5 min-h-[60px] resize-none border-[#0E1909]/12 bg-white font-display text-sm focus-visible:ring-[#DAFF01]"
            />
          </div>

          {/* Bounty */}
          <div>
            <Label className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#0E1909]/60">
              bounty on the table
            </Label>
            <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {BOUNTY_TYPES.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setBountyType(b.id)}
                  className={cn(
                    "flex flex-col items-start gap-1 rounded-md border px-2.5 py-2 text-left transition",
                    bountyType === b.id
                      ? "border-[#0E1909] bg-[#0E1909] text-[#DAFF01]"
                      : "border-[#0E1909]/15 bg-white text-[#0E1909] hover:border-[#0E1909]"
                  )}
                >
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest opacity-70">
                    {b.short}
                  </span>
                  <span className="font-display text-xs font-medium leading-tight">{b.label}</span>
                </button>
              ))}
            </div>

            {needsStake && (
              <div className="mt-3 rounded-md border border-[#0E1909]/12 bg-[#f8f9f3] p-3">
                <div className="flex items-center justify-between">
                  <Label className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#0E1909]/60">
                    {bountyType === "cofounder" ? "founding equity" : "stake offered"}
                  </Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={0.25}
                      max={bountyType === "cofounder" ? 50 : 25}
                      step={0.25}
                      value={stake}
                      onChange={(e) => setStake(Number(e.target.value))}
                      className="w-40 accent-[#0E1909]"
                    />
                    <span className="w-14 rounded bg-[#DAFF01] px-1.5 py-0.5 text-center font-mono text-xs font-bold text-[#0E1909]">
                      {stake}%
                    </span>
                  </div>
                </div>
              </div>
            )}

            <Textarea
              value={bountyDetail}
              onChange={(e) => setBountyDetail(e.target.value)}
              placeholder="Bounty details — vesting, terms, what they get, what you keep."
              className="mt-2 min-h-[60px] resize-none border-[#0E1909]/12 bg-white font-display text-sm focus-visible:ring-[#DAFF01]"
            />
          </div>

          {/* Tags */}
          <div>
            <Label className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#0E1909]/60">
              tags
            </Label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="gtm, devtools, edge-ml"
              className="mt-1.5 border-[#0E1909]/12 bg-white font-mono text-xs focus-visible:ring-[#DAFF01]"
            />
          </div>

          {/* Preview */}
          <div className="rounded-md border border-dashed border-[#0E1909]/20 bg-[#f8f9f3] p-3">
            <p className="mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-widest text-[#0E1909]/50">
              preview
            </p>
            <div className="flex items-center gap-2">
              <BountyBadge type={bountyType as any} stake={needsStake ? stake : null} />
              <span className="font-display text-sm font-medium text-[#0E1909]">
                {title || "Your broadcast title"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-[#0E1909]/10 bg-[#f8f9f3] px-5 py-3">
          <span className="font-mono text-[10px] uppercase tracking-widest text-[#0E1909]/40">
            broadcasts are public to the founder network
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="font-mono text-[11px] uppercase tracking-widest text-[#0E1909]/60"
            >
              cancel
            </Button>
            <Button
              size="sm"
              onClick={submit}
              disabled={submitting || !title.trim() || !bottleneck.trim() || !need.trim()}
              className="bg-[#DAFF01] font-mono text-[11px] font-semibold uppercase tracking-widest text-[#0E1909] shadow-none hover:bg-[#c4e600] disabled:opacity-50"
            >
              {submitting ? <Loader2 size={12} className="animate-spin" /> : null}
              broadcast →
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
