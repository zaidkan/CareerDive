import { useEffect, useState } from "react";
import { CareerExplorer } from "../careers/CareerExplorer.js";
import { SiteLink } from "../SiteLink.js";

const GATE_KEY = "first-shift-start-gate";

function useHasSeenFilm(): boolean {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    try {
      const value = window.sessionStorage.getItem(GATE_KEY);
      setSeen(value === "briefing" || value === "sim");
    } catch {
      // Session storage may be unavailable.
    }
  }, []);
  return seen;
}

const day = [
  "Read the handoff",
  "Choose what needs attention first",
  "Investigate A-1042",
  "Handle scanner interruption A-1180",
  "Give status and leave a usable handoff",
];

function WorkArtifact() {
  return (
    <div
      className="v2-artifact v2-media-frame"
      data-media-slot="evidence"
      aria-label="Illustrative A-1042 alert and evidence comparison from the Cybersecurity Analyst first day"
    >
      <div className="v2-artifact-top">
        <span>Verdaly Technologies · Alerts</span>
        <span>Static product preview</span>
      </div>
      <div className="v2-artifact-body">
        <div className="v2-artifact-title">
          <span className="v2-artifact-mark" aria-hidden="true" />
          <div>
            <small>Open investigation</small>
            <strong>Alert A-1042</strong>
          </div>
          <span className="v2-artifact-state">Needs review</span>
        </div>
        <p className="v2-artifact-signal">Sign-in from an unfamiliar device</p>
        <div className="v2-evidence-grid" aria-label="Evidence to compare">
          <div>
            <strong>Identity</strong>
            <span>Who signed in?</span>
          </div>
          <div>
            <strong>Session</strong>
            <span>What does the sign-in record show?</span>
          </div>
          <div>
            <strong>Device</strong>
            <span>Does inventory recognize it?</span>
          </div>
          <div>
            <strong>VPN</strong>
            <span>Does access history line up?</span>
          </div>
        </div>
      </div>
      <div className="v2-artifact-bottom">
        Compare the records <span aria-hidden="true">→</span> Leave a traceable
        case note
      </div>
    </div>
  );
}

