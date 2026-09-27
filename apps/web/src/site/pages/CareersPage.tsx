import { careers, careerPath } from "../../careers/careers.js";
import { readyNowCareers, workshopCareers } from "../../careers/selectors.js";
import { CareerPreview } from "../careers/CareerPreview.js";
import { ShiftDeskPreview } from "../careers/CareerWorkSamples.js";
import { SiteLink } from "../SiteLink.js";
import "../careers/careers.css";

export function CareersPage() {
  return (
    <div className="careers-page">
      <header className="explorer-intro">
        <h1>Explore careers through the work</h1>
        <div>
          <p className="lede">
            Playable careers are marked Ready Now. Explore other roles through
            practical previews while they are in the workshop.
          </p>
          <nav aria-label="Career availability" className="explorer-jump-links">
            <a href="#ready-now">Ready Now</a>
            <a href="#workshop">In the Workshop</a>
          </nav>
        </div>
      </header>

      <section
        id="ready-now"
        className="explorer-ready"
        aria-labelledby="explorer-ready-title"
      >
        <div className="explorer-section-heading">
          <h2 id="explorer-ready-title">Ready Now</h2>
          <p>Step into a career you can try today.</p>
        </div>
        {readyNowCareers(careers).map((career) => (
          <article key={career.id} className="explorer-feature">
            <div className="explorer-feature-copy">
              <h3>{career.title}</h3>
              <p className="explorer-summary">{career.shortSummary}</p>
              <p>{career.workplaceSummary}</p>
              <ul
                className="explorer-skills"
                aria-label={`${career.title} skills`}
              >
                {career.skills.map((skill) => (
                  <li key={skill}>{skill}</li>
                ))}
              </ul>
              <div className="explorer-actions">
                {career.simulationRoute ? (
                  <SiteLink
                    className="explorer-primary"
                    to={career.simulationRoute}
                  >
                    Begin your first day
                  </SiteLink>
                ) : null}
                <SiteLink
                  className="explorer-detail-link"
                  to={careerPath(career)}
                >
                  {career.title} details
                </SiteLink>
              </div>
              <p className="explorer-limit">{career.caveats[0]}</p>
            </div>
            <div className="explorer-feature-work">
              <ShiftDeskPreview />
              <div className="explorer-first-task">
                <span>Your first task</span>
                <strong>{career.plannedTasks[0]}</strong>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section
        id="workshop"
        className="explorer-workshop"
        aria-labelledby="explorer-workshop-title"
      >
        <div className="explorer-section-heading">
          <h2 id="explorer-workshop-title">In the Workshop</h2>
          <p>
            Coming Soon. Read a preview, then mark the careers you’d like to
            try.
          </p>
        </div>
        <p className="explorer-request-note">
          Requests stay on this page and aren't collected yet. No account, no
          email; undo anytime. They won't guarantee build order.
        </p>
        <ul className="explorer-workshop-list">
          {workshopCareers(careers).map((career) => (
            <li key={career.id}>
              <article
                className="explorer-workshop-row"
                data-career={career.slug}
              >
                <div className="explorer-role-copy">
                  <div className="explorer-role-meta">
                    <span>{career.field}</span>
                    <span className="explorer-coming-soon">Coming Soon</span>
                  </div>
                  <h3>{career.title}</h3>
                  <p>{career.shortSummary}</p>
                  <p className="explorer-workplace">
                    <strong>Workplace</strong> {career.workplaceSummary}
                  </p>
                  <CareerPreview career={career} />
                </div>
                <figure className="explorer-planned-artifacts">
                  <figcaption>
                    Planned work artifacts <span>Preview only</span>
                  </figcaption>
                  <ul>
                    {career.artifactOrMediaConcepts.map((artifact) => (
                      <li key={artifact}>{artifact}</li>
                    ))}
                  </ul>
                  <p>{career.caveats[0]}</p>
                </figure>
              </article>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
