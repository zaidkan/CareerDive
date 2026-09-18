import { it } from "vitest";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import { applyAction, applyTaskAttempt, applyWorkplaceInteraction, availableActions, createInitialWorldState } from "./src/index.js";

it("post-fire available", () => {
  const pack = loadDefaultCybersecurityPack();
  let state = createInitialWorldState("probe", 7, {}, pack);
  const EVENT = "suspicious-login-1";
  const ROUTINE = "routine-alert-1";
  const walk = (id: string, eventId: string) => {
    const a = availableActions(state).find((x) => x.id === id && x.eventId === eventId);
    if (!a) return console.log("NOT AVAIL", id, eventId);
    if (a.taskId) {
      const task = state.rules.tasks[a.taskId];
      const n = task.steps.length;
      for (let i = 0; i < n; i++) {
        for (const s of new Set(task.steps[i].options.flatMap((o: any) => o.source ? [o.source.artifactId] : []))) {
          if (!state.observedArtifactIds.includes(s)) {
            try { state = applyWorkplaceInteraction(state, { type: "open_artifact", artifactId: s }).state; }
            catch (e: any) { console.log("  open fail", s, e.message); }
          }
        }
        const turn = applyTaskAttempt(state, { taskId: task.id, eventId, selectedOptionIds: task.steps[i].requiredOptionIds });
        state = turn.state;
      }
    } else {
      state = applyAction(state, { id: id as any, eventId, actorId: "user" }).state;
    }
    console.log("done", id, "clock", state.simClock);
  };
  for (const id of ["review_alert", "inspect_login_context", "inspect_account_history", "check_device_inventory"]) walk(id, EVENT);
  walk("dismiss_alert", EVENT);
  for (const id of ["review_alert", "search_knowledge_base"]) walk(id, ROUTINE);
  walk("document_ticket", ROUTINE);
  console.log("post-fire simClock", state.simClock);
  console.log(availableActions(state).map((a) => `${a.id}:${a.eventId}`));
});
