"use client";

import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useMutate } from "@/lib/use-api";
import { ALPHA_STAGES, PROJECT_CATEGORIES } from "@/lib/preship";
import { compressAndUpload } from "@/lib/image-compress";
import type { Project } from "@/lib/preship-types";
import { ProjectMark } from "../avatars";
import { cn } from "@/lib/utils";
import { Loader2, Boxes, Pencil, Plus, Camera, Upload, X, Trash2 } from "lucide-react";
import { toast } from "sonner";

// fallback tile color when no logo is uploaded
const FALLBACK_COLOR = "#0E1909";

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function ProjectDialog({
  open,
  onOpenChange,
  project,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  project?: Project | null;
}) {
  const isEdit = !!project;
  // key forces the inner form to remount (and re-init state) when the target changes
  const formKey = project?.id ?? "new";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-0 overflow-hidden border-[#0E1909]/15 bg-white p-0 sm:rounded-lg">
        <DialogHeader className="border-b border-[#0E1909]/10 bg-[#0E1909] px-5 py-4 text-left">
          <div className="flex items-center gap-2">
            {isEdit ? <Pencil size={16} className="text-[#DAFF01]" /> : <Plus size={16} className="text-[#DAFF01]" />}
            <DialogTitle className="font-display text-base font-semibold text-[#DAFF01]">
              {isEdit ? "Edit project" : "Add a project"}
            </DialogTitle>
          </div>
          <DialogDescription className="font-mono text-xs uppercase tracking-widest text-white/50">
            {isEdit ? "update your startup's stage & details" : "register your startup as a founder"}
          </DialogDescription>
        </DialogHeader>

        <ProjectForm key={formKey} project={project} isEdit={isEdit} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function ProjectForm({
  project,
  isEdit,
  onDone,
}: {
  project?: Project | null;
  isEdit: boolean;
  onDone: () => void;
}) {
  const mutate = useMutate();

  // initialize from props directly — the keyed remount guarantees fresh state per target
  const [name, setName] = useState(project?.name ?? "");
  const [tagline, setTagline] = useState(project?.tagline ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [category, setCategory] = useState<string>(project?.category ?? PROJECT_CATEGORIES[0]);
  const [alphaStage, setAlphaStage] = useState<string>(project?.alphaStage ?? ALPHA_STAGES[0]);
  const [logoUrl, setLogoUrl] = useState<string | null>(project?.logoUrl ?? null);
  const [logoMark, setLogoMark] = useState(project?.logoMark ?? "");
  const [website, setWebsite] = useState(project?.website ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const mark = logoMark.trim() || initialsOf(name || "··");

  const handleLogoFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please pick an image file.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Image too large (max 8MB before compression).");
      return;
    }
    try {
      setLogoBusy(true);
      const url = await compressAndUpload(file, 400, 0.85);
      setLogoUrl(url);
      toast.success("Logo compressed + uploaded →");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Logo upload failed");
    } finally {
      setLogoBusy(false);
    }
  };

  const submit = async () => {
    if (!name.trim() || !tagline.trim()) return;
    setSubmitting(true);
    const payload = {
      name: name.trim(),
      tagline: tagline.trim(),
      description: description.trim() || null,
      category,
      alphaStage,
      logoUrl: logoUrl || null,
      logoMark: logoMark.trim() || initialsOf(name.trim()),
      website: website.trim() || null,
    };
    const res = isEdit
      ? await mutate(`/api/projects/${project!.id}`, { method: "PATCH", body: payload })
      : await mutate("/api/projects", { method: "POST", body: payload });
    setSubmitting(false);
    if (res.ok) onDone();
  };

  return (
    <>
      <div className="max-h-[70vh] space-y-4 overflow-y-auto p-5 scroll-thin">
        {/* preview */}
        <div className="flex items-center gap-3 rounded-md border border-dashed border-[#0E1909]/20 bg-[#f8f9f3] p-3">
          <ProjectMark mark={mark} color={FALLBACK_COLOR} logoUrl={logoUrl} name={name || "Your startup"} size={40} />
          <div className="min-w-0">
            <p className="font-display text-sm font-semibold text-[#0E1909]">
              {name || "Your startup"}
            </p>
            <p className="truncate font-mono text-xs text-[#0E1909]/55">
              {tagline || "one-line tagline"}
            </p>
          </div>
          <span className="ml-auto rounded border border-[#0E1909]/15 bg-white px-1.5 py-0.5 font-mono text-xs uppercase tracking-widest text-[#0E1909]/70">
            {alphaStage.split(" ")[0]}
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/60">
              name
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ledgerline"
              className="mt-1.5 border-[#0E1909]/12 bg-white font-display text-sm focus-visible:ring-[#DAFF01]"
            />
          </div>
          <div>
            <Label className="font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/60">
              tagline
            </Label>
            <Input
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="CLI-first bookkeeping for solo operators"
              className="mt-1.5 border-[#0E1909]/12 bg-white font-display text-sm focus-visible:ring-[#DAFF01]"
            />
          </div>
        </div>

        <div>
          <Label className="font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/60">
            description
          </Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What are you building? What stage are you in?"
            className="mt-1.5 min-h-[70px] resize-none border-[#0E1909]/12 bg-white font-display text-sm focus-visible:ring-[#DAFF01]"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/60">
              category
            </Label>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {PROJECT_CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={cn(
                    "rounded border px-2 py-1 font-mono text-xs uppercase tracking-widest tactile-flat",
                    category === c
                      ? "border-[#0E1909] bg-[#0E1909] text-[#DAFF01]"
                      : "border-[#0E1909]/15 bg-white text-[#0E1909]/60 hover:border-[#0E1909]"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/60">
              website (optional)
            </Label>
            <Input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="ledgerline.dev"
              className="mt-1.5 border-[#0E1909]/12 bg-white font-mono text-xs focus-visible:ring-[#DAFF01]"
            />
          </div>
        </div>

        {/* alpha sub-stage */}
        <div>
          <Label className="font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/60">
            current alpha sub-stage
          </Label>
          <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {ALPHA_STAGES.map((s, i) => {
              const active = alphaStage === s;
              const currentIdx = ALPHA_STAGES.indexOf(alphaStage as (typeof ALPHA_STAGES)[number]);
              const past = i < currentIdx;
              return (
                <button
                  key={s}
                  onClick={() => setAlphaStage(s)}
                  className={cn(
                    "flex items-start gap-2 rounded-md border px-2.5 py-2 text-left transition",
                    active
                      ? "border-[#0E1909] bg-[#DAFF01]"
                      : past
                      ? "border-[#0E1909]/20 bg-[#f4ffd6]"
                      : "border-[#0E1909]/12 bg-white hover:border-[#0E1909]/40"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border font-mono text-[8px] font-bold",
                      active
                        ? "border-[#0E1909] bg-[#0E1909] text-[#DAFF01]"
                        : past
                        ? "border-[#0E1909] bg-[#0E1909] text-[#DAFF01]"
                        : "border-[#0E1909]/20 text-[#0E1909]/40"
                    )}
                  >
                    {past ? "✓" : i + 1}
                  </span>
                  <span className="font-display text-xs font-medium leading-tight text-[#0E1909]">
                    {s}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* logo upload + monogram fallback */}
        <div>
          <Label className="font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/60">
            logo · 400×400
          </Label>
          <div className="mt-2 flex items-center gap-3">
            <div className="group relative" style={{ width: 56, height: 56 }}>
              <ProjectMark mark={mark} color={FALLBACK_COLOR} logoUrl={logoUrl} name={name || "Your startup"} size={56} className="size-full" />
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                disabled={logoBusy}
                className="absolute inset-0 flex items-center justify-center rounded-md bg-[#0E1909]/60 opacity-0 transition-opacity group-hover:opacity-100 disabled:cursor-not-allowed"
                aria-label="Upload logo"
              >
                {logoBusy ? (
                  <Loader2 size={18} className="animate-spin text-[#DAFF01]" />
                ) : (
                  <Camera size={18} className="text-[#DAFF01]" />
                )}
              </button>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleLogoFile(f);
                  e.target.value = "";
                }}
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={logoBusy}
                  className="h-8 border-[#0E1909]/15 bg-white font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909] hover:border-[#0E1909]"
                >
                  {logoBusy ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                  upload
                </Button>
                {logoUrl && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => { setLogoUrl(null); toast.success("Logo removed"); }}
                    className="h-8 font-mono text-xs uppercase tracking-widest text-[#0E1909]/55 hover:text-[#e0463c]"
                  >
                    <X size={12} /> remove
                  </Button>
                )}
              </div>
              <p className="mt-1.5 font-mono text-[11px] text-[#0E1909]/40">
                auto-compressed to 400×400 · falls back to monogram if empty
              </p>
            </div>
          </div>
          {/* monogram fallback (only used if no logo uploaded) */}
          {!logoUrl && (
            <div className="mt-3">
              <Label className="font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/60">
                monogram fallback
              </Label>
              <Input
                value={logoMark}
                onChange={(e) => setLogoMark(e.target.value)}
                placeholder={initialsOf(name || "··")}
                maxLength={3}
                className="mt-1.5 h-9 border-[#0E1909]/12 bg-white font-mono text-sm uppercase focus-visible:ring-[#DAFF01]"
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-[#0E1909]/10 bg-[#f8f9f3] px-5 py-3">
        {isEdit ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              if (!confirm(`Delete "${project?.name}"? This cannot be undone.`)) return;
              const res = await mutate(`/api/projects/${project!.id}`, { method: "DELETE" });
              if (res.ok) {
                toast.success("Project deleted →");
                onDone();
              }
            }}
            className="font-mono text-xs font-semibold uppercase tracking-widest text-[#e0463c] hover:bg-[#e0463c]/5"
          >
            <Trash2 size={12} /> delete project
          </Button>
        ) : (
          <span className="font-mono text-xs uppercase tracking-widest text-[#0E1909]/40">
            project is visible to the founder network
          </span>
        )}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onDone}
            className="font-mono text-xs uppercase tracking-widest text-[#0E1909]/60"
          >
            cancel
          </Button>
          <Button
            size="sm"
            onClick={submit}
            disabled={submitting || !name.trim() || !tagline.trim()}
            className="bg-[#DAFF01] font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909] cta-lime hover:bg-[#c4e600] disabled:opacity-50"
          >
            {submitting ? <Loader2 size={12} className="animate-spin" /> : isEdit ? null : <Boxes size={12} />}
            {isEdit ? "save changes →" : "add project →"}
          </Button>
        </div>
      </div>
    </>
  );
}
