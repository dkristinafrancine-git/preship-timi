"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useMutate } from "@/lib/use-api";
import type { Article } from "@/lib/preship-types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Loader2, PenLine, Hash } from "lucide-react";

/** Preset cover colors aligned with the Preship brand. */
const COVER_COLORS = [
  { id: "ink", value: "#0E1909", label: "Ink" },
  { id: "lime", value: "#DAFF01", label: "Lime" },
  { id: "moss", value: "#6f8a3e", label: "Moss" },
  { id: "deep", value: "#2a3a1f", label: "Deep" },
  { id: "clay", value: "#b34a3a", label: "Clay" },
  { id: "rust", value: "#c97a2f", label: "Rust" },
];

export function ArticleEditorDialog({
  open,
  onOpenChange,
  article,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** When provided, the dialog edits this article (PATCH). Otherwise it creates (POST). */
  article?: Article | null;
}) {
  const mutate = useMutate();
  const isEdit = !!article;

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [coverColor, setCoverColor] = useState<string>(COVER_COLORS[0].value);
  const [published, setPublished] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // sync local form state from the article prop when opening.
  // Draft-editor pattern: initialize from server snapshot on open.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) return;
    if (article) {
      setTitle(article.title);
      setSubtitle(article.subtitle ?? "");
      setBody(article.body);
      setTags(article.tags ?? "");
      setCoverColor(article.coverColor || COVER_COLORS[0].value);
      setPublished(article.published);
    } else {
      setTitle("");
      setSubtitle("");
      setBody("");
      setTags("");
      setCoverColor(COVER_COLORS[0].value);
      setPublished(false);
    }
  }, [open, article]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const canSubmit = title.trim().length > 0 && body.trim().length > 0;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    const payload = {
      title: title.trim(),
      subtitle: subtitle.trim() || null,
      body: body,
      tags: tags.trim() || null,
      published,
      coverColor,
    };
    const res = isEdit
      ? await mutate(`/api/articles/${article!.id}`, { method: "PATCH", body: payload })
      : await mutate("/api/articles", { method: "POST", body: payload });
    setSubmitting(false);
    if (res.ok) {
      toast.success(
        published
          ? isEdit
            ? "Article updated & published →"
            : "Article published →"
          : isEdit
          ? "Draft saved →"
          : "Draft created →"
      );
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-0 overflow-hidden border-[#0E1909]/15 bg-white p-0 sm:rounded-lg">
        <DialogHeader className="border-b border-[#0E1909]/10 bg-[#0E1909] px-5 py-4 text-left">
          <div className="flex items-center gap-2">
            <PenLine size={16} className="text-[#DAFF01]" />
            <DialogTitle className="font-display text-base font-semibold text-[#DAFF01]">
              {isEdit ? "Edit article" : "Write an article"}
            </DialogTitle>
          </div>
          <DialogDescription className="font-mono text-xs uppercase tracking-widest text-white/50">
            brain-dump · build in public
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto p-5 scroll-thin">
          {/* cover color */}
          <div>
            <Label className="font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/60">
              cover color
            </Label>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {COVER_COLORS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCoverColor(c.value)}
                  className={cn(
                    "tactile-flat flex h-8 w-8 items-center justify-center rounded-md border-2",
                    coverColor === c.value
                      ? "border-[#0E1909] ring-2 ring-[#DAFF01] ring-offset-1"
                      : "border-[#0E1909]/12"
                  )}
                  style={{ background: c.value }}
                  title={c.label}
                  aria-label={`Cover color: ${c.label}`}
                >
                  {coverColor === c.value && (
                    <span
                      className="font-mono text-xs font-bold"
                      style={{ color: c.value.toLowerCase() === "#daff01" ? "#0E1909" : "#DAFF01" }}
                    >
                      ✓
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* title */}
          <div>
            <Label className="font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/60">
              title
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="A high-signal headline"
              className="mt-1.5 border-[#0E1909]/12 bg-white font-display text-base focus-visible:ring-[#DAFF01]"
            />
          </div>

          {/* subtitle */}
          <div>
            <Label className="font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/60">
              subtitle (optional)
            </Label>
            <Input
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="One-line context for the article"
              className="mt-1.5 border-[#0E1909]/12 bg-white font-display text-sm focus-visible:ring-[#DAFF01]"
            />
          </div>

          {/* body */}
          <div>
            <Label className="font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/60">
              body
            </Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your article. Markdown-style plain text — line breaks preserved."
              className="mt-1.5 min-h-[260px] resize-y border-[#0E1909]/12 bg-white font-display text-[15px] leading-[1.7] text-[#0E1909] focus-visible:ring-[#DAFF01]"
            />
          </div>

          {/* tags */}
          <div>
            <Label className="font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/60">
              tags
            </Label>
            <div className="mt-1.5 flex h-9 items-center gap-1.5 rounded-md border border-[#0E1909]/12 bg-white px-2.5">
              <Hash size={13} className="text-[#0E1909]/40" />
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="comma-separated, e.g. distribution, beta-lessons"
                className="flex-1 bg-transparent font-mono text-xs text-[#0E1909] outline-none placeholder:text-[#0E1909]/35"
              />
            </div>
          </div>

          {/* publish toggle */}
          <div className="flex items-center justify-between rounded-md border border-[#0E1909]/12 bg-[#f8f9f3] p-3">
            <div className="min-w-0">
              <p className="font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/70">
                publish immediately
              </p>
              <p className="mt-0.5 font-mono text-xs text-[#0E1909]/45">
                {published ? "visible to the founder network" : "saved as a private draft"}
              </p>
            </div>
            <Switch
              checked={published}
              onCheckedChange={setPublished}
            />
          </div>
        </div>

        {/* footer */}
        <div className="flex items-center justify-between border-t border-[#0E1909]/10 bg-[#f8f9f3] px-5 py-3">
          <span className="font-mono text-xs uppercase tracking-widest text-[#0E1909]/40">
            {canSubmit
              ? published
                ? "publishing to brain dump"
                : "saving as draft"
              : "title + body required"}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="font-mono text-xs uppercase tracking-widest text-[#0E1909]/60"
            >
              cancel
            </Button>
            <Button
              size="sm"
              onClick={submit}
              disabled={submitting || !canSubmit}
              className="bg-[#DAFF01] font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909] cta-lime hover:bg-[#c4e600] disabled:opacity-50"
            >
              {submitting ? <Loader2 size={12} className="animate-spin" /> : null}
              {published ? "publish →" : isEdit ? "save draft →" : "save draft →"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
