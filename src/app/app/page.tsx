import { PreshipApp } from "@/components/preship/preship-app";

export const metadata = {
  title: "Preship — The Alpha War Room for Pre-Launch Founders",
};

/**
 * /app — the authenticated workspace (war room, synergy, idealab, …).
 * Middleware guarantees a session before this renders; the component itself
 * handles the not-yet-onboarded redirect to /onboarding.
 *
 * The public root `/` renders a landing page instead, so the authenticated
 * app lives under its own clean path.
 */
export default function AppPage() {
  return <PreshipApp />;
}
