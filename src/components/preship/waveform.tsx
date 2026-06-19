"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { fmtDuration } from "@/lib/preship";

/**
 * Audio waveform player. Since we don't have real audio files, this is a
 * simulated player that animates playback progress over the waveform bars.
 * The visual language is intentionally "developer": mono timer, scrub bar,
 * lime progress fill on ink bars.
 */
export function WaveformPlayer({
  waveform,
  duration,
  title,
  className,
  compact = false,
}: {
  waveform: string;
  duration: number;
  title?: string;
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

  useEffect(() => {
    if (!playing) {
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
  }, [playing, duration]);

  const toggle = () => {
    if (progress >= 1) setProgress(0);
    setPlaying((p) => !p);
  };

  const seekTo = (idx: number) => {
    const p = (idx + 0.5) / bars.length;
    setProgress(Math.max(0, Math.min(1, p)));
    if (playing) {
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
      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          aria-label={playing ? "Pause" : "Play"}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#DAFF01] text-[#0E1909] transition hover:scale-105"
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
              className="group flex-1"
              style={{ height: "100%" }}
              aria-label={`Seek to ${Math.floor((i / bars.length) * duration)}s`}
            >
              <span
                className="block w-full rounded-full transition-colors"
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
          <span>preship / audio</span>
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
