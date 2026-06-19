import { db } from "@/lib/db";

/**
 * Create a notification row for a user.
 *
 * Used by API routes (reactions, comments, synergy offers, follows, etc.)
 * to alert the recipient that something happened.
 *
 * @param userId   Recipient user id (the person being notified).
 * @param kind     One of: reaction | comment | handshake-offer | offer-accepted |
 *                 follow | session-starting | session-live | bounty-gathered
 * @param title    Short headline (e.g. "New handshake on your post").
 * @param body     Longer description.
 * @param linkView Optional view name for deep-linking: war-room | synergy | idealab | projects | profile
 * @param linkId   Optional id of the linked entity (postId / synergyId / sessionId / founderId).
 */
export async function notify(
  userId: string,
  kind: string,
  title: string,
  body: string,
  linkView?: string,
  linkId?: string
) {
  try {
    return await db.notification.create({
      data: {
        userId,
        kind,
        title,
        body,
        linkView: linkView ?? null,
        linkId: linkId ?? null,
      },
    });
  } catch (err) {
    // Notifications are best-effort — never let a notify failure break the
    // parent request. Log and move on.
    console.error("[notify]", err);
    return null;
  }
}
