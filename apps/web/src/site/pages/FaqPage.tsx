import { SiteLink } from "../SiteLink.js";

type Faq = {
  q: string;
  a: string;
  link?: { label: string; href: string };
};

const FAQS: Faq[] = [
  {
    q: "What does the first day actually involve?",
    a: "Read the handoff, deal with what comes up, write the ticket, then write how it went. It’s practice, not an application — there’s no score and nothing goes to an employer.",
  },
  {
    q: "Do I need to be good at games?",
    a: "Not at all. Clicking fast or steering the camera well doesn’t count. What matters is how the work feels to you.",
  },
  {
    q: "What if something doesn’t load, or I get stuck?",
    a: "Keyboard support and reduced motion are available. If you get stuck, a fallback recovery path can return you to a safe screen. A tool to report problems directly is currently being built.",
  },
  {
    q: "If I write about how I felt, who sees it?",
    a: "Only you — unless you make a sharing link on purpose. That link expires, and you can take it back anytime.",
  },
  {
    q: "Does AI decide what happens in the simulation?",
    a: "No. Career Expo defines the scenario, allowed information, and outcomes. Where AI-assisted dialogue is used, it works inside those strict constraints. It does not get to invent scenario facts or independently change the simulation outcome.",
  },
  {
    q: "What does “Taking shape” mean?",
    a: "These pages and artifacts are previews of our current plans, but they aren't playable yet. Tasks and content can change during development. A public preview is not a production commitment, and requesting a career does not guarantee it will be built next.",
  },
  {
    q: "How do career requests work?",
    a: "Right now, the request button is a local preview — it remembers your choice on your device but does not send data to our servers. When connected in the future, your requests will help us understand interest. They will not create a public popularity score, guarantee a release order, or guarantee a date. You can request or unrequest anytime, and no name, email, or account is required.",
  },
  {
    q: "Is there more after this first day?",
    a: "Not yet. This first shift is day one as a junior cybersecurity analyst. We’ll add more careers only if this one actually helps people understand the work.",
  },
];

import { PublicChapter, ChapterSeparator } from "../ArtDirection.js";

export function FaqPage() {
  return (
    <article className="faq-page" style={{ paddingBottom: "var(--space-4xl, 8rem)" }}>
      <PublicChapter surface="base" rhythm="expansive" width="wide" className="faq-hero">
        <p className="ui-type-eyebrow" style={{ color: "var(--text-brand)", marginBottom: "0.5rem" }}>The plain version</p>
        <h1 id="faq-title" className="ui-type-display" style={{ marginBottom: "1.5rem" }}>Quick answers, honestly</h1>
        <p className="ui-type-lede" style={{ maxWidth: "60ch", color: "var(--text-secondary)" }}>Before you start a shift, here’s what people want to know.</p>
      </PublicChapter>

      <ChapterSeparator />

      <PublicChapter surface="base" rhythm="standard" width="reading" className="faq-content">
        <div className="faq-list" aria-label="Questions and answers" style={{ marginTop: 0 }}>
          {FAQS.map(({ q, a, link }) => (
            <details key={q} className="faq-item">
              <summary>
                <span className="faq-q">{q}</span>
              </summary>
              <p>
                {a}
                {link ? (
                  <>
                    {" "}
                    <a href={link.href} target="_blank" rel="noreferrer" style={{ color: "var(--action-primary)", fontWeight: 700 }}>
                      {link.label}
                      <span aria-hidden="true"> ↗</span>
                    </a>
                  </>
                ) : null}
              </p>
            </details>
          ))}
        </div>

        <div className="faq-footer" style={{ marginTop: "4rem", paddingTop: "2rem", borderTop: "1px solid var(--ui-rule, var(--border-subtle))" }}>
          <p className="ui-type-body-large">
            Still wondering? The full version is on{" "}
            <SiteLink
              to="/trust"
              style={{ color: "var(--action-primary)", fontWeight: 700, textDecoration: "none" }}
            >
              Privacy and safety →
            </SiteLink>
          </p>
        </div>
      </PublicChapter>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQS.map(({ q, a }) => ({
              "@type": "Question",
              name: q,
              acceptedAnswer: { "@type": "Answer", text: a },
            })),
          }),
        }}
      />
    </article>
  );
}
