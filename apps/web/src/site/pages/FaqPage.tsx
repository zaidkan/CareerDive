const FAQS = [
  {
    q: "Is this a real job application?",
    a: "Nope — just exploring. Nothing you do here gets sent to an employer, scored, or ranked.",
  },
  {
    q: "How long does it actually take?",
    a: "Most people finish in about 10–15 minutes. It’s one shift: you read the handoff, check a login, handle something that pops up, write a quick ticket, and wrap up.",
  },
  {
    q: "Do I need to be good at games?",
    a: "Not at all. How quickly you click or move the camera has nothing to do with what we learn about how you like the work.",
  },
  {
    q: "Can I play with just my keyboard or a screen reader?",
    a: "Yes. The Simple list version is the same shift, just presented as a clear list with keyboard and screen-reader support. The walk-around office is just a different view — not a harder level. A full accessibility audit is still to come, but we don’t make the simple version the worse one.",
  },
  {
    q: "So what does the AI actually do?",
    a: "It just helps phrase what your manager, Morgan, says — after we’ve already decided what Morgan is allowed to know. It can’t make up facts or change what happens.",
  },
  {
    q: "If I write about how I felt, who sees it?",
    a: "Only you — unless you make a sharing link on purpose. That link expires, and you can take it back anytime.",
  },
  {
    q: "Do I have to walk around in 3D?",
    a: "No. You can play the whole shift from your desk, or as a simple list. Same buttons, same story.",
  },
  {
    q: "Is there more after this first day?",
    a: "Not yet. This first shift is day one as a junior cybersecurity analyst. We’ll add more careers only if this one actually helps people understand the work — liking it isn’t enough to green-light the next one.",
  },
];

export function FaqPage() {
  return (
    <>
      <section className="page-section" aria-labelledby="faq-title" style={{borderTop:0, marginTop:"1.5rem"}}>
        <p className="eyebrow">The plain version</p>
        <h1 id="faq-title" style={{fontFamily:"var(--font-display)", color:"var(--paper)", letterSpacing:"-0.03em", lineHeight:0.98, fontSize:"clamp(2rem,4.5vw,2.9rem)", margin:"0.35rem 0 0.7rem"}}>Quick answers, honestly</h1>
        <p className="lede" style={{maxWidth:"65ch"}}>
          No long policy — just what people usually ask. If we change anything before launch, we’ll update the privacy page first and say what changed.
        </p>
        <div className="trust-strip" style={{marginTop:"1rem", justifyContent:"flex-start"}}>
          <span className="site-chip">Plain language</span>
          <span className="site-chip site-chip-muted">Tap any question</span>
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
        Still wondering? The straight story is on <a href="/trust" style={{color:"var(--phosphor)", fontWeight:600}}>Privacy and safety →</a> — same calm page, same honest headings.
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
