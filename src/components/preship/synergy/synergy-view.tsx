"use client";

import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useApi } from "@/lib/use-api";
import { usePreship } from "@/lib/preship-store";
import { SynergyCard } from "./synergy-card";
import { BroadcastDialog } from "./broadcast-dialog";
import { ViewHeader } from "../view-header";
import type { SynergyRequest } from "@/lib/preship-types";
import { BOUNTY_TYPES } from "@/lib/preship";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Sparkles } from "lucide-react";

type Filter = "all" | "mine" | "open" | "match";

export function SynergyView() {
  const [filter, setFilter] = useState<Filter>("all");
  const [bountyFilter, setBountyFilter] = useState<string>("all");
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const me = usePreship((s) => s.me);
  const deepLink = usePreship((s) => s.deepLink);
  const clearDeepLink = usePreship((s) => s.clearDeepLink);

  // current user's skill set, lowercased for matching
  const mySkills = useMemo(
    () =>
      me?.skills
        ? me.skills.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
        : [],
    [me]
  );

  const url =
    filter === "mine"
      ? "/api/synergy?mine=1"
      : filter === "match"
      ? "/api/synergy?status=open"
      : bountyFilter !== "all"
      ? `/api/synergy?status=open&bountyType=${bountyFilter}`
      : "/api/synergy?status=open";
  const { data, loading } = useApi<{ requests: SynergyRequest[] }>(url, [filter, bountyFilter]);

  // for "match" filter, keep only requests whose tags overlap with my skills
  let requests = data?.requests ?? [];
  if (filter === "match") {
    requests = requests.filter((r) => {
      const tags = r.tags ? r.tags.split(",").map((t) => t.trim().toLowerCase()) : [];
      return tags.some((t) => mySkills.includes(t));
    });
  }

  // helper: which tags of a request match the current user's skills
  const matchedSkillsFor = (r: SynergyRequest): string[] => {
    const tags = r.tags ? r.tags.split(",").map((t) => t.trim()) : [];
    return tags.filter((t) => mySkills.includes(t.toLowerCase()));
  };

  // when navigated via ticker deep-link, scroll to / open that request
  useEffect(() => {
    if (deepLink?.synergyId) {
      const el = document.getElementById(`synergy-${deepLink.synergyId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-[#DAFF01]");
        setTimeout(() => el.classList.remove("ring-2", "ring-[#DAFF01]"), 2400);
      }
      clearDeepLink();
    }
  }, [deepLink, clearDeepLink, requests]);

  return (
    <div className="space-y-5">
      <ViewHeader
        title="Synergy"
        code="/synergy"
        sub="broadcast a blocker · receive matched offers · pick your collaborator"
        action={
          <Button
            size="sm"
            onClick={() => setBroadcastOpen(true)}
            className="cta-lime h-9 bg-[#DAFF01] font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909] hover:bg-[#c4e600]"
          >
            <Plus size={13} /> broadcast →
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-md border border-[#0E1909]/12 bg-white p-0.5">
          {(["all", "open", "match", "mine"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              disabled={f === "match" && mySkills.length === 0}
              className={cn(
                "rounded px-3.5 py-2 font-mono text-xs font-semibold uppercase tracking-widest tactile-flat disabled:opacity-40 disabled:cursor-not-allowed",
                filter === f
                  ? "bg-[#DAFF01] text-[#0E1909]"
                  : "text-[#0E1909]/55 hover:text-[#0E1909]"
              )}
              title={f === "match" && mySkills.length === 0 ? "Add skills to your profile to enable matching" : undefined}
            >
              {f === "mine" ? "my broadcasts" : f === "match" ? "✦ match" : f}
            </button>
          ))}
        </div>
        {filter !== "mine" && (
          <div className="flex items-center gap-1 rounded-md border border-[#0E1909]/12 bg-white p-0.5">
            <button
              onClick={() => setBountyFilter("all")}
              className={cn(
                "rounded px-3 py-2 font-mono text-xs uppercase tracking-widest tactile-flat",
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
                  "rounded px-2.5 py-2 font-mono text-xs uppercase tracking-widest tactile-flat",
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
      <div className="space-y-5">
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
            <div key={r.id} id={`synergy-${r.id}`} className="scroll-mt-32 rounded-lg transition-shadow duration-300">
              <SynergyCard
                request={r}
                isOwner={me?.id === r.founderId}
                matchedSkills={matchedSkillsFor(r)}
              />
            </div>
          ))
        )}
      </div>

      <BroadcastDialog open={broadcastOpen} onOpenChange={setBroadcastOpen} />
    </div>
  );
}
