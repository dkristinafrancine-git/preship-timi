import type { Metadata } from "next";
import { LegalPage, BulletList, P } from "@/components/preship/legal/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy · Preship",
  description:
    "How Preship collects, uses, and protects information from founders who use the alpha war room.",
};

const LAST_UPDATED = "June 26, 2026";
const CONTACT = "founder@preship.app";

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="privacy policy"
      title="Privacy Policy"
      lastUpdated={LAST_UPDATED}
      contactEmail={CONTACT}
      intro={
        <>
          <P>
            Preship (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;)
            operates the alpha war room — a tactical command center where
            pre-launch founders broadcast bottlenecks, match collaborators in
            Synergy, and ideate in invite-only IdeaLab audio rooms (the
            &ldquo;Service&rdquo;). This Privacy Policy explains what information
            we collect, how we use it, and the choices you have.
          </P>
          <P>
            By creating an account or using the Service, you agree to the
            practices described here. This policy should be read alongside our{" "}
            <a
              href="/terms"
              className="font-semibold text-[#0E1909] underline decoration-[#DAFF01] decoration-2 underline-offset-2"
            >
              Terms &amp; Conditions
            </a>
            .
          </P>
        </>
      }
      sections={[
        {
          id: "information-we-collect",
          heading: "Information we collect",
          body: (
            <>
              <P>
                <strong>Account information.</strong> When you sign up, we
                collect your name, email address, chosen handle, and a hashed
                password. We never store passwords in plain text — they are
                hashed with scrypt before being written to our database.
              </P>
              <P>
                <strong>Profile information.</strong> Optional profile fields you
                provide, such as your title, location, skills, bio, and avatar.
                This is the public face other founders see.
              </P>
              <P>
                <strong>Content you post.</strong> Posts, comments, reactions,
                Synergy offers, project details, bounty listings, IdeaLab
                sessions, and other content you create or upload through the
                Service, including any audio recorded during IdeaLab sessions.
              </P>
              <P>
                <strong>Usage information.</strong> Logs and analytics about how
                you interact with the Service, such as the pages or features you
                use, timestamps, device and browser type, and approximate
                location derived from your IP address. We also record a
                &ldquo;last seen&rdquo; timestamp to power active-user signals.
              </P>
              <P>
                <strong>Cookies and similar technologies.</strong> We use an
                authentication cookie (session token) to keep you signed in, and
                may use analytics cookies to understand aggregate usage. You can
                control cookies through your browser settings.
              </P>
            </>
          ),
        },
        {
          id: "founder-invite-emails",
          heading: "Founder invite emails",
          body: (
            <>
              <P>
                When you use the &ldquo;Invite a founder&rdquo; feature, we
                collect the invitee&rsquo;s email address and any personal note
                you choose to include. We use this solely to send a single
                styled invitation email containing a signup link unique to that
                invitation.
              </P>
              <P>We do not:</P>
              <BulletList
                items={[
                  "add invitees to any marketing or newsletter list — they receive exactly one invitation email, nothing more unless they sign up;",
                  "retain the invitee's email beyond what is needed to track whether the invitation was accepted or to prevent duplicate invitations from the same inviter;",
                  "share the invitee's email with any third party.",
                ]}
              />
              <P>
                Invitees who never sign up can request that their pending invite
                record be removed by contacting us at {CONTACT}.
              </P>
            </>
          ),
        },
        {
          id: "how-we-use-information",
          heading: "How we use your information",
          body: (
            <>
              <P>We use the information we collect to:</P>
              <BulletList
                items={[
                  "create and manage your account, authenticate you, and keep the Service secure;",
                  "display your profile, posts, and activity to other founders as you intend;",
                  "operate Synergy matching, IdeaLab audio rooms, and bounty features;",
                  "send you transactional messages such as invitations, notifications, and security alerts;",
                  "power the admin console's aggregate health and usage statistics;",
                  "investigate and prevent fraud, abuse, and violations of our Terms;",
                  "improve, debug, and develop the Service.",
                ]}
              />
            </>
          ),
        },
        {
          id: "ip-intake-submissions",
          heading: "IP-support intake submissions",
          body: (
            <P>
              If you submit a Trademark, Copyright, or Patent support request
              through our intake form, we collect the details you provide (the
              type of protection, what you are protecting, its stage,
              jurisdiction, project name, budget, and any details) plus an email
              address so our team can follow up. This information is used only to
              evaluate and respond to your request and is not shared outside
              Preship without your consent, except as required by law.
            </P>
          ),
        },
        {
          id: "sharing-and-disclosure",
          heading: "Sharing and disclosure",
          body: (
            <>
              <P>
                We do not sell your personal information. We may share
                information only in these limited situations:
              </P>
              <BulletList
                items={[
                  "with service providers who process data on our behalf (for example: hosting and database providers, email delivery, and live audio infrastructure) under contractual obligations of confidentiality;",
                  "to comply with legal obligations, respond to lawful requests, or protect the rights, property, or safety of Preship, our users, or others;",
                  "in connection with a merger, acquisition, or sale of all or part of our assets, subject to the confidentiality obligations of this policy.",
                ]}
              />
            </>
          ),
        },
        {
          id: "data-retention",
          heading: "Data retention",
          body: (
            <P>
              We retain your information for as long as your account is active or
              as needed to provide the Service. If you delete your account, we
              remove or anonymize your personal information within a reasonable
              period, except where we are required to retain it (for example, for
              legal, accounting, or fraud-prevention purposes). Audio recordings
              and content may be retained according to the feature-specific
              retention rules in effect at the time.
            </P>
          ),
        },
        {
          id: "your-rights",
          heading: "Your rights and choices",
          body: (
            <>
              <P>Depending on where you live, you may have the right to:</P>
              <BulletList
                items={[
                  "access the personal information we hold about you;",
                  "correct inaccurate or incomplete information;",
                  "request deletion of your personal information, subject to legal exceptions;",
                  "object to or restrict certain processing;",
                  "withdraw consent where processing relies on consent;",
                  "receive a portable copy of your information.",
                ]}
              />
              <P>
                To exercise any of these rights, contact us at {CONTACT}. We will
                respond within the timeframe required by applicable law.
              </P>
            </>
          ),
        },
        {
          id: "security",
          heading: "Security",
          body: (
            <P>
              We use reasonable technical and organizational measures to protect
              your information, including hashed passwords, authenticated
              sessions, ownership-checked access controls, and encrypted
              connections in transit. However, no system is perfectly secure, and
              we cannot guarantee absolute security.
            </P>
          ),
        },
        {
          id: "international-transfer",
          heading: "International data transfer",
          body: (
            <P>
              The Service is hosted on cloud infrastructure that may process data
              in regions different from your own. By using the Service, you
              consent to the transfer of your information to, and storage and
              processing of it in, such regions.
            </P>
          ),
        },
        {
          id: "children",
          heading: "Children's privacy",
          body: (
            <P>
              The Service is not directed to anyone under the age of 13, and we do
              not knowingly collect personal information from children under 13.
              If you believe we have collected such information, please contact us
              and we will delete it.
            </P>
          ),
        },
        {
          id: "changes",
          heading: "Changes to this policy",
          body: (
            <P>
              We may update this Privacy Policy from time to time. If we make
              material changes, we will revise the &ldquo;last updated&rdquo;
              date at the top and, where appropriate, notify you through the
              Service. Continued use of the Service after a change takes effect
              constitutes acceptance of the revised policy.
            </P>
          ),
        },
      ]}
    />
  );
}
