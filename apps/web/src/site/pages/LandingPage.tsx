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
  { moment: "Arrive", detail: "Enter the workplace and get your bearings." },
  {
    moment: "Find your desk",
    detail: "Sit down and open the same workday in Desk OS.",
  },
  {
    moment: "Read the handoff",
    detail: "See what the previous analyst left open.",
  },
  {
    moment: "Make a call",
    detail: "Compare records and document what you can support.",
  },
  {
    moment: "Reflect",
    detail: "Look back at your decisions, without a career fit score.",
  },
];

function WorkArtifact() {
  return (
    <div
      className="v2-artifact"
      aria-label="Illustrative example of a Cybersecurity Analyst handoff"
    >
      <div className="v2-artifact-top">
        <span>Verdaly Technologies</span>
        <span>Analyst handoff · example</span>
      </div>
      <div className="v2-artifact-body">
        <div className="v2-artifact-title">
          <span className="v2-artifact-mark" aria-hidden="true" />{" "}
          <strong>Morning review</strong>
          <small>Open item</small>
        </div>
        <div className="v2-artifact-line">
          <span>Observation</span>
          <p>Unfamiliar device on a login record</p>
        </div>
        <div className="v2-artifact-line">
          <span>Check</span>
          <p>Compare device inventory and sign-in history</p>
        </div>
        <div className="v2-artifact-line">
          <span>Handoff</span>
          <p>Record what is known, and what still needs review</p>
        </div>
      </div>
      <div className="v2-artifact-bottom">
        Read evidence <span aria-hidden="true">→</span> Write a clear note
      </div>
    </div>
  );
}

