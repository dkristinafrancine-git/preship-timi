"use client";

import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useMutate } from "@/lib/use-api";
import { useApi } from "@/lib/use-api";
import { usePreship } from "@/lib/preship-store";
import type { Founder, Project } from "@/lib/preship-types";
import { ProjectMark } from "../avatars";
import { Type, Mic, Hash, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Mode = "text" | "audio";

export function PostComposer() {
  const [mode, setMode] = useState<Mode>("text");
  const [body, setBody] = useState("");
  const [audioTitle, setAudioTitle] = useState("");
  const [tags, setTags] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [recording, setRecording] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const mutate = useMutate();
  const me = usePreship((s) => s.me);
  const { data: meData } = useApi<{ user: Founder; projects: Project[] }>("/api/me");
  const projects = meData?.projects ?? [];

  const recRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = () => {
    if (recRef.current) {
      clearInterval(recRef.current);
      recRef.current = null;
    }
  };

  const toggleRecord = () => {
    if (recording) {
      stopTimer();
      setRecording(false);
      return;
    }
    setRecording(true);
    setRecordSecs(0);
    recRef.current = setInterval(() => {
      setRecordSecs((s) => {
        if (s >= 300) {
          stopTimer();
          setRecording(false);
          return s;
        }
        return s + 1;
      });
    }, 1000);
  };

  const reset = () => {
    setBody("");
    setAudioTitle("");
    setTags("");
    setProjectId("");
    setRecordSecs(0);
    setRecording(false);
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
    setSubmitting(true);

    // synthesize a waveform for audio posts
    const wf =
      mode === "audio"
        ? Array.from({ length: 48 }, (_, i) => {
            const env = Math.sin((i / 48) * Math.PI);
            return Math.max(0.15, Math.min(1, 0.35 + Math.random() * 0.6 * (0.4 + env))).toFixed(3);
          }).join(",")
        : undefined;

    const res = await mutate("/api/posts", {
      method: "POST",
      body: {
        type: mode,
        body: mode === "text" ? body.trim() : body.trim() || null,
        audioTitle: mode === "audio" ? audioTitle.trim() : null,
        audioDuration: mode === "audio" ? Math.max(8, recordSecs || 92) : null,
        audioWaveform: wf ?? null,
        tags: tags.trim() || null,
        projectId: projectId || null,
      },
    });
    setSubmitting(false);
    if (res.ok) {
      toast.success(mode === "audio" ? "Audio post shipped →" : "Post shipped →");
      reset();
    }
  };

  const fmtRec = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="terminal-card">
      {/* mode tabs */}
      <div className="flex items-center justify-between border-b border-[#0E1909]/10 bg-[#f8f9f3] px-3 py-2">
        <div className="flex items-center gap-1">
          <span className="flex gap-1">
            <span className="h-2 w-2 rounded-full bg-[#0E1909]/15" />
            <span className="h-2 w-2 rounded-full bg-[#0E1909]/15" />
            <span className="h-2 w-2 rounded-full bg-[#DAFF01]" />
          </span>
          <span className="ml-2 font-mono text-[10px] font-semibold uppercase tracking-widest text-[#0E1909]/60">
            post · as-founder
          </span>
        </div>
        <div className="flex items-center gap-1 rounded-md border border-[#0E1909]/12 bg-white p-0.5">
          <button
            onClick={() => setMode("text")}
            className={cn(
              "flex items-center gap-1.5 rounded px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-widest transition",
              mode === "text" ? "bg-[#0E1909] text-[#DAFF01]" : "text-[#0E1909]/55 hover:text-[#0E1909]"
            )}
          >
            <Type size={12} /> Text
          </button>
          <button
            onClick={() => setMode("audio")}
            className={cn(
              "flex items-center gap-1.5 rounded px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-widest transition",
              mode === "audio" ? "bg-[#0E1909] text-[#DAFF01]" : "text-[#0E1909]/55 hover:text-[#0E1909]"
            )}
          >
            <Mic size={12} /> Audio
          </button>
        </div>
      </div>

      <div className="p-4">
        <div className="flex gap-3">
          <div className="shrink-0">
            {me && (
              <div className="text-center">
                <span className="font-mono text-[9px] uppercase tracking-widest text-[#0E1909]/40">
                  you
                </span>
              </div>
            )}
          </div>
          <div className="flex-1">
            {mode === "audio" ? (
              <div className="space-y-2">
                <input
                  value={audioTitle}
                  onChange={(e) => setAudioTitle(e.target.value)}
                  placeholder="Audio title — one line, high-signal"
                  className="w-full bg-transparent font-display text-base font-medium text-[#0E1909] outline-none placeholder:text-[#0E1909]/30"
                />
                {/* recording bar */}
                <div className="flex items-center gap-3 rounded-md border border-[#0E1909]/12 bg-[#0E1909] px-3 py-2.5">
                  <button
                    onClick={toggleRecord}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full border-2 transition",
                      recording
                        ? "border-[#e0463c] bg-[#e0463c] text-white"
                        : "border-[#DAFF01] bg-[#DAFF01] text-[#0E1909] hover:scale-105"
                    )}
                    aria-label={recording ? "Stop recording" : "Start recording"}
                  >
                    {recording ? (
                      <span className="h-3 w-3 rounded-[2px] bg-white" />
                    ) : (
                      <Mic size={14} />
                    )}
                  </button>
                  <div className="flex-1">
                    {recording ? (
                      <div className="flex items-end gap-[2px]" style={{ height: 20 }}>
                        {Array.from({ length: 28 }).map((_, i) => (
                          <span
                            key={i}
                            className="w-[2px] rounded-full bg-[#e0463c]"
                            style={{
                              height: `${20 + Math.sin(i + recordSecs) * 40 + Math.random() * 30}%`,
                              animation: `blink 0.8s ease-in-out ${i * 0.05}s infinite`,
                            }}
                          />
                        ))}
                      </div>
                    ) : recordSecs > 0 ? (
                      <span className="font-mono text-xs text-[#DAFF01]/70">
                        Recorded {fmtRec(recordSecs)} · ready to ship
                      </span>
                    ) : (
                      <span className="font-mono text-xs text-[#DAFF01]/60">
                        Tap to record · max 5:00
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-xs tabular-nums text-[#DAFF01]">
                    {fmtRec(recordSecs)}
                  </span>
                </div>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Optional context for the audio…"
                  className="min-h-[60px] resize-none border-[#0E1909]/12 bg-transparent font-display text-sm text-[#0E1909] placeholder:text-[#0E1909]/30 focus-visible:ring-[#DAFF01]"
                />
              </div>
            ) : (
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="What are you shipping in the dark?"
                className="min-h-[88px] resize-none border-0 bg-transparent p-0 font-display text-base text-[#0E1909] shadow-none focus-visible:ring-0 placeholder:text-[#0E1909]/30"
              />
            )}
          </div>
        </div>

        {/* tags + project + actions */}
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#0E1909]/8 pt-3">
          <div className="flex items-center gap-1.5 rounded-md border border-[#0E1909]/12 bg-white px-2 py-1">
            <Hash size={12} className="text-[#0E1909]/40" />
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="tags, comma-separated"
              className="w-44 bg-transparent font-mono text-[11px] text-[#0E1909] outline-none placeholder:text-[#0E1909]/30"
            />
          </div>

          {projects.length > 0 && (
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="rounded-md border border-[#0E1909]/12 bg-white px-2 py-1 font-mono text-[11px] text-[#0E1909] outline-none"
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
            <span className="inline-flex items-center gap-1 rounded-md bg-[#f4ffd6] px-1.5 py-1 font-mono text-[10px] uppercase tracking-widest text-[#0E1909]/60">
              tagged: {projects.find((p) => p.id === projectId)?.name}
              <button onClick={() => setProjectId("")} className="hover:text-[#0E1909]">
                <X size={10} />
              </button>
            </span>
          )}

          <div className="ml-auto flex items-center gap-2">
            <span className="hidden font-mono text-[10px] uppercase tracking-widest text-[#0E1909]/35 sm:inline">
              cmd+enter to ship
            </span>
            <Button
              onClick={submit}
              disabled={submitting}
              className="bg-[#DAFF01] font-mono text-[11px] font-semibold uppercase tracking-widest text-[#0E1909] shadow-none hover:bg-[#c4e600] disabled:opacity-60"
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
