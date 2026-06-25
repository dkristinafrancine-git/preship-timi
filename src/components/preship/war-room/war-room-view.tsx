"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useApi } from "@/lib/use-api";
import { usePreship } from "@/lib/preship-store";
import { PostComposer } from "./post-composer";
import { FeedPost } from "./feed-post";
import { ViewHeader } from "../view-header";
import { ApiErrorState } from "../api-error-state";
import type { FeedPost as FeedPostType } from "@/lib/preship-types";
import { Loader2, Filter, Signal } from "lucide-react";

type Sort = "newest" | "trending";

export function WarRoomView() {
  const [sort, setSort] = useState<Sort>("newest");
  const { data, loading, error, refetch } = useApi<{ posts: FeedPostType[] }>(`/api/feed?sort=${sort}`, [sort]);
  const posts = data?.posts ?? [];
  const deepLink = usePreship((s) => s.deepLink);
  const clearDeepLink = usePreship((s) => s.clearDeepLink);

  // Record a batched impression for the page's posts once per feed load.
  // Pings ONLY the main feed (never the right-rail trending fetch) so counts
  // aren't inflated ~2× per view. The ref guard stops StrictMode's double
  // effect invocation in dev from double-counting; in prod the effect runs once.
  // Skips optimistic/temp posts ("optimistic-…") — only real ids reach the API.
  const pingedKey = useRef<string | null>(null);
  useEffect(() => {
    if (loading || posts.length === 0) return;
    // Stable key per (sort, post-set) so re-renders with identical data don't
    // re-ping, but a sort change / new posts does.
    const key = `${sort}:${posts.map((p) => p.id).join(",")}`;
    if (pingedKey.current === key) return;
    pingedKey.current = key;
    const ids = posts.map((p) => p.id).filter((id) => !id.startsWith("optimistic-"));
    if (ids.length === 0) return;
    // Fire-and-forget: best-effort, never blocks the feed. `keepalive` lets the
    // request survive a tab close/navigation.
    fetch("/api/feed/impressions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postIds: ids }),
      keepalive: true,
    }).catch(() => {});
  }, [posts, loading, sort]);

  // deep-link from ticker: scroll to + briefly highlight a post
  useEffect(() => {
    if (deepLink?.postId) {
      const el = document.getElementById(`post-${deepLink.postId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-[#DAFF01]");
        setTimeout(() => el.classList.remove("ring-2", "ring-[#DAFF01]"), 2400);
      }
      clearDeepLink();
    }
  }, [deepLink, clearDeepLink, posts]);

  return (
    <div className="space-y-5">
      <ViewHeader
        title="War Room"
        code="/war-room"
        sub="broadcast progress · text + audio · back each other with handshakes"
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
                "tactile-flat flex items-center gap-1.5 rounded px-3.5 py-2 font-mono text-xs font-semibold uppercase tracking-widest",
                sort === s
                  ? "bg-[#DAFF01] text-[#0E1909] shadow-[0_1px_3px_rgba(14,25,9,0.10)]"
                  : "text-[#0E1909]/55 hover:text-[#0E1909]"
              )}
            >
              {s === "trending" && <Signal size={13} />}
              {s}
            </button>
          ))}
        </div>
        <button className="flex items-center gap-1.5 rounded-md border border-[#0E1909]/12 bg-white px-3 py-2 font-mono text-xs uppercase tracking-widest text-[#0E1909]/60 hover:text-[#0E1909]">
          <Filter size={13} /> filter
        </button>
      </div>

      {/* Feed */}
      <div className="space-y-5">
        {error && posts.length === 0 ? (
          <ApiErrorState
            onRetry={refetch}
            message="Couldn't load the war room feed."
          />
        ) : loading && posts.length === 0 ? (
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
          posts.map((p) => (
            <div key={p.id} id={`post-${p.id}`} className="scroll-mt-32 rounded-lg transition-shadow duration-300">
              <FeedPost post={p} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
