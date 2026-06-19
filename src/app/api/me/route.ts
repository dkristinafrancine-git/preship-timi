import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No current user found" }, { status: 404 });
    }

    const projects = await db.project.findMany({
      where: { founderId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ user, projects });
  } catch (err) {
    console.error("[GET /api/me]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
