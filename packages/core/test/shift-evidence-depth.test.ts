import { describe, expect, it } from "vitest";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import type { SimulationActionId, WorldState } from "@sim/schemas";
import {
  applyAction,
  applyTaskAttempt,
  applyWorkplaceInteraction,
  createInitialWorldState,
  toClientView,
} from "../src/index.js";

const login = "suspicious-login-1";
const routine = "routine-alert-1";
function world() {
  return createInitialWorldState(
    "shift-evidence",
    24,
    {},
    loadDefaultCybersecurityPack(),
  );
}
function complete(
  initial: WorldState,
  id: SimulationActionId,
  eventId: string,
  stopAt?: string,
) {
  let state = initial;
  const action = toClientView(state).availableActions.find(
    (a) => a.id === id && a.eventId === eventId,
  );
  if (!action) throw new Error(`Unavailable ${id}:${eventId}`);
  if (!action.taskId)
    return applyAction(state, { id, eventId, actorId: "user" }).state;
  const task = state.rules.tasks[action.taskId];
  if (!task) throw new Error("Missing task");
  while (!state.taskProgress[`${eventId}:${task.id}`]?.completed) {
    const step =
      task.steps[state.taskProgress[`${eventId}:${task.id}`]?.currentStep ?? 0];
    if (!step) throw new Error("Missing step");
    if (step.id === stopAt) return state;
    for (const artifactId of step.relatedArtifactIds) {
      state = applyWorkplaceInteraction(state, {
        type: "open_artifact",
        artifactId,
      }).state;
    }
    state = applyTaskAttempt(state, {
      eventId,
      taskId: task.id,
      selectedOptionIds: step.requiredOptionIds,
    }).state;
  }
  return state;
}
function interrupted() {
  let state = complete(world(), "read_handoff", "handoff-1");
  state = complete(state, "acknowledge_handoff", "handoff-1");
  state = complete(state, "review_alert", login);
  return complete(state, "inspect_login_context", login);
}

describe("shift evidence coverage", () => {
  it("keeps the scanner run private until the interruption is visible and the record is opened", () => {
    const initial = world();
    expect(initial.artifacts["scanner-run-log"]).toBeDefined();
    expect(
      toClientView(initial).artifacts.some((a) => a.id === "scanner-run-log"),
    ).toBe(false);
    expect(() =>
      applyWorkplaceInteraction(initial, {
        type: "open_artifact",
        artifactId: "scanner-run-log",
      }),
    ).toThrow();
    const state = interrupted();
    const preview = toClientView(state).artifacts.find(
      (a) => a.id === "scanner-run-log",
    );
    expect(preview).toBeDefined();
    expect(preview).not.toHaveProperty("body");
    const opened = applyWorkplaceInteraction(state, {
      type: "open_artifact",
      artifactId: "scanner-run-log",
    }).state;
    expect(
      toClientView(opened).artifacts.find((a) => a.id === "scanner-run-log")
        ?.body,
    ).toContain("RUN-FIN-031");
  });

  it("requires the run and alert sources, coaches arrival-time confusion without advancing work", () => {
    let state = complete(interrupted(), "review_alert", routine);
    state = complete(
      state,
      "search_knowledge_base",
      routine,
      "scanner-run-cross-check",
    );
    const task = toClientView(state).tasks.find(
      (t) => t.id === "scanner-window-match",
    );
    expect(task).toBeDefined();
    if (!task) throw new Error("Missing run comparison");
    expect(task.options.every((option) => option.source)).toBe(true);
    expect(JSON.stringify(toClientView(state))).not.toContain("RUN-FIN-031");
    expect(
      task.options
        .filter((o) => o.source?.artifactId === "scanner-run-log")
        .every((o) => !o.source?.quote),
    ).toBe(true);
    const attempt = {
      eventId: routine,
      taskId: task.id,
      selectedOptionIds: ["run-identity-scope", "recorded-event-time"],
    };
    expect(() => applyTaskAttempt(state, attempt)).toThrow(/Open the source/);
    for (const artifactId of task.relatedArtifactIds)
      state = applyWorkplaceInteraction(state, {
        type: "open_artifact",
        artifactId,
      }).state;
    const wrong = applyTaskAttempt(state, {
      ...attempt,
      selectedOptionIds: ["run-identity-scope", "delivery-time"],
    });
    expect(wrong.accepted).toBe(false);
    expect(wrong.state.simClock).toBe(state.simClock);
    expect(wrong.state.workplace).toEqual(state.workplace);
    expect(wrong.state.events).toEqual(state.events);
    expect(applyTaskAttempt(state, attempt).accepted).toBe(true);
  });

  it("carries independent case references and collection limits into both canonical tickets", () => {
    const run = () => {
      let state = interrupted();
      for (const id of [
        "review_alert",
        "search_knowledge_base",
        "document_ticket",
        "dismiss_alert",
      ] as const)
        state = complete(state, id, routine);
      expect(state.ticketNotes[routine]).toContain("RUN-FIN-031");
      expect(state.ticketNotes[routine]).toContain("SCAN-FIN-MON");
      expect(state.ticketNotes[routine]).toContain("10:18");
      expect(state.ticketNotes[routine]).toContain(
        "does not establish vulnerability findings",
      );
      expect(state.ticketNotes[routine]).not.toContain("S-0741");
      for (const id of [
        "inspect_account_history",
        "check_device_inventory",
        "document_ticket",
        "escalate_alert",
      ] as const)
        state = complete(state, id, login);
      expect(state.ticketNotes[login]).toContain("07:45");
      expect(state.ticketNotes[login]).toContain(
        "file-access or mailbox activity",
      );
      expect(state.ticketNotes[login]).not.toContain("RUN-FIN-031");
      expect(state.events.find((e) => e.id === routine)?.resolution).toContain(
        "RUN-FIN-031",
      );
      return state;
    };
    expect(run()).toEqual(run());
  });
});
