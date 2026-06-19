"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMutate } from "@/lib/use-api";
import type { IdeaLabSession } from "@/lib/preship-types";
import { Loader2, KeyRound, ArrowRight } from "lucide-react";

export function JoinDialog({
  open,
  onOpenChange,
  onJoined,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onJoined: (session: IdeaLabSession) => void;
}) {
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const mutate = useMutate();

  const submit = async () => {
    if (!code.trim()) return;
    setSubmitting(true);
    const res = await mutate<{ session: IdeaLabSession }>(`/api/idealab/join`, {
      method: "POST",
      body: { inviteCode: code.trim() },
    });
    setSubmitting(false);
    if (res.ok && res.data?.session) {
      setCode("");
      onOpenChange(false);
      onJoined(res.data.session);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 overflow-hidden border-[#0E1909]/15 bg-white p-0 sm:rounded-lg">
        <DialogHeader className="border-b border-[#0E1909]/10 bg-[#0E1909] px-5 py-4 text-left">
          <div className="flex items-center gap-2">
            <KeyRound size={16} className="text-[#DAFF01]" />
            <DialogTitle className="font-display text-base font-semibold text-[#DAFF01]">
              Join with invite code
            </DialogTitle>
          </div>
          <DialogDescription className="font-mono text-xs uppercase tracking-widest text-white/50">
            enter the code shared by the host
          </DialogDescription>
        </DialogHeader>
        <div className="p-5">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            placeholder="PRESHIP-XX-00"
            className="border-[#0E1909]/12 bg-[#f8f9f3] font-mono text-sm font-semibold uppercase tracking-widest text-[#0E1909] focus-visible:ring-[#DAFF01]"
            autoFocus
          />
          <p className="mt-2 font-mono text-xs uppercase tracking-widest text-[#0E1909]/40">
            codes look like PRESHIP-AB-07
          </p>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-[#0E1909]/10 bg-[#f8f9f3] px-5 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="font-mono text-xs uppercase tracking-widest text-[#0E1909]/60"
          >
            cancel
          </Button>
          <Button
            size="sm"
            onClick={submit}
            disabled={submitting || !code.trim()}
            className="bg-[#DAFF01] font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909] cta-lime hover:bg-[#c4e600] disabled:opacity-50"
          >
            {submitting ? <Loader2 size={12} className="animate-spin" /> : <ArrowRight size={12} />}
            join room
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
