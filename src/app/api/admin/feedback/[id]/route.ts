import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

/**
 * PATCH /api/admin/feedback/[id]
 *
 * Update the status of a feedback/support ticket. Body: { status }.
 *
 * The inbox workflow is: new → open → resolved (or archived). There's no
 * per-user ownership beyond the superadmin role — requireAdmin() is the gate
 * (defense in depth: middleware guarantees a session, this checks the role,
 * matching the convention in notifications/[id]).
 */
const VALID_STATUSES = ["new", "open", "resolved", "archived"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireAdmin();
    if (guard instanceof NextResponse) return guard;

    const { id } = await params;
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const status = (body as Record<string, unknown>).status;
    if (typeof status !== "string" || !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const existing = await db.feedback.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
    }

    const updated = await db.feedback.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        status: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ feedback: updated });
  } catch (err) {
    console.error("[PATCH /api/admin/feedback/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
