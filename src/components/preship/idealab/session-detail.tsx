"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useApi } from "@/lib/use-api";
import { useMutate } from "@/lib/use-api";
import { usePreship } from "@/lib/preship-store";
import type { IdeaLabSession, IdeaLabSignup, Founder } from "@/lib/preship-types";
import { fmtRelative, IDEA_ROLES } from "@/lib/preship";
import { FounderAvatar } from "../avatars";
import { StatusPill, RoleBadge, TerminalHeader } from "../badges";
import { LiveAudioRoom } from "./live-audio-room";
import { Loader2, Copy, Check, Star, X, Volume2, Trash2 } from "lucide-react";
import { toast } from "sonner";

export function SessionDetail({
  sessionId,
  open,
  onOpenChange,
}: {
  sessionId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const me = usePreship((s) => s.me);
  const { data, loading } = useApi<{ session: IdeaLabSession }>(
    open && sessionId ? `/api/idealab/${sessionId}` : null,
    [open, sessionId]
  );
  const session = data?.session;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl gap-0 overflow-hidden border-[#0E1909]/15 bg-white p-0 sm:rounded-lg">
        <DialogTitle className="sr-only">{session?.title ?? "Session detail"}</DialogTitle>
        <DialogDescription className="sr-only">
          View session thesis, agenda, roles, and join the live audio room.
        </DialogDescription>
        {loading || !session ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 size={20} className="animate-spin text-[#0E1909]/40" />
          </div>
        ) : (
          <SessionBody session={session} isHost={me?.id === session.hostId} onOpenChange={onOpenChange} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function SessionBody({ session, isHost, onOpenChange }: { session: IdeaLabSession; isHost: boolean; onOpenChange: (v: boolean) => void }) {
  const [joined, setJoined] = useState(false);
  const [copied, setCopied] = useState(false);
  const [signupRole, setSignupRole] = useState<string>("participant");
  const [interestNote, setInterestNote] = useState("");
  const [showInterest, setShowInterest] = useState(false);
  const mutate = useMutate();

  const isLive = session.status === "live";
  const roles = session.rolesOpen ? session.rolesOpen.split(",").filter(Boolean) : [];
  const signups = session.signups ?? [];
  const interests = session.interests ?? [];
  const seatsLeft = session.maxSeats - session._count.signups;
  const agendaLines = session.agenda ? session.agenda.split("\n").filter(Boolean) : [];

  const register = async () => {
    const res = await mutate(`/api/idealab/${session.id}/signup`, {
      method: "POST",
      body: { role: signupRole },
    });
    if (res.ok) setJoined(true);
  };

  const toggleInterest = async () => {
    await mutate(`/api/idealab/${session.id}/interest`, {
      method: "POST",
      body: {},
    });
    setShowInterest(false);
    setInterestNote("");
  };

  const copyInvite = () => {
    navigator.clipboard?.writeText(session.inviteCode);
    setCopied(true);
    toast.success("Invite code copied →");
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="flex max-h-[88vh] flex-col">
      {/* header */}
      <div className={cn("relative px-5 py-4", isLive ? "bg-[#0E1909]" : "bg-[#0E1909]")}>
        <div className="bg-grid-dark">
          <div className="flex items-center justify-between">
            <StatusPill status={session.status} />
            <button
              onClick={copyInvite}
              className="tactile-flat flex items-center gap-1.5 rounded-md border border-[#DAFF01]/25 bg-white/5 px-2 py-1 font-mono text-xs uppercase tracking-widest text-[#DAFF01] hover:bg-white/10 hover:border-[#DAFF01]/50"
            >
              {copied ? <Check size={11} /> : <Copy size={11} />}
              {session.inviteCode}
            </button>
          </div>
          <h2 className="mt-2 font-display text-lg font-semibold leading-snug text-white">
            {session.title}
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-3 font-mono text-xs uppercase tracking-widest text-[#DAFF01]/70">
            <span className="flex items-center gap-1.5">
              <FounderAvatar founder={session.host} size={16} />
              @{session.host.handle} · host
            </span>
            <span>{new Date(session.scheduledAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</span>
            <span>{session.durationMins}m</span>
            <span>{session._count.signups}/{session.maxSeats} seats</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scroll-thin">
        {/* thesis */}
        <div className="border-b border-[#0E1909]/8 px-5 py-4">
          <p className="font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/45">
            thesis
          </p>
          <p className="mt-1 font-display text-sm leading-relaxed text-[#0E1909]/85">
            {session.thesis}
          </p>
          {session.description && (
            <p className="mt-2 text-xs leading-relaxed text-[#0E1909]/65">{session.description}</p>
          )}
        </div>

        {/* live audio room */}
        {isLive && (
          <>
            {joined ? (
              // Real LiveKit audio room — owns its own connection lifecycle.
              <LiveAudioRoom
                sessionId={session.id}
                isHost={isHost}
                onLeave={() => setJoined(false)}
              />
            ) : (
              // Static preview of who's registered (no fake speaking indicators).
              <div className="border-b border-[#0E1909]/8 bg-[#0E1909] px-5 py-4">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-mono text-xs font-semibold uppercase tracking-widest text-[#DAFF01]">
                    <span className="h-1.5 w-1.5 animate-blink rounded-full bg-[#e0463c]" />
                    live audio room
                  </span>
                  <span className="font-mono text-xs uppercase tracking-widest text-[#DAFF01]/60">
                    {signups.length} registered
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {signups.slice(0, 8).map((s) => (
                    <SpeakerTile key={s.id} signup={s} />
                  ))}
                  {signups.length === 0 && (
                    <p className="col-span-full py-4 text-center font-mono text-xs text-[#DAFF01]/40">
                      no one registered yet
                    </p>
                  )}
                </div>
                <p className="mt-3 text-center font-mono text-[11px] uppercase tracking-widest text-[#DAFF01]/40">
                  click “join live room →” to connect your mic
                </p>
              </div>
            )}
          </>
        )}

        {/* agenda */}
        {agendaLines.length > 0 && (
          <div className="border-b border-[#0E1909]/8 px-5 py-4">
            <p className="font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/45">
              agenda
            </p>
            <ul className="mt-2 space-y-1">
              {agendaLines.map((line, i) => (
                <li key={i} className="flex items-start gap-2 font-mono text-xs text-[#0E1909]/75">
                  <span className="mt-0.5 text-[#DAFF01] opacity-0">›</span>
                  <span className="rounded bg-[#f4ffd6] px-1.5 py-0.5 font-bold text-[#0E1909]">
                    {line.split("—")[0]?.trim()}
                  </span>
                  <span className="flex-1">{line.split("—").slice(1).join("—").trim()}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* open roles + register */}
        {!session.mySignup && seatsLeft > 0 && (
          <div className="border-b border-[#0E1909]/8 px-5 py-4">
            <p className="font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/45">
              register · pick your role
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {IDEA_ROLES.filter((r) => r.id !== "host").map((r) => {
                const open = roles.includes(r.id) || r.id === "participant";
                const sel = signupRole === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => setSignupRole(r.id)}
                    className={cn(
                      "rounded-md border px-2.5 py-1.5 font-mono text-xs uppercase tracking-widest transition",
                      sel
                        ? "border-[#0E1909] bg-[#0E1909] text-[#DAFF01]"
                        : open
                        ? "border-[#0E1909]/15 bg-white text-[#0E1909] hover:border-[#0E1909]"
                        : "border-dashed border-[#0E1909]/15 bg-[#f8f9f3] text-[#0E1909]/35"
                    )}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>
            <Button
              size="sm"
              onClick={register}
              className="mt-3 bg-[#DAFF01] font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909] cta-lime hover:bg-[#c4e600]"
            >
              register as {signupRole.replace("-", " ")} →
            </Button>
          </div>
        )}

        {/* signups list */}
        {signups.length > 0 && (
          <div className="border-b border-[#0E1909]/8 px-5 py-4">
            <p className="font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/45">
              in the room · {signups.length}
            </p>
            <ul className="mt-2 space-y-1.5">
              {signups.map((s) => (
                <li key={s.id} className="flex items-center gap-2">
                  <FounderAvatar founder={s.user} size={22} />
                  <span className="font-display text-xs font-medium text-[#0E1909]">{s.user.name}</span>
                  <span className="font-mono text-xs text-[#0E1909]/40">@{s.user.handle}</span>
                  <span className="ml-auto">
                    <RoleBadge role={s.role} filled={s.status === "confirmed"} />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* interest */}
        <div className="px-5 py-4">
          {showInterest ? (
            <div className="rounded-md border border-[#0E1909]/12 bg-[#f8f9f3] p-3">
              <Textarea
                value={interestNote}
                onChange={(e) => setInterestNote(e.target.value)}
                placeholder="Why are you interested? (optional)"
                className="min-h-[50px] resize-none border-[#0E1909]/12 bg-white font-display text-xs focus-visible:ring-[#DAFF01]"
              />
              <div className="mt-2 flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => setShowInterest(false)} className="font-mono text-xs uppercase tracking-widest text-[#0E1909]/55">
                  <X size={11} /> cancel
                </Button>
                <Button size="sm" onClick={toggleInterest} className="bg-[#DAFF01] font-mono text-xs uppercase tracking-widest text-[#0E1909] cta-lime hover:bg-[#c4e600]">
                  <Check size={11} /> mark interest
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[#0E1909]/45">
                <Star size={11} />
                {session._count.interests} founder{session._count.interests === 1 ? "" : "s"} interested
                {session.myInterest && (
                  <span className="rounded bg-[#f4ffd6] px-1.5 py-0.5 text-[#0E1909]/70">you</span>
                )}
              </div>
              {!session.myInterest && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowInterest(true)}
                  className="border-[#0E1909]/20 font-mono text-xs uppercase tracking-widest text-[#0E1909]/70"
                >
                  <Star size={11} /> mark interest
                </Button>
              )}
              {session.myInterest && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={toggleInterest}
                  className="border-[#0E1909]/20 font-mono text-xs uppercase tracking-widest text-[#0E1909]/70"
                >
                  remove interest
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* footer actions */}
      <div className="flex items-center justify-between gap-2 border-t border-[#0E1909]/10 bg-[#f8f9f3] px-5 py-3">
        <span className="font-mono text-xs uppercase tracking-widest text-[#0E1909]/40">
          {isHost ? "you are the host" : session.mySignup ? `registered · ${session.mySignup.role.replace("-", " ")}` : `${seatsLeft} seat${seatsLeft === 1 ? "" : "s"} left`}
        </span>
        <div className="flex items-center gap-2">
          {isHost && (
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                if (!confirm("Delete this session? This cannot be undone.")) return;
                await mutate(`/api/idealab/${session.id}`, { method: "DELETE" });
                onOpenChange(false);
              }}
              className="font-mono text-xs font-semibold uppercase tracking-widest text-[#e0463c] hover:bg-[#e0463c]/5"
            >
              <Trash2 size={12} /> delete
            </Button>
          )}
          {isLive && !session.mySignup && (
            <Button
              size="sm"
              onClick={register}
              className="cta-ink bg-[#e0463c] font-mono text-xs font-semibold uppercase tracking-widest text-white hover:bg-[#c93d34]"
            >
              <Volume2 size={12} /> join live room →
            </Button>
          )}
          {isLive && session.mySignup && (
            <Button
              size="sm"
              onClick={() => setJoined((j) => !j)}
              className={cn(
                "cta-ink font-mono text-xs font-semibold uppercase tracking-widest",
                joined ? "bg-[#0E1909] text-[#DAFF01] hover:bg-[#0E1909]/90" : "bg-[#e0463c] text-white hover:bg-[#c93d34]"
              )}
            >
              {joined ? "leave room" : "join live room →"}
            </Button>
          )}
          {isHost && session.status === "scheduled" && (
            <Button
              size="sm"
              onClick={async () => {
                await mutate(`/api/idealab/${session.id}`, {
                  method: "PATCH",
                  body: { status: "live" },
                });
              }}
              className="cta-ink bg-[#e0463c] font-mono text-xs font-semibold uppercase tracking-widest text-white hover:bg-[#c93d34]"
            >
              ● go live
            </Button>
          )}
          {isHost && isLive && (
            <Button
              size="sm"
              onClick={async () => {
                await mutate(`/api/idealab/${session.id}`, {
                  method: "PATCH",
                  body: { status: "ended" },
                });
              }}
              className="cta-ink bg-[#0E1909] font-mono text-xs font-semibold uppercase tracking-widest text-[#DAFF01] hover:bg-[#0E1909]/90"
            >
              ■ end session
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Static speaker tile used in the pre-join "who's registered" preview.
 *  Live speaking indicators are handled by LiveAudioRoom once connected. */
function SpeakerTile({ signup }: { signup: IdeaLabSignup }) {
  const isHost = signup.role === "host";
  return (
    <div className="flex flex-col items-center gap-1 rounded-md border border-[#DAFF01]/15 bg-white/5 p-2">
      <div className="relative">
        <FounderAvatar founder={signup.user} size={36} />
        {isHost && (
          <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-[#DAFF01] ring-2 ring-[#0E1909]">
            <Volume2 size={7} className="text-[#0E1909]" />
          </span>
        )}
      </div>
      <span className="max-w-full truncate font-mono text-xs text-[#DAFF01]/70">
        @{signup.user.handle}
      </span>
      <span className="rounded bg-[#DAFF01]/15 px-1 font-mono text-[8px] uppercase tracking-widest text-[#DAFF01]">
        {signup.role.split("-")[0]}
      </span>
    </div>
  );
}
