import { useEffect, useState } from "react";
import { careers } from "../../careers/careers.js";
import { CareerExplorer } from "../careers/CareerExplorer.js";
import { CareerFields } from "../careers/CareerFields.js";
import { AlertArtifact, DeskPreview } from "../careers/CyberArtifacts.js";
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

const EXPERIENCE_ARC = [
  {
    step: "Brief",
    detail: "Get the context other people are relying on.",
  },
  {
    step: "Investigate",
    detail: "Look at the actual work, not a description of it.",
  },
  {
    step: "Decide",
    detail: "Make a call with the evidence you have.",
  },
  {
    step: "Adapt",
    detail: "New information changes what matters next.",
  },
  {
    step: "Document",
    detail: "Leave a record someone else can continue.",
  },
  {
    step: "Hand off",
    detail: "Pass it on cleanly when the day ends.",
  },
  {
    step: "Reflect",
    detail: "Look back on the decisions and how the day felt.",
  },
] as const;

const SHELF_INTERVAL_MS = 4600;

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setReduced(query.matches);
    };
    update();
    query.addEventListener("change", update);
    return () => {
      query.removeEventListener("change", update);
    };
  }, []);
  return reduced;
}

function HeroShelf() {
  const reducedMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (reducedMotion || paused) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % careers.length);
    }, SHELF_INTERVAL_MS);
    return () => {
      window.clearInterval(timer);
    };
  }, [reducedMotion, paused]);

  return (
    <div className="v2-hero-media v2-media-frame" data-media-slot="hero">
      <div
        className="v2-shelf"
        onMouseEnter={() => {
          setPaused(true);
        }}
        onMouseLeave={() => {
          setPaused(false);
        }}
        onFocus={() => {
          setPaused(true);
        }}
        onBlur={() => {
          setPaused(false);
        }}
      >
        {careers.map((career, index) => {
          const ready = career.availability === "ready_now";
          const isActive = index === activeIndex;
          return (
            <div
              key={career.id}
              className={`v2-shelf-doc v2-shelf-doc--${String(index)}${
                ready ? " v2-shelf-doc--ready" : ""
              }${isActive ? " v2-shelf-doc--active" : ""}`}
              aria-hidden="true"
            >
              <span className="v2-shelf-doc-field">{career.field}</span>
              <strong className="v2-shelf-doc-title">{career.title}</strong>
              <span className="v2-shelf-doc-glyph" />
              <small className="v2-shelf-doc-status">
                {ready ? "Ready now" : "In the workshop"}
              </small>
            </div>
          );
        })}
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
            Career Expo puts you inside a first day of real work. Read the
            handoff, use the tools, make decisions, and find out how the job
            actually feels.
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
          <HeroShelf />
        </div>
      </section>

      <section
        className="v2-section v2-explorer-section"
        aria-labelledby="v2-explore-title"
      >
        <div className="v2-section-intro">
          <h2 id="v2-explore-title">Explore careers.</h2>
          <p>One is playable now. See what else is taking shape.</p>
        </div>
        <CareerExplorer headingLevel={3} />
      </section>

      <section
        className="v2-section v2-proof-section"
        aria-labelledby="v2-proof-title"
      >
        <div className="v2-proof-intro">
          <p className="v2-eyebrow">A real task, not a job description.</p>
          <h2 id="v2-proof-title">
            You compare evidence. Then you make the call.
          </h2>
          <p>
            In Cybersecurity Analyst, you compare evidence, make a judgment, and
            leave a record someone else can continue.
          </p>
        </div>
        <AlertArtifact compact />
        <p className="v2-proof-tag">
          <SiteLink
            className="v2-text-link"
            to="/careers/cybersecurity-analyst"
          >
            Cybersecurity Analyst · Ready now <span aria-hidden="true">→</span>
          </SiteLink>
        </p>
      </section>

      <CareerFields />

      <section
        className="v2-section v2-arc-section"
        aria-labelledby="v2-arc-title"
      >
        <div className="v2-section-intro">
          <h2 id="v2-arc-title">How a Career Expo first day works</h2>
          <p>
            Every career follows the same shape. The work changes — the judgment
            does not.
          </p>
        </div>
        <ol className="v2-arc-list">
          {EXPERIENCE_ARC.map((beat, index) => (
            <li key={beat.step}>
              <span className="v2-arc-index">
                {String(index + 1).padStart(2, "0")}
              </span>
              <strong>{beat.step}</strong>
              <p>{beat.detail}</p>
            </li>
          ))}
        </ol>
        <p className="v2-arc-example" id="v2-arc-example">
          Example · Cybersecurity Analyst
        </p>
        <DeskPreview />
        <p className="v2-reality-note">
          Every career follows these seven steps. The example beside it is from
          the currently playable Cybersecurity Analyst first day — its tools are
          its own, not every career’s.
        </p>
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
              Not yet. Requests currently stay on this page and aren’t
              collected. When collection is enabled, they’ll help guide what we
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
          Try the work <span aria-hidden="true">→</span> Make decisions{" "}
          <span aria-hidden="true">→</span> See how the shift responds
        </p>
        <div className="v2-final-actions">
          <SiteLink className="start-shift v2-primary" to="/careers">
            Explore careers <span aria-hidden="true">→</span>
          </SiteLink>
          <SiteLink className="v2-text-link" to="/start">
            Cybersecurity Analyst · Ready now <span aria-hidden="true">↗</span>
          </SiteLink>
        </div>
      </section>
    </div>
  );
}
