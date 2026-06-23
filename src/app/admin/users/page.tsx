import { AdminUsersView } from "@/components/preship/admin/admin-users-view";

export const metadata = { title: "Admin · Users" };

/**
 * /admin/users — searchable users table with active/passive badges derived from
 * lastSeenAt. The server layout already gated on the superadmin role.
 */
export default function AdminUsersPage() {
  return <AdminUsersView />;
}
