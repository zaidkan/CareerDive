import { describe, expect, it } from "vitest";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import type { SimulationActionId, WorldState } from "@sim/schemas";
import {
  applyAction,
  applyTaskAttempt,
  applyWorkplaceInteraction,
  createInitialWorldState,
  julesDialogue,
  respondToNotification,
  toClientView,
} from "../src/index.js";

const eventId = "routine-alert-1";
function world() {
  const state = createInitialWorldState(
    "shift-depth",
    42,
    {},
    loadDefaultCybersecurityPack(),
  );
  state.simClock = 25;
  return applyAction(state, {
    id: "update_notebook",
    eventId: "suspicious-login-1",
    actorId: "user",
    freeText: "Return to the open record and check its scope.",
  }).state;
}
function complete(initial: WorldState, id: SimulationActionId) {
  let state = initial;
  const action = toClientView(state).availableActions.find(
    (a) => a.id === id && a.eventId === eventId,
  );
  if (!action) throw new Error(`Unavailable ${id}`);
  const task = action.taskId ? state.rules.tasks[action.taskId] : undefined;
  if (!task) return applyAction(state, { id, eventId, actorId: "user" }).state;
  for (const step of task.steps) {
    for (const source of step.options.flatMap((o) =>
      o.source ? [o.source.artifactId] : [],
    ))
      state = applyWorkplaceInteraction(state, {
        type: "open_artifact",
        artifactId: source,
      }).state;
    const turn = applyTaskAttempt(state, {
      taskId: task.id,
      eventId,
      selectedOptionIds: step.requiredOptionIds,
    });
    expect(turn.accepted).toBe(true);
    state = turn.state;
  }
  return state;
}

describe("whole-shift interruption", () => {
  it("acknowledges the interruption without performing investigation or closure", () => {
    const state = world();
    const acknowledged = respondToNotification(state, {
      notificationId: "routine-scanner-arrived",
      response: "continue",
    });
    expect(acknowledged.events).toEqual(state.events);
    expect(acknowledged.notifications[0]?.status).toBe("acknowledged");
  });
  it("offers a real dismissal choice after triage without claiming a reference was checked", () => {
    const state = complete(world(), "review_alert");
    const actions = toClientView(state)
      .availableActions.filter((a) => a.eventId === eventId)
      .map((a) => a.id);
    expect(actions).toContain("dismiss_alert");
    expect(actions).toContain("search_knowledge_base");
    const closed = complete(state, "dismiss_alert");
    expect(closed.events.find((e) => e.id === eventId)?.resolution).toMatch(
      /closure.*does not|does not.*verify/i,
    );
    expect(closed.observedArtifactIds).not.toContain("scanner-window");
    expect(closed.ticketNotes[eventId]).toBeUndefined();
  });
  it("requires opening raw-log and baseline sources and carries collection limits into the ticket", () => {
    let state = complete(world(), "review_alert");
    const step = state.rules.tasks["scanner-window-match"]?.steps.find(
      (s) => s.id === "scanner-baseline-check",
    );
    expect(step).toBeDefined();
    state = complete(state, "search_knowledge_base");
    state = complete(state, "document_ticket");
    expect(state.observedArtifactIds).toEqual(
      expect.arrayContaining(["scanner-connection-log", "scanner-baseline"]),
    );
    expect(state.ticketNotes[eventId]).toMatch(/SCAN-FIN-MON/);
    expect(state.ticketNotes[eventId]).toMatch(/sample|collection/i);
    expect(
      complete(state, "dismiss_alert").events.find((e) => e.id === eventId)
        ?.status,
    ).toBe("resolved");
  });
  it("keeps scanner bodies hidden before arrival and produces repeatable outcomes", () => {
    const initial = createInitialWorldState(
      "shift-depth",
      42,
      {},
      loadDefaultCybersecurityPack(),
    );
    expect(
      toClientView(initial).artifacts.some(
        (a) => a.id === "scanner-connection-log",
      ),
    ).toBe(false);
    const run = () =>
      complete(
        complete(
          complete(complete(world(), "review_alert"), "search_knowledge_base"),
          "document_ticket",
        ),
        "dismiss_alert",
      );
    expect(run()).toEqual(run());
    expect(JSON.stringify(toClientView(run()))).not.toMatch(
      /requiredOptionIds|employee-private-travel/,
    );
  });
  it("gives scanner-specific guidance when the login item is settled and a wrap-up when all work is settled", () => {
    const state = world();
    for (const event of state.events)
      if (event.id !== eventId) event.status = "resolved";
    expect(julesDialogue(state, "current_work").text).toMatch(
      /scanner|interruption/i,
    );
    for (const event of state.events) event.status = "resolved";
    expect(julesDialogue(state, "current_work").text).toMatch(
      /wrap|complete shift/i,
    );
    expect(julesDialogue(state, "break_room").text).toMatch(
      /finished|settled|wrap/i,
    );
  });
});