function DeskPreview() {
  return (
    <div
      className="v2-desk v2-media-frame"
      data-media-slot="desk"
      aria-label="Illustrative preview of the existing Desk OS tools"
    >
      <div className="v2-desk-bar">
        <span>Desk OS</span>
        <span>Verdaly · first shift</span>
      </div>
      <div className="v2-desk-body">
        <div className="v2-desk-sidebar">
          <strong>Dashboard</strong>
          <span>Alerts</span>
          <span>Email</span>
          <span>Tickets</span>
          <span>Guides</span>
          <span>Team</span>
          <span>Files · Notes</span>
        </div>
        <div className="v2-desk-window">
          <div className="v2-desk-window-head">
            Alerts · A-1042 <span>Review queue</span>
          </div>
          <div className="v2-desk-alert">
            <span className="v2-desk-alert-icon" aria-hidden="true" />
            <div>
              <strong>Sign-in from an unfamiliar device</strong>
              <small>Check the evidence before you decide.</small>
            </div>
            <span>Review</span>
          </div>
          <div className="v2-desk-record">
            <span>Compare</span>
            <strong>Identity · Session · Device · VPN</strong>
          </div>
          <div className="v2-desk-record">
            <span>Document</span>
            <strong>Known facts and open questions</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LandingPage() {
  const hasSeenFilm = useHasSeenFilm();
  useEffect(() => {
    if (
      typeof IntersectionObserver === "undefined" ||
      (typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    )
      return;
    const targets = document.querySelectorAll<HTMLElement>(
      ".v2-explorer-section .career-card-featured, .v2-desk",
    );
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("v2-revealed");
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.2 },
    );
    targets.forEach((target) => {
      observer.observe(target);
    });
    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div className="v2-home">
      <section className="v2-hero" aria-labelledby="home-hero">
        <div className="v2-hero-copy">
          <h1 id="home-hero">Know the work before you choose the career.</h1>
          <p>
            Step inside a first day. Read the handoff, use the tools, make a
            decision, and find out how the job actually feels.
          </p>
          <div className="v2-hero-actions">
            <SiteLink className="start-shift v2-primary" to="/start">
              {hasSeenFilm ? "Continue your first day" : "Start your first day"}
              <span aria-hidden="true"> ↗</span>
            </SiteLink>
            <SiteLink className="v2-text-link" to="/careers">
              Explore careers <span aria-hidden="true">→</span>
            </SiteLink>
          </div>
          <p className="v2-hero-note">
            Cybersecurity Analyst is ready now. More careers are in the
            workshop.
          </p>
        </div>
        <div className="v2-hero-visual" aria-hidden="true">
          <div className="v2-hero-media v2-media-frame" data-media-slot="hero">
            <div className="v2-hero-cards">
              <div className="v2-role-slip v2-role-slip-back">
                <span>Healthcare</span>
                <strong>Registered Nurse</strong>
                <small>In the Workshop</small>
              </div>
              <div className="v2-role-slip v2-role-slip-mid">
                <span>Engineering</span>
                <strong>Mechanical Engineer</strong>
                <small>In the Workshop</small>
              </div>
              <div className="v2-role-slip v2-role-slip-front">
                <span>Technology · Security</span>
                <strong>Cybersecurity Analyst</strong>
                <small>Ready now · First day at Verdaly</small>
                <div className="v2-slip-task">
                  Read the handoff <span>→</span> Review the alert{" "}
                  <span>→</span> Make the call
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        className="v2-section v2-explorer-section"
        aria-labelledby="v2-explore-title"
      >
        <div className="v2-section-intro">
          <h2 id="v2-explore-title">Explore careers.</h2>
          <p>Cybersecurity is ready now. See what else is taking shape.</p>
        </div>
        <CareerExplorer headingLevel={3} />
      </section>

      <section
        className="v2-section v2-work-section"
        aria-labelledby="v2-work-title"
      >
        <div className="v2-work-intro">
          <h2 id="v2-work-title">An alert is only the beginning.</h2>
          <p>
            The useful part is the judgment: what the signals support, what they
            don’t, and a handoff someone else can rely on.
          </p>
        </div>
        <WorkArtifact />
        <div className="v2-work-steps" aria-label="Your investigation">
          <p>
            <strong>01 · Read</strong> the previous analyst’s handoff
          </p>
          <p>
            <strong>02 · Compare</strong> identity, session, device, and VPN
            records
          </p>
          <p>
            <strong>03 · Document</strong> what’s known and what’s uncertain
          </p>
        </div>
        <p className="v2-reality-note">
          From the playable Cybersecurity Analyst first day. Tasks are
          simplified slices of real work.
        </p>
      </section>

      <section
        className="v2-section v2-day-desk-section"
        aria-labelledby="v2-day-title"
      >
        <div className="v2-day-intro">
          <h2 id="v2-day-title">Your first day, on a real workstation.</h2>
          <p>A few connected decisions, one continuing shift.</p>
        </div>
        <ol className="v2-day-list">
          {day.map((step) => (
            <li key={step}>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        <DeskPreview />
        <div className="v2-desk-foot">
          <p>
            Stand up, walk the floor, come back — your session is exactly where
            you left it.
          </p>
          <SiteLink className="v2-text-link" to="/how-it-works">
            See how the first day works <span aria-hidden="true">→</span>
          </SiteLink>
        </div>
      </section>

      <section
        className="v2-section v2-how-section"
        aria-labelledby="v2-how-title"
      >
        <div className="v2-section-intro">
          <h2 id="v2-how-title">Enter. Decide. Reflect.</h2>
          <p>
            Your actions leave a trail you can look back on. No career quiz
            decides for you.
          </p>
        </div>
        <ol className="v2-how-grid">
          <li>
            <span>01</span>
            <strong>Enter</strong>
            <p>Read the team’s context and find what needs attention.</p>
          </li>
          <li>
            <span>02</span>
            <strong>Do the work</strong>
            <p>Compare evidence, make a call, and leave traceable notes.</p>
          </li>
          <li>
            <span>03</span>
            <strong>Reflect</strong>
            <p>Consider the decisions you made and how the day felt.</p>
          </li>
        </ol>
        <div className="v2-skills">
          <strong>In this shift</strong>
          <span>Record search</span>
          <span>Evidence comparison</span>
          <span>Documenting uncertainty</span>
          <span>Escalation judgment</span>
          <span>Traceable case notes</span>
        </div>
      </section>

      <section
        className="v2-section v2-trust-section"
        aria-labelledby="v2-trust-title"
      >
        <h2 id="v2-trust-title">Honest about the limits.</h2>
        <p>
          A short simulation can’t show a whole career — so we always say what’s
          simplified.
        </p>
        <ul>
          <li>Realistic tasks</li>
          <li>Clear simplifications</li>
          <li>No career-fit score</li>
        </ul>
        <SiteLink className="v2-text-link" to="/trust">
          Privacy and safety <span aria-hidden="true">→</span>
        </SiteLink>
      </section>

      <section
        className="v2-section v2-faq-section"
        aria-labelledby="v2-faq-title"
      >
        <div className="v2-section-intro">
          <h2 id="v2-faq-title">Questions, answered plainly.</h2>
          <p>Know what the first shift is before you begin.</p>
        </div>
        <div className="v2-faq-list">
          <details>
            <summary>Is this a career test?</summary>
            <p>
              No. You try selected tasks and reflect on the experience. Career
              Expo does not tell you which career to choose.
            </p>
          </details>
          <details>
            <summary>Are all these careers playable?</summary>
            <p>
              Cybersecurity Analyst is playable now. Workshop careers have
              previews only; their simulations are still being planned.
            </p>
          </details>
          <details>
            <summary>Do my requests change what you build?</summary>
            <p>
              Not yet. Requests currently stay on this page and aren't
              collected. When collection is enabled, they'll help guide what we
              prioritize without guaranteeing build order.
            </p>
          </details>
          <details>
            <summary>What if the workplace does not load?</summary>
            <p>
              The accessibility recovery path opens the workstation and keeps
              your current session and progress.
            </p>
          </details>
        </div>
        <div className="v2-feedback">
          <SiteLink className="v2-text-link" to="/faq">
            More questions <span aria-hidden="true">→</span>
          </SiteLink>
          <a
            href="https://github.com/zaidkan/Career-Expo/issues/new"
            target="_blank"
            rel="noreferrer"
          >
            Report feedback on GitHub <span aria-hidden="true">↗</span>
          </a>
        </div>
      </section>

      <section className="v2-final" aria-labelledby="v2-final-title">
        <h2 id="v2-final-title">One short day. One real first shift.</h2>
        <p>
          Read the handoff <span aria-hidden="true">→</span> Review the alert{" "}
          <span aria-hidden="true">→</span> Make the call
        </p>
        <SiteLink className="start-shift v2-primary" to="/start">
          {hasSeenFilm ? "Continue your first day" : "Start your first day"}
          <span aria-hidden="true"> ↗</span>
        </SiteLink>
      </section>
    </div>
  );
}
