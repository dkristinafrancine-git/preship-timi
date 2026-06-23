import { AdminFeedbackView } from "@/components/preship/admin/admin-feedback-view";

export const metadata = { title: "Admin · Feedback & Support" };

/**
 * /admin/feedback — feedback + support ticket inbox with status workflows.
 * The server layout already gated on the superadmin role; this just renders
 * the client view that fetches /api/admin/feedback.
 */
export default function AdminFeedbackPage() {
  return <AdminFeedbackView />;
}
