import { it } from "vitest";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import {
  applyAction,
  applyTaskAttempt,
  applyWorkplaceInteraction,
  availableActions,
  createInitialWorldState,
} from "./src/index.js";

it("escalate path walk", () => {
  const pack = loadDefaultCybersecurityPack();
  let state = createInitialWorldState("probe", 5, {}, pack);
  const EVENT = "suspicious-login-1";
  const act = (id: string) => {
    const a = availableActions(state).find((x) => x.id === id && x.eventId === EVENT);
    console.log("available", id, !!a, a?.taskId);
    if (!a) return;
    if (a.taskId) {
      const task = state.rules.tasks[a.taskId];
      while (!state.taskProgress[`${EVENT}:${task.id}`]?.completed) {
        const stepIndex = state.taskProgress[`${EVENT}:${task.id}`]?.currentStep ?? 0;
        const step = task.steps[stepIndex];
        console.log("  step", task.id, stepIndex, step.options.flatMap((o: any) => o.source ? [o.source.artifactId] : []));
        for (const s of new Set(step.options.flatMap((o: any) => o.source ? [o.source.artifactId] : []))) {
          if (!state.observedArtifactIds.includes(s)) {
            try {
              state = applyWorkplaceInteraction(state, { type: "open_artifact", artifactId: s }).state;
              console.log("    opened", s);
            } catch (e: any) {
              console.log("    OPEN FAIL", s, "->", e.message);
            }
          }
        }
        const turn = applyTaskAttempt(state, { taskId: task.id, eventId: EVENT, selectedOptionIds: step.requiredOptionIds });
        state = turn.state;
      }
    } else {
      state = applyAction(state, { id: id as any, eventId: EVENT, actorId: "user" }).state;
    }
    console.log("  clock", state.simClock, "observed", state.observedArtifactIds.join(","));
  };
  for (const id of ["review_alert", "inspect_login_context", "inspect_account_history", "check_device_inventory", "document_ticket", "escalate_alert"]) act(id);
});
