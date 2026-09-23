const FAQS = [
  {
    q: "Is this a real job or an assessment employers see?",
    a: "No. Career exploration only. No hiring signal, no score sent anywhere, no ranking.",
  },
  {
    q: "How long does the first shift take?",
    a: "The intended route is 10–15 minutes: handoff, login investigation, interruption, ticket, wrap-up.",
  },
  {
    q: "Do I need gaming skill or fast clicking?",
    a: "No. Navigation speed, pointer precision, and camera skill never produce career evidence.",
  },
  {
    q: "Can I play keyboard-only or with a screen reader?",
    a: "Yes. Simple list exposes the same canonical actions and outcomes as Desk and Walk. Full WCAG 2.2 AA audit is still pending.",
  },
  {
    q: "What does the AI actually do?",
    a: "Phrases bounded manager dialogue after the deterministic engine resolves intent. It cannot create facts or change outcomes.",
  },
  {
    q: "Are my reflections shared?",
    a: "No. Owner-only unless you create an explicit expiring sharing grant.",
  },
  {
    q: "Is 3D required?",
    a: "No. Desk only and Simple list complete the same shift with identical action IDs.",
  },
  {
    q: "Is there a second workday yet?",
    a: "No. First Shift covers day one as a Junior Cybersecurity Analyst. More Career Expo workdays wait on the validation gate.",
  },
];

export function FaqPage() {
  return (
    <>
      <section className="page-section" aria-labelledby="faq-title">
        <p className="eyebrow">Scope, access, limits</p>
        <h2 id="faq-title">Frequently asked questions</h2>
        <p className="lede">
          Short answers with product boundaries. Anything here that changes
          before launch gets updated on the Trust page first.
        </p>
      </section>
      {FAQS.map(({ q, a }) => (
        <article key={q} className="faq-item">
          <h3>{q}</h3>
          <p>{a}</p>
        </article>
      ))}
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
