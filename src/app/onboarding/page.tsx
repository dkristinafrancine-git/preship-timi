"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApi } from "@/lib/use-api";
import { OnboardingWizard } from "@/components/preship/auth/onboarding-wizard";
import { Logo } from "@/components/preship/logo";
import type { Founder } from "@/lib/preship-types";

/**
 * /onboarding — the proper path for the new-founder onboarding wizard.
 *
 * - No session → /login (hard redirect; middleware usually catches this first).
 * - Already onboarded → /.
 * - Otherwise renders <OnboardingWizard>. On success the wizard navigates to /.
 */
export default function OnboardingPage() {
  const router = useRouter();
  const { data, loading, error } = useApi<{ user: Founder }>("/api/me");

  // No session → send to login. (404 from /api/me means no current user.)
  useEffect(() => {
    if (!loading && (error || (data && !data.user))) {
      router.replace("/login");
    }
  }, [loading, error, data, router]);

  const user = data?.user;

  // Already onboarded → bounce to the app.
  useEffect(() => {
    if (user && (user.onboarded || user.title !== "")) {
      router.replace("/");
    }
  }, [user, router]);

  // While we resolve the user, show a quiet branded loader (no wizard yet).
  if (loading || !user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white">
        <Logo />
        <p className="font-mono text-xs uppercase tracking-widest text-[#0E1909]/45">
          loading onboarding…
        </p>
      </div>
    );
  }

  // If the effect above is about to redirect (user is already onboarded),
  // don't flash the wizard.
  if (user.onboarded || user.title !== "") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white">
        <Logo />
        <p className="font-mono text-xs uppercase tracking-widest text-[#0E1909]/45">
          redirecting…
        </p>
      </div>
    );
  }

  return <OnboardingWizard user={user} />;
}
