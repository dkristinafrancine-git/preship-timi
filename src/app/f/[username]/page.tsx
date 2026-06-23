import { PublicProfileView } from "@/components/preship/profile/public-profile-view";

export const metadata = {
  title: "Founder profile · Preship",
};

/**
 * /f/[username] — shareable founder profile.
 *
 * Read-only, displayed via the PublicProfileView client component which reads
 * the lightweight /api/founders/by-handle endpoint. Auth-gated by middleware:
 * an anonymous visitor is redirected to /login?callbackUrl=/f/<username>.
 */
export default async function FounderProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  return <PublicProfileView handle={username} />;
}
