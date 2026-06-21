"use client";

import { useEffect, useState, useCallback, memo } from "react";
import {
  LiveKitRoom,
  useLocalParticipant,
  useRemoteParticipants,
  useSpeakingParticipants,
  useConnectionState,
  ConnectionState,
} from "@livekit/components-react";
import { RoomEvent, Track } from "livekit-client";
import "@livekit/components-styles";
import { cn } from "@/lib/utils";
import { FounderAvatar } from "../avatars";
import { Mic, MicOff, Hand, Volume2, Loader2, WifiOff, AlertCircle, LogOut } from "lucide-react";
import { toast } from "sonner";
import type { IdeaLabSession } from "@/lib/preship-types";

/**
 * LiveAudioRoom — real LiveKit audio for an IdeaLab session.
 *
 * Mounted by session-detail.tsx when a founder clicks "join live room" (and
 * the session status is "live"). Owns the whole connection lifecycle:
 *   1. Fetches a short-lived token from /api/idealab/[id]/livekit-token
 *   2. Connects <LiveKitRoom> with audio enabled
 *   3. Renders a real participant grid (replacing the hardcoded mock tiles)
 *      driven by useRemoteParticipants + useLocalParticipant, with the
 *      speaking indicator driven by useSpeakingParticipants (real mic levels)
 *   4. Real mic mute via localParticipant.setMicrophoneEnabled
 *   5. Cleanly disconnects on unmount / leave
 *
 * Open-mic model: every admitted joiner can publish audio (the token route
 * grants canPublish to host + registered attendees).
 */

type TokenResponse = { token: string; url: string; roomName: string };
type TokenError = { error: string; status: number };

export function LiveAudioRoom({
  sessionId,
  isHost,
  onLeave,
}: {
  sessionId: string;
  isHost: boolean;
  onLeave: () => void;
}) {
  const [tokenData, setTokenData] = useState<TokenResponse | null>(null);
  const [loadState, setLoadState] = useState<
    | { kind: "loading" }
    | { kind: "error"; message: string }
    | { kind: "ready" }
  >({ kind: "loading" });

  // Fetch the token once on mount. The route enforces the admission gate
  // (auth + session live + signup), so a 4xx here is an admission failure.
  useEffect(() => {
    let alive = true;
    setLoadState({ kind: "loading" });
    fetch(`/api/idealab/${sessionId}/livekit-token`, {
      method: "POST",
      headers: { Accept: "application/json" },
    })
      .then(async (r) => {
        const json = await r.json().catch(() => ({}));
        if (!r.ok) {
          const msg = (json as TokenError).error ?? `HTTP ${r.status}`;
          throw Object.assign(new Error(msg), { status: r.status });
        }
        return json as TokenResponse;
      })
      .then((data) => {
        if (!alive) return;
        setTokenData(data);
        setLoadState({ kind: "ready" });
      })
      .catch((err: Error & { status?: number }) => {
        if (!alive) return;
        setLoadState({ kind: "error", message: err.message });
      });
    return () => {
      alive = false;
    };
  }, [sessionId]);

  // --- admission-failure / loading UI ---
  if (loadState.kind === "loading") {
    return (
      <RoomShell>
        <div className="flex items-center justify-center gap-2 py-8 font-mono text-xs uppercase tracking-widest text-[#DAFF01]/60">
          <Loader2 size={14} className="animate-spin" />
          connecting to live room…
        </div>
      </RoomShell>
    );
  }
  if (loadState.kind === "error") {
    return (
      <RoomShell>
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <AlertCircle size={20} className="text-[#DAFF01]/60" />
          <p className="max-w-[34ch] font-mono text-xs leading-relaxed text-[#DAFF01]/70">
            {loadState.message}
          </p>
          <button
            onClick={onLeave}
            className="rounded-md border border-[#DAFF01]/30 px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest text-[#DAFF01] hover:border-[#DAFF01]/60"
          >
            <LogOut size={11} className="mr-1 inline" />
            close
          </button>
        </div>
      </RoomShell>
    );
  }
  if (!tokenData) {
    return null;
  }

  // --- connected room ---
  return (
    <LiveKitRoom
      token={tokenData.token}
      serverUrl={tokenData.url}
      connect
      audio
      video={false}
      onDisconnected={() => {
        // The user (or network) left the room. Tell the parent to unmount us.
        onLeave();
      }}
      onError={(err) => {
        console.error("[LiveKitRoom] error", err);
        toast.error("Live audio connection error");
      }}
      options={{
        // Adaptive streaming keeps small rooms crisp without manual tuning.
        adaptiveAudio: true,
        dyncast: false,
      }}
    >
      <RoomInner sessionId={sessionId} isHost={isHost} onLeave={onLeave} />
    </LiveKitRoom>
  );
}

