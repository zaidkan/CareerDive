/** Public career descriptions. Deliberately independent of simulation CareerPackSchema. */
export type CareerAvailability = "ready_now" | "in_workshop";

export type PublicCareer = {
  id: string;
  slug: string;
  title: string;
  field: string;
  shortSummary: string;
  workplaceSummary: string;
  skills: readonly string[];
  plannedTasks: readonly string[];
  artifactOrMediaConcepts: readonly string[];
  caveats: readonly string[];
  contentCaveats?: readonly string[];
  sources: readonly string[];
  availability: CareerAvailability;
  detailPublished: boolean;
  requestable: boolean;
  simulationRoute?: "/start";
};
