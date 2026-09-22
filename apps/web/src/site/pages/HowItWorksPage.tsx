export function HowItWorksPage() {
  return (
    <>
      <section className="page-section" aria-labelledby="how-title">
        <p className="eyebrow">Method, not marketing · First Shift beta</p>
        <h2 id="how-title">How the Verdaly shift works</h2>
        <p className="lede">
          Briefing, floor, desk login, handoff read and acknowledge, alert
          investigation, scanner interruption, ticket documentation, escalation
          or dismissal, wrap-up and debrief.
        </p>
        <div className="card-grid">
          <article className="info-card">
            <h3>1 · Briefing</h3>
            <p>Badge, floor, desk. Single 10–15 minute shift.</p>
          </article>
          <article className="info-card">
            <h3>2 · Investigate</h3>
            <p>Open records before acting. Compare flagged vs known-normal.</p>
          </article>
          <article className="info-card">
            <h3>3 · Handle interruption</h3>
            <p>Routine scanner at minute 25. Handle, snooze once, continue.</p>
          </article>
          <article className="info-card">
            <h3>4 · Document</h3>
            <p>Ticket notes are canonical. Scratch notes stay local.</p>
          </article>
          <article className="info-card">
            <h3>5 · Decide</h3>
            <p>Escalate for senior review or dismiss with consequences.</p>
          </article>
        </div>
      </section>

      <section className="page-section" aria-labelledby="shift-preview-how">
        <h2 id="shift-preview-how">Interface preview</h2>
        <p className="lede">
          Real surfaces, placeholder stills until screen recordings land.
        </p>
        <div className="showcase-grid">
          <article className="showcase-card">
            <img
              src="/verdaly-tower-doors.svg"
              alt="Alert detail surface preview"
              loading="lazy"
            />
            <div>
              <h3>Alert detail</h3>
              <p>Timeline, related records, open-before-decide.</p>
            </div>
          </article>
          <article className="showcase-card">
            <img
              src="/verdaly-tower-doors.svg"
              alt="Ticket queue surface preview"
              loading="lazy"
            />
            <div>
              <h3>Ticket queue</h3>
              <p>Evidence, uncertainty, next step.</p>
            </div>
          </article>
        </div>
      </section>

      <section className="page-section" aria-labelledby="morgan">
        <h2 id="morgan">Morgan, your manager</h2>
        <p className="lede">
          Security Operations Manager with bounded knowledge and availability
          from world state. Procedural hints, never decisions. Consultation is
          limited per event and recorded as a consequence.
        </p>
      </section>

      <section className="page-section" aria-labelledby="energy">
        <h2 id="energy">Breaks and energy</h2>
        <p className="lede">
          Finite fridge bars with three bites each, coffee start-finish-pour-
          drink stages, Jules check-ins. Energy changes only through canonical
          work and these resources. Idle never drains. Movement never creates
          career evidence.
        </p>
      </section>

      <section className="page-section" aria-labelledby="validation">
        <h2 id="validation">How usefulness gets judged</h2>
        <p className="lede">
          Career understanding versus strong static material, decision
          usefulness, practitioner realism review, debrief reliability,
          accessible-mode parity, gaming-skill confounds, authoring cost, and
          session economics. Enjoyment alone never passes the gate. Implementation
          is public:{" "}
          <a href="https://github.com/zaidkan/Career-Expo">
            github.com/zaidkan/Career-Expo
          </a>
          , shift content in{" "}
          <code>content/packs/cybersecurity-analyst/pack.yaml</code>.
        </p>
      </section>
    </>
  );
}
