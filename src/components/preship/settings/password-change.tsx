"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TerminalHeader } from "../badges";
import { passwordStrength } from "@/lib/human-test";
import { Loader2, KeyRound, ShieldCheck, RefreshCw, Check, Lock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Quiz = {
  prompt: string;
  options: string[];
  challenge: string;
  expiresAt: number;
};

/**
 * Password change card for the Settings view.
 *
 * Flow:
 *   1. On mount, fetch a human-test quiz from /api/me/password/quiz.
 *      (The correct answer is never on the client — the server returns an
 *      opaque signed challenge token we echo back on submit.)
 *   2. The founder fills: current password, new password, confirm new, and
 *      the quiz answer.
 *   3. On submit we POST all four to /api/me/password, which re-verifies the
 *      quiz server-side + checks the current password + enforces new-pw
 *      rules before rehashing.
 *
 * A failed quiz (wrong answer / expired 60s) prompts a refresh — we refetch
 * a new quiz so the founder can try again.
 */
export function PasswordChange() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [quizAnswer, setQuizAnswer] = useState("");
  const [quizLoading, setQuizLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [changed, setChanged] = useState(false);

  const fetchQuiz = useCallback(async () => {
    setQuizLoading(true);
    setQuizAnswer("");
    try {
      const r = await fetch("/api/me/password/quiz", {
        headers: { Accept: "application/json" },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const q: Quiz = await r.json();
      setQuiz(q);
    } catch {
      toast.error("Couldn't load the human test");
      setQuiz(null);
    } finally {
      setQuizLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuiz();
  }, [fetchQuiz]);

  const strength = passwordStrength(newPassword);
  const strengthBars = [1, 2, 3, 4];
  const strengthColor = ["#e0463c", "#e0782c", "#c4cf9a", "#6f8a3e", "#0E1909"][
    strength.score
  ];

  // client-side gate: all fields filled, new == confirm, quiz answered
  const canSubmit =
    !!quiz &&
    currentPassword.length > 0 &&
    newPassword.length >= 8 &&
    newPassword === confirmPassword &&
    newPassword !== currentPassword &&
    quizAnswer.trim().length > 0 &&
    !submitting;

  const confirmMismatch =
    confirmPassword.length > 0 && newPassword !== confirmPassword;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!quiz) {
      toast.error("Quiz hasn't loaded — try again");
      return;
    }
    if (confirmMismatch) {
      toast.error("New passwords don't match");
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch("/api/me/password", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          challenge: quiz.challenge,
          quizAnswer: quizAnswer.trim(),
        }),
      });
      const json = await r.json().catch(() => ({}));
      if (!r.ok) {
        const msg = (json as { error?: string }).error ?? `HTTP ${r.status}`;
        toast.error(msg);
        // A wrong/expired quiz answer is recoverable — refresh the quiz.
        if (/human test/i.test(msg) || /quiz/i.test(msg)) {
          await fetchQuiz();
        }
        setSubmitting(false);
        return;
      }
      toast.success("Password updated →");
      setChanged(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setQuizAnswer("");
      // fresh quiz for the next potential change
      await fetchQuiz();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="terminal-card">
      <TerminalHeader
        label="security · password"
        right={
          <span className="flex items-center gap-1 font-mono text-xs uppercase tracking-widest text-[#0E1909]/45">
            <Lock size={12} /> secured
          </span>
        }
      />
      <div className="space-y-4 p-5">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#0E1909]">
            <KeyRound size={16} className="text-[#DAFF01]" />
          </span>
          <div className="min-w-0">
            <p className="font-display text-sm font-semibold text-[#0E1909]">
              Change password
            </p>
            <p className="mt-0.5 font-mono text-[12px] leading-relaxed text-[#0E1909]/55">
              Confirm your current password and answer a quick human test.
              We re-verify both server-side before rehashing.
            </p>
          </div>
        </div>

        {changed && (
          <div className="flex items-center gap-2 rounded-md border border-[#6f8a3e] bg-[#f4ffd6] px-3 py-2.5">
            <Check size={14} className="shrink-0 text-[#0E1909]" />
            <p className="font-mono text-xs text-[#0E1909]/75">
              Password changed. Use it the next time you log in.
            </p>
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label className="font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/60">
              current password
            </Label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              className="mt-1.5 h-10 border-[#0E1909]/12 bg-white font-mono text-sm focus-visible:ring-[#DAFF01]"
            />
          </div>

          <div>
            <Label className="font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/60">
              new password
            </Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="min 8 characters"
              className="mt-1.5 h-10 border-[#0E1909]/12 bg-white font-mono text-sm focus-visible:ring-[#DAFF01]"
            />
            {newPassword.length > 0 && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex flex-1 gap-1">
                  {strengthBars.map((b) => (
                    <span
                      key={b}
                      className="h-1 flex-1 rounded-full transition-colors"
                      style={{
                        backgroundColor:
                          b <= strength.score ? strengthColor : "#0E190915",
                      }}
                    />
                  ))}
                </div>
                <span
                  className="w-20 text-right font-mono text-[11px] uppercase tracking-widest"
                  style={{ color: newPassword ? strengthColor : "#0E190955" }}
                >
                  {strength.label}
                </span>
              </div>
            )}
          </div>

          <div>
            <Label className="font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/60">
              confirm new password
            </Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              className={cn(
                "mt-1.5 h-10 border-[#0E1909]/12 bg-white font-mono text-sm focus-visible:ring-[#DAFF01]",
                confirmMismatch && "border-[#e0463c] focus-visible:ring-[#e0463c]"
              )}
            />
            {confirmMismatch && (
              <p className="mt-1.5 font-mono text-xs text-[#e0463c]">
                Passwords don&apos;t match
              </p>
            )}
          </div>

          {/* human test quiz */}
          <div className="rounded-md border border-[#0E1909]/10 bg-[#f8f9f3] p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909]/60">
                <ShieldCheck size={12} /> human test
              </p>
              <button
                type="button"
                onClick={fetchQuiz}
                disabled={quizLoading}
                className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-widest text-[#0E1909]/45 hover:text-[#0E1909] disabled:opacity-50"
              >
                <RefreshCw size={11} className={quizLoading ? "animate-spin" : ""} />
                new question
              </button>
            </div>
            {quiz ? (
              <p className="font-display text-sm font-medium text-[#0E1909]">
                {quiz.prompt}
              </p>
            ) : (
              <p className="font-mono text-xs text-[#0E1909]/40">
                loading question…
              </p>
            )}
            {quiz && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {quiz.options.map((opt) => {
                  const active = quizAnswer === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setQuizAnswer(opt)}
                      aria-pressed={active}
                      className={cn(
                        "tactile-flat rounded-md border px-3 py-2 font-mono text-xs font-semibold text-[#0E1909] transition",
                        active
                          ? "border-[#0E1909] bg-[#DAFF01] shadow-[0_2px_8px_rgba(14,25,9,0.10)]"
                          : "border-[#0E1909]/15 bg-white text-[#0E1909]/70 hover:border-[#0E1909]/35 hover:bg-[#f8f9f3]"
                      )}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            )}
            <p className="mt-2.5 font-mono text-[11px] leading-relaxed text-[#0E1909]/40">
              A one-time check that you&apos;re a human. Expires in 60s —
              tap <span className="font-semibold">new question</span> if it does.
            </p>
          </div>

          <Button
            type="submit"
            disabled={!canSubmit}
            className="cta-lime h-10 w-full bg-[#DAFF01] font-mono text-xs font-semibold uppercase tracking-widest text-[#0E1909] hover:bg-[#c4e600] disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <KeyRound size={14} />
            )}
            update password
          </Button>
        </form>
      </div>
    </div>
  );
}
