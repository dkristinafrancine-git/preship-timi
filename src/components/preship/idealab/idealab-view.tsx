"use client";

import { useState } from "react";
import { useApi } from "@/lib/use-api";
import { SessionCard } from "./session-card";
import { SessionDetail } from "./session-detail";
import { HostDialog } from "./host-dialog";
import { JoinDialog } from "./join-dialog";
import { ViewHeader } from "../view-header";
import { ApiErrorState } from "../api-error-state";
import type { IdeaLabSession } from "@/lib/preship-types";
import { Button } from "@/components/ui/button";
import { Loader2, Mic, Plus, KeyRound, Calendar } from "lucide-react";
import { usePreship } from "@/lib/preship-store";
import { useEffect } from "react";

export function IdeaLabView() {
  const [hostOpen, setHostOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const deepLink = usePreship((s) => s.deepLink);
  const clearDeepLink = usePreship((s) => s.clearDeepLink);

  const { data: liveData, loading: liveLoading, error: liveError, refetch: refetchLive } = useApi<{ sessions: IdeaLabSession[] }>(
    "/api/idealab?status=live"
  );
  const { data: schedData, loading: schedLoading, error: schedError, refetch: refetchSched } = useApi<{ sessions: IdeaLabSession[] }>(
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

  // deep-link from ticker: auto-open the session detail
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (deepLink?.sessionId) {
      setDetailId(deepLink.sessionId);
      setDetailOpen(true);
      clearDeepLink();
    }
  }, [deepLink, clearDeepLink]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <div className="space-y-5">
      <ViewHeader
        title="IdeaLab"
        code="/idea-lab"
        sub="invite-only live audio · host a room · set the agenda · build the team"
        action={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setJoinOpen(true)}
              className="border-[#0E1909]/20 bg-white font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909] shadow-none hover:bg-[#f4ffd6]"
            >
              <KeyRound size={13} /> join
            </Button>
            <Button
              size="sm"
              onClick={() => setHostOpen(true)}
              className="cta-lime h-9 bg-[#DAFF01] font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909] hover:bg-[#c4e600]"
            >
              <Plus size={13} /> host →
            </Button>
          </div>
        }
      />

      {/* Live now */}
      <section>
        <div className="mb-2 flex items-center gap-2">
          <span className="flex h-2 w-2">
            <span className="h-2 w-2 animate-blink rounded-full bg-[#e0463c]" />
          </span>
          <h3 className="font-display text-sm font-semibold text-[#0E1909]">Live now</h3>
          <span className="font-mono text-xs uppercase tracking-widest text-[#0E1909]/40">
            · {liveSessions.length} room{liveSessions.length === 1 ? "" : "s"} on air
          </span>
        </div>
        {liveError && liveSessions.length === 0 ? (
          <ApiErrorState
            compact
            onRetry={refetchLive}
            message="Couldn't load live rooms."
          />
        ) : liveLoading ? (
          <LoadingRow />
        ) : liveSessions.length === 0 ? (
          <div className="terminal-card flex items-center gap-2 px-4 py-5 text-[#0E1909]/40">
            <Mic size={14} />
            <span className="font-mono text-xs uppercase tracking-widest">
              no live rooms · host one or join with a code →
            </span>
          </div>
        ) : (
          <div className="grid gap-3">
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
          <span className="font-mono text-xs uppercase tracking-widest text-[#0E1909]/40">
            · {scheduled.length} scheduled
          </span>
        </div>
        {schedError && scheduled.length === 0 ? (
          <ApiErrorState
            compact
            onRetry={refetchSched}
            message="Couldn't load upcoming sessions."
          />
        ) : schedLoading ? (
          <LoadingRow />
        ) : scheduled.length === 0 ? (
          <div className="terminal-card px-4 py-5 text-center font-mono text-xs uppercase tracking-widest text-[#0E1909]/40">
            no upcoming sessions · host the first one →
          </div>
        ) : (
          <div className="grid gap-3">
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