function DeskPreview() {
  return (
    <div
      className="v2-desk"
      aria-label="Illustrative preview of the existing Desk OS tools"
    >
      <div className="v2-desk-bar">
        <span>Desk OS</span>
        <span>Verdaly · first shift</span>
      </div>
      <div className="v2-desk-body">
        <div className="v2-desk-sidebar">
          <strong>Workspace</strong>
          <span>Inbox</span>
          <span>Alerts</span>
          <span>Tickets</span>
          <span>Knowledge Base</span>
          <span>Team Chat</span>
        </div>
        <div className="v2-desk-window">
          <div className="v2-desk-window-head">
            Alert Dashboard <span>Review queue</span>
          </div>
          <div className="v2-desk-alert">
            <span className="v2-desk-alert-icon" aria-hidden="true" />
            <div>
              <strong>Suspicious login</strong>
              <small>Check the evidence before you decide.</small>
            </div>
            <span>Review</span>
          </div>
          <div className="v2-desk-record">
            <span>What happened</span>
            <strong>Sign-in from an unfamiliar device</strong>
          </div>
          <div className="v2-desk-record">
            <span>Next step</span>
            <strong>Compare with inventory and history</strong>
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
            decision, and find out how the job feels from the work itself.
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
                Read the handoff <span>→</span> Review the alert <span>→</span>{" "}
                Make the call
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
          <h2 id="v2-explore-title">Explore careers through the work.</h2>
          <p>
            Playable first days are marked Ready Now. Workshop previews show the
            kinds of decisions a future simulation could explore.
          </p>
        </div>
        <CareerExplorer headingLevel={3} />
      </section>

      <section
        className="v2-section v2-work-section"
        aria-labelledby="v2-work-title"
      >
        <div className="v2-work-copy">
          <h2 id="v2-work-title">What you’ll actually do.</h2>
          <p>
            In the Cybersecurity Analyst experience, you follow the evidence
            left by a team. The useful part is the judgment between signals and
            a handoff someone else can use.
          </p>
          <ul className="v2-plain-list">
            <li>Read the previous analyst’s handoff</li>
            <li>Compare an alert with device records</li>
            <li>Write down what is known and uncertain</li>
          </ul>
          <p className="v2-reality-note">
            Example shown from the playable Cybersecurity Analyst first day.
            Tasks are simplified slices of real work.
          </p>
        </div>
        <WorkArtifact />
      </section>

      <section
        className="v2-section v2-day-section"
        aria-labelledby="v2-day-title"
      >
        <div className="v2-section-intro">
          <h2 id="v2-day-title">First day, from arrival to reflection.</h2>
          <p>
            Here is the path through the first playable career. Future careers
            can have different workplaces and workflows.
          </p>
        </div>
        <ol className="v2-day-list">
          {day.map((step) => (
            <li key={step.moment}>
              <strong>{step.moment}</strong>
              <span>{step.detail}</span>
            </li>
          ))}
        </ol>
      </section>

      <section
        className="v2-section v2-desk-section"
        aria-labelledby="v2-desk-title"
      >
        <div className="v2-desk-copy">
          <h2 id="v2-desk-title">A real workstation, real decisions.</h2>
          <p>
            After you reach your desk, Desk OS keeps the same shift moving. Open
            the inbox, inspect an alert, check guidance, and leave a clear
            record. The shift keeps some surprises; your tools stay familiar.
          </p>
          <SiteLink className="v2-text-link" to="/how-it-works">
            See how the first day works <span aria-hidden="true">→</span>
          </SiteLink>
          <p className="v2-reality-note">
            Illustrative view of tools in the current Cybersecurity Analyst
            simulation.
          </p>
        </div>
        <DeskPreview />
      </section>

      <section
        className="v2-section v2-how-section"
        aria-labelledby="v2-how-title"
      >
        <div className="v2-section-intro">
          <h2 id="v2-how-title">Learn by doing the work.</h2>
          <p>
            No career quiz decides for you. Your actions create something worth
            looking back on.
          </p>
        </div>
        <div className="v2-how-grid">
          <div>
            <strong>See the context</strong>
            <p>
              A workplace, a team handoff, and tools with a reason to use them.
            </p>
          </div>
          <div>
            <strong>Make a decision</strong>
            <p>
              Read evidence, choose what matters, and document your reasoning.
            </p>
          </div>
          <div>
            <strong>Reflect on the fit</strong>
            <p>
              Consider how the work felt. No score tells you what to become.
            </p>
          </div>
        </div>
        <div className="v2-skills">
          <strong>Skills you practice in the playable shift</strong>
          <span>Evidence review</span>
          <span>Prioritization</span>
          <span>Clear handoffs</span>
        </div>
      </section>

      <section
        className="v2-section v2-trust-section"
        aria-labelledby="v2-trust-title"
      >
        <div>
          <h2 id="v2-trust-title">Built to show the work honestly.</h2>
          <p>
            Career Expo uses realistic decisions and work artifacts to help you
            understand a role. A short simulation cannot show every part of a
            career, so we say what is simplified.
          </p>
        </div>
        <div className="v2-trust-aside">
          <p>
            No career fit score. No job application. Your reflections stay
            private unless you choose to share them.
          </p>
          <SiteLink className="v2-text-link" to="/trust">
            Read our privacy and safety notes <span aria-hidden="true">→</span>
          </SiteLink>
        </div>
      </section>

      <section
        className="v2-section v2-request-section"
        aria-labelledby="v2-request-title"
      >
        <div>
          <h2 id="v2-request-title">Which career should we make next?</h2>
          <p>
            Explore Workshop previews, then mark any role you want to see.
            Change your mind with one click. No account or email needed.
          </p>
          <p className="v2-reality-note">
            Requests are a local preview in this beta; they are not collected
            yet.
          </p>
        </div>
        <a className="button-secondary" href="#workshop-title">
          Explore Workshop careers <span aria-hidden="true">↑</span>
        </a>
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
              No. You try selected tasks and reflect on the work. Career Expo
              does not tell you which career to choose.
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
            <summary>What if the workplace does not load?</summary>
            <p>
              The accessibility recovery path opens the workstation and keeps
              your current session and work.
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
        <h2 id="v2-final-title">
          A career can sound right. Try the work first.
        </h2>
        <p>
          Start with one short day as a Cybersecurity Analyst. More careers are
          being shaped in the workshop.
        </p>
        <SiteLink className="start-shift v2-primary" to="/start">
          {hasSeenFilm ? "Continue your first day" : "Start your first day"}
          <span aria-hidden="true"> ↗</span>
        </SiteLink>
      </section>
    </div>
  );
}
