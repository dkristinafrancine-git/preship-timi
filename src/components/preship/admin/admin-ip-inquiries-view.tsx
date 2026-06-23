"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useApi, useMutate } from "@/lib/use-api";
import type { IpInquiry, IpInquiryStatus, IpInquiryKind } from "@/lib/preship-types";
import { Scale, ChevronDown, ChevronUp } from "lucide-react";

/**
 * /admin/ip-inquiries inbox. Trademark / Copyright / Patent intake list with
 * status + kind filters, expandable rows (jurisdiction/stage/budget/details),
 * and an inline status dropdown. Mirrors the feedback inbox's shape.
 */
const STATUS_FILTERS = ["all", "new", "in-review", "responded", "closed"] as const;
const KIND_FILTERS: ("all" | IpInquiryKind)[] = ["all", "trademark", "copyright", "patent"];
const STATUSES: IpInquiryStatus[] = ["new", "in-review", "responded", "closed"];

type InquiryPage = { items: IpInquiry[]; nextCursor: string | null };

export function AdminIpInquiriesView() {
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("all");
  const [kindFilter, setKindFilter] = useState<(typeof KIND_FILTERS)[number]>("all");
  const [cursor, setCursor] = useState<string | null>(null);
  const [allItems, setAllItems] = useState<IpInquiry[]>([]);

  const listUrl = `/api/admin/ip-inquiries?status=${statusFilter}&kind=${kindFilter}`;
  const { data: firstPage, loading } = useApi<InquiryPage>(listUrl);

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
      const json = (await res.json()) as InquiryPage;
      const base = cursor ? allItems : firstPage?.items ?? [];
      setAllItems([...base, ...json.items]);
      setCursor(json.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  }, [listUrl, cursor, firstPage, allItems]);

  const onStatusChange = async (id: string, status: IpInquiryStatus) => {
    await mutate(`/api/admin/ip-inquiries/${id}`, {
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
        <Scale size={22} className="text-[#DAFF01]" />
        <div>
          <h1 className="font-display text-2xl font-semibold text-white">IP Inquiries</h1>
          <p className="mt-0.5 font-mono text-xs uppercase tracking-widest text-white/40">
            Trademark · Copyright · Patent · {items.length} shown
          </p>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <FilterGroup label="Status" options={STATUS_FILTERS} value={statusFilter} onChange={(v) => { setStatusFilter(v as typeof statusFilter); setCursor(null); setAllItems([]); }} />
        <FilterGroup label="Type" options={KIND_FILTERS} value={kindFilter} onChange={(v) => { setKindFilter(v as typeof kindFilter); setCursor(null); setAllItems([]); }} />
        {(statusFilter !== "all" || kindFilter !== "all") && (
          <button onClick={resetFilters} className="font-mono text-xs uppercase tracking-widest text-white/50 hover:text-white">
            clear
          </button>
        )}
      </div>

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
            <InquiryRow key={item.id} item={item} onStatusChange={onStatusChange} />
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

function InquiryRow({
  item,
  onStatusChange,
}: {
  item: IpInquiry;
  onStatusChange: (id: string, status: IpInquiryStatus) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03]">
      <div className="flex items-start gap-3 p-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={item.status} />
            <KindPill kind={item.kind} />
          </div>
          <p className="mt-2 font-display text-sm font-medium text-white/90">
            {item.protecting}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-white/45">
            <span className="uppercase tracking-wider">{item.stage}</span>
            <span>·</span>
            <span>{item.jurisdiction}</span>
            {item.projectName && (<><span>·</span><span>{item.projectName}</span></>)}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-white/40">
            {item.user ? (
              <span>{item.user.name} · @{item.user.handle}</span>
            ) : (
              <span>{item.email}</span>
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
        <div className="space-y-2 border-t border-white/10 px-4 py-3">
          <Field label="What to protect" value={item.protecting} />
          <Field label="Stage" value={item.stage} />
          <Field label="Jurisdiction" value={item.jurisdiction} />
          {item.projectName && <Field label="Project" value={item.projectName} />}
          {item.budget && <Field label="Budget" value={item.budget} />}
          {item.details && <Field label="Details" value={item.details} />}
          <Field label="Reply-to" value={item.email} />
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="w-32 shrink-0 font-mono text-[11px] uppercase tracking-widest text-white/35">
        {label}
      </span>
      <span className="flex-1 whitespace-pre-wrap font-sans text-sm text-white/75">{value}</span>
    </div>
  );
}

function StatusPill({ status }: { status: IpInquiryStatus }) {
  const styles: Record<IpInquiryStatus, string> = {
    new: "bg-[#DAFF01]/15 text-[#DAFF01] border-[#DAFF01]/30",
    "in-review": "bg-blue-400/15 text-blue-300 border-blue-400/30",
    responded: "bg-emerald-400/15 text-emerald-300 border-emerald-400/30",
    closed: "bg-white/10 text-white/50 border-white/20",
  };
  return (
    <span className={cn("rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest", styles[status])}>
      {status}
    </span>
  );
}

function KindPill({ kind }: { kind: IpInquiryKind }) {
  const styles: Record<IpInquiryKind, string> = {
    trademark: "bg-violet-400/15 text-violet-300",
    copyright: "bg-cyan-400/15 text-cyan-300",
    patent: "bg-rose-400/15 text-rose-300",
  };
  return (
    <span className={cn("rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest", styles[kind])}>
      {kind}
    </span>
  );
}

function StatusSelect({
  value,
  onChange,
}: {
  value: IpInquiryStatus;
  onChange: (s: IpInquiryStatus) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as IpInquiryStatus)}
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
        Nothing here yet. IP intakes land in this inbox as they come in.
      </p>
    </div>
  );
}
