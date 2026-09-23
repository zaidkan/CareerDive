export function HowItWorksPage() {
  return (
    <>
      <section className="page-section" aria-labelledby="how-title" style={{borderTop:0, marginTop:"1.5rem"}}>
        <p className="eyebrow">Method, not marketing · First Shift beta</p>
        <h1 id="how-title" style={{fontFamily:"var(--font-display)", color:"var(--paper)", letterSpacing:"-0.03em", lineHeight:0.98, fontSize:"clamp(2rem,4.5vw,2.9rem)", margin:"0.35rem 0 0.7rem"}}>How the Verdaly shift works</h1>
        <p className="lede">
          One bounded shift, five systems, real consequences. Below is the honest sequence — what you touch,
          what the engine remembers, and where we deliberately keep the design calm and readable.
        </p>
        <div className="trust-strip" style={{marginTop:"1.15rem"}}>
          <span className="site-chip">13+ · teen-respectful</span>
          <span className="site-chip">10–15 min · no timer required</span>
          <span className="site-chip">3 modes · same actions</span>
          <span className="site-chip site-chip-muted">Desk-OS · Operations · Debrief</span>
        </div>
      </section>

      <section className="page-section chapter-section" aria-labelledby="beat-01">
        <div className="chapter-head">
          <span className="chapter-num">01</span>
          <div>
            <h2 id="beat-01">Briefing — sketch what you were told</h2>
            <p className="lede">Badge, floor 12, desk login. The handoff is incomplete on purpose — you must open it to acknowledge, and read state is preserved.</p>
          </div>
        </div>
        <div className="showcase-grid">
          <article className="showcase-card">
            <div style={{height:156, display:"grid", placeItems:"center", background:"var(--desk)", borderBottom:"1px solid var(--line)", fontFamily:"var(--font-mono)", color:"var(--mute)", fontSize:"0.78rem"}}>Handoff thread · explicit open</div>
            <div><h3>Briefing beats</h3><p>Checklist, not quiz. The film freezes at the doors; your note starts blank.</p></div>
          </article>
          <article className="showcase-card">
            <div style={{height:156, display:"grid", placeItems:"center", background:"var(--ink-lift)", borderBottom:"1px solid var(--line)", fontFamily:"var(--font-mono)", color:"var(--mute)", fontSize:"0.78rem"}}>Lock screen → launcher → Ops Console tabs</div>
            <div><h3>Workstation</h3><p>Trace-paper desktop, calm OS chrome. Same brand as marketing, not a different game.</p></div>
          </article>
        </div>
      </section>

      <section className="page-section chapter-section" aria-labelledby="beat-02">
        <div className="chapter-head">
          <span className="chapter-num">02</span>
          <div>
            <h2 id="beat-02">Investigate — mark what doesn’t line up</h2>
            <p className="lede">Suspicious login A-1042. You compare the flagged session (203.0.113.44 · unknown-laptop-17 · no VPN) against account history, device inventory, and VPN route catalogue. Looking is not cheating — query is recorded.</p>
          </div>
        </div>
        <div className="showcase-grid">
          <article className="showcase-card">
            <img src="/verdaly-tower-doors.svg" alt="Alert detail surface — timeline and related records" loading="lazy" />
            <div><h3>Alert detail</h3><p>Timeline, two related records, open-before-decide gate. No numeric meter.</p></div>
          </article>
          <article className="showcase-card">
            <img src="/verdaly-tower-doors.svg" alt="Ticket notes — evidence, uncertainty, next step" loading="lazy" />
            <div><h3>Ticket notes</h3><p>Your words: what you verified, what remains uncertain, what you’ll ask Morgan.</p></div>
          </article>
        </div>
        <div className="info-card" style={{marginTop:"1rem"}}>
          <p className="mono-label">CRAFT</p>
          <p style={{margin:0}}>Illoca’s “sketch → mark → document” maps directly to First Shift: sketch your observation, mark the evidence, document a ticket that can be revisited.</p>
        </div>
      </section>

      <section className="page-section chapter-section" aria-labelledby="beat-03">
        <div className="chapter-head">
          <span className="chapter-num">03</span>
          <div>
            <h2 id="beat-03">Interruption — keep context, not speed</h2>
            <p className="lede">At simulated minute 25, routine scanner RUN-FIN-031 arrives while you are mid-thought. You may handle, snooze once, or continue. What matters is ordering and whether you revisit — not how fast you clicked (never compared across pacing modes).</p>
          </div>
        </div>
        <div className="card-grid">
          <article className="info-card"><p className="mono-label">NOTIFICATION</p><h3>Handle</h3><p>Switch focus, preserve A-1042 evidence facts, resume.</p></article>
          <article className="info-card"><p className="mono-label">CHOICE</p><h3>Snooze</h3><p>Once. The work stays unread, not gone.</p></article>
          <article className="info-card"><p className="mono-label">CONTINUE</p><h3>Stay</h3><p>Finish your note — but the queue still waits.</p></article>
        </div>
      </section>

      <section className="page-section chapter-section" aria-labelledby="beat-04">
        <div className="chapter-head">
          <span className="chapter-num">04</span>
          <div>
            <h2 id="beat-04">Document & decide — escalate or dismiss, both stick</h2>
            <p className="lede">Ticket notes are canonical and survive replay. Escalate with evidence for senior review, or dismiss the routine alert — earlier dismissal choices can create delayed consequences while later work is underway.</p>
          </div>
        </div>
        <div className="card-grid">
          <article className="info-card"><p className="mono-label">WRITE</p><h3>Ticket draft</h3><p>Template: Evidence · Uncertainty · Next step. Live preview, local scratch stays local.</p></article>
          <article className="info-card"><p className="mono-label">TALK</p><h3>Morgan</h3><p>Bounded guidance, same world state. Limited per event, never decides for you.</p></article>
          <article className="info-card"><p className="mono-label">CLOSE</p><h3>Wrap-up</h3><p>Complete shift → 8-section qualitative debrief. No score, only “what happened” and confidence + limitations.</p></article>
        </div>
      </section>

      <section className="page-section chapter-section" aria-labelledby="beat-05">
        <div className="chapter-head">
          <span className="chapter-num">05</span>
          <div>
            <h2 id="beat-05">Energy & presence — intentional, not gamified</h2>
            <p className="lede">Breaks are finite and authored: fridge bars (three bites each), coffee start-finish-pour-drink, Jules check-ins. Energy changes only through canonical work and these resources. Idle never drains. Movement never creates career evidence — Walk / Desk / Simple list are equal by design (G6).</p>
          </div>
        </div>
        <div className="card-grid">
          <article className="info-card"><p className="mono-label">WALK</p><h3>Office</h3><p>Low-poly, walk-and-approach. Light framing for a desk career; stations open the same work surface.</p></article>
          <article className="info-card"><p className="mono-label">DESK</p><h3>Focus</h3><p>Trace-paper OS: lock screen, launcher, Ops Console tabs — one product, not a reskin.</p></article>
          <article className="info-card"><p className="mono-label">LIST</p><h3>Simple</h3><p>Full keyboard, screen-reader descriptions, same actions. Not the ugly fallback.</p></article>
        </div>
      </section>

      <section className="page-section" aria-labelledby="validation">
        <h2 id="validation">How usefulness gets judged</h2>
        <p className="lede">
          Career understanding versus strong static material, decision usefulness, practitioner realism review, debrief reliability,
          accessible-mode parity, gaming-skill confounds, authoring cost, and session economics. Enjoyment alone never passes the gate. Implementation is public:{" "}
          <a href="https://github.com/zaidkan/Career-Expo">github.com/zaidkan/Career-Expo</a>, shift content in <code>content/packs/cybersecurity-analyst/pack.yaml</code>.
        </p>
        <div className="hero-ctas" style={{marginTop:"1rem"}}>
          <a className="start-shift" href="/start" style={{textDecoration:"none"}}>Start your first day →</a>
          <a className="button-secondary" href="/trust">Read trust →</a>
        </div>
      </section>
    </>
  );
}
