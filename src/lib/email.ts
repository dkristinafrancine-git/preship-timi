import { Resend } from "resend";
import { inviteFounderEmailHtml, inviteFounderEmailText } from "@/lib/email-templates";

/**
 * Email transport for Preship.
 *
 * Uses Resend (https://resend.com) when RESEND_API_KEY is set. In dev / before
 * a key is configured, `sendInviteEmail` logs the rendered HTML and returns a
 * dev preview so the invite flow works end-to-end without an SMTP account.
 *
 * Env:
 *  - RESEND_API_KEY  (required for real delivery)
 *  - MAIL_FROM       (e.g. "Preship <invite@preship.app>"; defaults to "Preship <onboarding@resend.dev>")
 *  - NEXT_PUBLIC_APP_URL (base URL used to build the signup link; defaults to http://localhost:3000)
 */

let _client: Resend | null = null;
function client(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!_client) _client = new Resend(key);
  return _client;
}

export function mailFrom(): string {
  return (
    process.env.MAIL_FROM ?? "Preship <onboarding@resend.dev>"
  );
}

export function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export type SendInviteArgs = {
  to: string; // invitee email
  inviterName: string;
  inviterHandle: string;
  inviterTitle?: string | null;
  note?: string | null;
  inviteToken: string;
};

export type SendResult = {
  delivered: boolean;
  /** Resend message id when delivered, else undefined. */
  messageId?: string;
  /** Dev-only: the rendered HTML, returned so callers can show a preview. */
  previewHtml?: string;
};

/**
 * Send the styled founder-invite email. Falls back to logging when no
 * RESEND_API_KEY is present so local dev keeps working.
 */
export async function sendInviteEmail(args: SendInviteArgs): Promise<SendResult> {
  const signupUrl = `${appUrl()}/signup?invite=${encodeURIComponent(args.inviteToken)}`;
  const html = inviteFounderEmailHtml({ ...args, signupUrl });
  const text = inviteFounderEmailText({ ...args, signupUrl });

  const resend = client();
  if (!resend) {
    // Dev fallback — no key configured. Surface the rendered email.
    console.info(
      "\n[invite email · dev fallback — set RESEND_API_KEY to deliver]\n" +
        `to: ${args.to}\nfrom: ${mailFrom()}\nsubject: ${args.inviterName} invited you to Preship\n` +
        `signup link: ${signupUrl}\n---- HTML ----\n${html}\n`
    );
    return { delivered: false, previewHtml: html };
  }

  const { data, error } = await resend.emails.send({
    from: mailFrom(),
    to: args.to,
    subject: `${args.inviterName} invited you to Preship`,
    html,
    text,
    // Tag for filtering / analytics in the Resend dashboard.
    tags: [{ name: "type", value: "founder_invite" }],
  });

  if (error) {
    throw new Error(error.message);
  }

  return { delivered: true, messageId: data?.id };
}

/**
 * Inbox address for admin notifications (IP-support intakes, feedback,
 * support requests). Defaults to the MAIL_FROM address so there's always a
 * destination without extra config in dev.
 */
export function adminEmail(): string {
  return process.env.ADMIN_EMAIL ?? mailFrom();
}

export type SendAdminEmailArgs = {
  /** Email subject line. */
  subject: string;
  /** Reply-to address (the submitter's email, when known). */
  replyTo?: string;
  /** Resend tag for dashboard filtering (e.g. "ip_support", "feedback"). */
  tag: string;
  /** Ordered label/value pairs rendered as a simple field table. */
  fields: { label: string; value: string }[];
};

/**
 * Generic admin-notification email. Renders the supplied fields as a plain
 * key/value table (both HTML and text) and sends to the admin inbox.
 *
 * Shared by the IP-support intake and the feedback/support widget so both
 * flows reuse one transport + one template. Falls back to a server log when
 * RESEND_API_KEY is unset, exactly like sendInviteEmail.
 */
export async function sendAdminEmail(
  args: SendAdminEmailArgs
): Promise<SendResult> {
  const rows = args.fields
    .map(
      (f) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#6b7280;font-family:ui-monospace,monospace;font-size:12px;text-transform:uppercase;letter-spacing:.05em;vertical-align:top;white-space:nowrap">${escapeHtml(
          f.label
        )}</td><td style="padding:6px 0;font-family:ui-sans-serif,system-ui,sans-serif;font-size:14px;color:#0E1909;vertical-align:top">${escapeHtml(
          f.value
        )}</td></tr>`
    )
    .join("");
  const html =
    `<div style="max-width:560px;margin:0 auto;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">` +
    `<div style="background:#0E1909;padding:16px 20px"><span style="font-family:ui-monospace,monospace;font-size:12px;text-transform:uppercase;letter-spacing:.15em;color:#DAFF01">preship · admin</span></div>` +
    `<table style="border-collapse:collapse;width:100%;padding:16px 20px">${rows}</table>` +
    `</div>`;
  const text = args.fields.map((f) => `${f.label}: ${f.value}`).join("\n");

  const resend = client();
  if (!resend) {
    console.info(
      "\n[admin email · dev fallback — set RESEND_API_KEY to deliver]\n" +
        `to: ${adminEmail()}\nfrom: ${mailFrom()}\nsubject: ${args.subject}\n` +
        `---- TEXT ----\n${text}\n`
    );
    return { delivered: false, previewHtml: html };
  }

  const { data, error } = await resend.emails.send({
    from: mailFrom(),
    to: adminEmail(),
    replyTo: args.replyTo,
    subject: args.subject,
    html,
    text,
    tags: [{ name: "type", value: args.tag }],
  });

  if (error) {
    throw new Error(error.message);
  }

  return { delivered: true, messageId: data?.id };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
