import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ADMIN_ROLE } from "@/lib/admin";
import { AdminShell } from "@/components/preship/admin/admin-shell";

export const metadata = {
  title: "Preship · Admin Console",
};

/**
 * /admin layout — gates the entire console tree on the superadmin role.
 *
 * Defense in depth: the edge middleware already forces *a* session on /admin;
 * this server layout additionally checks that the session's user is a
 * superadmin (role carried on the JWT via the NextAuth jwt/session callbacks,
 * bootstrapped from ADMIN_EMAILS). A non-superadmin is bounced to /app, never
 * seeing the console shell. Handlers under /api/admin/* re-check with
 * requireAdmin() for the same reason — the route render and the API must each
 * authorize independently.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (!session) {
    redirect("/login?callbackUrl=/admin");
  }
  if (role !== ADMIN_ROLE) {
    redirect("/app");
  }

  return <AdminShell>{children}</AdminShell>;
}
