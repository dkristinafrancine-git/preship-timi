"use client";

import { useEffect, useState } from "react";
import { usePreship } from "@/lib/preship-store";
import { useApi } from "@/lib/use-api";
import { Header } from "./header";
import { Sidebar } from "./sidebar";
import { RightRail } from "./right-rail";
import { Footer } from "./footer";
import { WarRoomView } from "./war-room/war-room-view";
import { SynergyView } from "./synergy/synergy-view";
import { IdeaLabView } from "./idealab/idealab-view";
import { ProjectsView } from "./projects/projects-view";
import { ProfileView } from "./profile/profile-view";
import { SearchView } from "./search/search-view";
import { BrainDumpView } from "./brain-dump/brain-dump-view";
import { SettingsView } from "./settings/settings-view";
import { DocsView } from "./docs/docs-view";
import { OnboardingWizard } from "./auth/onboarding-wizard";
import type { Founder } from "@/lib/preship-types";

export function PreshipApp() {
  const view = usePreship((s) => s.view);
  const setMe = usePreship((s) => s.setMe);
  const navigate = usePreship((s) => s.navigate);
  const { data: meData } = useApi<{ user: Founder }>("/api/me");

  useEffect(() => {
    if (meData?.user) setMe(meData.user);
  }, [meData, setMe]);

  // on first mount, honor a ?founder=<id> shareable link by opening the profile
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const founderId = params.get("founder");
    if (founderId) {
      navigate({ view: "profile", founderId });
    }
  }, [navigate]);

  const user = meData?.user;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {user && !user.onboarded && user.title === "" && (
        <OnboardingWizard user={user} />
      )}

      {/* full-width sticky header: logo + auth + live ticker */}
      <Header />

      {/* 3-column grid: left nav | center | right rail — max-width centered */}
      <main className="mx-auto w-full max-w-[1320px] flex-1 px-5 pt-5 pb-10 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)_320px] lg:gap-8">
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
    </div>
  );
}
