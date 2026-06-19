"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useApi } from "@/lib/use-api";
import { PostComposer } from "./post-composer";
import { FeedPost } from "./feed-post";
import { ViewHeader } from "../view-header";
import type { FeedPost as FeedPostType } from "@/lib/preship-types";
import { Loader2, Filter, Signal } from "lucide-react";

type Sort = "newest" | "trending";

export function WarRoomView() {
  const [sort, setSort] = useState<Sort>("newest");
  const { data, loading } = useApi<{ posts: FeedPostType[] }>(`/api/feed?sort=${sort}`, [sort]);
  const posts = data?.posts ?? [];

  return (
    <div className="space-y-4">
      <ViewHeader
        title="War Room"
        code="/war-room"
        sub="high-signal feed · text + audio · handshake over like"
      />

      <PostComposer />

      {/* Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 rounded-md border border-[#0E1909]/12 bg-white p-0.5">
          {(["newest", "trending"] as Sort[]).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={cn(
                "tactile-flat flex items-center gap-1.5 rounded px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-widest",
                sort === s
                  ? "bg-[#DAFF01] text-[#0E1909] shadow-[0_1px_3px_rgba(14,25,9,0.10)]"
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
