"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useApi } from "@/lib/use-api";
import { isActive } from "@/lib/admin";
import type { AdminUser } from "@/lib/preship-types";
import { Users, Search } from "lucide-react";

/**
 * /admin/users table. Searchable (debounced name/handle/email), with an
 * activity filter (all/active/passive) and a 7d/30d window toggle that drives
 * the active-passive boundary. Cursor-paginated ("Load more"). Read-only for
 * now — role promotion/revoke is deferred to a later phase.
 */
const DEBOUNCE_MS = 300;
const ACTIVITY_OPTIONS = ["all", "active", "passive"] as const;
const WINDOW_OPTIONS = [7, 30] as const;

type UsersPage = { items: AdminUser[]; nextCursor: string | null };

export function AdminUsersView() {
  const [input, setInput] = useState("");
  const [q, setQ] = useState("");
  const [activity, setActivity] = useState<(typeof ACTIVITY_OPTIONS)[number]>("all");
  const [windowDays, setWindowDays] = useState<(typeof WINDOW_OPTIONS)[number]>(7);
  const [cursor, setCursor] = useState<string | null>(null);
  const [allItems, setAllItems] = useState<AdminUser[]>([]);

  // debounce the search input, mirroring search-view.tsx
  useEffect(() => {
    const t = setTimeout(() => setQ(input.trim()), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [input]);

  // First-page query is keyed by (q, activity, windowDays). Cursor pages accumulate.
  const listUrl = `/api/admin/users?${new URLSearchParams({
    ...(q ? { q } : {}),
    activity,
    days: String(windowDays),
  })}`;
  const { data: firstPage, loading } = useApi<UsersPage>(listUrl);
  const [loadingMore, setLoadingMore] = useState(false);

  const items = cursor ? allItems : firstPage?.items ?? [];
  const nextCursor = cursor ? null : firstPage?.nextCursor ?? null;

  const loadMore = useCallback(async () => {
    if (!firstPage?.nextCursor && !cursor) return;
    const c = (cursor ?? firstPage?.nextCursor) as string;
    setLoadingMore(true);
    try {
      const res = await fetch(`${listUrl}&cursor=${encodeURIComponent(c)}`, {
        headers: { Accept: "application/json" },
      });
      const json = (await res.json()) as UsersPage;
      const base = cursor ? allItems : firstPage?.items ?? [];
      setAllItems([...base, ...json.items]);
      setCursor(json.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  }, [listUrl, cursor, firstPage, allItems]);

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <Users size={22} className="text-[#DAFF01]" />
        <div>
          <h1 className="font-display text-2xl font-semibold text-white">Users</h1>
          <p className="mt-0.5 font-mono text-xs uppercase tracking-widest text-white/40">
            Active vs passive · {items.length} shown
          </p>
        </div>
      </header>

      {/* controls: search + activity filter + window toggle */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/35" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search name, handle, email…"
            className="w-72 rounded-md border border-white/15 bg-[#0E1909] py-2 pl-9 pr-3 font-sans text-sm text-white/90 placeholder:text-white/30 outline-none focus:border-[#DAFF01]/50"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-widest text-white/35">Activity</span>
          <div className="flex overflow-hidden rounded-md border border-white/10">
            {ACTIVITY_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() => { setActivity(opt); setCursor(null); setAllItems([]); }}
                className={cn(
                  "px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider transition-colors",
                  activity === opt ? "bg-[#DAFF01] text-[#0E1909]" : "text-white/55 hover:bg-white/5 hover:text-white"
                )}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-widest text-white/35">Window</span>
          <div className="flex overflow-hidden rounded-md border border-white/10">
            {WINDOW_OPTIONS.map((d) => (
              <button
                key={d}
                onClick={() => { setWindowDays(d); setCursor(null); setAllItems([]); }}
                className={cn(
                  "px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider transition-colors",
                  windowDays === d ? "bg-[#DAFF01] text-[#0E1909]" : "text-white/55 hover:bg-white/5 hover:text-white"
                )}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* table */}
      {loading && items.length === 0 ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-md border border-white/10 bg-white/[0.03]" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState q={q} activity={activity} />
      ) : (
        <div className="overflow-hidden rounded-lg border border-white/10">
          <table className="w-full text-left">
            <thead className="border-b border-white/10 bg-white/[0.02]">
              <tr className="font-mono text-[10px] uppercase tracking-widest text-white/40">
                <th className="px-4 py-2.5 font-semibold">User</th>
                <th className="hidden px-4 py-2.5 font-semibold md:table-cell">Status</th>
                <th className="hidden px-4 py-2.5 font-semibold lg:table-cell">Role</th>
                <th className="hidden px-4 py-2.5 font-semibold sm:table-cell">Joined</th>
                <th className="hidden px-4 py-2.5 font-semibold lg:table-cell">Last seen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {items.map((u) => (
                <UserRow key={u.id} user={u} windowDays={windowDays} />
              ))}
            </tbody>
          </table>
        </div>
      )}

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
  );
}

function UserRow({ user, windowDays }: { user: AdminUser; windowDays: number }) {
  const active = isActive(user.lastSeenAt, windowDays);
  return (
    <tr className="text-sm transition-colors hover:bg-white/[0.02]">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate font-display font-medium text-white/90">{user.name}</span>
              {user.isFoundingMember && (
                <span className="rounded bg-[#DAFF01]/15 px-1 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest text-[#DAFF01]">
                  founding
                </span>
              )}
            </div>
            <div className="truncate font-mono text-[11px] text-white/40">
              @{user.handle} · {user.email}
            </div>
          </div>
        </div>
      </td>
      <td className="hidden px-4 py-3 md:table-cell">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest",
            active ? "bg-emerald-400/15 text-emerald-300" : "bg-white/10 text-white/50"
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", active ? "bg-emerald-400" : "bg-white/40")} />
          {active ? "active" : "passive"}
        </span>
      </td>
      <td className="hidden px-4 py-3 lg:table-cell">
        {user.role === "superadmin" ? (
          <span className="rounded bg-violet-400/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest text-violet-300">
            {user.role}
          </span>
        ) : (
          <span className="font-mono text-[11px] text-white/40">{user.role}</span>
        )}
      </td>
      <td className="hidden px-4 py-3 font-mono text-[11px] text-white/45 sm:table-cell">
        {new Date(user.createdAt).toLocaleDateString()}
      </td>
      <td className="hidden px-4 py-3 font-mono text-[11px] text-white/45 lg:table-cell">
        {user.lastSeenAt ? new Date(user.lastSeenAt).toLocaleDateString() : "—"}
      </td>
    </tr>
  );
}

function EmptyState({ q, activity }: { q: string; activity: string }) {
  let msg = "No users match this view.";
  if (q) msg = `No users match “${q}”.`;
  else if (activity !== "all") msg = `No ${activity} users in this window.`;
  return (
    <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-10 text-center">
      <p className="font-mono text-xs uppercase tracking-widest text-white/40">{msg}</p>
    </div>
  );
}
