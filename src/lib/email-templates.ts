/**
 * Styled HTML email templates for Preship.
 *
 * Email clients ignore <style> in many cases, so all styling is inlined as
 * `style="..."` attributes on each element. The design mirrors the app's
 * visual language:
 *   - ink dark header strip   #0E1909
 *   - lime CTA accent         #DAFF01
 *   - mono uppercase labels   JetBrains-ish sans-serif fallback stack
 *   - "alpha war room" voice
 *
 * Colors are kept to the same 4 hex values used in globals.css so the email
 * reads as unmistakably Preship.
 */

type InviteEmailArgs = {
  inviterName: string;
  inviterHandle: string;
  inviterTitle?: string | null;
  note?: string | null;
  to: string;
  signupUrl: string;
};

const INK = "#0E1909";
const LIME = "#DAFF01";
const MUTED = "#5c6b52";
const BORDER = "#e6e8df";
const TINT = "#f8f9f3";

export function inviteFounderEmailHtml(args: InviteEmailArgs): string {
  const { inviterName, inviterHandle, inviterTitle, note, to, signupUrl } = args;

  const noteBlock = note
    ? `<tr>
        <td style="padding:0 0 20px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${TINT};border:1px solid ${BORDER};border-left:3px solid ${LIME};border-radius:6px;">
            <tr><td style="padding:16px 18px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
              <p style="margin:0 0 6px 0;font-family:'JetBrains Mono',ui-monospace,Menlo,Consolas,monospace;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${MUTED};">a note from ${escapeHtml(inviterName)}</p>
              <p style="margin:0;font-size:15px;line-height:1.6;color:${INK};">${escapeHtml(note)}</p>
            </td></tr>
          </table>
        </td>
      </tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="X-Content-Type-Options" content="nosniff">
<title>${escapeHtml(inviterName)} invited you to Preship</title>
</head>
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${INK};">

  <!-- outer wrapper, max 560px -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:560px;max-width:560px;border:1px solid ${BORDER};border-radius:10px;overflow:hidden;background:#ffffff;">

          <!-- ink header strip -->
          <tr>
            <td style="background:${INK};padding:20px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-family:'JetBrains Mono',ui-monospace,Menlo,Consolas,monospace;font-size:13px;font-weight:700;letter-spacing:0.08em;color:${LIME};">
                    PRESHIP<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${LIME};margin-left:8px;vertical-align:middle;"></span>
                  </td>
                  <td align="right" style="font-family:'JetBrains Mono',ui-monospace,Menlo,Consolas,monospace;font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:${LIME};opacity:0.55;">
                    founder invite
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- body -->
          <tr>
            <td style="padding:32px 28px 8px 28px;">
              <p style="margin:0 0 4px 0;font-family:'JetBrains Mono',ui-monospace,Menlo,Consolas,monospace;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:${MUTED};">you've been invited by</p>
              <h1 style="margin:0;font-size:26px;font-weight:700;line-height:1.2;color:${INK};letter-spacing:-0.01em;">
                ${escapeHtml(inviterName)} <span style="color:${MUTED};font-weight:400;">@${escapeHtml(inviterHandle)}</span>
              </h1>
              ${inviterTitle ? `<p style="margin:6px 0 0 0;font-size:15px;color:${MUTED};">${escapeHtml(inviterTitle)}</p>` : ""}
            </td>
          </tr>

          <tr>
            <td style="padding:16px 28px 24px 28px;">
              <p style="margin:0;font-size:15px;line-height:1.65;color:${INK};">
                Preship is the <strong>alpha war room</strong> — a high-velocity command center where pre-launch founders collaborate, back each other, and trade leverage in broad daylight.
              </p>
              <p style="margin:14px 0 0 0;font-size:15px;line-height:1.65;color:${INK};">
                Founders don't pitch here. They broadcast bottlenecks, match in Synergy, and ideate new startups in invite-only IdeaLab rooms.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:0 28px;">
              ${noteBlock}
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:8px 28px 28px 28px;" align="center">
              <a href="${escapeAttr(signupUrl)}" target="_blank" rel="noopener noreferrer"
                 style="display:inline-block;background:${LIME};color:${INK};font-family:'JetBrains Mono',ui-monospace,Menlo,Consolas,monospace;font-size:13px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;text-decoration:none;padding:15px 34px;border-radius:6px;">
                accept invite &rarr;
              </a>
              <p style="margin:14px 0 0 0;font-family:'JetBrains Mono',ui-monospace,Menlo,Consolas,monospace;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:${MUTED};">
                sent to ${escapeHtml(to)}
              </p>
            </td>
          </tr>

          <!-- what's inside strip -->
          <tr>
            <td style="padding:0 28px 28px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BORDER};border-radius:6px;">
                <tr>
                  <td width="33.33%" align="center" style="padding:18px 8px;border-right:1px solid ${BORDER};">
                    <div style="font-family:'JetBrains Mono',ui-monospace,Menlo,Consolas,monospace;font-size:18px;font-weight:700;color:${LIME};background:${INK};width:32px;height:32px;line-height:32px;border-radius:6px;margin:0 auto 8px;">✎</div>
                    <p style="margin:0;font-family:'JetBrains Mono',ui-monospace,Menlo,Consolas,monospace;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:${INK};">war room</p>
                  </td>
                  <td width="33.33%" align="center" style="padding:18px 8px;border-right:1px solid ${BORDER};">
                    <div style="font-family:'JetBrains Mono',ui-monospace,Menlo,Consolas,monospace;font-size:18px;font-weight:700;color:${LIME};background:${INK};width:32px;height:32px;line-height:32px;border-radius:6px;margin:0 auto 8px;">⚡</div>
                    <p style="margin:0;font-family:'JetBrains Mono',ui-monospace,Menlo,Consolas,monospace;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:${INK};">synergy</p>
                  </td>
                  <td width="33.33%" align="center" style="padding:18px 8px;">
                    <div style="font-family:'JetBrains Mono',ui-monospace,Menlo,Consolas,monospace;font-size:18px;font-weight:700;color:${LIME};background:${INK};width:32px;height:32px;line-height:32px;border-radius:6px;margin:0 auto 8px;">●</div>
                    <p style="margin:0;font-family:'JetBrains Mono',ui-monospace,Menlo,Consolas,monospace;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:${INK};">idealab</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ink footer -->
          <tr>
            <td style="background:${INK};padding:20px 28px;">
              <p style="margin:0;font-family:'JetBrains Mono',ui-monospace,Menlo,Consolas,monospace;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:${LIME};opacity:0.7;line-height:1.6;">
                the alpha war room — collaborate in broad daylight
              </p>
              <p style="margin:8px 0 0 0;font-family:'JetBrains Mono',ui-monospace,Menlo,Consolas,monospace;font-size:10px;color:${LIME};opacity:0.4;">
                didn't expect this? you can safely ignore this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function inviteFounderEmailText(args: InviteEmailArgs): string {
  const { inviterName, inviterHandle, inviterTitle, note, to, signupUrl } = args;
  return [
    `PRESHIP — the alpha war room`,
    ``,
    `You've been invited by ${inviterName} @${inviterHandle}${inviterTitle ? ` (${inviterTitle})` : ""}.`,
    ``,
    `Preship is the alpha war room — a high-velocity command center where`,
    `pre-launch founders collaborate, back each other, and trade leverage`,
    `in broad daylight. Broadcast bottlenecks, match in Synergy, and ideate`,
    `in invite-only IdeaLab rooms.`,
    ``,
    note ? `A note from ${inviterName}:` : ``,
    note ? note : ``,
    note ? `` : ``,
    `Accept your invite:`,
    signupUrl,
    ``,
    `Sent to ${to}. Didn't expect this? You can safely ignore this email.`,
  ]
    .filter((l) => l !== undefined)
    .join("\n");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}