/** Shared ink background so the room reads as part of the session header. */
function RoomShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-b border-[#0E1909]/8 bg-[#0E1909] px-5 py-4">{children}</div>
  );
}

/** Inside the LiveKitRoom context — has access to all the hooks. */
function RoomInner({
  sessionId,
  isHost,
  onLeave,
}: {
  sessionId: string;
  isHost: boolean;
  onLeave: () => void;
}) {
  const connectionState = useConnectionState();
  const { localParticipant } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const speaking = useSpeakingParticipants();

  // who's actively speaking right now (real mic-level detection)
  const speakingIds = new Set(speaking.map((p) => p.identity));
  const isLocalSpeaking = localParticipant
    ? speakingIds.has(localParticipant.identity)
    : false;

  const connecting = connectionState === ConnectionState.Connecting;
  const reconnecting = connectionState === ConnectionState.Reconnecting;
  const failed = connectionState === ConnectionState.Disconnected;

  return (
    <div className="border-b border-[#0E1909]/8 bg-[#0E1909] px-5 py-4">
      {/* status bar */}
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 font-mono text-xs font-semibold uppercase tracking-widest text-[#DAFF01]">
          <span className="h-1.5 w-1.5 animate-blink rounded-full bg-[#e0463c]" />
          {reconnecting ? "reconnecting…" : connecting ? "joining room…" : "live audio room"}
        </span>
        <span className="font-mono text-xs uppercase tracking-widest text-[#DAFF01]/60">
          {1 + remoteParticipants.length} in room
        </span>
      </div>

      {reconnecting && (
        <div className="mt-2 flex items-center gap-1.5 rounded-md bg-[#DAFF01]/10 px-2 py-1 font-mono text-[11px] uppercase tracking-widest text-[#DAFF01]">
          <WifiOff size={11} /> connection dropped — retrying
        </div>
      )}

      {/* speakers grid: local first, then remotes */}
      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {localParticipant && (
          <LiveSpeakerTile
            identity={localParticipant.identity}
            name={localParticipant.name ?? "you"}
            metadata={localParticipant.metadata}
            speaking={isLocalSpeaking}
            isLocal
            isHost={isHost}
            muted={
              !localParticipant.isMicrophoneEnabled ||
              localParticipant.microphoneTrack?.isMuted === true
            }
          />
        )}
        {remoteParticipants.map((p) => (
          <LiveSpeakerTile
            key={p.identity}
            identity={p.identity}
            name={p.name ?? p.identity}
            metadata={p.metadata}
            speaking={speakingIds.has(p.identity)}
            isHost={false}
            muted={!p.isMicrophoneEnabled || p.microphoneTrack?.isMuted === true}
          />
        ))}
        {remoteParticipants.length === 0 && !connecting && (
          <p className="col-span-full py-4 text-center font-mono text-xs text-[#DAFF01]/40">
            you're the first one here — others will join
          </p>
        )}
      </div>

      {/* live meter — real audio presence */}
      <OnAirMeter active={speakingIds.size > 0 || isLocalSpeaking} />

      {/* mic controls */}
      <MicControls onLeave={onLeave} />
    </div>
  );
}

/** Parses the JSON metadata the token route stamped onto each participant. */
function parseMeta(
  metadata: string | undefined
): { handle?: string; avatarUrl?: string | null; title?: string | null; role?: string } {
  if (!metadata) return {};
  try {
    return JSON.parse(metadata);
  } catch {
    return {};
  }
}

/** A single speaker tile — speaking ring + avatar + name + mute indicator. */
const LiveSpeakerTile = memo(function LiveSpeakerTile({
  identity,
  name,
  metadata,
  speaking,
  isLocal,
  isHost,
  muted,
}: {
  identity: string;
  name: string;
  metadata?: string;
  speaking: boolean;
  isLocal?: boolean;
  isHost: boolean;
  muted: boolean;
}) {
  const meta = parseMeta(metadata);
  const founder = {
    name,
    handle: meta.handle ?? identity,
    avatarUrl: meta.avatarUrl ?? null,
    title: meta.title ?? "",
  };
  return (
    <div
      className={cn(
        "relative flex flex-col items-center gap-1 rounded-md border bg-white/5 p-2 transition",
        speaking
          ? "border-[#DAFF01] shadow-[0_0_16px_rgba(218,255,1,0.25)]"
          : "border-[#DAFF01]/15"
      )}
    >
      <div className="relative">
        <FounderAvatar founder={founder} size={36} />
        {speaking && (
          <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-[#DAFF01] ring-2 ring-[#0E1909]">
            <Volume2 size={7} className="text-[#0E1909]" />
          </span>
        )}
        {muted && !speaking && (
          <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-[#0E1909] ring-2 ring-[#0E1909]">
            <MicOff size={6} className="text-[#DAFF01]/50" />
          </span>
        )}
      </div>
      <span className="max-w-full truncate font-mono text-xs text-[#DAFF01]/70">
        @{founder.handle}
        {isLocal && <span className="text-[#DAFF01]/40"> (you)</span>}
      </span>
      <span className="rounded bg-[#DAFF01]/15 px-1 font-mono text-[8px] uppercase tracking-widest text-[#DAFF01]">
        {isHost ? "host" : meta.role?.split("-")[0] ?? "guest"}
      </span>
    </div>
  );
});

/** Mic + leave controls. Mute uses the real LiveKit local participant. */
function MicControls({ onLeave }: { onLeave: () => void }) {
  const { localParticipant } = useLocalParticipant();
  const [handRaised, setHandRaised] = useState(false);
  const [toggling, setToggling] = useState(false);

  const muted =
    !localParticipant ||
    !localParticipant.isMicrophoneEnabled ||
    localParticipant.microphoneTrack?.isMuted === true;

  const toggleMic = useCallback(async () => {
    if (!localParticipant || toggling) return;
    setToggling(true);
    try {
      // setMicrophoneEnabled handles the getUserMedia permission prompt,
      // track publish/unpublish, and mute state in one call.
      await localParticipant.setMicrophoneEnabled(muted);
      if (muted) {
        toast.success("mic on — you're live");
      }
    } catch (err) {
      console.error("[LiveAudioRoom] setMicrophoneEnabled failed", err);
      toast.error(
        "Couldn't access your microphone — check browser permissions."
      );
    } finally {
      setToggling(false);
    }
  }, [localParticipant, muted, toggling]);

  return (
    <div className="mt-3 flex items-center justify-center gap-2">
      <button
        onClick={toggleMic}
        disabled={toggling}
        aria-label={muted ? "Unmute microphone" : "Mute microphone"}
        className={cn(
          "tactile flex h-11 w-11 items-center justify-center rounded-full border-2 transition disabled:opacity-50",
          muted
            ? "border-[#DAFF01]/30 bg-transparent text-[#DAFF01]/50 hover:border-[#DAFF01]/60"
            : "border-[#DAFF01] bg-[#DAFF01] text-[#0E1909] hover:shadow-[0_0_16px_rgba(218,255,1,0.4)]"
        )}
      >
        {toggling ? <Loader2 size={16} className="animate-spin" /> : muted ? <MicOff size={16} /> : <Mic size={16} />}
      </button>
      <button
        onClick={() => setHandRaised((h) => !h)}
        aria-label="Raise hand"
        className={cn(
          "tactile flex h-11 w-11 items-center justify-center rounded-full border-2 transition",
          handRaised
            ? "border-[#DAFF01] bg-[#DAFF01] text-[#0E1909] hover:shadow-[0_0_16px_rgba(218,255,1,0.4)]"
            : "border-[#DAFF01]/30 bg-transparent text-[#DAFF01]/50 hover:border-[#DAFF01]/60"
        )}
      >
        <Hand size={16} />
      </button>
      <button
        onClick={() => {
          // Best-effort mic-off on leave so we don't leave a dangling publish.
          localParticipant?.setMicrophoneEnabled(false).catch(() => {});
          onLeave();
        }}
        aria-label="Leave room"
        className="tactile flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#e0463c]/40 bg-transparent text-[#e0463c] hover:border-[#e0463c] hover:bg-[#e0463c]/10"
      >
        <LogOut size={16} />
      </button>
      <span className="ml-2 font-mono text-xs uppercase tracking-widest text-[#DAFF01]/50">
        {muted ? "muted" : "live mic"} · {handRaised ? "hand raised" : "hand down"}
      </span>
    </div>
  );
}

/**
 * On-air meter — animated while anyone is speaking, static otherwise.
 * (Replaces the old purely-decorative CSS animation with a real signal.)
 */
function OnAirMeter({ active }: { active: boolean }) {
  const bars = Array.from({ length: 20 });
  return (
    <div className="mt-3 flex items-center gap-3 rounded-lg border border-[#DAFF01]/15 bg-[#162414] px-3 py-2.5">
      <span className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-[#DAFF01]">
        <span className="h-1.5 w-1.5 animate-blink rounded-full bg-[#e0463c]" />
        on air
      </span>
      <div className="ml-auto flex h-7 items-end gap-[3px]">
        {bars.map((_, i) => (
          <span
            key={i}
            className={cn(
              "block w-[3px] rounded-full bg-[#DAFF01]",
              active && "animate-live-audio-bar"
            )}
            style={{
              height: active ? "100%" : "20%",
              animationDelay: `${(i % 7) * 80}ms`,
              animationDuration: `${480 + (i % 4) * 140}ms`,
              transition: "height 200ms ease",
            }}
          />
        ))}
      </div>
    </div>
  );
}
