import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "../logo";
import { Footer } from "../footer";

/**
 * Shared chrome for the public legal pages (/privacy, /terms).
 *
 * Server component — no client state. Light surface (matches the public
 * landing page), ink header strip + lime accent, mono "legal" eyebrow, a
 * prominent DRAFT notice, a last-updated date, and a contact line. Renders the
 * supplied sections as a readable max-width prose column, then the global
 * footer.
 *
 * The DRAFT banner is intentional: the legal copy is AI-drafted scaffolding,
 * not legal advice, and must be reviewed by counsel before launch.
 */

export type LegalSection = {
  id: string;
  heading: string;
  /** Paragraph(s) of body copy. Strings render as <p>; arrays render as a list. */
  body: ReactNode;
};

export function LegalPage({
  eyebrow,
  title,
  lastUpdated,
  intro,
  sections,
  contactEmail,
}: {
  eyebrow: string;
  title: string;
  lastUpdated: string;
  intro: ReactNode;
  sections: LegalSection[];
  contactEmail: string;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[#f8f9f3]">
      {/* ink header strip */}
      <header className="border-b border-[#0E1909]/10 bg-[#0E1909]">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4 lg:px-8">
          <Link href="/" aria-label="Preship home">
            <Logo variant="lime" />
          </Link>
          <span className="font-mono text-[11px] uppercase tracking-widest text-[#DAFF01]/60">
            {eyebrow}
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10 lg:px-8 lg:py-14">
        {/* title block */}
        <div className="border-b border-[#0E1909]/10 pb-6">
          <p className="font-mono text-[11px] uppercase tracking-widest text-[#0E1909]/45">
            last updated · {lastUpdated}
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold leading-tight text-[#0E1909] sm:text-4xl">
            {title}
          </h1>
        </div>

        {/* DRAFT notice */}
        <div className="mt-6 flex items-start gap-3 rounded-lg border border-[#DAFF01]/60 bg-[#DAFF01]/15 p-4">
          <span className="mt-0.5 font-mono text-[11px] font-bold uppercase tracking-widest text-[#0E1909]">
            draft
          </span>
          <p className="font-display text-sm leading-relaxed text-[#0E1909]/80">
            This is a draft generated for review. It is not legal advice and is
            not a substitute for counsel. Have a qualified attorney review and
            finalize it before relying on it for your live product.
          </p>
        </div>

        {/* intro */}
        {intro && (
          <div className="mt-8 space-y-4 text-[15px] leading-relaxed text-[#0E1909]/80">
            {intro}
          </div>
        )}

        {/* sections */}
        <div className="mt-10 space-y-10">
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} className="scroll-mt-6">
              <h2 className="flex items-baseline gap-3 font-display text-lg font-semibold text-[#0E1909]">
                <span className="font-mono text-xs font-semibold text-[#DAFF01]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {s.heading}
              </h2>
              <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-[#0E1909]/75">
                {s.body}
              </div>
            </section>
          ))}
        </div>

        {/* contact */}
        <div className="mt-12 rounded-lg border border-[#0E1909]/10 bg-white p-5">
          <p className="font-mono text-[11px] uppercase tracking-widest text-[#0E1909]/45">
            questions about this policy
          </p>
          <p className="mt-1.5 text-[15px] leading-relaxed text-[#0E1909]/80">
            Email us at{" "}
            <a
              href={`mailto:${contactEmail}`}
              className="font-semibold text-[#0E1909] underline decoration-[#DAFF01] decoration-2 underline-offset-2 hover:text-[#0E1909]/70"
            >
              {contactEmail}
            </a>
            .
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}

/** Helper to render a string-array body as a bulleted list. */
export function BulletList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="space-y-2">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2.5">
          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#DAFF01]" />
          <span className="flex-1">{it}</span>
        </li>
      ))}
    </ul>
  );
}

/** Helper to render a string-array body as an ordered list. */
export function OrderedList({ items }: { items: ReactNode[] }) {
  return (
    <ol className="space-y-2">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2.5">
          <span className="font-mono text-xs font-semibold text-[#0E1909]/45">
            {i + 1}.
          </span>
          <span className="flex-1">{it}</span>
        </li>
      ))}
    </ol>
  );
}

/** Helper: a plain paragraph. Lets page files read as data, not JSX noise. */
export function P({ children }: { children: ReactNode }) {
  return <p>{children}</p>;
}
