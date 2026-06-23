"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useApi, useMutate } from "@/lib/use-api";
import type { Feedback, FeedbackStatus } from "@/lib/preship-types";
import { MessageSquareWarning, ChevronDown, ChevronUp } from "lucide-react";

/**
 * /admin/feedback inbox. Lists persisted feedback + support tickets with status
 * + kind filters, expandable rows, and an inline status dropdown that PATCHes
 * the row. Cursor-paginated ("Load more"). Uses the shared admin "channel" so a
 * status change refetches the inbox + overview stats in one batched pass.
 */
const STATUS_FILTERS = ["all", "new", "open", "resolved", "archived"] as const;
const KIND_FILTERS = ["all", "feedback", "support"] as const;
const STATUSES: FeedbackStatus[] = ["new", "open", "resolved", "archived"];

type FeedbackPage = { items: Feedback[]; nextCursor: string | null };

export function AdminFeedbackView() {
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("all");
  const [kindFilter, setKindFilter] = useState<(typeof KIND_FILTERS)[number]>("all");
  const [cursor, setCursor] = useState<string | null>(null);
  const [allItems, setAllItems] = useState<Feedback[]>([]);

  // First-page query (keyed by filters); cursor queries accumulate into allItems.
  const listUrl = `/api/admin/feedback?status=${statusFilter}&kind=${kindFilter}`;
  const { data: firstPage, loading } = useApi<FeedbackPage>(listUrl);

  const mutate = useMutate();
  const [loadingMore, setLoadingMore] = useState(false);

  const items = cursor ? allItems : firstPage?.items ?? [];
  const nextCursor = cursor ? null : firstPage?.nextCursor ?? null;

  const loadMore = useCallback(async () => {
    if (!firstPage?.nextCursor && !cursor) return;
    const c = (cursor ?? firstPage?.nextCursor) as string;
    setLoadingMore(true);
    try {
      const res = await fetch(
        `${listUrl}&cursor=${encodeURIComponent(c)}`,
        { headers: { Accept: "application/json" } }
      );
      const json = (await res.json()) as FeedbackPage;
      const base = cursor ? allItems : firstPage?.items ?? [];
      setAllItems([...base, ...json.items]);
      setCursor(json.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  }, [listUrl, cursor, firstPage, allItems]);

  const onStatusChange = async (id: string, status: FeedbackStatus) => {
    await mutate(`/api/admin/feedback/${id}`, {
      method: "PATCH",
      body: { status },
      invalidate: ["admin"],
    });
  };

  const resetFilters = () => {
    setStatusFilter("all");
    setKindFilter("all");
    setCursor(null);
    setAllItems([]);
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <MessageSquareWarning size={22} className="text-[#DAFF01]" />
        <div>
          <h1 className="font-display text-2xl font-semibold text-white">Feedback & Support</h1>
          <p className="mt-0.5 font-mono text-xs uppercase tracking-widest text-white/40">
            Inbox · {items.length} shown
          </p>
        </div>
      </header>

      {/* filters */}
      <div className="flex flex-wrap items-center gap-2">
        <FilterGroup label="Status" options={STATUS_FILTERS} value={statusFilter} onChange={(v) => { setStatusFilter(v as typeof statusFilter); setCursor(null); setAllItems([]); }} />
        <FilterGroup label="Type" options={KIND_FILTERS} value={kindFilter} onChange={(v) => { setKindFilter(v as typeof kindFilter); setCursor(null); setAllItems([]); }} />
        {(statusFilter !== "all" || kindFilter !== "all") && (
          <button onClick={resetFilters} className="font-mono text-xs uppercase tracking-widest text-white/50 hover:text-white">
            clear
          </button>
        )}
      </div>

      {/* list */}
      {loading && items.length === 0 ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg border border-white/10 bg-white/[0.03]" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <FeedbackRow key={item.id} item={item} onStatusChange={onStatusChange} />
          ))}
          {nextCursor && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="w-full rounded-lg border border-white/10 bg-white/[0.02] py-3 font-mono text-xs uppercase tracking-widest text-white/50 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-50"
            >
              {loadingMore ? "Loading…" : "Load more"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function FeedbackRow({
  item,
  onStatusChange,
}: {
  item: Feedback;
  onStatusChange: (id: string, status: FeedbackStatus) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03]">
      <div className="flex items-start gap-3 p-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={item.status} />
            <KindPill kind={item.kind} />
            {item.category && (
              <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">
                {item.category}
              </span>
            )}
          </div>
          <p className="mt-2 font-display text-sm font-medium text-white/90">
            {item.subject || "(no subject)"}
          </p>
          <p className={cn("mt-1 font-sans text-sm text-white/60", !expanded && "line-clamp-1")}>
            {item.message}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-white/40">
            {item.user ? (
              <span>{item.user.name} · @{item.user.handle}</span>
            ) : (
              <span className="italic">no account</span>
            )}
            <span>{new Date(item.createdAt).toLocaleString()}</span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <StatusSelect value={item.status} onChange={(s) => onStatusChange(item.id, s)} />
          <button
            onClick={() => setExpanded((e) => !e)}
            className="font-mono text-[10px] uppercase tracking-widest text-white/40 hover:text-white"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-white/10 px-4 py-3">
          <p className="whitespace-pre-wrap font-sans text-sm text-white/70">{item.message}</p>
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: FeedbackStatus }) {
  const styles: Record<FeedbackStatus, string> = {
    new: "bg-[#DAFF01]/15 text-[#DAFF01] border-[#DAFF01]/30",
    open: "bg-blue-400/15 text-blue-300 border-blue-400/30",
    resolved: "bg-emerald-400/15 text-emerald-300 border-emerald-400/30",
    archived: "bg-white/10 text-white/50 border-white/20",
  };
  return (
    <span className={cn("rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest", styles[status])}>
      {status}
    </span>
  );
}

function KindPill({ kind }: { kind: string }) {
  const isSupport = kind === "support";
  return (
    <span className={cn(
      "rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest",
      isSupport ? "bg-amber-400/15 text-amber-300" : "bg-white/10 text-white/60"
    )}>
      {kind}
    </span>
  );
}

function StatusSelect({
  value,
  onChange,
}: {
  value: FeedbackStatus;
  onChange: (s: FeedbackStatus) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as FeedbackStatus)}
      className="rounded border border-white/15 bg-[#0E1909] px-2 py-1 font-mono text-[11px] uppercase tracking-wider text-white/80 outline-none focus:border-[#DAFF01]/50"
    >
      {STATUSES.map((s) => (
        <option key={s} value={s} className="bg-[#0E1909]">
          {s}
        </option>
      ))}
    </select>
  );
}

function FilterGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-widest text-white/35">{label}</span>
      <div className="flex overflow-hidden rounded-md border border-white/10">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={cn(
              "px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider transition-colors",
              value === opt ? "bg-[#DAFF01] text-[#0E1909]" : "text-white/55 hover:bg-white/5 hover:text-white"
            )}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-10 text-center">
      <p className="font-mono text-xs uppercase tracking-widest text-white/40">
        Nothing here yet. Submissions land in this inbox as they come in.
      </p>
    </div>
  );
}
