import type { PublicCareer } from "../../careers/types.js";
import { SiteLink } from "../SiteLink.js";
import {
  AlertArtifact,
  DeskPreview,
  FirstShiftTimeline,
  InvestigationSteps,
} from "./CyberArtifacts.js";

export function CyberDetail({ career }: { career: PublicCareer }) {
  return (
    <article className="career-detail cyber-detail">
      <SiteLink to="/careers" className="career-back-link">
        ← All careers
      </SiteLink>
      <header className="page-section page-hero">
        <p className="eyebrow">{career.field} · Ready Now</p>
        <h1>{career.title}</h1>
        <p className="lede">{career.shortSummary}</p>
        <p>{career.workplaceSummary}</p>
        <SiteLink className="start-shift" to="/start">
          Begin your first day
        </SiteLink>
      </header>

      <section className="page-section" aria-labelledby="cyber-investigation-title">
        <div className="cyber-chapter-head">
          <span className="cyber-chapter-num" aria-hidden="true">
            01
          </span>
          <div>
            <h2 id="cyber-investigation-title">
              An alert is only the beginning.
            </h2>
            <p className="lede">
              The useful part is the judgment: what the signals support, what they
              don’t, and a handoff someone else can rely on.
            </p>
          </div>
        </div>
        <AlertArtifact />
        <InvestigationSteps />
        <p className="cyber-reality-note">
          From the playable Cybersecurity Analyst first day. Tasks are simplified
          slices of real work.
        </p>
      </section>

      <section className="page-section" aria-labelledby="cyber-first-shift-title">
        <div className="cyber-chapter-head">
          <span className="cyber-chapter-num" aria-hidden="true">
            02
          </span>
          <div>
            <h2 id="cyber-first-shift-title">
              What your first shift looks like
            </h2>
            <p className="lede">
              A few connected decisions, one continuing shift.
            </p>
          </div>
        </div>
        <FirstShiftTimeline />
        <DeskPreview />
        <p className="cyber-desk-foot">
          Stand up, walk the floor, come back — your session is exactly where you
          left it.
        </p>
      </section>

      <section className="page-section" aria-labelledby="cyber-why-title">
        <h2 id="cyber-why-title">Why the tasks matter</h2>
        <ul className="cyber-note-list">
          {(career.realityNotes ?? []).map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
        {(career.misconceptions ?? []).map((entry) => (
          <div className="cyber-misconception" key={entry.claim}>
            <p className="cyber-misconception-claim">
              <strong>Common picture:</strong> {entry.claim}
            </p>
            <p className="cyber-misconception-correction">
              <strong>Closer to the work:</strong> {entry.correction}
            </p>
          </div>
        ))}
      </section>

      <section className="page-section" aria-labelledby="cyber-artifacts-title">
        <h2 id="cyber-artifacts-title">Artifacts you will use</h2>
        <ul className="cyber-artifact-list">
          {career.artifactOrMediaConcepts.map((artifact) => (
            <li key={artifact}>{artifact}</li>
          ))}
        </ul>
        <p className="cyber-sources">
          Sources: {career.sources.join(" · ")}
        </p>
      </section>

      <section className="page-section cyber-cta" aria-labelledby="cyber-cta-title">
        <h2 id="cyber-cta-title">Try the first shift</h2>
        <p className="lede">
          One short day at Verdaly. Read the handoff, make the calls, and see how
          the work feels.
        </p>
        <SiteLink className="start-shift" to="/start">
          Start your first day <span aria-hidden="true">↗</span>
        </SiteLink>
      </section>
    </article>
  );
}
