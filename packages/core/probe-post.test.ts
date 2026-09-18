import { expect, it } from "vitest";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import { applyAction, applyTaskAttempt, applyWorkplaceInteraction, applyAction as f, availableActions, createInitialWorldState, applyAction as a, applyWorkplaceInteraction as w } from "./src/index.js";

const EVENT = "suspicious-login-1";
const ROUTINE = "routine-alert-1";
const actorId = "user" as const;
function complete(state: any, id: string, eventId: string): any {
  const act = availableActions(state).find((x: any) => x.id === id && x.eventId === eventId);
  if (!act?.taskId) return a(state, { id: id as any, eventId, actorId }).state;
  const t = state.rules.tasks[act.taskId];
  for (const step of t.steps) {
    for (const op of step.options) {
      const src = (op as any).source;
      if (src && !state.observedArtifactIds.includes(src.artifactId)) {
        state = w(state, { type: "open_artifact", artifactId: src.artifactId }).state;
      }
    }
    state = applyTaskAttempt(state, { taskId: t.id, eventId, selectedOptionIds: step.requiredOptionIds }).state;
  }
  return state;
}
function investigate(state: any): any {
  for (const id of ["review_alert", "inspect_login_context", "inspect_account_history", "check_device_inventory"] as const)
    state = complete(state, id, EVENT);
  return state;
}
function fire(state: any): any {
  for (const id of ["review_alert", "search_knowledge_base"] as const) state = complete(state, id, ROUTINE);
  state = complete(state, "document_ticket", ROUTINE);
  return state;
}
it("post-fire availability", () => {
  let state = createInitialWorldState("probe-post", 7, {}, loadDefaultCybersecurityPack());
  state = investigate(state);
  state = complete(state, "dismiss_alert", EVENT);
  state = fire(state);
  console.log("post-fire clock", state.simClock, "status", state.events.find((e: any) => e.id === EVENT)?.status);
  console.log(availableActions(state).map((x: any) => `${x.id}:${x.eventId}`).join("\n"));
  expect(true).toBe(true);
});
