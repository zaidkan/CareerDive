import { availabilityLabel } from "../../careers/publicCopy.js";
import type { PublicCareer } from "../../careers/types.js";
import { CyberDetail } from "../careers/CyberDetail.js";
import { SiteLink } from "../SiteLink.js";

export function CareerDetailPage({ career }: { career: PublicCareer }) {
  if (career.slug === "cybersecurity-analyst") {
    return <CyberDetail career={career} />;
  }
  return (
    <article className="career-detail">
      <SiteLink to="/careers" className="career-back-link">
        ← All careers
      </SiteLink>
      <header className="page-section page-hero">
        <p className="eyebrow">
          {career.field} ·{" "}
          {availabilityLabel(career.availability)}
        </p>
        <h1>{career.title}</h1>
        <p className="lede">{career.shortSummary}</p>
        <p>{career.workplaceSummary}</p>
        {career.simulationRoute ? (
          <SiteLink className="start-shift" to={career.simulationRoute}>
            Start your first day
          </SiteLink>
        ) : null}
      </header>
      <section className="page-section" aria-labelledby="career-work-title">
        <h2 id="career-work-title">The work</h2>
        <ul>
          {career.plannedTasks.map((task) => (
            <li key={task}>{task}</li>
          ))}
        </ul>
      </section>
      <section className="page-section" aria-labelledby="career-skills-title">
        <h2 id="career-skills-title">Skills in view</h2>
        <ul>
          {career.skills.map((skill) => (
            <li key={skill}>{skill}</li>
          ))}
        </ul>
      </section>
      {career.artifactOrMediaConcepts.length > 0 ? (
        <section
          className="page-section"
          aria-labelledby="career-artifacts-title"
        >
          <h2 id="career-artifacts-title">Work artifacts</h2>
          <ul>
            {career.artifactOrMediaConcepts.map((artifact) => (
              <li key={artifact}>{artifact}</li>
            ))}
          </ul>
        </section>
      ) : null}
      <section className="page-section" aria-labelledby="career-notes-title">
        <h2 id="career-notes-title">What to know</h2>
        <ul>
          {[...career.caveats, ...(career.contentCaveats ?? [])].map(
            (caveat) => (
              <li key={caveat}>{caveat}</li>
            ),
          )}
        </ul>
      </section>
    </article>
  );
}
