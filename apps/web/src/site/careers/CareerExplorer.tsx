import { careers } from "../../careers/careers.js";
import { readyNowCareers, workshopCareers } from "../../careers/selectors.js";
import type { PublicCareer } from "../../careers/types.js";
import { ReadyNowStage } from "./ReadyNowStage.js";
import { WorkshopShelf } from "./WorkshopShelf.js";
import type { SetCareerRequest } from "./CareerRequestToggle.js";

export function CareerExplorer({
  items = careers,
  setCareerRequest,
}: {
  items?: readonly PublicCareer[];
  setCareerRequest?: SetCareerRequest | undefined;
}) {
  return (
    <div className="career-explorer">
      <ReadyNowStage careers={readyNowCareers(items)} />
      <WorkshopShelf careers={workshopCareers(items)} setCareerRequest={setCareerRequest} />
    </div>
  );
}
