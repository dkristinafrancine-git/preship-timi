"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useApi } from "@/lib/use-api";
import { usePreship } from "@/lib/preship-store";
import { SynergyCard } from "./synergy-card";
import { BroadcastDialog } from "./broadcast-dialog";
import type { SynergyRequest, Founder } from "@/lib/preship-types";
import { BOUNTY_TYPES } from "@/lib/preship";
import { Loader2, Zap, Plus, Filter } from "lucide-react";

type Filter = "all" | "mine" | "open";

export function SynergyView() {
  const [filter, setFilter] = useState<Filter>("all");
  const [bountyFilter, setBountyFilter] = useState<string>("all");
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const me = usePreship((s) => s.me);

  const url =
    filter === "mine"
      ? "/api/synergy?mine=1"
      : bountyFilter !== "all"
      ? `/api/synergy?status=open&bountyType=${bountyFilter}`
      : "/api/synergy?status=open";
  const { data, loading } = useApi<{ requests: SynergyRequest[] }>(url, [filter, bountyFilter]);
  const requests = data?.requests ?? [];

  return (
    <div className="space-y-4">
      {/* Hero / intro */}
      <div className="overflow-hidden rounded-lg border border-[#0E1909]/12 bg-[#0E1909]">
        <div className="bg-grid-dark px-5 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-[#DAFF01]" />
                <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#DAFF01]">
                  synergy · bottleneck-broadcast
                </span>
              </div>
              <h2 className="mt-1 font-display text-lg font-semibold text-white">
                Trade bounties for handshakes.
              </h2>
              <p className="mt-0.5 font-mono text-xs text-white/55">
                broadcast a blocker · receive matched offers · pick your collaborator
              </p>
            </div>
            <button
              onClick={() => setBroadcastOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#DAFF01] px-3.5 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-widest text-[#0E1909] transition hover:bg-[#c4e600]"
            >
              <Plus size={13} /> broadcast a bottleneck →
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-md border border-[#0E1909]/12 bg-white p-0.5">
          {(["all", "open", "mine"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-widest transition",
                filter === f
                  ? "bg-[#DAFF01] text-[#0E1909]"
                  : "text-[#0E1909]/55 hover:text-[#0E1909]"
              )}
            >
              {f === "mine" ? "my broadcasts" : f}
            </button>
          ))}
        </div>
        {filter !== "mine" && (
          <div className="flex items-center gap-1 rounded-md border border-[#0E1909]/12 bg-white p-0.5">
            <button
              onClick={() => setBountyFilter("all")}
              className={cn(
                "rounded px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-widest transition",
                bountyFilter === "all"
                  ? "bg-[#0E1909] text-[#DAFF01]"
                  : "text-[#0E1909]/55 hover:text-[#0E1909]"
              )}
            >
              all bounties
            </button>
            {BOUNTY_TYPES.map((b) => (
              <button
                key={b.id}
                onClick={() => setBountyFilter(b.id)}
                className={cn(
                  "rounded px-2 py-1.5 font-mono text-[11px] uppercase tracking-widest transition",
                  bountyFilter === b.id
                    ? "bg-[#0E1909] text-[#DAFF01]"
                    : "text-[#0E1909]/55 hover:text-[#0E1909]"
                )}
              >
                {b.short}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* List */}
      <div className="space-y-4">
        {loading && requests.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-[#0E1909]/40">
            <Loader2 size={18} className="animate-spin" />
            <span className="ml-2 font-mono text-xs uppercase tracking-widest">
              loading broadcasts…
            </span>
          </div>
        ) : requests.length === 0 ? (
          <div className="terminal-card py-16 text-center">
            <p className="font-mono text-xs uppercase tracking-widest text-[#0E1909]/40">
              no broadcasts in this filter · broadcast yours →
            </p>
          </div>
        ) : (
          requests.map((r) => (
            <SynergyCard key={r.id} request={r} isOwner={me?.id === r.founderId} />
          ))
        )}
      </div>

      <BroadcastDialog open={broadcastOpen} onOpenChange={setBroadcastOpen} />
    </div>
  );
}
