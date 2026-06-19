"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useApi } from "@/lib/use-api";
import { PostComposer } from "./post-composer";
import { FeedPost } from "./feed-post";
import type { FeedPost as FeedPostType } from "@/lib/preship-types";
import { Loader2, Filter, Signal } from "lucide-react";

type Sort = "newest" | "trending";

export function WarRoomView() {
  const [sort, setSort] = useState<Sort>("newest");
  const { data, loading } = useApi<{ posts: FeedPostType[] }>(`/api/feed?sort=${sort}`, [sort]);
  const posts = data?.posts ?? [];

  return (
    <div className="space-y-4">
      {/* Hero strip — war room intro */}
      <div className="overflow-hidden rounded-lg border border-[#0E1909]/12 bg-[#0E1909]">
        <div className="bg-grid-dark">
          <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#DAFF01]">
                  war-room · session-active
                </span>
                <span className="flex h-1.5 w-1.5">
                  <span className="h-1.5 w-1.5 animate-blink rounded-full bg-[#DAFF01]" />
                </span>
              </div>
              <h2 className="mt-1 font-display text-lg font-semibold text-white">
                Where alpha founders ship in the dark, together.
              </h2>
              <p className="mt-0.5 font-mono text-xs text-white/55">
                high-intent posts · text + audio · handshake over like
              </p>
            </div>
            <div className="flex items-center gap-4 rounded-md border border-[#DAFF01]/20 bg-white/5 px-4 py-2.5">
              <Metric label="founders" value="7" />
              <span className="h-8 w-px bg-[#DAFF01]/15" />
              <Metric label="posts" value="9" />
              <span className="h-8 w-px bg-[#DAFF01]/15" />
              <Metric label="handshakes" value="12" />
            </div>
          </div>
        </div>
      </div>

      <PostComposer />

      {/* Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 rounded-md border border-[#0E1909]/12 bg-white p-0.5">
          {(["newest", "trending"] as Sort[]).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={cn(
                "flex items-center gap-1.5 rounded px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-widest transition",
                sort === s
                  ? "bg-[#DAFF01] text-[#0E1909]"
                  : "text-[#0E1909]/55 hover:text-[#0E1909]"
              )}
            >
              {s === "trending" && <Signal size={12} />}
              {s}
            </button>
          ))}
        </div>
        <button className="flex items-center gap-1.5 rounded-md border border-[#0E1909]/12 bg-white px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-widest text-[#0E1909]/60 hover:text-[#0E1909]">
          <Filter size={12} /> filter
        </button>
      </div>

      {/* Feed */}
      <div className="space-y-4">
        {loading && posts.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-[#0E1909]/40">
            <Loader2 size={18} className="animate-spin" />
            <span className="ml-2 font-mono text-xs uppercase tracking-widest">
              loading war-room…
            </span>
          </div>
        ) : posts.length === 0 ? (
          <div className="terminal-card py-16 text-center">
            <p className="font-mono text-xs uppercase tracking-widest text-[#0E1909]/40">
              no posts yet · be the first to ship
            </p>
          </div>
        ) : (
          posts.map((p) => <FeedPost key={p.id} post={p} />)
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="font-display text-xl font-bold text-[#DAFF01]">{value}</p>
      <p className="font-mono text-[9px] uppercase tracking-widest text-white/45">{label}</p>
    </div>
  );
}
