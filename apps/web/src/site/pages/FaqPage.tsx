import { SiteLink } from "../SiteLink.js";

type Faq = {
  q: string;
  a: string;
  link?: { label: string; href: string };
};

const FAQS: Faq[] = [
  {
    q: "What does the first day actually involve?",
    a: "About 10–15 minutes: read the handoff, deal with what comes up, write the ticket, then write how it went. It’s practice, not an application — there’s no score and nothing goes to an employer.",
  },
  {
    q: "Do I need to be good at games?",
    a: "Not at all. Clicking fast or steering the camera well doesn’t count — there’s no score. What matters is how the work feels to you.",
  },
  {
    q: "What if something doesn’t load, or I get stuck?",
    a: "If the office won’t render, a recovery workstation opens automatically and keeps your work. Keyboard navigation is supported, and Accessibility recovery gets you to the workstation if you get stuck. A full accessibility audit hasn’t happened yet — found a problem?",
    link: {
      label: "Report it on GitHub",
      href: "https://github.com/zaidkan/Career-Expo/issues/new",
    },
  },
  {
    q: "If I write about how I felt, who sees it?",
    a: "Only you — unless you make a sharing link on purpose. That link expires, and you can take it back anytime.",
  },
  {
    q: "What does the AI actually do?",
    a: "It helps phrase what your manager, Morgan, says — after we’ve already decided what Morgan is allowed to know. It can’t make up facts or change what happens.",
  },
  {
    q: "What does “In the workshop” mean?",
    a: "One career is live — Cybersecurity Analyst. Four more are taking shape: you can read what the day is like, but they aren’t playable yet.",
  },
  {
    q: "How do career requests work?",
    a: "Click Request on a career to mark your interest — it stays on that page. Nothing is collected or stored yet. When collection turns on, requests will help choose what we build next, without promising an order.",
  },
  {
    q: "Is there more after this first day?",
    a: "Not yet. This first shift is day one as a junior cybersecurity analyst. We’ll add more careers only if this one actually helps people understand the work — liking it isn’t enough to green-light the next one.",
  },
];

export function FaqPage() {
  return (
    <>
      <section className="page-section page-hero" aria-labelledby="faq-title">
        <p className="eyebrow">The plain version</p>
        <h1 id="faq-title">Quick answers, honestly</h1>
        <p className="lede">Before you start a shift, here’s what people want to know.</p>
      </section>

      <section className="faq-list" aria-label="Questions and answers">
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
                  <a href={link.href} target="_blank" rel="noreferrer">
                    {link.label}
                    <span aria-hidden="true"> ↗</span>
                  </a>
                </>
              ) : null}
            </p>
          </details>
        ))}
      </section>

      <p className="mode-note" style={{marginTop:"1.75rem", maxWidth:"70ch"}}>
        Still wondering? The full version is on{" "}
        <SiteLink
          to="/trust"
          style={{ color: "var(--phosphor)", fontWeight: 600 }}
        >
          Privacy and safety →
        </SiteLink>
      </p>

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
    </>
  );
}
