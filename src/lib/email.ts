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
