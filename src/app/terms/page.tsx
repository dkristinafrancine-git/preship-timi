import type { Metadata } from "next";
import { LegalPage, BulletList, P } from "@/components/preship/legal/legal-page";

export const metadata: Metadata = {
  title: "Terms & Conditions · Preship",
  description:
    "The terms that govern your use of Preship, the alpha war room for pre-launch founders.",
};

const LAST_UPDATED = "June 26, 2026";
const CONTACT = "founder@preship.app";

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="terms & conditions"
      title="Terms & Conditions"
      lastUpdated={LAST_UPDATED}
      contactEmail={CONTACT}
      intro={
        <>
          <P>
            These Terms &amp; Conditions (&ldquo;Terms&rdquo;) govern your access
            to and use of Preship, the alpha war room — including the war-room
            feed, Synergy matching, IdeaLab audio rooms, bounties, projects, and
            related features (the &ldquo;Service&rdquo;). The Service is operated
            by Preship (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;).
          </P>
          <P>
            By creating an account or using the Service, you agree to be bound by
            these Terms. If you do not agree, you may not use the Service. Please
            also read our{" "}
            <a
              href="/privacy"
              className="font-semibold text-[#0E1909] underline decoration-[#DAFF01] decoration-2 underline-offset-2"
            >
              Privacy Policy
            </a>
            , which describes how we handle your information.
          </P>
        </>
      }
      sections={[
        {
          id: "eligibility",
          heading: "Eligibility",
          body: (
            <P>
              You must be at least 13 years old (or the minimum age required to
              consent to data processing in your jurisdiction) to use the Service.
              By using the Service, you represent that you meet these
              requirements and that you have the legal capacity to enter into
              these Terms.
            </P>
          ),
        },
        {
          id: "accounts",
          heading: "Accounts",
          body: (
            <>
              <P>
                You must provide accurate, current information when creating your
                account and keep it up to date. You are responsible for
                safeguarding your password and for all activity that occurs under
                your account.
              </P>
              <P>
                You may not transfer your account to another person without our
                permission. Notify us immediately at {CONTACT} if you believe
                your account has been compromised.
              </P>
            </>
          ),
        },
        {
          id: "acceptable-use",
          heading: "Acceptable use",
          body: (
            <>
              <P>You agree not to:</P>
              <BulletList
                items={[
                  "use the Service for any unlawful purpose or in violation of these Terms;",
                  "harass, threaten, defame, or otherwise harm another person;",
                  "post content that is infringing, fraudulent, misleading, or that you do not have the right to share;",
                  "impersonate another person or misrepresent your affiliation;",
                  "attempt to gain unauthorized access to the Service, its systems, or another user's data;",
                  "interfere with or disrupt the Service, including by introducing malware, scraping at scale, or overloading infrastructure;",
                  "use automated means (bots, scripts) to access the Service except as expressly permitted.",
                ]}
              />
              <P>
                We may suspend or terminate access for any violation, at our sole
                discretion, without notice.
              </P>
            </>
          ),
        },
        {
          id: "founder-invites",
          heading: "Founder invites",
          body: (
            <P>
              The &ldquo;Invite a founder&rdquo; feature lets you send an
              invitation email to another person. You agree to use it
              responsibly: only invite people you genuinely believe would benefit
              from the Service, do not use it to send unsolicited or promotional
              messages, and do not invite email addresses you have collected
              without consent. We are not liable for the consequences of invites
              you choose to send. See our Privacy Policy for how invitee emails
              are handled.
            </P>
          ),
        },
        {
          id: "content-and-ip",
          heading: "Your content & intellectual property",
          body: (
            <>
              <P>
                You retain ownership of all content you submit to the Service
                (&ldquo;Your Content&rdquo;), including posts, comments, project
                details, bounty listings, and IdeaLab audio. By submitting Your
                Content, you grant Preship a worldwide, non-exclusive,
                royalty-free license to host, store, use, display, reproduce, and
                distribute it solely as needed to operate, maintain, and improve
                the Service.
              </P>
              <P>
                You represent that you own or have all necessary rights to Your
                Content and that it does not infringe the rights of any third
                party. You are solely responsible for Your Content.
              </P>
              <P>
                You may remove Your Content at any time. Removal does not
                guarantee complete deletion from our backup systems, and we may
                retain copies as permitted by these Terms and applicable law.
              </P>
            </>
          ),
        },
        {
          id: "synergy-and-idealab",
          heading: "Synergy, IdeaLab & bounties",
          body: (
            <>
              <P>
                Synergy, IdeaLab audio rooms, and bounties facilitate connections
                and collaboration between founders. Any agreement, arrangement,
                or transaction you enter into with another founder through these
                features is solely between you and that founder. Preship is not a
                party to such arrangements and has no responsibility or liability
                for them.
              </P>
              <P>
                IdeaLab sessions may be recorded. By participating, you consent to
                such recording in accordance with any feature-specific notices
                and our Privacy Policy.
              </P>
            </>
          ),
        },
        {
          id: "ip-support",
          heading: "IP-support intake",
          body: (
            <P>
              The IP-support intake form helps connect you with help for
              Trademark, Copyright, or Patent matters. Submitting a request does
              not create an attorney-client relationship, and we make no
              guarantee of outcome. Any guidance we provide is general and not a
              substitute for advice from a qualified attorney.
            </P>
          ),
        },
        {
          id: "third-party-links",
          heading: "Third-party content & links",
          body: (
            <P>
              The Service may contain links or references to third-party websites,
              services, or content that we do not control. We are not responsible
              for and do not endorse such third parties, and you access them at
              your own risk.
            </P>
          ),
        },
        {
          id: "disclaimers",
          heading: "Disclaimers",
          body: (
            <>
              <P>
                THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS
                AVAILABLE&rdquo; WITHOUT WARRANTIES OF ANY KIND, whether express
                or implied, including implied warranties of merchantability,
                fitness for a particular purpose, or non-infringement. We do not
                warrant that the Service will be uninterrupted, error-free, secure,
                or that any result will be accurate or reliable.
              </P>
              <P>
                Any content, advice, or guidance obtained through the Service is
                used at your sole risk.
              </P>
            </>
          ),
        },
        {
          id: "limitation-of-liability",
          heading: "Limitation of liability",
          body: (
            <P>
              To the fullest extent permitted by law, in no event will Preship,
              its officers, employees, or affiliates be liable for any indirect,
              incidental, special, consequential, or punitive damages, or any
              loss of profits, data, or goodwill, arising out of or related to
              your use of (or inability to use) the Service, whether based on
              warranty, contract, tort, or any other legal theory, even if we
              have been advised of the possibility of such damages. Our total
              aggregate liability for any claim is limited to the amount, if any,
              you have paid us to use the Service.
            </P>
          ),
        },
        {
          id: "indemnification",
          heading: "Indemnification",
          body: (
            <P>
              You agree to indemnify and hold harmless Preship and its officers,
              employees, and affiliates from any claims, damages, losses, or
              expenses (including reasonable attorneys&rsquo; fees) arising out of
              Your Content or your violation of these Terms.
            </P>
          ),
        },
        {
          id: "termination",
          heading: "Termination",
          body: (
            <P>
              You may delete your account at any time. We may suspend or terminate
              your access to the Service at any time, with or without cause or
              notice, including for violation of these Terms. Upon termination,
              all licenses granted by you will end, and the provisions of these
              Terms that by their nature should survive will remain in effect.
            </P>
          ),
        },
        {
          id: "governing-law",
          heading: "Governing law",
          body: (
            <P>
              These Terms are governed by the laws of the jurisdiction in which
              Preship is established, without regard to conflict-of-law
              principles. You agree to the exclusive jurisdiction of the courts of
              that jurisdiction for any dispute arising out of or relating to
              these Terms or the Service. (Confirm the governing jurisdiction and
              courts with counsel before finalizing.)
            </P>
          ),
        },
        {
          id: "changes",
          heading: "Changes to these Terms",
          body: (
            <P>
              We may modify these Terms from time to time. If we make material
              changes, we will revise the &ldquo;last updated&rdquo; date and, where
              appropriate, provide notice through the Service. Your continued use
              of the Service after the revised Terms take effect constitutes your
              acceptance of the changes.
            </P>
          ),
        },
      ]}
    />
  );
}
