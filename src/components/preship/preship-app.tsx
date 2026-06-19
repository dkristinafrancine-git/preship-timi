"use client";

import { useEffect } from "react";
import { usePreship } from "@/lib/preship-store";
import { useApi } from "@/lib/use-api";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
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
      <div className="flex flex-1">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="flex flex-1 gap-8 px-4 py-6 lg:px-8">
            <div className="min-w-0 flex-1">
              {view === "war-room" && <WarRoomView />}
              {view === "synergy" && <SynergyView />}
              {view === "idealab" && <IdeaLabView />}
              {view === "projects" && <ProjectsView />}
            </div>
            <RightRail />
          </main>
        </div>
      </div>
      <Footer />
    </div>
  );
}
