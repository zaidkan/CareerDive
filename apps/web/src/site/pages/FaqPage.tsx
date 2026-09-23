const FAQS = [
  {
    q: "Is this a real job or an assessment employers see?",
    a: "No. Career exploration only. No hiring signal, no score sent anywhere, no ranking. Your reflections are owner-only unless you make an explicit expiring sharing grant.",
  },
  {
    q: "How long does the first shift take?",
    a: "The intended route is 10–15 minutes: handoff, suspicious-login investigation, routine scanner interruption, ticket documentation, and wrap-up. You can take longer — there is no countdown bar.",
  },
  {
    q: "Do I need gaming skill or fast clicking?",
    a: "No. Navigation speed, pointer precision, and camera skill never produce career evidence (G6). Walk, Desk, and Simple list expose the same canonical actions.",
  },
  {
    q: "Can I play keyboard-only or with a screen reader?",
    a: "Yes. Simple list is the same shift with keyboard navigation, screen-reader descriptions, and reduced motion. Walk is optional framing for a desk career. Full WCAG 2.2 AA audit is still pending — we don’t regress.",
  },
  {
    q: "What does the AI actually do?",
    a: "Phrases bounded manager dialogue after the deterministic engine in @sim/core resolves intent. It cannot create facts, procedures, deadlines, evidence, or outcomes. Restricted facts are redacted before the prompt and checked after.",
  },
  {
    q: "Are my reflections shared?",
    a: "No. Owner-only by default. Sharing is an explicit grant row that you can revoke. Row-level security is the boundary; app code is convenience.",
  },
  {
    q: "Is 3D required?",
    a: "No. Desk only and Simple list complete the same shift with identical action IDs. 3D is a view adapter — same state, same consequences.",
  },
  {
    q: "Is there a second workday yet?",
    a: "No. First Shift covers day one as a Junior Cybersecurity Analyst. Two deliberately different careers wait on the validation gate — enjoyment alone never passes it.",
  },
];

export function FaqPage() {
  return (
    <>
      <section className="page-section" aria-labelledby="faq-title" style={{borderTop:0, marginTop:"1.5rem"}}>
        <p className="eyebrow">Scope, access, limits · Updated for the warm paper system</p>
        <h1 id="faq-title" style={{fontFamily:"var(--font-display)", color:"var(--paper)", letterSpacing:"-0.03em", lineHeight:0.98, fontSize:"clamp(2rem,4.5vw,2.9rem)", margin:"0.35rem 0 0.7rem"}}>Frequently asked questions</h1>
        <p className="lede" style={{maxWidth:"65ch"}}>
          Short answers with product boundaries. Anything here that changes before launch gets updated on the
          Trust page first. No scores, no lorem, no fake testimonials — just what the system does and doesn’t do.
        </p>
        <div className="trust-strip" style={{marginTop:"1rem", justifyContent:"flex-start"}}>
          <span className="site-chip">Plain language</span>
          <span className="site-chip site-chip-muted">Tap a question to open</span>
        </div>
      </section>

      <section aria-label="Questions and answers" style={{marginTop:"1.25rem", display:"grid", gap:"0.85rem"}}>
        {FAQS.map(({ q, a }) => (
          <details key={q} className="faq-item" style={{marginTop:0}}>
            <summary style={{listStyle:"none", cursor:"pointer", display:"flex", gap:"0.75rem", alignItems:"flex-start"}}>
              <span style={{flex:"none", marginTop:"0.2rem", width:22, height:22, borderRadius:"50%", border:"1px solid var(--line-bright)", display:"grid", placeItems:"center", fontFamily:"var(--font-mono)", fontSize:"0.7rem", color:"var(--phosphor)"}}>?</span>
              <span style={{flex:1, color:"var(--paper)", fontWeight:650, fontSize:"1.02rem", lineHeight:1.35}}>{q}</span>
              <span aria-hidden="true" style={{color:"var(--mute)", fontWeight:700}}>+</span>
            </summary>
            <p style={{margin:"0.7rem 0 0 2.35rem", color:"var(--fog)", lineHeight:1.65, maxWidth:"65ch"}}>{a}</p>
          </details>
        ))}
      </section>

      <p className="mode-note" style={{marginTop:"1.5rem", maxWidth:"70ch"}}>
        Still curious? The honest engineering summary lives at <a href="/trust" style={{color:"var(--phosphor)", fontWeight:600}}>Privacy and safety →</a> — same warm paper, same mono chapter numbers, same 65ch measure.
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
