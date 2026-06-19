"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { fmtDuration } from "@/lib/preship";

/**
 * Audio waveform player.
 *
 * If `audioUrl` is provided, plays real audio via an <audio> element and
 * syncs the waveform progress to the actual playback position.
 *
 * If no `audioUrl`, falls back to a simulated player that animates progress
 * over the waveform bars at the given duration.
 */
export function WaveformPlayer({
  waveform,
  duration,
  title,
  audioUrl,
  className,
  compact = false,
}: {
  waveform: string;
  duration: number;
  title?: string;
  audioUrl?: string | null;
  className?: string;
  compact?: boolean;
}) {
  const bars = waveform
    .split(",")
    .map((n) => parseFloat(n))
    .filter((n) => !isNaN(n));
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1
  const raf = useRef<number | null>(null);
  const startTs = useRef<number>(0);
  const startProgress = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Real audio mode: sync progress to the <audio> element
  useEffect(() => {
    if (!audioUrl) return;
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      if (audio.duration > 0) {
        setProgress(audio.currentTime / audio.duration);
      }
    };
    const onEnded = () => {
      setPlaying(false);
      setProgress(0);
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, [audioUrl]);

  // Simulated mode (no audioUrl): animate progress via requestAnimationFrame
  useEffect(() => {
    if (audioUrl || !playing) {
      if (raf.current) cancelAnimationFrame(raf.current);
      return;
    }
    startTs.current = performance.now();
    startProgress.current = progress;
    const step = (now: number) => {
      const elapsed = (now - startTs.current) / 1000;
      const p = startProgress.current + elapsed / duration;
      if (p >= 1) {
        setProgress(1);
        setPlaying(false);
        return;
      }
      setProgress(p);
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [playing, duration, audioUrl]);

  const toggle = () => {
    if (audioUrl && audioRef.current) {
      if (playing) {
        audioRef.current.pause();
      } else {
        if (progress >= 1) {
          audioRef.current.currentTime = 0;
        }
        audioRef.current.play().catch(() => {});
      }
    } else {
      if (progress >= 1) setProgress(0);
      setPlaying((p) => !p);
    }
  };

  const seekTo = (idx: number) => {
    const p = (idx + 0.5) / bars.length;
    setProgress(Math.max(0, Math.min(1, p)));
    if (audioUrl && audioRef.current) {
      audioRef.current.currentTime = p * (audioRef.current.duration || duration);
    } else if (playing) {
      startTs.current = performance.now();
      startProgress.current = p;
    }
  };

  const currentSec = Math.floor(progress * duration);
  const playedBars = Math.floor(progress * bars.length);

  return (
    <div
      className={cn(
        "rounded-lg border border-[#0E1909]/12 bg-[#0E1909] p-3 text-[#DAFF01]",
        className
      )}
    >
      {audioUrl && <audio ref={audioRef} src={audioUrl} preload="metadata" />}
      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          aria-label={playing ? "Pause" : "Play"}
          className="tactile flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#DAFF01] text-[#0E1909] hover:scale-110 hover:shadow-[0_4px_12px_rgba(218,255,1,0.4)]"
        >
          {playing ? (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <rect x="2" y="1" width="3.5" height="12" rx="1" />
              <rect x="8.5" y="1" width="3.5" height="12" rx="1" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <path d="M3 1.5v11l9-5.5z" />
            </svg>
          )}
        </button>

        {!compact && title && (
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-sm font-medium text-white">
              {title}
            </p>
          </div>
        )}

        <div className="font-mono text-xs tabular-nums text-[#DAFF01]/80">
          {fmtDuration(currentSec)} / {fmtDuration(duration)}
        </div>
      </div>

      <div className="mt-3 flex items-end gap-[2px]" style={{ height: compact ? 22 : 34 }}>
        {bars.map((h, i) => {
          const played = i < playedBars;
          return (
            <button
              key={i}
              onClick={() => seekTo(i)}
              className="group flex-1 transition-transform duration-100 hover:scale-y-110"
              style={{ height: "100%" }}
              aria-label={`Seek to ${Math.floor((i / bars.length) * duration)}s`}
            >
              <span
                className="block w-full rounded-full transition-all duration-150 group-hover:opacity-100"
                style={{
                  height: `${Math.max(8, h * 100)}%`,
                  background: played ? "#DAFF01" : "rgba(218,255,1,0.28)",
                }}
              />
            </button>
          );
        })}
      </div>

      {!compact && (
        <div className="mt-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-[#DAFF01]/50">
          <span>preship / audio {audioUrl ? "· live" : "· simulated"}</span>
          <span>{playing ? "playing" : progress > 0 ? "paused" : "ready"}</span>
        </div>
      )}
    </div>
  );
}

/** Tiny inline waveform used in cards (non-interactive). */
export function WaveformMini({ waveform, className }: { waveform: string; className?: string }) {
  const bars = waveform
    .split(",")
    .map((n) => parseFloat(n))
    .filter((n) => !isNaN(n));
  return (
    <div className={cn("flex items-end gap-[2px]", className)} style={{ height: 18 }}>
      {bars.slice(0, 28).map((h, i) => (
        <span
          key={i}
          className="block w-[2px] rounded-full bg-current"
          style={{ height: `${Math.max(12, h * 100)}%` }}
        />
      ))}
    </div>
  );
}
