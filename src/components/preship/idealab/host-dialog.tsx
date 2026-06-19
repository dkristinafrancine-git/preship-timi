"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutate } from "@/lib/use-api";
import { IDEA_ROLES } from "@/lib/preship";
import { cn } from "@/lib/utils";
import { Loader2, Mic, Calendar } from "lucide-react";

const DEFAULT_AGENDA = `0:00 — Wedge teardown\n0:15 — Pressure-test the thesis\n0:35 — One prototype spec\n0:55 — Handshakes & next steps`;

export function HostDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const mutate = useMutate();
  const [title, setTitle] = useState("");
  const [thesis, setThesis] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [durationMins, setDurationMins] = useState(60);
  const [agenda, setAgenda] = useState(DEFAULT_AGENDA);
  const [rolesOpen, setRolesOpen] = useState<string[]>(["technical-lead", "design-lead", "participant"]);
  const [maxSeats, setMaxSeats] = useState(8);
  const [isPublic, setIsPublic] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const toggleRole = (id: string) => {
    setRolesOpen((r) => (r.includes(id) ? r.filter((x) => x !== id) : [...r, id]));
  };

  const reset = () => {
    setTitle(""); setThesis(""); setDescription(""); setScheduledAt("");
    setDurationMins(60); setAgenda(DEFAULT_AGENDA);
    setRolesOpen(["technical-lead", "design-lead", "participant"]);
    setMaxSeats(8); setIsPublic(true);
  };

  const submit = async () => {
    if (!title.trim() || !thesis.trim() || !scheduledAt) return;
    setSubmitting(true);
    const res = await mutate("/api/idealab", {
      method: "POST",
      body: {
        title: title.trim(),
        thesis: thesis.trim(),
        description: description.trim() || null,
        scheduledAt: new Date(scheduledAt).toISOString(),
        durationMins,
        agenda,
        rolesOpen: rolesOpen.join(","),
        maxSeats,
        isPublic,
        coverColor: "#0E1909",
      },
    });
    setSubmitting(false);
    if (res.ok) {
      reset();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-0 overflow-hidden border-[#0E1909]/15 bg-white p-0 sm:rounded-lg">
        <DialogHeader className="border-b border-[#0E1909]/10 bg-[#0E1909] px-5 py-4 text-left">
          <div className="flex items-center gap-2">
            <Mic size={16} className="text-[#DAFF01]" />
            <DialogTitle className="font-display text-base font-semibold text-[#DAFF01]">
              Host an IdeaLab session
            </DialogTitle>
          </div>
          <DialogDescription className="font-mono text-[11px] uppercase tracking-widest text-white/50">
            invite-only · live audio · ideate a startup together
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto p-5 scroll-thin">
          <div>
            <Label className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#0E1909]/60">
              session title
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. What does developer-grade bookkeeping actually mean?"
              className="mt-1.5 border-[#0E1909]/12 bg-white font-display text-sm focus-visible:ring-[#DAFF01]"
            />
          </div>

          <div>
            <Label className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#0E1909]/60">
              the thesis to pressure-test
            </Label>
            <Textarea
              value={thesis}
              onChange={(e) => setThesis(e.target.value)}
              placeholder="State the hypothesis you want the room to break."
              className="mt-1.5 min-h-[70px] resize-none border-[#0E1909]/12 bg-white font-display text-sm focus-visible:ring-[#DAFF01]"
            />
          </div>

          <div>
            <Label className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#0E1909]/60">
              description (optional)
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Who should come, what they should bring, what leaves the room."
              className="mt-1.5 min-h-[50px] resize-none border-[#0E1909]/12 bg-white font-display text-sm focus-visible:ring-[#DAFF01]"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#0E1909]/60">
                <Calendar size={10} className="mr-1 inline" /> schedule
              </Label>
              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="mt-1.5 border-[#0E1909]/12 bg-white font-mono text-xs focus-visible:ring-[#DAFF01]"
              />
            </div>
            <div>
              <Label className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#0E1909]/60">
                duration · minutes
              </Label>
              <Input
                type="number"
                min={15}
                max={180}
                step={15}
                value={durationMins}
                onChange={(e) => setDurationMins(Number(e.target.value))}
                className="mt-1.5 border-[#0E1909]/12 bg-white font-mono text-xs focus-visible:ring-[#DAFF01]"
              />
            </div>
          </div>

          <div>
            <Label className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#0E1909]/60">
              roles open
            </Label>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {IDEA_ROLES.filter((r) => r.id !== "host").map((r) => {
                const on = rolesOpen.includes(r.id);
                return (
                  <button
                    key={r.id}
                    onClick={() => toggleRole(r.id)}
                    className={cn(
                      "rounded-md border px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-widest transition",
                      on
                        ? "border-[#0E1909] bg-[#0E1909] text-[#DAFF01]"
                        : "border-[#0E1909]/15 bg-white text-[#0E1909]/50 hover:border-[#0E1909]"
                    )}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#0E1909]/60">
              agenda
            </Label>
            <Textarea
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              className="mt-1.5 min-h-[110px] resize-none border-[#0E1909]/12 bg-white font-mono text-xs leading-relaxed focus-visible:ring-[#DAFF01]"
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#0E1909]/60">
                max seats
              </Label>
              <Input
                type="number"
                min={2}
                max={30}
                value={maxSeats}
                onChange={(e) => setMaxSeats(Number(e.target.value))}
                className="w-20 border-[#0E1909]/12 bg-white font-mono text-xs"
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="accent-[#0E1909]"
              />
              <span className="font-mono text-[11px] uppercase tracking-widest text-[#0E1909]/70">
                list on public board
              </span>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-[#0E1909]/10 bg-[#f8f9f3] px-5 py-3">
          <span className="font-mono text-[10px] uppercase tracking-widest text-[#0E1909]/40">
            an invite code is generated on create
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="font-mono text-[11px] uppercase tracking-widest text-[#0E1909]/60"
            >
              cancel
            </Button>
            <Button
              size="sm"
              onClick={submit}
              disabled={submitting || !title.trim() || !thesis.trim() || !scheduledAt}
              className="bg-[#DAFF01] font-mono text-[11px] font-semibold uppercase tracking-widest text-[#0E1909] cta-lime hover:bg-[#c4e600] disabled:opacity-50"
            >
              {submitting ? <Loader2 size={12} className="animate-spin" /> : null}
              host session →
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
