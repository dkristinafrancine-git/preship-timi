"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePreship } from "@/lib/preship-store";
import { useApi } from "@/lib/use-api";
import { Header } from "./header";
import { Sidebar } from "./sidebar";
import { RightRail } from "./right-rail";
import { Footer } from "./footer";
import { FeedbackWidget } from "./feedback-widget";
import { WarRoomView } from "./war-room/war-room-view";
import { SynergyView } from "./synergy/synergy-view";
import { IdeaLabView } from "./idealab/idealab-view";
import { ProjectsView } from "./projects/projects-view";
import { ProfileView } from "./profile/profile-view";
import { SearchView } from "./search/search-view";
import { BrainDumpView } from "./brain-dump/brain-dump-view";
import { SettingsView } from "./settings/settings-view";
import { DocsView } from "./docs/docs-view";
import type { Founder } from "@/lib/preship-types";

export function PreshipApp() {
  const view = usePreship((s) => s.view);
  const setMe = usePreship((s) => s.setMe);
  const navigate = usePreship((s) => s.navigate);
  const router = useRouter();
  const { data: meData } = useApi<{ user: Founder }>("/api/me");

  useEffect(() => {
    if (meData?.user) setMe(meData.user);
  }, [meData, setMe]);

  // Not-yet-onboarded founders are sent to the dedicated /onboarding path
  // instead of an overlay. (Middleware guarantees a session by the time we
  // reach here; meData resolves to the user once /api/me lands.)
  useEffect(() => {
    if (meData?.user && !meData.user.onboarded && meData.user.title === "") {
      router.replace("/onboarding");
    }
  }, [meData, router]);

  // Legacy deep-link: /app?founder=<id> opens that founder's profile. Shareable
  // profile links now use the clean /f/<handle> route; this keeps old
  // ?founder=<id> links (e.g. forwarded from / by middleware) working.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const founderId = params.get("founder");
    if (founderId) {
      navigate({ view: "profile", founderId });
    }
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* full-width sticky header: logo + auth + live ticker */}
      <Header />

      {/* 3-column grid: left nav | center | right rail — full-width on desktop */}
      <main className="w-full flex-1 px-5 pt-5 pb-10 lg:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)_380px] lg:gap-8">
          <Sidebar />
          <section className="min-w-0 px-0 lg:px-0">
            {view === "war-room" && <WarRoomView />}
            {view === "synergy" && <SynergyView />}
            {view === "idealab" && <IdeaLabView />}
            {view === "projects" && <ProjectsView />}
            {view === "profile" && <ProfileView />}
            {view === "search" && <SearchView />}
            {view === "brain-dump" && <BrainDumpView />}
            {view === "settings" && <SettingsView />}
            {view === "docs" && <DocsView />}
          </section>
          <RightRail />
        </div>
      </main>

      <Footer />

      {/* Floating Feedback / Support button — only renders for a logged-in
          founder (self-hides when there's no `me`). */}
      <FeedbackWidget />
    </div>
  );
}
