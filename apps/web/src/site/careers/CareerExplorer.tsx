import { careers } from "../../careers/careers.js";
import { readyNowCareers, workshopCareers } from "../../careers/selectors.js";
import type { PublicCareer } from "../../careers/types.js";
import { ReadyNowStage } from "./ReadyNowStage.js";
import { WorkshopShelf } from "./WorkshopShelf.js";
import type { SetCareerRequest } from "./CareerRequestToggle.js";

export function CareerExplorer({
  items = careers,
  setCareerRequest,
  headingLevel = 2,
}: {
  items?: readonly PublicCareer[];
  setCareerRequest?: SetCareerRequest | undefined;
  headingLevel?: 2 | 3;
}) {
  return (
    <div className="career-explorer">
      <ReadyNowStage careers={readyNowCareers(items)} headingLevel={headingLevel} />
      <WorkshopShelf careers={workshopCareers(items)} setCareerRequest={setCareerRequest} headingLevel={headingLevel} />
    </div>
  );
}
