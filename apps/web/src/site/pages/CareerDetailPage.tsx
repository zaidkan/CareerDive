import type { PublicCareer } from "../../careers/types.js";
import { CareerPreview } from "../careers/CareerPreview.js";
import { CareerRequestToggle } from "../careers/CareerRequestToggle.js";
import { SiteLink } from "../SiteLink.js";

export function CareerDetailPage({ career }: { career: PublicCareer }) {
  return (
    <article className="career-detail">
      <SiteLink to="/careers" className="career-back-link">← All careers</SiteLink>
      <header className="page-section page-hero">
        <p className="eyebrow">{career.field} · {career.availability === "ready_now" ? "Ready Now" : "In the Workshop"}</p>
        <h1>{career.title}</h1>
        <p className="lede">{career.shortSummary}</p>
        <p>{career.workplaceSummary}</p>
        {career.simulationRoute ? (
          <SiteLink className="start-shift" to={career.simulationRoute}>Begin your first day</SiteLink>
        ) : null}
      </header>
      <section className="page-section" aria-labelledby="career-work-title">
        <h2 id="career-work-title">The work</h2>
        <ul>{career.plannedTasks.map((task) => <li key={task}>{task}</li>)}</ul>
      </section>
      <section className="page-section" aria-labelledby="career-skills-title">
        <h2 id="career-skills-title">Skills in view</h2>
        <ul>{career.skills.map((skill) => <li key={skill}>{skill}</li>)}</ul>
      </section>
      {career.artifactOrMediaConcepts.length > 0 ? (
        <section className="page-section" aria-labelledby="career-artifacts-title">
          <h2 id="career-artifacts-title">Artifacts and media concepts</h2>
          <ul>{career.artifactOrMediaConcepts.map((artifact) => <li key={artifact}>{artifact}</li>)}</ul>
        </section>
      ) : null}
      <section className="page-section" aria-labelledby="career-preview-title">
        <h2 id="career-preview-title">Preview this career</h2>
        <CareerPreview career={career} />
        {career.requestable ? <CareerRequestToggle careerId={career.id} careerTitle={career.title} /> : null}
      </section>
      <section className="page-section" aria-labelledby="career-notes-title">
        <h2 id="career-notes-title">What to know</h2>
        <ul>{career.caveats.map((caveat) => <li key={caveat}>{caveat}</li>)}</ul>
      </section>
    </article>
  );
}
