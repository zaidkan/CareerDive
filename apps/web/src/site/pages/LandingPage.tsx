import { useEffect, useState } from "react";
import { SiteLink } from "../SiteLink.js";

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
            <span style={{ color: "var(--signal-hot)" }}>●</span>
            <strong>Suspicious login — j.patel</strong>
            <em>Investigate</em>
          </div>
          <div className="hero-mock-row">
            <span>○</span>
            <strong>Queue item — review</strong>
            <span>Review</span>
          </div>
          <div className="hero-mock-row">
            <span>○</span>
            <strong>Inbox — handoff</strong>
            <span>Read</span>
          </div>
          <div style={{ display: "flex", gap: "0.45rem", marginTop: "0.2rem" }}>
            <span className="site-chip" style={{ fontSize: "0.62rem" }}>
              Ticket draft — Notes saved
            </span>
            <span className="site-chip site-chip-muted" style={{ fontSize: "0.62rem" }}>
              Morgan · guidance available
            </span>
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
            <p className="eyebrow">Career Expo · a calm way to try work</p>
            <h1 id="home-hero">Try day one as a cybersecurity analyst</h1>
            <p>
              Step into a short, real shift at Verdaly Technologies. Read what actually happened,
              talk to your team, make the call — and see how it plays out. About 10 minutes, no quiz,
              no chatbot. Just you, trying the job.
            </p>
            <div className="hero-ctas">
              <SiteLink
                className="start-shift"
                to="/start"
                style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}
              >
                {hasSeenFilm ? "Continue to Verdaly →" : "Start your first day →"}
              </SiteLink>
              <SiteLink className="button-secondary" to="/how-it-works">
                How the shift works
              </SiteLink>
            </div>
            <ul className="trust-chips" aria-label="What to expect">
              <li className="site-chip">13+ · made for teens, respectful</li>
              <li className="site-chip">About 10 minutes</li>
              <li className="site-chip">Same story, your choices</li>
              <li className="site-chip site-chip-muted">Your notes stay private</li>
            </ul>
            <p className="platform-note">
              Career Expo is still in beta. This is your first workday to explore — more will come after
              we prove it actually helps.
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
              Real work at Verdaly is paper-trace: you notice what happened, mark what matters, and
              write down what you’d stand behind. Your notes and tickets are the craft — not a score.
            </p>
          </div>
        </div>
        <div className="card-grid">
          <article className="info-card">
            <p className="mono-label">01 · Handoff</p>
            <h3>Read the thread</h3>
            <p>You’ll get the real handoff from last night — gaps and all. Open it, take it in.</p>
          </article>
          <article className="info-card">
            <p className="mono-label">02 · Investigate</p>
            <h3>Compare what you see</h3>
            <p>That login doesn’t look right. Check history, devices, the route — then decide.</p>
          </article>
          <article className="info-card">
            <p className="mono-label">03 · Handle</p>
            <h3>Something new comes in</h3>
            <p>New work lands while you’re mid-thought. You choose what to do first.</p>
          </article>
        </div>
      </section>

      <section className="page-section chapter-section" aria-labelledby="systems">
        <div className="chapter-head">
          <ChapterNum n="02" />
          <div>
            <h2 id="systems">Five workplace systems — one shift</h2>
            <p className="lede">
              The shift keeps some surprises — the systems below are the whole, honest toolbox. Same tools
              a junior analyst really uses. No hidden meters, just what’s in front of you.
            </p>
          </div>
        </div>
        <div className="card-grid">
          <article className="info-card">
            <p className="mono-label">ALERTS</p>
            <h3>Alert Dashboard</h3>
            <p>Your queue. Who, when, how — read it before you act.</p>
          </article>
          <article className="info-card">
            <p className="mono-label">EMAIL</p>
            <h3>Inbox</h3>
            <p>The handoff lives here. What you missed, the system remembers.</p>
          </article>
          <article className="info-card">
            <p className="mono-label">TICKETS</p>
            <h3>Ticket Queue</h3>
            <p>Turn what you found into a note you could hand to anyone.</p>
          </article>
          <article className="info-card">
            <p className="mono-label">GUIDES</p>
            <h3>Knowledge Base</h3>
            <p>Quick procedures when you’re unsure. Looking it up is part of the job.</p>
          </article>
          <article className="info-card">
            <p className="mono-label">CHAT</p>
            <h3>Team Chat</h3>
            <p>Morgan’s there if you want sounding board — not answers.</p>
          </article>
        </div>
      </section>

      <section className="page-section chapter-section" aria-labelledby="shift-beats">
        <div className="chapter-head">
          <ChapterNum n="03" />
          <div>
            <h2 id="shift-beats">How the 10 minutes move</h2>
            <p className="lede">Not a timer you race — time moves when you work. Here’s the rhythm:</p>
          </div>
        </div>
        <div className="card-grid">
          <article className="info-card">
            <p className="mono-label">FIRST 2 MIN</p>
            <h3>Say hello</h3>
            <p>Badge in, find your desk, log in. Take a breath.</p>
          </article>
          <article className="info-card">
            <p className="mono-label">NEXT FEW</p>
            <h3>Look closely</h3>
            <p>Pull two records, compare them. Ask Morgan if you want.</p>
          </article>
          <article className="info-card">
            <p className="mono-label">MID-SHIFT</p>
            <h3>New work lands</h3>
            <p>Something pops up while you’re still thinking. Your call what’s first.</p>
          </article>
          <article className="info-card">
            <p className="mono-label">AT THE END</p>
            <h3>Make the call</h3>
            <p>Write it down, send it for review — then see what comes back later.</p>
          </article>
        </div>
      </section>

      <section
        className="page-section chapter-section trust-strip-section"
        aria-labelledby="trust-strip"
      >
        <div className="chapter-head">
          <ChapterNum n="04" />
          <div>
            <h2 id="trust-strip">Honest, private, just for you</h2>
            <p className="lede">
              No scores. No “you should become ___.” Your reflections are yours until you choose to
              share them. The AI just helps Morgan sound human — it never makes the decision for you.{" "}
              <SiteLink to="/trust">How we keep it honest →</SiteLink>
            </p>
          </div>
        </div>
        <div className="trust-strip">
          <span className="site-chip">No stress %</span>
          <span className="site-chip">No fit scores</span>
          <span className="site-chip">Keyboard + screen reader friendly</span>
          <span className="site-chip site-chip-muted">One continuous workday</span>
        </div>
      </section>

      <section className="page-section cta-closer" aria-labelledby="start-closer">
        <h2 id="start-closer">Ready for Verdaly?</h2>
        <p className="lede">
          A short film at the tower doors, then you’re at your desk on Floor 12.
        </p>
        <div className="hero-ctas">
          <SiteLink
            className="start-shift"
            to="/start"
            style={{ textDecoration: "none" }}
          >
            {hasSeenFilm ? "Continue to Verdaly →" : "Start your first day →"}
          </SiteLink>
          <SiteLink className="button-secondary" to="/faq">
            Questions? Start here →
          </SiteLink>
        </div>
      </section>
    </>
  );
}
