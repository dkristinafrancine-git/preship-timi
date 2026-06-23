import { AdminIpInquiriesView } from "@/components/preship/admin/admin-ip-inquiries-view";

export const metadata = { title: "Admin · IP Inquiries" };

/**
 * /admin/ip-inquiries — Trademark / Copyright / Patent intake inbox with status
 * workflows. The server layout already gated on the superadmin role.
 */
export default function AdminIpInquiriesPage() {
  return <AdminIpInquiriesView />;
}
