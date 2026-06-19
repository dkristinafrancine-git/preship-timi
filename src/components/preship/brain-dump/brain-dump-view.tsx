"use client";

import { useState, useEffect } from "react";
import { useApi } from "@/lib/use-api";
import { usePreship } from "@/lib/preship-store";
import { ViewHeader } from "../view-header";
import { ArticleCard } from "./article-card";
import { ArticleEditorDialog } from "./article-editor-dialog";
import { ArticleDetailDialog } from "./article-detail-dialog";
import { TerminalHeader, Tag } from "../badges";
import type { Article } from "@/lib/preship-types";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, PenLine, FileEdit, ArrowRight } from "lucide-react";

export function BrainDumpView() {
  const deepLink = usePreship((s) => s.deepLink);
  const clearDeepLink = usePreship((s) => s.clearDeepLink);

  const { data, loading } = useApi<{ articles: Article[] }>("/api/articles");
  const { data: draftsData } = useApi<{ articles: Article[] }>("/api/articles?drafts=1");
  const articles = data?.articles ?? [];
  const drafts = draftsData?.articles ?? [];

  // dialogs
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Article | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // honor deep-link ?articleId — open the detail dialog when navigated from search
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (deepLink?.articleId) {
      setDetailId(deepLink.articleId);
      setDetailOpen(true);
      clearDeepLink();
    }
  }, [deepLink, clearDeepLink]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const openNew = () => {
    setEditing(null);
    setEditorOpen(true);
  };

  const openDetail = (id: string) => {
    setDetailId(id);
    setDetailOpen(true);
  };

  const openEdit = (article: Article) => {
    setDetailOpen(false);
    setEditing(article);
    setEditorOpen(true);
  };

  const openEditDraft = (article: Article) => {
    setEditing(article);
    setEditorOpen(true);
  };

  return (
    <div className="space-y-5">
      <ViewHeader
        title="Brain Dump"
        code="/brain-dump"
        sub="founder-written articles · build in public"
        action={
          <Button
            size="sm"
            onClick={openNew}
            className="cta-lime h-9 bg-[#DAFF01] font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909] hover:bg-[#c4e600]"
          >
            <Plus size={13} /> write article →
          </Button>
        }
      />

      {/* My Drafts section — shown when user has unpublished drafts */}
      {drafts.length > 0 && (
        <div className="terminal-card">
          <TerminalHeader
            label={`my drafts · ${drafts.length}`}
            right={<FileEdit size={14} className="text-[#0E1909]/40" />}
          />
          <div className="divide-y divide-[#0E1909]/8">
            {drafts.map((d) => (
              <button
                key={d.id}
                onClick={() => openEditDraft(d)}
                className="hover-row group block w-full px-4 py-3.5 text-left"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-[15px] font-semibold text-[#0E1909]">
                      {d.title}
                    </p>
                    {d.subtitle && (
                      <p className="truncate font-mono text-xs text-[#0E1909]/50">
                        {d.subtitle}
                      </p>
                    )}
                  </div>
                  <Tag className="shrink-0">draft</Tag>
                  <span className="flex shrink-0 items-center gap-1 font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909] transition-all duration-200 group-hover:gap-2 group-hover:text-[#6f8a3e]">
                    edit <ArrowRight size={11} />
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Published articles */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <PenLine size={16} className="text-[#0E1909]/60" />
          <h3 className="font-display text-sm font-semibold text-[#0E1909]">
            Published
          </h3>
          <span className="font-mono text-xs uppercase tracking-widest text-[#0E1909]/40">
            · {articles.length} article{articles.length === 1 ? "" : "s"}
          </span>
        </div>

        {loading && articles.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-[#0E1909]/40">
            <Loader2 size={18} className="animate-spin" />
            <span className="ml-2 font-mono text-xs uppercase tracking-widest">
              loading articles…
            </span>
          </div>
        ) : articles.length === 0 ? (
          <div className="terminal-card py-16 text-center">
            <PenLine size={28} className="mx-auto text-[#0E1909]/20" />
            <p className="mt-2 font-mono text-xs uppercase tracking-widest text-[#0E1909]/40">
              no published articles yet · write the first one →
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {articles.map((a) => (
              <ArticleCard key={a.id} article={a} onOpen={() => openDetail(a.id)} />
            ))}
          </div>
        )}
      </div>

      {/* Write / edit dialog */}
      <ArticleEditorDialog
        open={editorOpen}
        onOpenChange={(v) => {
          setEditorOpen(v);
          if (!v) setEditing(null);
        }}
        article={editing}
      />

      {/* Read / clap dialog */}
      <ArticleDetailDialog
        articleId={detailId}
        open={detailOpen}
        onOpenChange={(v) => {
          setDetailOpen(v);
          if (!v) setDetailId(null);
        }}
        onEdit={openEdit}
      />
    </div>
  );
}
