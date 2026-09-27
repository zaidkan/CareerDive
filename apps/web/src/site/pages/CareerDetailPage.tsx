import type { PublicCareer } from "../../careers/types.js";
import {
  HandoffExcerpt,
  InvestigationExcerpt,
  ShiftDeskPreview,
} from "../careers/CareerWorkSamples.js";
import { SiteLink } from "../SiteLink.js";
import "../careers/careers.css";

const workflow = [
  [
    "Alert",
    "Read the signal. An alert asks for attention; it is not a finding.",
  ],
  ["Evidence", "Compare the sign-in, device inventory, and account history."],
  ["Judgment", "Separate what is supported from what still needs checking."],
  [
    "Documentation",
    "Preserve the sources, uncertainty, and next step in a ticket.",
  ],
  [
    "Communication",
    "Give Morgan an update and leave the next shift a usable handoff.",
  ],
];

const sourceLinks: Record<string, string> = {
  "content/packs/cybersecurity-analyst/pack.yaml":
    "https://github.com/zaidkan/Career-Expo/blob/8af4a80200ce1479943e9f6c84a79ba7dd8f0b48/content/packs/cybersecurity-analyst/pack.yaml",
  "docs/content/public-career-content-packet.md":
    "https://github.com/zaidkan/Career-Expo/blob/8af4a80200ce1479943e9f6c84a79ba7dd8f0b48/docs/content/public-career-content-packet.md",
  "BLS OOH Information Security Analysts":
    "https://www.bls.gov/ooh/computer-and-information-technology/information-security-analysts.htm",
  "NIST NICE Workforce Framework for Cybersecurity":
    "https://www.nist.gov/itl/applied-cybersecurity/nice/nice-framework-source-center",
};

export function CareerDetailPage({ career }: { career: PublicCareer }) {
  const cyber = career.slug === "cybersecurity-analyst";
  return (
    <article className="career-dossier">
      <SiteLink to="/careers" className="dossier-back">
        ← All careers
      </SiteLink>
      <header className="dossier-intro">
        <div>
          <h1>{career.title}</h1>
          <div className="dossier-meta">
            <span>{career.field}</span>
            <span className="dossier-ready">
              {career.availability === "ready_now"
                ? "Ready Now"
                : "In the Workshop"}
            </span>
          </div>
          <p className="dossier-summary">{career.shortSummary}</p>
          <p>{career.workplaceSummary}</p>
          {career.simulationRoute ? (
            <SiteLink className="explorer-primary" to={career.simulationRoute}>
              Begin your first day
            </SiteLink>
          ) : null}
        </div>
        {cyber ? <HandoffExcerpt /> : null}
      </header>

      {cyber ? (
        <section className="dossier-workflow" aria-labelledby="workflow-title">
          <h2 id="workflow-title">From signal to handoff</h2>
          <ol>
            {workflow.map(([label, description], index) => (
              <li key={label}>
                <span className="workflow-step">{index + 1}</span>
                <h3>{label}</h3>
                <p>{description}</p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <section className="dossier-work" aria-labelledby="career-work-title">
        <div>
          <h2 id="career-work-title">The work</h2>
          <ol className="dossier-tasks">
            {career.plannedTasks.map((task) => (
              <li key={task}>{task}</li>
            ))}
          </ol>
        </div>
        <div className="dossier-skills">
          <h2>Skills in view</h2>
          <ul className="explorer-skills">
            {career.skills.map((skill) => (
              <li key={skill}>{skill}</li>
            ))}
          </ul>
          {career.realityNotes?.map((note) => (
            <p key={note}>{note}</p>
          ))}
        </div>
      </section>

      {career.artifactOrMediaConcepts.length > 0 ? (
        <section
          className="dossier-artifacts"
          aria-labelledby="career-artifacts-title"
        >
          <div className="explorer-section-heading">
            <h2 id="career-artifacts-title">Work artifacts</h2>
            <p>The records you read. The trail you leave.</p>
          </div>
          {cyber ? (
            <div className="dossier-artifact-layout">
              <ShiftDeskPreview />
              <InvestigationExcerpt />
            </div>
          ) : (
            <ul>
              {career.artifactOrMediaConcepts.map((artifact) => (
                <li key={artifact}>{artifact}</li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {career.misconceptions?.length ? (
        <section
          className="dossier-misconceptions"
          aria-labelledby="misconceptions-title"
        >
          <h2 id="misconceptions-title">
            What people picture.
            <br />
            What the work asks.
          </h2>
          <div>
            {career.misconceptions.map(({ claim, correction }) => (
              <div className="dossier-comparison" key={claim}>
                <h3>{claim}</h3>
                <p>{correction}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {career.pathway?.length ? (
        <section className="dossier-pathway" aria-labelledby="pathway-title">
          <h2 id="pathway-title">Pathways into the field</h2>
          <div>
            {career.pathway.map((step) => (
              <p key={step}>{step}</p>
            ))}
          </div>
        </section>
      ) : null}

      <section className="dossier-scope" aria-labelledby="career-notes-title">
        <div>
          <h2 id="career-notes-title">What to know</h2>
          <ul>
            {[...career.caveats, ...(career.contentCaveats ?? [])].map(
              (caveat) => (
                <li key={caveat}>{caveat}</li>
              ),
            )}
          </ul>
        </div>
        <details className="dossier-sources">
          <summary>Sources &amp; provenance</summary>
          <p>
            Career context and the approved content behind this selected first
            shift.
          </p>
          <ul>
            {career.sources.map((source) => (
              <li key={source}>
                {sourceLinks[source] ? (
                  <a href={sourceLinks[source]}>{source}</a>
                ) : (
                  source
                )}
              </li>
            ))}
          </ul>
        </details>
      </section>
    </article>
  );
}
