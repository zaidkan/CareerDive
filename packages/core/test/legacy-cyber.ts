import { loadDefaultCybersecurityPack } from "@sim/career-packs";

/** Archived V1 progression shape for replay regression cases. */
export function legacyCyberPack() {
  const pack = structuredClone(loadDefaultCybersecurityPack());
  pack.career.packVersion = "1.0.0";
  const login = pack.scenario.eventTemplates.suspicious_login;
  if (!login) throw new Error("Missing legacy login template");
  login.actionConditions = {};
  if (login.progression.kind === "stages") {
    for (const stage of login.progression.stages.slice(1, -1)) {
      stage.alsoOffer.push("dismiss_alert");
    }
  }
  for (const task of pack.scenario.tasks) {
    for (const step of task.steps) {
      step.outcomes = [];
      step.conditionalRequiredOptionIds = [];
    }
  }
  return pack;
}
