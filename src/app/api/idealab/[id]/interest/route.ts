import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";

// POST /api/idealab/[id]/interest — toggle interest for the current user
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No current user" }, { status: 401 });
    }

    const session = await db.ideaLabSession.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const existing = await db.ideaLabInterest.findUnique({
      where: {
        sessionId_userId: { sessionId: id, userId: user.id },
      },
      select: { id: true },
    });

    if (existing) {
      await db.ideaLabInterest.delete({ where: { id: existing.id } });
      return NextResponse.json({ interested: false });
    }

    await db.ideaLabInterest.create({
      data: { sessionId: id, userId: user.id },
    });
    return NextResponse.json({ interested: true });
  } catch (err) {
    console.error("[POST /api/idealab/[id]/interest]", err);
    return NextResponse.json(
      { error: "Failed to toggle interest" },
      { status: 500 }
    );
  }
}
