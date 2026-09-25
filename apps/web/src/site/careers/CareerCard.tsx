import { careerPath } from "../../careers/careers.js";
import type { PublicCareer } from "../../careers/types.js";
import { SiteLink } from "../SiteLink.js";
import { CareerPreview } from "./CareerPreview.js";
import { CareerRequestToggle, type SetCareerRequest } from "./CareerRequestToggle.js";

export function CareerCard({
  career,
  featured = false,
  setCareerRequest,
}: {
  career: PublicCareer;
  featured?: boolean;
  setCareerRequest?: SetCareerRequest | undefined;
}) {
  const ready = career.availability === "ready_now";
  return (
    <article className={`career-card${featured ? " career-card-featured" : ""}`}>
      <p className="career-card-field">{career.field}</p>
      <p className="career-card-status">{ready ? "Ready now" : "In the workshop"}</p>
      <h3>{career.title}</h3>
      <p className="career-card-summary">{career.shortSummary}</p>
      <ul className="career-card-skills" aria-label={`${career.title} skills`}>
        {career.skills.map((skill) => <li key={skill}>{skill}</li>)}
      </ul>
      <div className="career-card-actions">
        {career.simulationRoute ? (
          <SiteLink className="start-shift" to={career.simulationRoute}>Begin your first day</SiteLink>
        ) : null}
        {career.detailPublished ? (
          <SiteLink className="career-detail-link" to={careerPath(career)}>
            {career.title} details
          </SiteLink>
        ) : null}
      </div>
      <CareerPreview career={career} />
      {career.requestable ? (
        <CareerRequestToggle
          careerId={career.id}
          careerTitle={career.title}
          setCareerRequest={setCareerRequest}
        />
      ) : null}
    </article>
  );
}
