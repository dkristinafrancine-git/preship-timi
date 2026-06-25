"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useMutate, useFeedCache } from "@/lib/use-api";
import { useApi } from "@/lib/use-api";
import { usePreship } from "@/lib/preship-store";
import { useAudioRecorder } from "@/lib/use-audio-recorder";
import type { FeedPost, Founder, Project } from "@/lib/preship-types";
import { ProjectMark } from "../avatars";
import { Type, Mic, Hash, X, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

type Mode = "text" | "audio";

export function PostComposer() {
  const [mode, setMode] = useState<Mode>("text");
  const [body, setBody] = useState("");
  const [audioTitle, setAudioTitle] = useState("");
  const [tags, setTags] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [uploadedAudioUrl, setUploadedAudioUrl] = useState<string | null>(null);
  const mutate = useMutate();
  const feedCache = useFeedCache();
  const me = usePreship((s) => s.me);
  const { data: meData } = useApi<{ user: Founder; projects: Project[] }>("/api/me");
  const projects = meData?.projects ?? [];

  const recorder = useAudioRecorder();

  const toggleRecord = () => {
    if (recorder.recording) {
      recorder.stop();
    } else {
      recorder.start();
    }
  };

  // when recording finishes and we have a blob + waveform, upload the audio
  const ensureAudioUploaded = async (): Promise<string | null> => {
    if (uploadedAudioUrl) return uploadedAudioUrl;
    if (!recorder.audioBlob) return null;
    setUploadingAudio(true);
    try {
      const form = new FormData();
      const ext = recorder.audioBlob.type.split("/")[1] || "webm";
      const file = new File([recorder.audioBlob], `audio.${ext}`, { type: recorder.audioBlob.type });
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error((json as { error?: string }).error ?? "Upload failed");
      const url = (json as { url: string }).url;
      setUploadedAudioUrl(url);
      setUploadingAudio(false);
      return url;
    } catch (e) {
      setUploadingAudio(false);
      toast.error(e instanceof Error ? e.message : "Audio upload failed");
      return null;
    }
  };

  const reset = () => {
    setBody("");
    setAudioTitle("");
    setTags("");
    setProjectId("");
    setUploadedAudioUrl(null);
    recorder.reset();
  };

  const submit = async () => {
    if (mode === "text" && !body.trim()) {
      toast.error("Write something first.");
      return;
    }
    if (mode === "audio" && !audioTitle.trim()) {
      toast.error("Give your audio a title.");
      return;
    }
    if (mode === "audio" && !recorder.audioBlob && recorder.seconds === 0) {
      toast.error("Record some audio first.");
      return;
    }
    setSubmitting(true);

    // For audio mode: upload the real recording + use the real waveform
    let audioUrl: string | null = null;
    let wf: string | null = null;
    let audioDuration: number | null = null;

    if (mode === "audio") {
      // Upload the real audio blob
      audioUrl = await ensureAudioUploaded();
      // Use the real waveform extracted from the recording
      wf = recorder.waveform.length > 0
        ? recorder.waveform.map((v) => v.toFixed(3)).join(",")
        : null;
      audioDuration = Math.max(1, recorder.seconds);
    }

    // Snapshot the payload we're about to send, in the exact server shapes,
    // so the optimistic provisional post matches what the DB will store.
    const payload = {
      type: mode,
      body: mode === "text" ? body.trim() : body.trim() || null,
      audioTitle: mode === "audio" ? audioTitle.trim() : null,
      audioUrl,
      audioDuration,
      audioWaveform: wf,
      tags: tags.trim() || null,
      projectId: projectId || null,
    };

    // Optimistic: build a provisional post from the composer state + current
    // user and prepend it to the feed INSTANTLY (before the round trip). A
    // fresh post has zero reactions/comments and the author's own (empty)
    // myReaction. The temp id is swapped for the real one once the create
    // resolves. Requires `me` — anonymous compose isn't reachable (the composer
    // only renders inside /app behind auth).
    const tempId = `optimistic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const selectedProject = projects.find((p) => p.id === projectId) ?? null;
    if (me) {
      const provisional: FeedPost = {
        id: tempId,
        authorId: me.id,
        projectId: payload.projectId,
        type: payload.type,
        body: payload.body,
        audioTitle: payload.audioTitle,
        audioUrl: payload.audioUrl,
        audioDuration: payload.audioDuration,
        audioWaveform: payload.audioWaveform,
        tags: payload.tags,
        impressions: 0,
        createdAt: new Date().toISOString(),
        author: me,
        // FeedPost.project is typed Project|null but the real feed payload only
        // carries the card fields below. selectedProject is a full Project from
        // /api/me, so it satisfies the type; FeedPost only renders the card
        // subset. Passing the whole object is correct and avoids an inline
        // partial that wouldn't match the Project type.
        project: selectedProject,
        _count: {
          reactions: { like: 0, repost: 0, handshake: 0 },
          comments: 0,
        },
        myReaction: [],
      };
      feedCache.prepend(provisional);
    }
    // Clear the composer immediately so the user sees their post land and the
    // box empty in the same frame — the create continues in the background.
    const draftReset = { mode, body, audioTitle, tags, projectId };
    reset();

    const res = await mutate<{ post: Omit<FeedPost, "_count" | "myReaction"> }>(
      "/api/posts",
      {
        method: "POST",
        body: payload,
        // We already optimistically prepended; don't refetch the whole feed.
        invalidate: [],
      }
    );
    setSubmitting(false);

    if (res.ok && res.data?.post) {
      // Reconcile: swap the temp post for the real one (real id, server
      // canonical createdAt). A fresh post still has empty counts/myReaction.
      const real = res.data.post as FeedPost;
      const shaped: FeedPost = {
        ...real,
        _count: real._count ?? {
          reactions: { like: 0, repost: 0, handshake: 0 },
          comments: 0,
        },
        myReaction: real.myReaction ?? [],
      };
      feedCache.reconcile(tempId, shaped);
      toast.success(mode === "audio" ? "Audio post shipped →" : "Post shipped →");
    } else {
      // Create failed: remove the provisional post so the feed doesn't show a
      // ghost, and restore the draft so the user doesn't lose their input.
      feedCache.remove(tempId);
      setMode(draftReset.mode);
      setBody(draftReset.body);
      setAudioTitle(draftReset.audioTitle);
      setTags(draftReset.tags);
      setProjectId(draftReset.projectId);
      // useMutate already toasted the error message.
    }
  };

  const fmtRec = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="terminal-card">
      {/* mode tabs */}
      <div className="flex items-center justify-between border-b border-[#0E1909]/10 bg-[#f8f9f3] px-4 py-2.5">
        <div className="flex items-center gap-1">
          <span className="flex gap-1">
            <span className="h-2 w-2 rounded-full bg-[#0E1909]/15" />
            <span className="h-2 w-2 rounded-full bg-[#0E1909]/15" />
            <span className="h-2 w-2 rounded-full bg-[#DAFF01]" />
          </span>
          <span className="ml-2.5 font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/60">
            post · as-founder
          </span>
        </div>
        <div className="flex items-center gap-1 rounded-md border border-[#0E1909]/12 bg-white p-0.5">
          <button
            onClick={() => setMode("text")}
            className={cn(
              "tactile-flat flex items-center gap-1.5 rounded px-2.5 py-1.5 font-mono text-xs font-semibold uppercase tracking-widest",
              mode === "text" ? "bg-[#0E1909] text-[#DAFF01]" : "text-[#0E1909]/55 hover:text-[#0E1909]"
            )}
          >
            <Type size={13} /> Text
          </button>
          <button
            onClick={() => setMode("audio")}
            className={cn(
              "tactile-flat flex items-center gap-1.5 rounded px-2.5 py-1.5 font-mono text-xs font-semibold uppercase tracking-widest",
              mode === "audio" ? "bg-[#0E1909] text-[#DAFF01]" : "text-[#0E1909]/55 hover:text-[#0E1909]"
            )}
          >
            <Mic size={13} /> Audio
          </button>
        </div>
      </div>

      <div className="p-5">
        <div className="flex gap-3">
          <div className="shrink-0">
            {me && (
              <div className="text-center">
                <span className="font-mono text-xs uppercase tracking-widest text-[#0E1909]/40">
                  you
                </span>
              </div>
            )}
          </div>
          <div className="flex-1">
            {mode === "audio" ? (
              <div className="space-y-3">
                <input
                  value={audioTitle}
                  onChange={(e) => setAudioTitle(e.target.value)}
                  placeholder="Audio title — one line, high-signal"
                  className="w-full bg-transparent font-display text-lg font-medium text-[#0E1909] outline-none placeholder:text-[#0E1909]/30"
                />
                {/* recording bar */}
                <div className="flex items-center gap-3 rounded-md border border-[#0E1909]/12 bg-[#0E1909] px-3 py-2.5">
                  <button
                    onClick={toggleRecord}
                    className={cn(
                      "tactile flex h-8 w-8 items-center justify-center rounded-full border-2",
                      recorder.recording
                        ? "border-[#e0463c] bg-[#e0463c] text-white shadow-[0_0_0_4px_rgba(224,70,60,0.15)]"
                        : "border-[#DAFF01] bg-[#DAFF01] text-[#0E1909] hover:scale-105 hover:shadow-[0_4px_12px_rgba(218,255,1,0.4)]"
                    )}
                    aria-label={recorder.recording ? "Stop recording" : "Start recording"}
                  >
                    {recorder.recording ? (
                      <span className="h-3 w-3 rounded-[2px] bg-white" />
                    ) : (
                      <Mic size={14} />
                    )}
                  </button>
                  <div className="flex-1">
                    {recorder.recording ? (
                      /* Real mic level visualization */
                      <div className="flex items-end gap-[2px]" style={{ height: 20 }}>
                        {Array.from({ length: 28 }).map((_, i) => {
                          const base = recorder.level * 100;
                          const variance = Math.sin(i * 0.5 + Date.now() / 100) * 30;
                          return (
                            <span
                              key={i}
                              className="w-[2px] rounded-full bg-[#e0463c]"
                              style={{
                                height: `${Math.max(8, Math.min(100, base + variance + Math.random() * 20))}%`,
                              }}
                            />
                          );
                        })}
                      </div>
                    ) : recorder.audioBlob ? (
                      <span className="font-mono text-xs text-[#DAFF01]/70">
                        Recorded {fmtRec(recorder.seconds)} · {recorder.waveform.length > 0 ? "waveform ready" : "processing…"} · ready to ship
                      </span>
                    ) : (
                      <span className="font-mono text-xs text-[#DAFF01]/60">
                        Tap to record · uses your real microphone
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-xs tabular-nums text-[#DAFF01]">
                    {fmtRec(recorder.seconds)}
                  </span>
                </div>
                {recorder.error && (
                  <div className="flex items-center gap-2 rounded-md border border-[#e0463c]/30 bg-[#e0463c]/5 px-3 py-2">
                    <AlertCircle size={14} className="shrink-0 text-[#e0463c]" />
                    <span className="text-xs text-[#e0463c]">{recorder.error}</span>
                  </div>
                )}
                {uploadingAudio && (
                  <div className="flex items-center gap-2 rounded-md border border-[#DAFF01]/30 bg-[#f4ffd6] px-3 py-2">
                    <Loader2 size={14} className="shrink-0 animate-spin text-[#0E1909]" />
                    <span className="font-mono text-xs uppercase tracking-widest text-[#0E1909]/60">
                      uploading audio…
                    </span>
                  </div>
                )}
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Optional context for the audio…"
                  className="min-h-[64px] resize-none border-[#0E1909]/12 bg-transparent font-display text-[15px] leading-relaxed text-[#0E1909] placeholder:text-[#0E1909]/35 focus-visible:ring-[#DAFF01]"
                />
              </div>
            ) : (
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="What are you broadcasting to the war room?"
                className="min-h-[96px] resize-none border-0 bg-transparent p-0 font-display text-lg leading-relaxed text-[#0E1909] shadow-none focus-visible:ring-0 placeholder:text-[#0E1909]/30"
              />
            )}
          </div>
        </div>

        {/* tags + project + actions */}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#0E1909]/8 pt-4">
          <div className="flex h-9 items-center gap-1.5 rounded-md border border-[#0E1909]/12 bg-white px-2.5">
            <Hash size={13} className="text-[#0E1909]/40" />
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="tags, comma-separated"
              className="w-48 bg-transparent font-mono text-xs text-[#0E1909] outline-none placeholder:text-[#0E1909]/35"
            />
          </div>

          {projects.length > 0 && (
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="h-9 rounded-md border border-[#0E1909]/12 bg-white px-2.5 font-mono text-xs text-[#0E1909] outline-none focus-visible:border-[#0E1909]"
            >
              <option value="">post as founder</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  ▣ {p.name}
                </option>
              ))}
            </select>
          )}

          {projectId && (
            <span className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#f4ffd6] px-2.5 font-mono text-xs uppercase tracking-widest text-[#0E1909]/60">
              tagged: {projects.find((p) => p.id === projectId)?.name}
              <button onClick={() => setProjectId("")} className="hover:text-[#0E1909]">
                <X size={12} />
              </button>
            </span>
          )}

          <div className="ml-auto flex items-center gap-3">
            <span className="hidden font-mono text-xs uppercase tracking-widest text-[#0E1909]/40 sm:inline">
              cmd+enter to ship
            </span>
            <Button
              onClick={submit}
              disabled={submitting || uploadingAudio || (mode === "audio" && recorder.recording)}
              className="cta-lime h-9 bg-[#DAFF01] font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909] hover:bg-[#c4e600] disabled:opacity-60"
            >
              {submitting ? <Loader2 size={12} className="animate-spin" /> : null}
              {mode === "audio" ? "Ship audio →" : "Ship post →"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
