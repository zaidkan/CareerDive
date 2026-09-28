import { SiteLink } from "../SiteLink.js";

type Faq = {
  q: string;
  a: string;
  link?: { label: string; href: string };
};

const FAQS: Faq[] = [
  {
    q: "How long does it take?",
    a: "About 10–15 minutes. It's one shift: read the handoff, check a login, handle what pops up, write a quick ticket, wrap up.",
  },
  {
    q: "Do I need to be good at games?",
    a: "Not at all. Clicking fast or steering the camera well doesn't count — there's no score. What matters is how the work feels to you.",
  },
  {
    q: "What if the office doesn't load?",
    a: "A recovery workstation opens automatically and your session and work stay intact.",
  },
  {
    q: "How accessible is it, and how do I report a problem?",
    a: "The workplace supports keyboard navigation. If office navigation doesn't work for you, open Accessibility recovery to continue at the workstation with your progress kept. A full accessibility audit is still to come.",
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
    a: "It helps phrase what your manager, Morgan, says — after we've already decided what Morgan is allowed to know. It can't make up facts or change what happens.",
  },
  {
    q: "What do Workshop careers mean?",
    a: "They're previews: you can read what the day is like, but they aren't playable yet. Only Cybersecurity Analyst has a playable shift right now.",
  },
  {
    q: "Do career requests influence what gets built?",
    a: "Not yet. Requests stay where you click them — nothing is collected or stored. When collection is enabled, they'll help guide what we build next without guaranteeing build order.",
  },
  {
    q: "Is there more after this first day?",
    a: "Not yet. This first shift is day one as a junior cybersecurity analyst. We'll add more careers only if this one actually helps people understand the work — liking it isn't enough to green-light the next one.",
  },
];

export function FaqPage() {
  return (
    <>
      <section className="page-section page-hero" aria-labelledby="faq-title">
        <p className="eyebrow">The plain version</p>
        <h1 id="faq-title">Quick answers, honestly</h1>
        <p className="lede">Before you start a shift, here's what people want to know.</p>
      </section>

      <section aria-label="Questions and answers" style={{marginTop:"1.25rem", display:"grid", gap:"0.85rem"}}>
        {FAQS.map(({ q, a, link }) => (
          <details key={q} className="faq-item" style={{marginTop:0}}>
            <summary style={{listStyle:"none", cursor:"pointer", display:"flex", gap:"0.75rem", alignItems:"flex-start"}}>
              <span style={{flex:"none", marginTop:"0.2rem", width:22, height:22, borderRadius:"50%", border:"1px solid var(--line-bright)", display:"grid", placeItems:"center", fontFamily:"var(--font-mono)", fontSize:"0.7rem", color:"var(--phosphor)"}}>?</span>
              <span style={{flex:1, color:"var(--paper)", fontWeight:650, fontSize:"1.02rem", lineHeight:1.35}}>{q}</span>
              <span aria-hidden="true" className="faq-toggle" style={{color:"var(--mute)", fontWeight:700, width:22, height:22, borderRadius:"50%", border:"1px solid var(--line-bright)", display:"grid", placeItems:"center", lineHeight:1}}>+</span>
            </summary>
            <p style={{margin:"0.65rem 0 0 2.125rem", color:"var(--fog)", lineHeight:1.65, maxWidth:"65ch"}}>
              {a}
              {link ? (
                <>
                  {" "}
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    style={{color:"var(--phosphor)", fontWeight:600}}
                  >
                    {link.label}
                    <span aria-hidden="true"> ↗</span>
                  </a>
                </>
              ) : null}
            </p>
          </details>
        ))}
      </section>

      <p className="mode-note" style={{marginTop:"1.5rem", maxWidth:"70ch"}}>
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
