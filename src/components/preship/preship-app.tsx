"use client";

import { useEffect } from "react";
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
import type { Founder } from "@/lib/preship-types";

export function PreshipApp() {
  const view = usePreship((s) => s.view);
  const setMe = usePreship((s) => s.setMe);
  const { data: meData } = useApi<{ user: Founder }>("/api/me");

  useEffect(() => {
    if (meData?.user) setMe(meData.user);
  }, [meData, setMe]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* full-width sticky header: logo + auth + live ticker */}
      <Header />

      {/* 3-column grid: left nav | center | right rail — max-width centered */}
      <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-5 lg:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)_320px] lg:gap-6">
          <Sidebar />
          <section className="min-w-0 px-0 lg:px-0">
            {view === "war-room" && <WarRoomView />}
            {view === "synergy" && <SynergyView />}
            {view === "idealab" && <IdeaLabView />}
            {view === "projects" && <ProjectsView />}
          </section>
          <RightRail />
        </div>
      </main>

      <Footer />
    </div>
  );
}
