"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { FeedPost, Comment, Founder } from "@/lib/preship-types";
import { fmtRelative } from "@/lib/preship";
import { FounderAvatar, ProjectMark } from "../avatars";
import { StageChip, Tag } from "../badges";
import { WaveformPlayer } from "../waveform";
import { useMutate } from "@/lib/use-api";
import { useApi } from "@/lib/use-api";
import { Heart, Repeat2, Handshake, MessageCircle, Share, MoreHorizontal, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function FeedPost({ post }: { post: FeedPost }) {
  const [showComments, setShowComments] = useState(false);
  const mutate = useMutate();

  const react = async (kind: "like" | "repost" | "handshake") => {
    await mutate(`/api/posts/${post.id}/react`, { method: "POST", body: { kind } });
  };

  const tags = post.tags ? post.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];

  return (
    <article className="terminal-card">
      {/* header */}
      <div className="flex items-start gap-3 p-4 pb-3">
        <FounderAvatar founder={post.author} size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="font-display text-sm font-semibold text-[#0E1909]">
              {post.author.name}
            </span>
            <span className="font-mono text-xs text-[#0E1909]/45">@{post.author.handle}</span>
            <span className="font-mono text-xs text-[#0E1909]/30">·</span>
            <span className="font-mono text-xs text-[#0E1909]/45">{fmtRelative(post.createdAt)}</span>
          </div>
          <p className="truncate font-mono text-[11px] text-[#0E1909]/50">{post.author.title}</p>
        </div>
        {post.project && (
          <div className="flex shrink-0 items-center gap-1.5 rounded-md border border-[#0E1909]/12 bg-[#f8f9f3] px-2 py-1">
            <ProjectMark mark={post.project.logoMark} color={post.project.logoColor} size={20} />
            <div className="hidden sm:block">
              <p className="font-display text-xs font-semibold leading-tight text-[#0E1909]">
                {post.project.name}
              </p>
              <StageChip stage={post.project.alphaStage} className="mt-0.5 !px-1 !py-0" />
            </div>
          </div>
        )}
        <button className="rounded p-1 text-[#0E1909]/30 hover:bg-[#0E1909]/5 hover:text-[#0E1909]">
          <MoreHorizontal size={16} />
        </button>
      </div>

      {/* body */}
      <div className="px-4 pb-3">
        {post.type === "audio" ? (
          <div className="space-y-3">
            {post.body && (
              <p className="whitespace-pre-wrap font-display text-[15px] leading-relaxed text-[#0E1909]/85">
                {post.body}
              </p>
            )}
            <WaveformPlayer
              waveform={post.audioWaveform ?? ""}
              duration={post.audioDuration ?? 0}
              title={post.audioTitle ?? undefined}
            />
          </div>
        ) : (
          <p className="whitespace-pre-wrap font-display text-[15px] leading-relaxed text-[#0E1909]/90">
            {post.body}
          </p>
        )}

        {tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {tags.map((t) => (
              <Tag key={t}>#{t}</Tag>
            ))}
          </div>
        )}
      </div>

      {/* reactions */}
      <div className="flex items-center gap-1 border-t border-[#0E1909]/8 px-2 py-1.5">
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
            className="rounded p-1.5 text-[#0E1909]/40 transition hover:bg-[#0E1909]/5 hover:text-[#0E1909]"
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
        "group flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-xs transition",
        highlight && !active
          ? "text-[#0E1909]/70 hover:bg-[#DAFF01] hover:text-[#0E1909]"
          : active
          ? cn("font-semibold", activeColor)
          : "text-[#0E1909]/50 hover:bg-[#0E1909]/5 hover:text-[#0E1909]"
      )}
    >
      <Icon size={15} className={cn(active && activeColor.includes("bg") && "text-[#0E1909]")} />
      <span className="uppercase tracking-wider">{count}</span>
      <span className="hidden uppercase tracking-wider text-[10px] opacity-50 sm:inline">
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
  const me = useApi<{ user: Founder }>("/api/me");

  const submit = async () => {
    if (!body.trim()) return;
    setSubmitting(true);
    const res = await mutate(`/api/posts/${postId}/comment`, {
      method: "POST",
      body: { body: body.trim() },
    });
    setSubmitting(false);
    if (res.ok) {
      setBody("");
    }
  };

  return (
    <div className="border-t border-[#0E1909]/8 bg-[#f8f9f3] p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#0E1909]/50">
          thread · {data?.comments?.length ?? 0}
        </span>
      </div>
      <div className="space-y-2.5">
        {loading ? (
          <p className="font-mono text-xs text-[#0E1909]/40">loading thread…</p>
        ) : (
          data?.comments?.map((c) => (
            <div key={c.id} className="flex gap-2">
              <FounderAvatar founder={c.user} size={24} />
              <div className="flex-1 rounded-md border border-[#0E1909]/8 bg-white px-2.5 py-1.5">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-display text-xs font-semibold text-[#0E1909]">
                    {c.user.name}
                  </span>
                  <span className="font-mono text-[10px] text-[#0E1909]/40">
                    @{c.user.handle} · {fmtRelative(c.createdAt)}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-[#0E1909]/80">{c.body}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* composer */}
      <div className="mt-3 flex items-center gap-2">
        {me.data?.user && <FounderAvatar founder={me.data.user} size={24} />}
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
          className="flex-1 rounded-md border border-[#0E1909]/12 bg-white px-2.5 py-1.5 font-display text-xs text-[#0E1909] outline-none placeholder:text-[#0E1909]/30 focus-visible:border-[#0E1909]"
        />
        <Button
          size="sm"
          onClick={submit}
          disabled={submitting || !body.trim()}
          className="h-7 bg-[#DAFF01] font-mono text-[10px] font-semibold uppercase tracking-widest text-[#0E1909] shadow-none hover:bg-[#c4e600] disabled:opacity-50"
        >
          {submitting ? <Loader2 size={11} className="animate-spin" /> : "reply →"}
        </Button>
      </div>
    </div>
  );
}
