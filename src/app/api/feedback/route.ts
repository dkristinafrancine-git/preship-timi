import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { sendAdminEmail } from "@/lib/email";

/**
 * POST /api/feedback
 *
 * Auth-required. Handles both Feedback and Support submissions from the
 * floating widget — `kind` distinguishes them ("feedback" | "support") so one
 * endpoint serves both tabs.
 *
 * The submission is PERSISTED to the Feedback table (so the /admin console has
 * a triageable inbox) AND emailed to the admin inbox via Resend (dev-fallback
 * log when unset). DB write happens first, then the email I/O — per the pooling
 * rule, never hold work dependent on the row across the email round-trip.
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
    const b = body as Record<string, unknown>;

    const kind = typeof b.kind === "string" ? b.kind : "feedback";
    const subject = typeof b.subject === "string" ? b.subject.trim() : "";
    const message = typeof b.message === "string" ? b.message.trim() : "";

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }
    if (!["feedback", "support"].includes(kind)) {
      return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
    }

    const category = typeof b.category === "string" ? b.category.trim() : "";

    // Persist first — the inbox is the durable record. Email failure must not
    // lose the submission; an email exception bubbles to the 500 below, but the
    // row is already committed by then. (If email flakiness becomes an issue,
    // wrap the email in its own try/catch and return ok regardless.)
    await db.feedback.create({
      data: {
        userId: user.id,
        kind,
        category: category || null,
        subject: subject || null,
        message,
      },
    });

    await sendAdminEmail({
      subject:
        kind === "support"
          ? `Support · ${subject || "request"}`
          : `Feedback · ${category || "general"} — ${subject || "(no subject)"}`,
      replyTo: user.email,
      tag: kind,
      fields: [
        { label: "Type", value: kind },
        ...(category ? [{ label: "Category", value: category }] : []),
        ...(subject ? [{ label: "Subject", value: subject }] : []),
        { label: "Message", value: message },
        { label: "From", value: `${user.name} (@${user.handle}) <${user.email}>` },
      ],
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/feedback]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
