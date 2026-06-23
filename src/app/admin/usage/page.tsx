import { AdminUsageView } from "@/components/preship/admin/admin-usage-view";

export const metadata = { title: "Admin · Audio Usage" };

/**
 * /admin/usage — recorded audio-post minutes + IdeaLab live participant-minutes.
 * The server layout already gated on the superadmin role.
 */
export default function AdminUsagePage() {
  return <AdminUsageView />;
}
