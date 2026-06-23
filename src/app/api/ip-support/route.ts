import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { sendAdminEmail } from "@/lib/email";

/**
 * POST /api/ip-support
 *
 * Trademark / Copyright / Patent intake form. **Public** (added to the
 * middleware PUBLIC_PREFIXES) so an anonymous visitor on the landing page can
 * request IP help. When a session exists, the founder's identity is attached
 * automatically; otherwise the submitted email is used as the reply-to.
 *
 * The intake is PERSISTED to the IpInquiry table (so the /admin console has a
 * triageable inbox) AND emailed to the admin via Resend (dev-fallback log when
 * RESEND_API_KEY is unset). DB write first, then email I/O — see AGENT.md
 * pooling rules.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const b = body as Record<string, unknown>;

    const kind = typeof b.kind === "string" ? b.kind : "";
    const protecting = typeof b.protecting === "string" ? b.protecting : "";
    const stage = typeof b.stage === "string" ? b.stage : "";
    const jurisdiction = typeof b.jurisdiction === "string" ? b.jurisdiction : "";
    const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";

    const VALID_KINDS = ["trademark", "copyright", "patent"];
    if (!VALID_KINDS.includes(kind)) {
      return NextResponse.json({ error: "Select a protection type" }, { status: 400 });
    }
    if (!protecting.trim() || !stage.trim() || !jurisdiction.trim()) {
      return NextResponse.json({ error: "Please complete the required fields" }, { status: 400 });
    }

    // Attach the logged-in founder when present (identity is trusted from the
    // session, not the body). Anonymous submissions require an email.
    const user = await getCurrentUser();
    const replyTo = user?.email ?? email;
    if (!replyTo) {
      return NextResponse.json({ error: "An email is required" }, { status: 400 });
    }

    const projectName = typeof b.projectName === "string" ? b.projectName.trim() : "";
    const budget = typeof b.budget === "string" ? b.budget.trim() : "";
    const details = typeof b.details === "string" ? b.details.trim() : "";

    // Persist first (the durable inbox record), then email. userId is null for
    // anonymous submissions; email is always the reply-to.
    await db.ipInquiry.create({
      data: {
        userId: user?.id ?? null,
        email: replyTo,
        kind,
        protecting: protecting.trim(),
        stage,
        jurisdiction: jurisdiction.trim(),
        projectName: projectName || null,
        budget: budget || null,
        details: details || null,
      },
    });

    await sendAdminEmail({
      subject: `IP support · ${kind} — ${protecting.trim().slice(0, 60)}`,
      replyTo,
      tag: "ip_support",
      fields: [
        { label: "Type", value: kind },
        { label: "What to protect", value: protecting.trim() },
        { label: "Stage", value: stage },
        { label: "Jurisdiction", value: jurisdiction.trim() },
        ...(projectName ? [{ label: "Project", value: projectName }] : []),
        ...(budget ? [{ label: "Budget", value: budget }] : []),
        ...(details ? [{ label: "Details", value: details }] : []),
        {
          label: "From",
          value: user
            ? `${user.name} (@${user.handle}) <${user.email}>`
            : replyTo,
        },
      ],
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/ip-support]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
