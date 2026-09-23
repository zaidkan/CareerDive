import { useEffect, useState } from "react";
import { navigate } from "../routes.js";

const GATE_KEY = "first-shift-start-gate";

function useHasSeenFilm(): boolean {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    try {
      const v = window.sessionStorage.getItem(GATE_KEY);
      if (v === "briefing" || v === "sim") setSeen(true);
    } catch {
      // storage unavailable
    }
  }, []);
  return seen;
}

function MockFrame() {
  return (
    <div className="hero-mock" aria-hidden="true">
      <div className="hero-mock-frame">
        <div className="hero-mock-bar">
          <i /><i /><i /><span>Verdaly SOC · Ops Console</span>
        </div>
        <div className="hero-mock-body">
          <div className="hero-mock-row" data-priority="high">
            <span style={{color:"var(--signal-hot)"}}>●</span>
            <strong>Suspicious login — j.patel</strong><em>Investigate</em>
          </div>
          <div className="hero-mock-row"><span>○</span><strong>Queue item — review</strong><span>Review</span></div>
          <div className="hero-mock-row"><span>○</span><strong>Inbox — handoff</strong><span>Read</span></div>
          <div style={{display:"flex", gap:"0.45rem", marginTop:"0.2rem"}}>
            <span className="site-chip" style={{fontSize:"0.62rem"}}>Ticket draft — Notes saved</span>
            <span className="site-chip site-chip-muted" style={{fontSize:"0.62rem"}}>Morgan · guidance available</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChapterNum({ n }: { n: string }) {
  return <span className="chapter-num">{n}</span>;
}

export function LandingPage() {
  const hasSeenFilm = useHasSeenFilm();
  return (
    <>
      <section className="hero" aria-labelledby="home-hero">
        <div className="hero-media">
          <div className="hero-copy">
            <p className="eyebrow">Career Expo — First Shift · beta · 13+</p>
            <h1 id="home-hero">Try day one as a cybersecurity analyst</h1>
            <p>
              A bounded 10–15 minute first shift at Verdaly Technologies. Read evidence, compare
              records, decide what matters, see consequences. Not a quiz. Not a chatbot.
            </p>
            <div className="hero-ctas">
              <a
                className="start-shift"
                style={{ textDecoration: "none", display: "inline-flex", alignItems:"center" }}
                href="/start"
                onClick={(event) => {
                  event.preventDefault();
                  navigate("/start");
                }}
              >
                {hasSeenFilm ? "Continue to Verdaly →" : "Start your first day →"}
              </a>
              <a
                className="button-secondary"
                href="/how-it-works"
                onClick={(event) => {
                  event.preventDefault();
                  navigate("/how-it-works");
                }}
              >
                How the shift works
              </a>
            </div>
            <ul className="trust-chips" aria-label="Trust signals">
              <li className="site-chip">13+ · respectful, adult-craft</li>
              <li className="site-chip">10–15 min · single shift</li>
              <li className="site-chip">Deterministic · replayable</li>
              <li className="site-chip site-chip-muted">Reflections private by default</li>
            </ul>
            <p className="platform-note">
              First Shift is the first playable workday from Career Expo — day one as a
              cybersecurity analyst. More workdays later, after the validation gate.
            </p>
          </div>
        </div>
        <MockFrame />
      </section>

      <section className="page-section chapter-section" aria-labelledby="sketch">
        <div className="chapter-head">
          <ChapterNum n="01" />
          <div>
            <h2 id="sketch">Sketch → mark → document</h2>
            <p className="lede">
              Verdaly runs on paper-trace: you sketch what you saw, mark what matters, document
              what you will stand behind. Notes, tickets, and evidence are the craft — not bars or scores.
            </p>
          </div>
        </div>
        <div className="card-grid">
          <article className="info-card">
            <p className="mono-label">01 · Handoff</p>
            <h3>Read the thread</h3>
            <p>Real shift handoff with gaps. Explicit open is required; read state is preserved.</p>
          </article>
          <article className="info-card">
            <p className="mono-label">02 · Investigate</p>
            <h3>Compare records</h3>
            <p>Flagged login vs account history, device inventory, VPN routes. Open before deciding.</p>
          </article>
          <article className="info-card">
            <p className="mono-label">03 · Handle</p>
            <h3>Live interruption</h3>
            <p>New work lands mid-thought. Prioritize, not scramble.</p>
          </article>
        </div>
      </section>

      <section className="page-section chapter-section" aria-labelledby="systems">
        <div className="chapter-head">
          <ChapterNum n="02" />
          <div>
            <h2 id="systems">Five workplace systems — one shift</h2>
            <p className="lede">
              The shift keeps some surprises — the systems below are the full toolbox. Exactly as a junior analyst would meet it. No hidden meters, no fake precision.
            </p>
          </div>
        </div>
        <div className="card-grid">
          <article className="info-card">
            <p className="mono-label">ALERTS</p>
            <h3>Alert Dashboard</h3>
            <p>Queue, timeline, daylight lookup. Urgency is in the content, not a number.</p>
          </article>
          <article className="info-card">
            <p className="mono-label">EMAIL</p>
            <h3>Inbox</h3>
            <p>Handoff thread. You acknowledge it; consequences remember if you skimmed.</p>
          </article>
          <article className="info-card">
            <p className="mono-label">TICKETS</p>
            <h3>Ticket Queue</h3>
            <p>Evidence, uncertainty, next step — drafted live, saved canonically.</p>
          </article>
          <article className="info-card">
            <p className="mono-label">GUIDES</p>
            <h3>Knowledge Base</h3>
            <p>Searchable procedures. Query is recorded; looking is not cheating.</p>
          </article>
          <article className="info-card">
            <p className="mono-label">CHAT</p>
            <h3>Team Chat</h3>
            <p>Morgan helps only if you ask, bounded by world state. Guidance, not decisions.</p>
          </article>
        </div>
      </section>

      <section className="page-section chapter-section" aria-labelledby="shift-beats">
        <div className="chapter-head">
          <ChapterNum n="03" />
          <div>
            <h2 id="shift-beats">How the 10 minutes move</h2>
            <p className="lede">Time passes through work, not a countdown bar. What the clock does to you:</p>
          </div>
        </div>
        <div className="card-grid">
          <article className="info-card"><p className="mono-label">00–02 MIN</p><h3>Handoff</h3><p>Badge in, find your desk, login. Read before you act.</p></article>
          <article className="info-card"><p className="mono-label">02–08 MIN</p><h3>Investigate</h3><p>Pull two records, compare, write a note. Morgan is there if you ask.</p></article>
          <article className="info-card"><p className="mono-label">MID-SHIFT</p><h3>Interruption</h3><p>New work lands while you are mid-thought. You choose the order.</p></article>
          <article className="info-card"><p className="mono-label">END</p><h3>Decide</h3><p>Document, escalate or dismiss. Earlier calls resurface later.</p></article>
        </div>
      </section>

      <section className="page-section chapter-section trust-strip-section" aria-labelledby="trust-strip">
        <div className="chapter-head">
          <ChapterNum n="04" />
          <div>
            <h2 id="trust-strip">Honest, private, bounded</h2>
            <p className="lede">No scores. No rankings. No “you should become”. Reflections are owner-only unless you explicitly share them. AI only phrases dialogue the engine already allowed. <a href="/trust">Read the trust summary →</a></p>
          </div>
        </div>
        <div className="trust-strip">
          <span className="site-chip">No stress %</span>
          <span className="site-chip">No fit scores</span>
          <span className="site-chip">Keyboard + screen reader</span>
          <span className="site-chip site-chip-muted">Deterministic · 3 modes equal</span>
        </div>
      </section>

      <section className="page-section cta-closer" aria-labelledby="start-closer">
        <h2 id="start-closer">Ready for Verdaly?</h2>
        <p className="lede">Short preview film (freezes at the tower doors), then your desk in Security Operations on Floor 12.</p>
        <div className="hero-ctas">
          <a className="start-shift" href="/start" onClick={(e)=>{e.preventDefault(); navigate("/start");}}>
            {hasSeenFilm ? "Continue to Verdaly →" : "Start your first day →"}
          </a>
          <a className="button-secondary" href="/faq" onClick={(e)=>{e.preventDefault(); navigate("/faq");}}>How we keep it fair →</a>
        </div>
      </section>
    </>
  );
}
