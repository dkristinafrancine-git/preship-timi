import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";

// POST /api/notifications/read — mark notifications as read for the current user.
// Body: { id?: string }
//   - If `id` is provided, mark only that notification as read (must be owned).
//   - If `id` is omitted, mark ALL of the current user's notifications as read.
// Returns: { ok: true, updated: N }
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No current user" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const id =
      body && typeof body === "object" && "id" in body
        ? String((body as { id?: unknown }).id ?? "")
        : "";

    if (id) {
      // Verify ownership before updating.
      const existing = await db.notification.findUnique({
        where: { id },
        select: { userId: true },
      });
      if (!existing) {
        return NextResponse.json(
          { error: "Notification not found" },
          { status: 404 }
        );
      }
      if (existing.userId !== user.id) {
        return NextResponse.json(
          { error: "You can only mark your own notifications as read" },
          { status: 403 }
        );
      }

      const result = await db.notification.updateMany({
        where: { id, userId: user.id, read: false },
        data: { read: true },
      });

      return NextResponse.json({ ok: true, updated: result.count });
    }

    // Mark all as read for the current user.
    const result = await db.notification.updateMany({
      where: { userId: user.id, read: false },
      data: { read: true },
    });

    return NextResponse.json({ ok: true, updated: result.count });
  } catch (err) {
    console.error("[POST /api/notifications/read]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
