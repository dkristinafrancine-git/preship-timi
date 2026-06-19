"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { FounderAvatar } from "../avatars";
import { FounderHoverCard } from "../founder-hover-card";
import { Tag } from "../badges";
import { fmtRelative } from "@/lib/preship";
import type { Article } from "@/lib/preship-types";
import { Heart, ArrowRight } from "lucide-react";

/**
 * A clickable article card: cover-color strip, title, subtitle, author
 * (avatar + hover-card-enabled name), tags, clap count, relative time.
 */
export function ArticleCard({
  article,
  onOpen,
}: {
  article: Article;
  onOpen: () => void;
}) {
  const tags = article.tags
    ? article.tags.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 4)
    : [];
  const isDark = article.coverColor.toLowerCase() === "#0e1909";

  return (
    <button
      onClick={onOpen}
      className="terminal-card group block w-full cursor-pointer text-left hover:border-[#0E1909]/25 hover:shadow-[0_6px_16px_rgba(14,25,9,0.08),0_2px_6px_rgba(14,25,9,0.05)]"
    >
      {/* cover color strip */}
      <div
        className={cn(
          "relative h-2 w-full",
          isDark && "bg-grid-dark"
        )}
        style={{ background: isDark ? undefined : article.coverColor }}
      />

      {/* body */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-lg font-semibold leading-snug text-[#0E1909] line-clamp-2">
              {article.title}
            </h3>
            {article.subtitle && (
              <p className="mt-1 text-[13px] leading-relaxed text-[#0E1909]/65 line-clamp-2">
                {article.subtitle}
              </p>
            )}
          </div>
          <ArrowRight
            size={16}
            className="mt-1 shrink-0 text-[#0E1909]/25 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-[#0E1909]/55"
          />
        </div>

        {/* author + time */}
        <div className="mt-3.5 flex items-center gap-2">
          <FounderAvatar founder={article.author} size={26} />
          <FounderHoverCard
            founder={article.author}
            className="font-display text-[13px] font-semibold text-[#0E1909]"
          >
            {article.author.name}
          </FounderHoverCard>
          <span className="font-mono text-xs text-[#0E1909]/45">@{article.author.handle}</span>
          <span className="font-mono text-xs text-[#0E1909]/35">·</span>
          <span className="font-mono text-xs text-[#0E1909]/45">{fmtRelative(article.createdAt)}</span>
        </div>

        {/* tags + clap */}
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#0E1909]/8 pt-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {tags.length > 0 ? (
              tags.map((t) => <Tag key={t}>{t}</Tag>)
            ) : (
              <span className="font-mono text-xs uppercase tracking-widest text-[#0E1909]/35">
                no tags
              </span>
            )}
          </div>
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 font-mono text-xs font-semibold",
              article.myClap
                ? "border-[#0E1909] bg-[#DAFF01] text-[#0E1909]"
                : "border-[#0E1909]/12 bg-white text-[#0E1909]/60"
            )}
            title={`${article._count.claps} clap${article._count.claps === 1 ? "" : "s"}`}
          >
            <Heart size={12} className={article.myClap ? "fill-current" : ""} />
            {article._count.claps}
          </span>
        </div>
      </div>
    </button>
  );
}
