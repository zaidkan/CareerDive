import { HOME_FAQ } from "../faqData.js";
import { SiteLink } from "../SiteLink.js";

type Faq = {
  q: string;
  a: string;
  link?: { label: string; href: string };
};

const FAQS: Faq[] = [
  {
    q: "How do I know what career I want?",
    a: "Start by exploring what the work involves, rather than looking for a quiz to choose for you. Try selected tasks, reflect on what interested you and what felt difficult, and compare that with further research or conversations with people in the field. CareerDive offers one short cybersecurity simulation as a starting point; it cannot decide your career or establish your fit.",
  },
  {
    q: "Can I explore a cybersecurity analyst’s day in the life?",
    a: "CareerDive samples selected junior cybersecurity analyst tasks: read a handoff, review alerts, check evidence, document your reasoning and leave a next step. The 10–15-minute simulation is a slice of the work, not a complete day in the life. The debrief shows recorded decisions, supporting evidence and unknowns, not a hiring assessment or credential.",
  },
  ...HOME_FAQ,
  {
    q: "What does the short first shift involve?",
    a: "Read the handoff, investigate selected alerts, document your reasoning, and leave a handoff. Then review a debrief grounded in your recorded actions and evidence, including what remains unknown. This is a simulated slice of the job, not a full workday or a hiring assessment.",
  },
  {
    q: "How does CareerDive compare with an internship?",
    a: "Finding an internship can mean months of applications, meeting entry requirements, and networking—before you know whether you enjoy the work. CareerDive is a free, low-commitment first step to explore that interest. It does not replace an internship’s deeper, real-world experience.",
  },
  {
    q: "Do I need to be good at games?",
    a: "Not at all. Clicking fast or steering the camera well doesn’t count. What matters is how the work feels to you.",
  },
  {
    q: "Can teachers or career counselors use CareerDive?",
    a: "Yes. Teachers and career counselors can use the short simulation as a starting point for career exploration and discussion. Students try the work, then discuss what interested them, what felt difficult, and what they would like to explore next.",
  },
  {
    q: "What if something doesn’t load, or I get stuck?",
    a: "If something doesn't load, CareerDive can retry the shift, check compatibility, offer a fallback recovery path, and let you report the problem directly. Keyboard support and reduced motion are available. On the shift screen, use Retry starting shift when offered, or Report a problem. If the office cannot open, a compatibility check can offer the recovery workstation. If report delivery is unavailable, your draft stays during this tab session; use Copy report details or retry delivery later.",
  },
  {
    q: "If I write about how I felt, who sees it?",
    a: "Submitted reflections are stored with your shift on the server and protected by identity and owner checks. They are not published or sent to employers. Public sharing links are not currently available.",
  },
  {
    q: "Does AI decide what happens in the simulation?",
    a: "No. CareerDive defines the scenario, allowed information, and outcomes. Where AI-assisted dialogue is used, it works inside those strict constraints. It does not get to invent scenario facts or independently change the simulation outcome.",
  },
  {
    q: "What does “Taking shape” mean?",
    a: "These pages and artifacts are previews of our current plans, but they aren't playable yet. Tasks and content can change during development. A public preview is not a production commitment, and requesting a career does not guarantee it will be built next.",
  },
  {
    q: "How do career requests work?",
    a: "Career requests are sent to and stored on the server under your anonymous identity. We save the career you requested and whether the request is active; database records also keep request and update times. Your saved choices load again when you return with the same browser identity. Undoing a request marks it inactive rather than deleting its database record. Requests do not create a public popularity score or guarantee a release order or date. No name, email, or manual signup is required.",
  },
  {
    q: "Is there more after this first shift?",
    a: "Not yet. There is one playable, short first-shift simulation as a junior cybersecurity analyst. Four other careers have concept previews only. More depends on whether this focused experience helps people understand a slice of the work; there is no promised release date.",
  },
];

import { PublicChapter, ChapterSeparator } from "../ArtDirection.js";

export function FaqPage() {
  return (
    <article className="faq-page" style={{ paddingBottom: "var(--space-4xl, 8rem)" }}>
      <PublicChapter surface="base" rhythm="expansive" width="wide" className="faq-hero">
        <p className="ui-type-eyebrow" style={{ color: "var(--text-brand)", marginBottom: "0.5rem" }}>The plain version</p>
        <h1 id="faq-title" className="ui-type-display" style={{ marginBottom: "1.5rem" }}>Quick answers, honestly</h1>
        <p className="ui-type-lede" style={{ maxWidth: "60ch", color: "var(--text-secondary)" }}>One playable career, one ~10–15-minute simulated first shift, and an evidence-based debrief. Here is what that experience can and cannot show.</p>
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
