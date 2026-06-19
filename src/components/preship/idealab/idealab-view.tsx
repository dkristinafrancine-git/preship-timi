"use client";

import { useState } from "react";
import { useApi } from "@/lib/use-api";
import { SessionCard } from "./session-card";
import { SessionDetail } from "./session-detail";
import { HostDialog } from "./host-dialog";
import { JoinDialog } from "./join-dialog";
import type { IdeaLabSession } from "@/lib/preship-types";
import { Loader2, Mic, Plus, KeyRound, Calendar } from "lucide-react";
import { StatusPill } from "../badges";

export function IdeaLabView() {
  const [hostOpen, setHostOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { data: liveData, loading: liveLoading } = useApi<{ sessions: IdeaLabSession[] }>(
    "/api/idealab?status=live"
  );
  const { data: schedData, loading: schedLoading } = useApi<{ sessions: IdeaLabSession[] }>(
    "/api/idealab?status=scheduled&public=1"
  );
  const liveSessions = liveData?.sessions ?? [];
  const scheduled = schedData?.sessions ?? [];

  const openDetail = (id: string) => {
    setDetailId(id);
    setDetailOpen(true);
  };

  const onJoined = (session: IdeaLabSession) => {
    setDetailId(session.id);
    setDetailOpen(true);
  };

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="overflow-hidden rounded-lg border border-[#0E1909]/12 bg-[#0E1909]">
        <div className="bg-grid-dark px-5 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Mic size={14} className="text-[#DAFF01]" />
                <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#DAFF01]">
                  idealab · invite-only audio
                </span>
              </div>
              <h2 className="mt-1 font-display text-lg font-semibold text-white">
                Ideate a new startup. Together. Live.
              </h2>
              <p className="mt-0.5 font-mono text-xs text-white/55">
                host a room · set the agenda · build the team · one prototype leaves
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setJoinOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-md border border-[#DAFF01]/30 bg-white/5 px-3 py-2 font-mono text-[11px] font-semibold uppercase tracking-widest text-[#DAFF01] transition hover:bg-white/10"
              >
                <KeyRound size={13} /> join with code
              </button>
              <button
                onClick={() => setHostOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-md bg-[#DAFF01] px-3.5 py-2 font-mono text-[11px] font-semibold uppercase tracking-widest text-[#0E1909] transition hover:bg-[#c4e600]"
              >
                <Plus size={13} /> host a session →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Live now */}
      <section>
        <div className="mb-2 flex items-center gap-2">
          <span className="flex h-2 w-2">
            <span className="h-2 w-2 animate-blink rounded-full bg-[#e0463c]" />
          </span>
          <h3 className="font-display text-sm font-semibold text-[#0E1909]">Live now</h3>
          <span className="font-mono text-[10px] uppercase tracking-widest text-[#0E1909]/40">
            · {liveSessions.length} room{liveSessions.length === 1 ? "" : "s"} on air
          </span>
        </div>
        {liveLoading ? (
          <LoadingRow />
        ) : liveSessions.length === 0 ? (
          <div className="terminal-card flex items-center gap-2 px-4 py-5 text-[#0E1909]/40">
            <Mic size={14} />
            <span className="font-mono text-xs uppercase tracking-widest">
              no live rooms · host one or join with a code →
            </span>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {liveSessions.map((s) => (
              <SessionCard key={s.id} session={s} onOpen={() => openDetail(s.id)} />
            ))}
          </div>
        )}
      </section>

      {/* Upcoming */}
      <section>
        <div className="mb-2 flex items-center gap-2">
          <Calendar size={14} className="text-[#0E1909]/60" />
          <h3 className="font-display text-sm font-semibold text-[#0E1909]">Upcoming sessions</h3>
          <span className="font-mono text-[10px] uppercase tracking-widest text-[#0E1909]/40">
            · {scheduled.length} scheduled
          </span>
        </div>
        {schedLoading ? (
          <LoadingRow />
        ) : scheduled.length === 0 ? (
          <div className="terminal-card px-4 py-5 text-center font-mono text-xs uppercase tracking-widest text-[#0E1909]/40">
            no upcoming sessions · host the first one →
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {scheduled.map((s) => (
              <SessionCard key={s.id} session={s} onOpen={() => openDetail(s.id)} />
            ))}
          </div>
        )}
      </section>

      <HostDialog open={hostOpen} onOpenChange={setHostOpen} />
      <JoinDialog open={joinOpen} onOpenChange={setJoinOpen} onJoined={onJoined} />
      <SessionDetail sessionId={detailId} open={detailOpen} onOpenChange={setDetailOpen} />
    </div>
  );
}

function LoadingRow() {
  return (
    <div className="flex items-center gap-2 py-8 text-[#0E1909]/40">
      <Loader2 size={16} className="animate-spin" />
      <span className="font-mono text-xs uppercase tracking-widest">loading rooms…</span>
    </div>
  );
}
