"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useApi } from "@/lib/use-api";
import { usePreship } from "@/lib/preship-store";
import { SynergyCard } from "./synergy-card";
import { BroadcastDialog } from "./broadcast-dialog";
import { ViewHeader } from "../view-header";
import type { SynergyRequest } from "@/lib/preship-types";
import { BOUNTY_TYPES } from "@/lib/preship";
import { Button } from "@/components/ui/button";
import { Loader2, Plus } from "lucide-react";

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
      <ViewHeader
        title="Synergy"
        code="/synergy"
        sub="broadcast a blocker · receive matched offers · pick your collaborator"
        action={
          <Button
            size="sm"
            onClick={() => setBroadcastOpen(true)}
            className="bg-[#DAFF01] font-mono text-[11px] font-semibold uppercase tracking-widest text-[#0E1909] shadow-none hover:bg-[#c4e600]"
          >
            <Plus size={13} /> broadcast →
          </Button>
        }
      />

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
