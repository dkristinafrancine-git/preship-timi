"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useApi, useMutate } from "@/lib/use-api";
import { usePreship } from "@/lib/preship-store";
import { FounderAvatar } from "../avatars";
import { FounderHoverCard } from "../founder-hover-card";
import { Tag } from "../badges";
import { fmtRelative } from "@/lib/preship";
import type { Article } from "@/lib/preship-types";
import { toast } from "sonner";
import {
  Loader2,
  Heart,
  Pencil,
  Trash2,
  PenLine,
  ArrowRight,
} from "lucide-react";

/**
 * Article detail dialog: shows the full article with a clap button.
 * Author-only: edit / delete actions in the footer.
 */
export function ArticleDetailDialog({
  articleId,
  open,
  onOpenChange,
  onEdit,
}: {
  articleId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Called when the author clicks "edit" — parent opens the editor. */
  onEdit: (article: Article) => void;
}) {
  const me = usePreship((s) => s.me);
  const { data, loading } = useApi<{ article: Article }>(
    open && articleId ? `/api/articles/${articleId}` : null,
    [open, articleId]
  );
  const article = data?.article;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-0 overflow-hidden border-[#0E1909]/15 bg-white p-0 sm:rounded-lg">
        <DialogTitle className="sr-only">
          {article?.title ?? "Article"}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Read the full article, clap, and (if you&apos;re the author) edit or delete it.
        </DialogDescription>
        {loading || !article ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 size={20} className="animate-spin text-[#0E1909]/40" />
          </div>
        ) : (
          <ArticleBody
            article={article}
            isAuthor={me?.id === article.authorId}
            onOpenChange={onOpenChange}
            onEdit={onEdit}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ArticleBody({
  article,
  isAuthor,
  onOpenChange,
  onEdit,
}: {
  article: Article;
  isAuthor: boolean;
  onOpenChange: (v: boolean) => void;
  onEdit: (article: Article) => void;
}) {
  const mutate = useMutate();
  const [clapping, setClapping] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // optimistic clap state — the API returns the new state, but we also bump
  // the global tick so the list view refetches with fresh _count.
  const [clapped, setClapped] = useState(article.myClap ?? false);
  const [clapCount, setClapCount] = useState(article._count.claps);

  const tags = article.tags
    ? article.tags.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  const toggleClap = async () => {
    setClapping(true);
    // optimistic
    const nextClapped = !clapped;
    setClapped(nextClapped);
    setClapCount((c) => c + (nextClapped ? 1 : -1));
    const res = await mutate(`/api/articles/${article.id}/clap`, {
      method: "POST",
      body: {},
    });
    setClapping(false);
    if (!res.ok) {
      // revert on failure
      setClapped(!nextClapped);
      setClapCount((c) => c + (nextClapped ? -1 : 1));
    } else {
      const data = res.data as { clapped: boolean } | undefined;
      if (data) {
        setClapped(data.clapped);
        // recompute count from server truth via the bump-triggered refetch
      }
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this article? This cannot be undone.")) return;
    setDeleting(true);
    const res = await mutate(`/api/articles/${article.id}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) {
      toast.success("Article deleted →");
      onOpenChange(false);
    }
  };

  const isDark = article.coverColor.toLowerCase() === "#0e1909";

  return (
    <div className="flex max-h-[88vh] flex-col">
      {/* cover color strip */}
      <div
        className={cn("h-3 w-full shrink-0", isDark && "bg-grid-dark")}
        style={{ background: isDark ? undefined : article.coverColor }}
      />

      {/* header */}
      <div className="border-b border-[#0E1909]/8 px-5 py-4">
        <div className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-[#0E1909]/45">
          <PenLine size={12} />
          brain-dump
          <span>·</span>
          <span>{fmtRelative(article.createdAt)} ago</span>
          {!article.published && (
            <>
              <span>·</span>
              <span className="rounded bg-[#0E1909]/8 px-1.5 py-0.5 font-semibold text-[#0E1909]/65">
                draft
              </span>
            </>
          )}
        </div>
        <h2 className="mt-2 font-display text-2xl font-semibold leading-tight text-[#0E1909]">
          {article.title}
        </h2>
        {article.subtitle && (
          <p className="mt-1.5 font-display text-[15px] leading-relaxed text-[#0E1909]/65">
            {article.subtitle}
          </p>
        )}
        <div className="mt-3 flex items-center gap-2">
          <FounderAvatar founder={article.author} size={32} />
          <div className="min-w-0">
            <FounderHoverCard
              founder={article.author}
              className="block truncate font-display text-[14px] font-semibold text-[#0E1909]"
            >
              {article.author.name}
            </FounderHoverCard>
            <p className="truncate font-mono text-xs text-[#0E1909]/50">
              @{article.author.handle}
              {article.author.title ? ` · ${article.author.title}` : ""}
            </p>
          </div>
        </div>
      </div>

      {/* body */}
      <div className="flex-1 overflow-y-auto scroll-thin">
        <div className="px-5 py-4">
          <article className="whitespace-pre-wrap font-display text-[16px] leading-[1.7] text-[#0E1909]/90">
            {article.body}
          </article>

          {tags.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-1.5 border-t border-[#0E1909]/8 pt-4">
              {tags.map((t) => (
                <Tag key={t}>{t}</Tag>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* footer — clap + author actions */}
      <div className="flex items-center justify-between gap-2 border-t border-[#0E1909]/10 bg-[#f8f9f3] px-5 py-3">
        <button
          onClick={toggleClap}
          disabled={clapping}
          className={cn(
            "tactile-flat inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 font-mono text-xs font-semibold uppercase tracking-widest transition disabled:opacity-50",
            clapped
              ? "border-[#0E1909] bg-[#DAFF01] text-[#0E1909]"
              : "border-[#0E1909]/15 bg-white text-[#0E1909]/65 hover:border-[#0E1909] hover:text-[#0E1909]"
          )}
        >
          {clapping ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Heart size={12} className={clapped ? "fill-current" : ""} />
          )}
          {clapped ? "clapped" : "clap"}
          <span className="ml-1 rounded bg-[#0E1909]/8 px-1.5 py-0.5 text-[#0E1909]">
            {clapCount}
          </span>
        </button>

        <div className="flex items-center gap-2">
          {isAuthor && (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onEdit(article)}
                className="font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/70 hover:bg-[#0E1909]/5 hover:text-[#0E1909]"
              >
                <Pencil size={12} /> edit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDelete}
                disabled={deleting}
                className="font-mono text-xs font-semibold uppercase tracking-widest text-[#e0463c] hover:bg-[#e0463c]/5"
              >
                {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                delete
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="font-mono text-xs uppercase tracking-widest text-[#0E1909]/55"
          >
            close
            <ArrowRight size={12} />
          </Button>
        </div>
      </div>
    </div>
  );
}
