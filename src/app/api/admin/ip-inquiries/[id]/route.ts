import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

/**
 * PATCH /api/admin/ip-inquiries/[id]
 *
 * Update the status of a Trademark/Copyright/Patent inquiry. Body: { status }.
 *
 * Workflow: new → in-review → responded (or closed). requireAdmin() is the gate
 * — there's no per-submitter ownership to check beyond the superadmin role.
 */
const VALID_STATUSES = ["new", "in-review", "responded", "closed"];

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

    const existing = await db.ipInquiry.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "IP inquiry not found" }, { status: 404 });
    }

    const updated = await db.ipInquiry.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        status: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ inquiry: updated });
  } catch (err) {
    console.error("[PATCH /api/admin/ip-inquiries/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
