import { PublicLanding } from "@/components/preship/public-landing";

/**
 * `/` — the public landing page: a read-only war-room feed replica with the
 * left/right rails (clicks route to /login) and a floating login/signup CTA
 * ribbon. No auth required.
 *
 * Authenticated visitors are bounced to /app by middleware before this renders.
 */
export default function Home() {
  return <PublicLanding />;
}
