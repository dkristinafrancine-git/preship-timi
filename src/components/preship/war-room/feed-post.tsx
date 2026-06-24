"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { FeedPost, Comment, Founder } from "@/lib/preship-types";
import { fmtRelative } from "@/lib/preship";
import { FounderAvatar, ProjectMark } from "../avatars";
import { StageCode, Tag, FoundingBadge } from "../badges";
import { FounderHoverCard } from "../founder-hover-card";
import { WaveformPlayer } from "../waveform";
import { useMutate, useFeedCache, useCommentCache } from "@/lib/use-api";
import { useApi } from "@/lib/use-api";
import { Heart, Repeat2, Handshake, MessageCircle, Share, MoreHorizontal, Loader2, Pencil, Trash2, X, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePreship } from "@/lib/preship-store";
import { useRouter } from "next/navigation";

export function FeedPost({ post }: { post: FeedPost }) {
  const [showComments, setShowComments] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(post.body ?? "");
  const [savingEdit, setSavingEdit] = useState(false);
  const mutate = useMutate();
  const feedCache = useFeedCache();
  const me = usePreship((s) => s.me);
  const router = useRouter();
  const isAuthor = me?.id === post.authorId;

  const react = async (kind: "like" | "repost" | "handshake") => {
    // Anonymous visitors (public landing page) get routed to login instead of
    // firing a mutation they can't authenticate. Reactions need a session.
    if (!me) {
      router.push("/login?callbackUrl=/app");
      return;
    }
    // Optimistic: compute the target state from the current UI and patch the
    // feed cache IMMEDIATELY (same frame, no round trip). The background
    // worker writes the truth; on failure we roll back.
    const desired = !post.myReaction.includes(kind);
    feedCache.react(post.id, kind, desired);

    try {
      // Fire-and-forget the enqueue. The API validates + enqueues and returns
      // fast; it no longer holds the DB connection open across a write+notify.
      // We send `desired` so the server never has to read the reaction row.
      await fetch(`/api/posts/${post.id}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, desired }),
      });
    } catch {
      // Network failure: roll the optimistic patch back to the prior state.
      feedCache.react(post.id, kind, !desired);
      toast.error("Couldn't reach the server — reaction not saved.");
    }
  };

  const saveEdit = async () => {
    if (!editBody.trim()) return;
    setSavingEdit(true);
    const res = await mutate(`/api/posts/${post.id}`, {
      method: "PATCH",
      body: { body: editBody.trim() },
    });
    setSavingEdit(false);
    if (res.ok) {
      setEditing(false);
      toast.success("Post updated →");
    }
  };

  const tags = post.tags ? post.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];

  return (
    <article className="terminal-card">
      {/* header */}
      <div className="flex items-start gap-3.5 p-5 pb-3.5">
        <FounderAvatar founder={post.author} size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <FounderHoverCard founder={post.author} className="font-display text-[15px] font-semibold text-[#0E1909]">
              {post.author.name}
            </FounderHoverCard>
            <FoundingBadge show={post.author.isFoundingMember} className="-mt-0.5" />
            <span className="font-mono text-[13px] text-[#0E1909]/50">@{post.author.handle}</span>
            <span className="font-mono text-[13px] text-[#0E1909]/35">·</span>
            <span className="font-mono text-[13px] text-[#0E1909]/50">{fmtRelative(post.createdAt)}</span>
          </div>
          <p className="truncate font-mono text-xs text-[#0E1909]/55">{post.author.title}</p>
        </div>
        {post.project && (
          <div className="flex shrink-0 items-center gap-1.5 rounded-md border border-[#0E1909]/12 bg-[#f8f9f3] px-2.5 py-1.5">
            <ProjectMark mark={post.project.logoMark} color={post.project.logoColor} logoUrl={post.project.logoUrl} name={post.project.name} size={20} />
            <div className="hidden max-w-[120px] min-w-0 sm:block">
              <p className="truncate font-display text-[13px] font-semibold leading-tight text-[#0E1909]" title={post.project.name}>
                {post.project.name}
              </p>
              <StageCode stage={post.project.alphaStage} className="mt-0.5" />
            </div>
          </div>
        )}
        {isAuthor ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="tactile-flat rounded p-1 text-[#0E1909]/35 hover:bg-[#0E1909]/5 hover:text-[#0E1909]">
                <MoreHorizontal size={18} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 border-[#0E1909]/15">
              <DropdownMenuItem
                onClick={() => { setEditing(true); setEditBody(post.body ?? ""); }}
                className="cursor-pointer font-mono text-xs uppercase tracking-widest text-[#0E1909]/70"
              >
                <Pencil size={13} /> edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={async () => {
                  // Optimistic: pull the post from the feed cache instantly,
                  // then DELETE. No feed refetch (the row is gone from the UI
                  // already; the worker/DB already removed it by the time any
                  // refetch would run).
                  feedCache.remove(post.id);
                  const res = await mutate(`/api/posts/${post.id}`, {
                    method: "DELETE",
                    invalidate: [], // we already optimistically removed it
                  });
                  if (!res.ok) {
                    // On failure the next natural feed refetch restores it.
                    toast.error("Delete failed — post will reappear on refresh.");
                  } else {
                    toast.success("Post deleted →");
                  }
                }}
                className="cursor-pointer font-mono text-xs uppercase tracking-widest text-[#e0463c] focus:text-[#e0463c]"
              >
                <Trash2 size={13} /> delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <button
            onClick={() => toast.success("Link copied →")}
            className="tactile-flat rounded p-1 text-[#0E1909]/35 hover:bg-[#0E1909]/5 hover:text-[#0E1909]"
            aria-label="Share"
          >
            <Share size={16} />
          </button>
        )}
      </div>

      {/* body */}
      <div className="px-5 pb-4">
        {editing ? (
          <div className="space-y-3">
            <Textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              className="min-h-[80px] resize-none border-[#0E1909]/12 bg-white font-display text-[16px] leading-[1.65] text-[#0E1909] focus-visible:ring-[#DAFF01]"
              autoFocus
            />
            <div className="flex items-center justify-end gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setEditing(false); setEditBody(post.body ?? ""); }}
                className="font-mono text-xs uppercase tracking-widest text-[#0E1909]/55"
              >
                <X size={12} /> cancel
              </Button>
              <Button
                size="sm"
                onClick={saveEdit}
                disabled={savingEdit || !editBody.trim()}
                className="cta-lime bg-[#DAFF01] font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909] hover:bg-[#c4e600] disabled:opacity-50"
              >
                {savingEdit ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                save
              </Button>
            </div>
          </div>
        ) : post.type === "audio" ? (
          <div className="space-y-3.5">
            {post.body && (
              <p className="whitespace-pre-wrap font-display text-[15px] leading-[1.65] text-[#0E1909]/85">
                {post.body}
              </p>
            )}
            <WaveformPlayer
              waveform={post.audioWaveform ?? ""}
              duration={post.audioDuration ?? 0}
              title={post.audioTitle ?? undefined}
              audioUrl={post.audioUrl}
            />
          </div>
        ) : (
          <p className="whitespace-pre-wrap font-display text-[16px] leading-[1.65] text-[#0E1909]/90">
            {post.body}
          </p>
        )}

        {tags.length > 0 && (
          <div className="mt-3.5 flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <Tag key={t}>#{t}</Tag>
            ))}
          </div>
        )}
      </div>

      {/* reactions */}
      <div className="flex items-center gap-1 border-t border-[#0E1909]/8 px-3 py-2">
        <ReactionBtn
          icon={Heart}
          label="like"
          count={post._count.reactions.like}
          active={post.myReaction.includes("like")}
          activeColor="text-[#e0463c]"
          onClick={() => react("like")}
        />
        <ReactionBtn
          icon={Repeat2}
          label="repost"
          count={post._count.reactions.repost}
          active={post.myReaction.includes("repost")}
          activeColor="text-[#6f8a3e]"
          onClick={() => react("repost")}
        />
        <ReactionBtn
          icon={Handshake}
          label="handshake"
          count={post._count.reactions.handshake}
          active={post.myReaction.includes("handshake")}
          activeColor="text-[#0E1909] bg-[#DAFF01] hover:bg-[#DAFF01]"
          highlight
          onClick={() => react("handshake")}
        />
        <ReactionBtn
          icon={MessageCircle}
          label="reply"
          count={post._count.comments}
          active={showComments}
          activeColor="text-[#0E1909]"
          onClick={() => setShowComments((s) => !s)}
        />
        <div className="ml-auto flex items-center gap-1 pr-1">
          <button
            onClick={() => {
              toast.success("Link copied →");
            }}
            className="tactile-flat rounded p-1.5 text-[#0E1909]/40 hover:bg-[#0E1909]/5 hover:text-[#0E1909]"
            aria-label="Share"
          >
            <Share size={15} />
          </button>
        </div>
      </div>

      {showComments && <CommentsSection postId={post.id} />}
    </article>
  );
}

function ReactionBtn({
  icon: Icon,
  label,
  count,
  active,
  activeColor,
  highlight,
  onClick,
}: {
  icon: typeof Heart;
  label: string;
  count: number;
  active: boolean;
  activeColor: string;
  highlight?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "tactile-flat group flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-mono text-[13px]",
        highlight && !active
          ? "text-[#0E1909]/70 hover:bg-[#DAFF01] hover:text-[#0E1909]"
          : active
          ? cn("font-semibold", activeColor)
          : "text-[#0E1909]/55 hover:bg-[#0E1909]/5 hover:text-[#0E1909]"
      )}
    >
      <Icon size={16} className={cn("transition-transform duration-150 group-hover:scale-110", active && activeColor.includes("bg") && "text-[#0E1909]")} />
      <span className="tabular-nums">{count}</span>
      <span className="hidden uppercase tracking-wider text-xs opacity-55 sm:inline">
        {label}
      </span>
    </button>
  );
}

function CommentsSection({ postId }: { postId: string }) {
  const { data, loading } = useApi<{ comments: Comment[] }>(`/api/posts/${postId}/comment`);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const mutate = useMutate();
  const commentCache = useCommentCache();
  const me = useApi<{ user: Founder }>("/api/me");

  const submit = async () => {
    if (!body.trim()) return;
    const user = me.data?.user;
    if (!user) return;
    // Optimistic: prepend a provisional comment with a temp id the instant the
    // user submits, then reconcile temp→real when the POST resolves. On failure
    // we remove the provisional row + restore the draft. No refetch — the
    // comment list is the displayed content, patched in place.
    const text = body.trim();
    const tempId = `optimistic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const provisional: Comment = {
      id: tempId,
      body: text,
      createdAt: new Date().toISOString(),
      user,
    };
    commentCache.prepend(postId, provisional);
    setBody("");
    setSubmitting(true);
    const res = await mutate<{ comment: Comment }>(`/api/posts/${postId}/comment`, {
      method: "POST",
      body: { body: text },
      invalidate: [], // already patched optimistically
    });
    setSubmitting(false);
    if (res.ok && res.data?.comment) {
      commentCache.reconcile(postId, tempId, res.data.comment);
    } else {
      commentCache.remove(postId, tempId);
      setBody(text); // restore the draft so the user doesn't lose input
    }
  };

  return (
    <div className="border-t border-[#0E1909]/8 bg-[#f8f9f3] p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/50">
          thread · {data?.comments?.length ?? 0}
        </span>
      </div>
      <div className="space-y-3">
        {loading ? (
          <p className="font-mono text-[13px] text-[#0E1909]/40">loading thread…</p>
        ) : (
          data?.comments?.map((c) => (
            <div key={c.id} className="flex gap-2.5">
              <FounderAvatar founder={c.user} size={28} />
              <div className="group flex-1 rounded-md border border-[#0E1909]/8 bg-white px-3 py-2 transition-colors duration-150 hover:border-[#0E1909]/15 hover:bg-[#f8f9f3]">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-display text-[13px] font-semibold text-[#0E1909]">
                    {c.user.name}
                  </span>
                  <FoundingBadge show={c.user.isFoundingMember} size={11} />
                  <span className="font-mono text-xs text-[#0E1909]/45">
                    @{c.user.handle} · {fmtRelative(c.createdAt)}
                  </span>
                  {me.data?.user && c.user.id === me.data.user.id && (
                    <button
                      onClick={async () => {
                        // Optimistic remove + no refetch. On failure the next
                        // natural refetch restores the comment.
                        commentCache.remove(postId, c.id);
                        const res = await mutate(`/api/posts/${postId}/comment/${c.id}`, {
                          method: "DELETE",
                          invalidate: [],
                        });
                        if (!res.ok) toast.error("Delete failed — comment will reappear on refresh.");
                      }}
                      className="ml-auto rounded p-0.5 text-[#0E1909]/25 opacity-0 transition hover:text-[#e0463c] group-hover:opacity-100"
                      aria-label="Delete comment"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
                <p className="mt-1 text-[13px] leading-relaxed text-[#0E1909]/80">{c.body}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* composer */}
      <div className="mt-3.5 flex items-center gap-2">
        {me.data?.user && <FounderAvatar founder={me.data.user} size={28} />}
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Add to the thread…"
          className="h-9 flex-1 rounded-md border border-[#0E1909]/12 bg-white px-3 font-display text-[13px] text-[#0E1909] outline-none placeholder:text-[#0E1909]/35 focus-visible:border-[#0E1909]"
        />
        <Button
          size="sm"
          onClick={submit}
          disabled={submitting || !body.trim()}
          className="cta-lime h-9 bg-[#DAFF01] font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909] hover:bg-[#c4e600] disabled:opacity-50"
        >
          {submitting ? <Loader2 size={13} className="animate-spin" /> : "reply →"}
        </Button>
      </div>
    </div>
  );
}
