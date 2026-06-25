import type { Metadata } from "next";
import { LegalPage, BulletList, P } from "@/components/preship/legal/legal-page";

export const metadata: Metadata = {
  title: "Manifesto · Preship",
  description:
    "Why Preship exists — the alpha war room for founders who broadcast real progress and back each other with real handshakes.",
};

const LAST_UPDATED = "June 26, 2026";
const CONTACT = "founder@preship.app";

export default function ManifestoPage() {
  return (
    <LegalPage
      eyebrow="manifesto"
      title="Manifesto"
      lastUpdated={LAST_UPDATED}
      contactEmail={CONTACT}
      draft={false}
      contactPrompt="want to push back or add to this"
      intro={
        <>
          <P>
            Preship is the alpha war room — a room of founders broadcasting real
            progress, calling out real bottlenecks, and backing each other with
            real handshakes. We collaborate in broad daylight.
          </P>
          <P>
            The rest of the internet is built on the like: a cheap signal that
            costs the giver nothing and teaches the receiver nothing. We built a
            different room. Here, the highest-intent signal is the handshake — a
            public commitment, attached to a project and a stage, meant to be
            honored.
          </P>
        </>
      }
      sections={[
        {
          id: "why-we-exist",
          heading: "Why we exist",
          body: (
            <>
              <P>
                Pre-launch founders are isolated in a way that nobody talks
                about. You are not short on content to scroll — you are short on
                a room of people who actually know what it is like to be stuck on
                the thing you are stuck on, at the exact stage you are stuck on
                it.
              </P>
              <P>
                Preship exists to put those people in the same room, give them a
                shared vocabulary (the six alpha sub-stages), and a shared
                currency of trust (the handshake). Nothing here is performative
                by default — every post is tied to a project, every broadcast
                asks for a specific unblock, and every handshake attaches your
                name to someone else&rsquo;s next move.
              </P>
            </>
          ),
        },
        {
          id: "what-we-believe",
          heading: "What we believe",
          body: (
            <BulletList
              items={[
                "Progress is public by default. Broadcasting what you actually did this week — including the mess — beats a polished 'we're crushing it' every time.",
                "Stage matters more than hype. A founder in Customer Discovery and a founder in Pre-Launch need different rooms. Tag honestly so the right peers find you.",
                "A handshake is a commitment, not a like. If you back someone, you put your name on it and you follow through. Reputation compounds; likes don't.",
                "A bottleneck named out loud is half-solved. Synergy exists so 'I'm stuck' becomes 'I have three offers to unblock me by Friday'.",
                "Small, role-bound rooms beat broadcast podcasts. IdeaLab seats are capped and invite-only because trust scales with intimacy, not reach.",
              ]}
            />
          ),
        },
        {
          id: "how-we-collaborate",
          heading: "How we collaborate",
          body: (
            <>
              <P>
                Three actions define this network, in ascending order of weight:
              </P>
              <BulletList
                items={[
                  "Broadcast — say what you did, what you're stuck on, and what you need. Tie it to a project and a stage so context is one glance away.",
                  "React — like, repost, or comment. Useful, but cheap. None of these change your standing.",
                  "Handshake — the real move. Back a broadcast with your name, or accept an offer and own the outcome. This is what shows up on profiles as proof.",
                ]}
              />
              <P>
                The ratio that matters is handshakes-to-broadcasts, not
                likes-to-followers. Optimize for the first.
              </P>
            </>
          ),
        },
        {
          id: "what-we-reject",
          heading: "What we reject",
          body: (
            <BulletList
              items={[
                "Performative hype and 'crushing it' theater with no project behind it.",
                "Vague asks. 'Need advice' is not a broadcast — name the bottleneck and the specific unblock.",
                "Handshakes you don't intend to honor. A handshake is your word; breaking it quietly is how a reputation dies here.",
                "Lurker-only mode. If you only take and never broadcast or back, this is the wrong room.",
              ]}
            />
          ),
        },
        {
          id: "the-promise",
          heading: "The promise",
          body: (
            <P>
              If you broadcast honestly, tag your stage truthfully, and put your
              name on the founders you believe in, the room will know your work
              by the time you launch. That is the whole bet. Everything else in
              the product is in service of it.
            </P>
          ),
        },
      ]}
    />
  );
}
