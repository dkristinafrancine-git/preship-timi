"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useApi } from "@/lib/use-api";
import { usePreship } from "@/lib/preship-store";
import { ViewHeader } from "../view-header";
import { FounderAvatar, ProjectMark } from "../avatars";
import { FounderHoverCard } from "../founder-hover-card";
import { Tag, StatusPill, BountyBadge, StageChip } from "../badges";
import { fmtRelative } from "@/lib/preship";
import type {
  Founder,
  Project,
  FeedPost,
  SynergyRequest,
  Article,
} from "@/lib/preship-types";
import {
  Search as SearchIcon,
  Loader2,
  Users,
  Boxes,
  MessageSquare,
  Zap,
  PenLine,
  ArrowRight,
  X,
} from "lucide-react";

// Search API response shape (5 results max per category).
type SearchResults = {
  founders: Founder[];
  projects: Project[];
  posts: FeedPost[];
  synergy: SynergyRequest[];
  articles: Article[];
};

const EMPTY: SearchResults = {
  founders: [],
  projects: [],
  posts: [],
  synergy: [],
  articles: [],
};

const DEBOUNCE_MS = 300;
const MIN_QUERY = 2;

export function SearchView() {
  const navigate = usePreship((s) => s.navigate);
  const [input, setInput] = useState("");
  const [debounced, setDebounced] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // debounce the input → debounced query used to drive the fetch
  useEffect(() => {
    const t = setTimeout(() => setDebounced(input.trim()), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [input]);

  const shouldFetch = debounced.length >= MIN_QUERY;
  const url = shouldFetch ? `/api/search?q=${encodeURIComponent(debounced)}` : null;

  // useApi accepts a `string | null` URL — null skips the fetch entirely.
  const { data, loading } = useApi<SearchResults>(url, [debounced]);

  const results = data ?? EMPTY;
  const total =
    results.founders.length +
    results.projects.length +
    results.posts.length +
    results.synergy.length +
    results.articles.length;

  const showEmpty = !shouldFetch;
  const showNoResults = shouldFetch && !loading && total === 0;

  // category sections in display order
  const sections = useMemo(
    () => [
      {
        key: "founders" as const,
        label: "founders",
        icon: Users,
        items: results.founders,
        render: (f: Founder) => (
          <FounderRow
            key={f.id}
            founder={f}
            onClick={() => navigate({ view: "profile", founderId: f.id })}
          />
        ),
      },
      {
        key: "projects" as const,
        label: "projects",
        icon: Boxes,
        items: results.projects,
        render: (p: Project) => (
          <ProjectRow
            key={p.id}
            project={p}
            onClick={() => navigate({ view: "projects" })}
          />
        ),
      },
      {
        key: "posts" as const,
        label: "war-room posts",
        icon: MessageSquare,
        items: results.posts,
        render: (p: FeedPost) => (
          <PostRow
            key={p.id}
            post={p}
            onClick={() => navigate({ view: "war-room", postId: p.id })}
          />
        ),
      },
      {
        key: "synergy" as const,
        label: "synergy broadcasts",
        icon: Zap,
        items: results.synergy,
        render: (s: SynergyRequest) => (
          <SynergyRow
            key={s.id}
            request={s}
            onClick={() => navigate({ view: "synergy", synergyId: s.id })}
          />
        ),
      },
      {
        key: "articles" as const,
        label: "brain-dump articles",
        icon: PenLine,
        items: results.articles,
        render: (a: Article) => (
          <ArticleRow
            key={a.id}
            article={a}
            onClick={() => navigate({ view: "brain-dump", articleId: a.id })}
          />
        ),
      },
    ],
    [results, navigate]
  );

  return (
    <div className="space-y-5">
      <ViewHeader
        title="Search"
        code="/search"
        sub="find founders · projects · posts · broadcasts · articles"
      />

      {/* Search input — terminal-style */}
      <div className="terminal-card">
        <div className="flex items-center gap-3 border-b border-[#0E1909]/10 bg-[#f8f9f3] px-4 py-2.5">
          <span className="flex gap-1">
            <span className="h-2 w-2 rounded-full bg-[#0E1909]/15" />
            <span className="h-2 w-2 rounded-full bg-[#0E1909]/15" />
            <span className="h-2 w-2 rounded-full bg-[#DAFF01]" />
          </span>
          <span className="ml-1 font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/60">
            query
          </span>
          <span className="ml-auto font-mono text-xs uppercase tracking-widest text-[#0E1909]/35">
            {shouldFetch ? `${total} hit${total === 1 ? "" : "s"}` : "ready"}
          </span>
        </div>
        <div className="flex items-center gap-3 px-5 py-4">
          <SearchIcon size={20} className="shrink-0 text-[#0E1909]/45" />
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search founders, projects, posts, broadcasts, and articles"
            className="flex-1 bg-transparent font-display text-lg text-[#0E1909] outline-none placeholder:text-[#0E1909]/30"
            spellCheck={false}
            autoComplete="off"
          />
          {loading && <Loader2 size={16} className="animate-spin text-[#0E1909]/40" />}
          {input && !loading && (
            <button
              onClick={() => {
                setInput("");
                inputRef.current?.focus();
              }}
              className="tactile-flat rounded p-1 text-[#0E1909]/40 hover:bg-[#0E1909]/5 hover:text-[#0E1909]"
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      {showEmpty ? (
        <EmptyState />
      ) : showNoResults ? (
        <NoResults query={debounced} />
      ) : (
        <div className="space-y-5">
          {sections.map(
            (s) =>
              s.items.length > 0 && (
                <section key={s.key} className="terminal-card">
                  <SectionHeader icon={s.icon} label={s.label} count={s.items.length} />
                  <ul className="divide-y divide-[#0E1909]/8">
                    {s.items.map((item) => s.render(item))}
                  </ul>
                </section>
              )
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- Section header ---------- */

function SectionHeader({
  icon: Icon,
  label,
  count,
}: {
  icon: typeof Users;
  label: string;
  count: number;
}) {
  return (
    <div className="flex items-center justify-between border-b border-[#0E1909]/8 bg-[#f8f9f3] px-5 py-2.5">
      <div className="flex items-center gap-2">
        <Icon size={14} className="text-[#0E1909]/55" />
        <span className="font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/70">
          {label}
        </span>
      </div>
      <span className="rounded bg-[#DAFF01] px-1.5 py-0.5 font-mono text-xs font-bold text-[#0E1909]">
        {count}
      </span>
    </div>
  );
}

/* ---------- Result rows ---------- */

function RowShell({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <li>
      <button
        onClick={onClick}
        className="hover-row block w-full cursor-pointer px-5 py-3.5 text-left"
      >
        {children}
      </button>
    </li>
  );
}

function FounderRow({ founder, onClick }: { founder: Founder; onClick: () => void }) {
  const skills = founder.skills
    ? founder.skills.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 4)
    : [];
  return (
    <RowShell onClick={onClick}>
      <div className="flex items-center gap-3">
        <FounderAvatar founder={founder} size={36} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <FounderHoverCard
              founder={founder}
              className="truncate font-display text-[15px] font-semibold text-[#0E1909]"
            >
              {founder.name}
            </FounderHoverCard>
            <span className="truncate font-mono text-xs text-[#0E1909]/50">
              @{founder.handle}
            </span>
          </div>
          {founder.title && (
            <p className="truncate font-mono text-xs text-[#0E1909]/55">{founder.title}</p>
          )}
        </div>
        <ArrowRight size={14} className="shrink-0 text-[#0E1909]/30" />
      </div>
      {skills.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1 pl-[48px]">
          {skills.map((s) => (
            <Tag key={s}>{s}</Tag>
          ))}
        </div>
      )}
    </RowShell>
  );
}

function ProjectRow({ project, onClick }: { project: Project; onClick: () => void }) {
  return (
    <RowShell onClick={onClick}>
      <div className="flex items-center gap-3">
        <ProjectMark
          mark={project.logoMark}
          color={project.logoColor}
          logoUrl={project.logoUrl}
          name={project.name}
          size={36}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="truncate font-display text-[15px] font-semibold text-[#0E1909]">
              {project.name}
            </span>
            <Tag>{project.category}</Tag>
          </div>
          <p className="truncate font-mono text-xs text-[#0E1909]/55">{project.tagline}</p>
        </div>
        <StageChip stage={project.alphaStage} />
        <ArrowRight size={14} className="shrink-0 text-[#0E1909]/30" />
      </div>
    </RowShell>
  );
}

function PostRow({ post, onClick }: { post: FeedPost; onClick: () => void }) {
  return (
    <RowShell onClick={onClick}>
      <div className="flex items-start gap-3">
        <FounderAvatar founder={post.author} size={32} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="truncate font-display text-[14px] font-semibold text-[#0E1909]">
              {post.author.name}
            </span>
            <span className="truncate font-mono text-xs text-[#0E1909]/50">
              @{post.author.handle}
            </span>
            <span className="font-mono text-xs text-[#0E1909]/35">·</span>
            <span className="font-mono text-xs text-[#0E1909]/50">
              {fmtRelative(post.createdAt)}
            </span>
          </div>
          <p className="mt-0.5 line-clamp-2 text-[13px] leading-relaxed text-[#0E1909]/75">
            {post.body ?? post.audioTitle}
          </p>
          {post.project && (
            <p className="mt-1 font-mono text-xs text-[#0E1909]/45">▣ {post.project.name}</p>
          )}
        </div>
        <ArrowRight size={14} className="mt-1 shrink-0 text-[#0E1909]/30" />
      </div>
    </RowShell>
  );
}

function SynergyRow({
  request,
  onClick,
}: {
  request: SynergyRequest;
  onClick: () => void;
}) {
  return (
    <RowShell onClick={onClick}>
      <div className="flex items-start gap-3">
        <FounderAvatar founder={request.founder} size={32} />
        <div className="min-w-0 flex-1">
          <span className="block truncate font-display text-[14px] font-semibold text-[#0E1909]">
            {request.title}
          </span>
          <p className="mt-0.5 line-clamp-1 text-[13px] leading-relaxed text-[#0E1909]/70">
            {request.bottleneck}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <BountyBadge type={request.bountyType} stake={request.stake} size="sm" />
            <StatusPill status={request.status} />
            {request.project && (
              <span className="font-mono text-xs text-[#0E1909]/45">
                ▣ {request.project.name}
              </span>
            )}
          </div>
        </div>
        <ArrowRight size={14} className="mt-1 shrink-0 text-[#0E1909]/30" />
      </div>
    </RowShell>
  );
}

function ArticleRow({ article, onClick }: { article: Article; onClick: () => void }) {
  const tags = article.tags
    ? article.tags.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 3)
    : [];
  return (
    <RowShell onClick={onClick}>
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 h-12 w-1.5 shrink-0 rounded-full"
          style={{ background: article.coverColor }}
        />
        <div className="min-w-0 flex-1">
          <span className="block truncate font-display text-[15px] font-semibold text-[#0E1909]">
            {article.title}
          </span>
          {article.subtitle && (
            <p className="mt-0.5 line-clamp-1 text-[13px] leading-relaxed text-[#0E1909]/65">
              {article.subtitle}
            </p>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-2 font-mono text-xs text-[#0E1909]/50">
            <span className="text-[#0E1909]/65">@{article.author.handle}</span>
            <span>·</span>
            <span>{fmtRelative(article.createdAt)}</span>
            <span>·</span>
            <span>
              {article._count.claps} clap{article._count.claps === 1 ? "" : "s"}
            </span>
          </div>
          {tags.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {tags.map((t) => (
                <Tag key={t}>{t}</Tag>
              ))}
            </div>
          )}
        </div>
        <ArrowRight size={14} className="mt-1 shrink-0 text-[#0E1909]/30" />
      </div>
    </RowShell>
  );
}

/* ---------- Empty / no-results states ---------- */

function EmptyState() {
  const examples = [
    "founder name or @handle",
    "project name or tagline",
    "post body or tag",
    "synergy bottleneck",
    "article title",
  ];
  return (
    <div className="terminal-card py-16 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#f4ffd6]">
        <SearchIcon size={22} className="text-[#0E1909]/55" />
      </div>
      <p className="mt-3 font-display text-base font-medium text-[#0E1909]/75">
        Search founders, projects, posts, broadcasts, and articles
      </p>
      <p className="mt-1.5 font-mono text-xs uppercase tracking-widest text-[#0E1909]/40">
        start typing · min 2 characters
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-1.5">
        {examples.map((ex) => (
          <span
            key={ex}
            className="rounded border border-[#0E1909]/12 bg-white px-2 py-1 font-mono text-xs text-[#0E1909]/55"
          >
            {ex}
          </span>
        ))}
      </div>
    </div>
  );
}

function NoResults({ query }: { query: string }) {
  return (
    <div className="terminal-card py-16 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#0E1909]/5">
        <SearchIcon size={22} className="text-[#0E1909]/35" />
      </div>
      <p className="mt-3 font-display text-base font-medium text-[#0E1909]/75">
        No matches for &ldquo;{query}&rdquo;
      </p>
      <p className="mt-1.5 font-mono text-xs uppercase tracking-widest text-[#0E1909]/40">
        try a different keyword or fewer characters
      </p>
    </div>
  );
}
