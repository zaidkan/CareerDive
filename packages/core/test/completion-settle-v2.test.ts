import { expect, it } from "vitest";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import { applyAction, createInitialWorldState } from "../src/index.js";

it("settles required authored follow-up at completion without advancing time", () => {
  const state = createInitialWorldState("settle", 7, {}, loadDefaultCybersecurityPack());
  for (const event of state.events) event.status = "resolved";
  const caseEvent = state.events.find(({ id }) => id === "suspicious-login-1");
  if (!caseEvent) throw new Error("Missing case fixture");
  caseEvent.resolution = "Closed with saved reason.";
  state.pendingCallbacks.push({
    id: "authored-later-review", decisionId: "suspicious_login",
    eventId: caseEvent.id, actionId: "dismiss_alert", dueAt: 40, applied: false,
    delayMinutes: 40, when: [], author: "reviewer", body: "Review remains open.",
    emitEvent: "login_clarification", activationMessages: ["Next analyst owns clarification."],
    requiredAtCompletion: true,
  });
  const turn = applyAction(state, { id: "complete_shift", eventId: "shift", actorId: "user" });
  expect(turn.state.simClock).toBe(0);
  expect(turn.state.pendingCallbacks[0]?.applied).toBe(true);
  expect(turn.state.teamMessages?.some(({ body }) => body === "Review remains open.")).toBe(true);
  expect(turn.state.events.find(({ templateId }) => templateId === "login_clarification")?.status).toBe("waiting");
  expect(turn.state.completedActionIds).toContain("complete_shift");
  expect(turn.state.events.find(({ id }) => id === caseEvent.id)?.resolution).toBe("Closed with saved reason.");
});

it("delivers required callbacks in due-time order and replays deterministically", () => {
  const state = createInitialWorldState("ordered-settle", 7, {}, loadDefaultCybersecurityPack());
  for (const event of state.events) event.status = "resolved";
  for (const [id, dueAt] of [["later", 20], ["earlier", 10]] as const) {
    state.pendingCallbacks.push({
      id, eventId: "suspicious-login-1", actionId: "dismiss_alert",
      dueAt, applied: false, delayMinutes: dueAt, when: [],
      author: "reviewer", body: id, activationMessages: [], requiredAtCompletion: true,
    });
  }
  const first = applyAction(state, { id: "complete_shift", eventId: "shift", actorId: "user" });
  const replay = applyAction(state, { id: "complete_shift", eventId: "shift", actorId: "user" });
  expect(first).toEqual(replay);
  expect(first.state.teamMessages?.map(({ body }) => body)).toEqual(["earlier", "later"]);
  expect(first.state.simClock).toBe(0);
});
