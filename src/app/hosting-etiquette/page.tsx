import type { Metadata } from "next";
import { LegalPage, BulletList, P } from "@/components/preship/legal/legal-page";

export const metadata: Metadata = {
  title: "Hosting Etiquette · Preship",
  description:
    "How to host a Preship IdeaLab audio room with intent — set the thesis, fill the seats you need, and end on time.",
};

const LAST_UPDATED = "June 26, 2026";
const CONTACT = "founder@preship.app";

export default function HostingEtiquettePage() {
  return (
    <LegalPage
      eyebrow="hosting etiquette"
      title="Hosting Etiquette"
      lastUpdated={LAST_UPDATED}
      contactEmail={CONTACT}
      draft={false}
      contactPrompt="hosting a session and want to do it right"
      intro={
        <>
          <P>
            IdeaLab rooms are small, role-bound, and invite-only on purpose.
            Trust scales with intimacy, not reach — so the host is the person
            most responsible for keeping a room worth showing up to. This page
            is the house style. Follow it and your rooms will land; ignore it
            and founders will stop accepting your invites.
          </P>
          <P>
            A host schedules a session around a thesis, opens specific roles,
            shares an invite code, goes live at the scheduled time, and ends the
            session on demand. The etiquette below is organized around that
            lifecycle.
          </P>
        </>
      }
      sections={[
        {
          id: "before-you-host",
          heading: "Before you host",
          body: (
            <BulletList
              items={[
                "Have a real thesis, not a topic. 'How do distribution-first founders price a closed beta?' beats 'Let's talk about pricing'. A thesis gives the room somewhere to go.",
                "Name the unblock you want. If the session won't change a decision you're avoiding, it's a podcast, not an IdeaLab room.",
                "Open only the roles you actually need. Co-host, Technical Lead, Design Lead, Product Lead, Marketing Lead, Participant — each open seat is a promise that voice gets airtime. Empty roles are noise.",
                "Cap seats honestly. A room of 4 committed voices beats a room of 12 lurkers. Invite codes keep it invite-only — use that.",
              ]}
            />
          ),
        },
        {
          id: "the-invite",
          heading: "The invite",
          body: (
            <>
              <P>
                Your invite code is the first impression. Share it with founders
                whose stage and skills match the thesis, and say why you want
                <em> them</em> specifically when you send it. A cold mass-blasted
                invite code cheapens the room before it starts.
              </P>
              <BulletList
                items={[
                  "Invite people you'd genuinely take advice from in the room's domain.",
                  "Tell each invitee which role you're hoping they'll fill.",
                  "Don't stack the room with your existing friends at the expense of the right strangers — the point is to find the missing voice.",
                ]}
              />
            </>
          ),
        },
        {
          id: "going-live",
          heading: "Going live",
          body: (
            <BulletList
              items={[
                "Start on time. Founders who blocked their calendar for you are watching the countdown; a 10-minute late start disrespects every one of them.",
                "Open with the thesis and the unblock in one sentence each. Don't make the room figure out why it's there.",
                "Introduce roles as you go in, so participants know who holds which lens (technical, design, product, marketing).",
                "Mute when you're not speaking — background noise kills small rooms faster than bad content.",
              ]}
            />
          ),
        },
        {
          id: "running-the-room",
          heading: "Running the room",
          body: (
            <>
              <P>
                You are the host, not the keynote. Your job is to pull the right
                voices in and keep the room moving toward the unblock.
              </P>
              <BulletList
                items={[
                  "Direct traffic. Name the person you want to hear from next — 'Priya, you're the design lead here, what breaks for the user?'",
                  "Protect quiet voices. The most useful take in a room is often the one a founder is too polite to volunteer. Invite it explicitly.",
                  "Cut the loudest voice if they're crowding the room. That's a host's job, not a faux pas.",
                  "Stay on thesis. If the room drifts to a genuinely better unblock, name the pivot; if it drifts to nowhere, steer back.",
                  "Remember sessions may be recorded. Say so at the top, and don't put anyone on the spot with something they wouldn't want replayed.",
                ]}
              />
            </>
          ),
        },
        {
          id: "ending-well",
          heading: "Ending well",
          body: (
            <BulletList
              items={[
                "End on demand, and end before the room goes flat. Leave founders wishing it ran ten more minutes, not wishing you'd stopped ten ago.",
                "Land the unblock out loud: the decision, the open question, or the next step someone committed to.",
                "Handshake the people who actually moved the room — that's how a one-off session turns into a reputation.",
              ]}
            />
          ),
        },
        {
          id: "what-not-to-do",
          heading: "What not to do",
          body: (
            <BulletList
              items={[
                "Don't host a room to pitch your product. IdeaLab is for ideation; a disguised demo will be remembered for the wrong reason.",
                "Don't over-invite then cancel. If you can't fill the seats honestly, postpone rather than burning invite goodwill.",
                "Don't let one voice dominate — including your own. A host who monologues is running a podcast under a different name.",
                "Don't leave a recorded room's content ambiguous. State up front whether it's recorded and who can see it.",
              ]}
            />
          ),
        },
      ]}
    />
  );
}
