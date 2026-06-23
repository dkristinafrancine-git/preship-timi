import { AdminOverview } from "@/components/preship/admin/admin-overview";

export const metadata = { title: "Admin · Overview" };

/**
 * /admin overview. Server wrapper (holds metadata); the live dashboard is the
 * client <AdminOverview> which fetches GET /api/admin/stats.
 */
export default function AdminOverviewPage() {
  return <AdminOverview />;
}
