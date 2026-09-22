import { navigate } from "../routes.js";

export function LandingPage() {
  return (
    <>
      <section className="hero" aria-labelledby="home-hero">
        <div className="hero-media">
          <div className="hero-copy">
            <p className="eyebrow">Career Expo · First Shift beta</p>
            <h2 id="home-hero">Try day one as a cybersecurity analyst</h2>
            <p>
              A bounded 10–15 minute first shift. Read evidence, decide what
              matters, see consequences. No install, keyboard playable. Starts
              with a short preview film before your first day.
            </p>
            <div className="hero-ctas">
              <a
                className="start-shift"
                style={{ textDecoration: "none", display: "inline-block" }}
                href="/start"
                onClick={(event) => {
                  event.preventDefault();
                  navigate("/start");
                }}
              >
                Start your first day
              </a>
              <a
                className="button-secondary"
                href="/how-it-works"
                onClick={(event) => {
                  event.preventDefault();
                  navigate("/how-it-works");
                }}
              >
                How the shift works →
              </a>
            </div>
            <ul className="trust-chips">
              <li className="site-chip">Age 13+</li>
              <li className="site-chip">10–15 minute route</li>
              <li className="site-chip">Deterministic, replayable</li>
              <li className="site-chip site-chip-muted">
                Reflections private by default
              </li>
            </ul>
            <p className="platform-note">
              First Shift is the first playable workday from Career Expo —
              day one as a cybersecurity analyst. More workdays later.
            </p>
          </div>
        </div>
      </section>

      <section className="page-section" aria-labelledby="shift-beats">
        <h2 id="shift-beats">What you will actually do</h2>
        <p className="lede">
          Real shift work: a live queue, incomplete information, decisions
          that stick. The shift keeps some surprises — the systems below are
          the full toolbox. Your first placement: Verdaly Technologies,
          Floor 12.
        </p>
        <div className="card-grid">
          <article className="info-card">
            <h3>Triage a live queue</h3>
            <p>New work arrives while you are mid-investigation. Prioritize.</p>
          </article>
          <article className="info-card">
            <h3>Piece together incomplete info</h3>
            <p>Records disagree. Open sources before acting.</p>
          </article>
          <article className="info-card">
            <h3>Decide and live with it</h3>
            <p>Escalate or dismiss. Earlier calls resurface later.</p>
          </article>
        </div>
      </section>

      <section className="page-section" aria-labelledby="systems">
        <h2 id="systems">Five workplace systems</h2>
        <p className="lede">
          Alerts, Email, Tickets, Knowledge Base, Team Chat. One shift, full
          toolbox. Your first placement: Verdaly Technologies, Floor 12.
        </p>
        <div className="card-grid">
          <article className="info-card">
            <h3>Alert Dashboard</h3>
            <p>Queue, record timeline, open before deciding.</p>
          </article>
          <article className="info-card">
            <h3>Email</h3>
            <p>Handoff thread, explicit open, read state preserved.</p>
          </article>
          <article className="info-card">
            <h3>Ticket Queue</h3>
            <p>Evidence, uncertainty, next step with live draft.</p>
          </article>
          <article className="info-card">
            <h3>Knowledge Base</h3>
            <p>Searchable procedures. Query recorded canonically.</p>
          </article>
          <article className="info-card">
            <h3>Team Chat</h3>
            <p>Morgan guidance bounded by world state. Ask, not offload.</p>
          </article>
        </div>
      </section>

      <section className="page-section" aria-labelledby="shift-preview">
        <h2 id="shift-preview">How the 10 minutes move</h2>
        <p className="lede">
          No quiz — a short workday with time that actually passes. What the
          clock does to you:
        </p>
        <div className="card-grid">
          <article className="info-card">
            <h3>0–2 min · Handoff</h3>
            <p>Read the thread. Badge in, find your desk.</p>
          </article>
          <article className="info-card">
            <h3>2–8 min · Investigate</h3>
            <p>Pull records. Compare. Morgan helps only if you ask.</p>
          </article>
          <article className="info-card">
            <h3>Mid-shift · Interruption</h3>
            <p>New work lands while you are mid-thought. Prioritize.</p>
          </article>
          <article className="info-card">
            <h3>End · Decide</h3>
            <p>Document, escalate or dismiss, see it resurface.</p>
          </article>
        </div>
      </section>
    </>
  );
}
