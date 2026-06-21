import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { sendInviteEmail } from "@/lib/email";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NOTE = 500;

/**
 * GET /api/invites
 *
 * Returns all invites the current founder has sent, newest first.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No current user" }, { status: 401 });
    }

    const invites = await db.invite.findMany({
      where: { inviterId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        status: true,
        note: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ invites });
  } catch (err) {
    console.error("[GET /api/invites]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/invites
 *
 * Sends a founder invite email to a new founder.
 * Body: { email: string, note?: string }
 *
 * - Creates an Invite row with an opaque token (used in the signup link).
 * - Sends the styled invite email via Resend (falls back to a server log
 *   when RESEND_API_KEY is unset, so local dev works).
 * - One outstanding invite per (inviter, email); resending re-issues the
 *   token and re-sends the email.
 * - We do NOT allow inviting an email that's already a registered founder
 *   in the same way we don't block it either — but the invite link still
 *   just leads to signup, which will reject a duplicate email. We surface
 *   that as a friendly "already on Preship" message instead.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No current user" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { email, note } = body as Record<string, unknown>;

    // --- validate email ---
    if (typeof email !== "string") {
      return NextResponse.json({ error: "email is required" }, { status: 400 });
    }
    const emailNorm = email.trim().toLowerCase();
    if (!EMAIL_RE.test(emailNorm)) {
      return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
    }
    if (emailNorm === user.email) {
      return NextResponse.json({ error: "You can't invite yourself" }, { status: 400 });
    }

    // --- validate note (optional) ---
    let noteTrim: string | null = null;
    if (typeof note === "string") {
      noteTrim = note.trim().slice(0, MAX_NOTE) || null;
    }

    // --- is this email already a registered founder? ---
    const existingUser = await db.user.findUnique({
      where: { email: emailNorm },
      select: { id: true },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: "That founder is already on Preship" },
        { status: 400 }
      );
    }

    // --- create or refresh the invite row ---
    const token = randomBytes(24).toString("hex");

    // Upsert by the unique (inviterId, email) so re-inviting doesn't pile
    // up duplicate rows — it re-issues the token + resets the status.
    const invite = await db.invite.upsert({
      where: { inviterId_email: { inviterId: user.id, email: emailNorm } },
      create: {
        email: emailNorm,
        token,
        inviterId: user.id,
        note: noteTrim,
        status: "sent",
      },
      update: {
        token,
        note: noteTrim,
        status: "sent",
        acceptedById: null,
      },
      select: {
        id: true,
        email: true,
        token: true,
        status: true,
        createdAt: true,
      },
    });

    // --- send the email (Resend, with a dev fallback) ---
    let delivered = false;
    try {
      const res = await sendInviteEmail({
        to: emailNorm,
        inviterName: user.name,
        inviterHandle: user.handle,
        inviterTitle: user.title,
        note: noteTrim,
        inviteToken: invite.token,
      });
      delivered = res.delivered;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to send email";
      // Surface transport errors so the client can show them instead of a
      // silent "success" with no email landing.
      return NextResponse.json(
        { error: `Invite saved, but the email failed to send: ${msg}` },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        invite: {
          id: invite.id,
          email: invite.email,
          status: invite.status,
          createdAt: invite.createdAt,
        },
        delivered,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/invites]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
