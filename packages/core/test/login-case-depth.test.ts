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

const eventId = "suspicious-login-1";
function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("Missing case fixture");
  return value;
}
const newRecords = [
  "login-session-timeline",
  "prior-session-1",
  "vpn-context-1",
  "travel-status-1",
  "login-follow-up-guide",
];
function world() {
  return createInitialWorldState(
    "case-depth",
    42,
    {},
    loadDefaultCybersecurityPack(),
  );
}
function complete(initial: WorldState, id: SimulationActionId): WorldState {
  let state = initial;
  const action = toClientView(state).availableActions.find(
    (a) => a.id === id && a.eventId === eventId,
  );
  if (!action?.taskId)
    return applyAction(state, { id, eventId, actorId: "user" }).state;
  const task = required(state.rules.tasks[action.taskId]);
  for (const step of task.steps) {
    for (const source of new Set(
      step.options.flatMap((o) => (o.source ? [o.source.artifactId] : [])),
    )) {
      state = applyWorkplaceInteraction(state, {
        type: "open_artifact",
        artifactId: source,
      }).state;
    }
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

describe("cross-referenced login case", () => {
  it("keeps new record bodies and source quotes private until canonical observation", () => {
    const initial = world();
    const view = toClientView(initial);
    for (const id of newRecords) {
      expect(view.artifacts.find((a) => a.id === id)).toBeDefined();
      expect(view.artifacts.find((a) => a.id === id)).not.toHaveProperty(
        "body",
      );
      const opened = applyWorkplaceInteraction(initial, {
        type: "open_artifact",
        artifactId: id,
      }).state;
      expect(
        toClientView(opened).artifacts.find((a) => a.id === id)?.body,
      ).toBe(initial.artifacts[id]?.body);
    }
    expect(JSON.stringify(view)).not.toMatch(
      /requiredOptionIds|coachOnFailure|employee-private-travel/,
    );
  });

  it("requires opening the independent VPN comparison sources and rejects a weak comparison without cost", () => {
    let state = complete(
      complete(world(), "review_alert"),
      "inspect_login_context",
    );
    const task = required(state.rules.tasks["account-pattern-compare"]);
    const step = required(task.steps.find((s) => s.id === "vpn-cross-check"));
    expect(step).toBeDefined();
    for (const prior of task.steps.slice(0, task.steps.indexOf(step))) {
      for (const id of new Set(
        prior.options.flatMap((o) => (o.source ? [o.source.artifactId] : [])),
      )) {
        state = applyWorkplaceInteraction(state, {
          type: "open_artifact",
          artifactId: id,
        }).state;
      }
      state = applyTaskAttempt(state, {
        eventId,
        taskId: task.id,
        selectedOptionIds: prior.requiredOptionIds,
      }).state;
    }
    const attempt = {
      eventId,
      taskId: task.id,
      selectedOptionIds: step.requiredOptionIds,
    };
    expect(() => applyTaskAttempt(state, attempt)).toThrow(/Open the source/);
    for (const id of new Set(
      step.options.map((o) => required(o.source).artifactId),
    )) {
      state = applyWorkplaceInteraction(state, {
        type: "open_artifact",
        artifactId: id,
      }).state;
    }
    const wrong = applyTaskAttempt(state, {
      ...attempt,
      selectedOptionIds: [
        "baseline-vpn-route",
        "approved-vpn-exit",
        "vpn-display-city",
      ],
    });
    expect(wrong.accepted).toBe(false);
    expect(wrong.state.simClock).toBe(state.simClock);
    expect(wrong.state.workplace).toEqual(state.workplace);
    expect(wrong.state.events).toEqual(state.events);
    expect(applyTaskAttempt(state, attempt).accepted).toBe(true);
  });

  it("keeps a procedure review open, carries comparisons into the ticket, and deterministically escalates", () => {
    const run = () => {
      let state = complete(world(), "review_alert");
      for (const action of [
        "inspect_login_context",
        "inspect_account_history",
        "check_device_inventory",
        "document_ticket",
      ] as const)
        state = complete(state, action);
      state = applyAction(state, {
        id: "search_knowledge_base",
        eventId,
        actorId: "user",
        freeText: "route context",
      }).state;
      expect(state.kbQuery).toBe("route context");
      expect(state.events.find((e) => e.id === eventId)?.status).toBe("active");
      expect(toClientView(state).operationalMessages.join(" ")).toMatch(
        /more evidence/i,
      );
      expect(state.observedArtifactIds).toContain("login-follow-up-guide");
      expect(state.observedArtifactIds).not.toContain("scanner-window");
      expect(
        toClientView(state).availableActions.some(
          (action) =>
            action.eventId === eventId && action.id === "search_knowledge_base",
        ),
      ).toBe(false);
      expect(
        toClientView(state).availableActions.some(
          (action) =>
            action.eventId === eventId && action.id === "escalate_alert",
        ),
      ).toBe(true);
      expect(state.ticketNotes[eventId]).toMatch(/S-0731/);
      expect(state.ticketNotes[eventId]).toMatch(/S-0741/);
      expect(state.ticketNotes[eventId]).toMatch(/VPN/);
      expect(state.ticketNotes[eventId]).toMatch(/HR/);
      state = complete(state, "escalate_alert");
      expect(toClientView(state).operationalMessages.join(" ")).toMatch(
        /session identifiers/i,
      );
      return state;
    };
    expect(run()).toEqual(run());
  });

  it("retains a premature dismissal and applies the delayed, bounded follow-up", () => {
    let state = complete(complete(world(), "review_alert"), "dismiss_alert");
    expect(state.events.find((e) => e.id === eventId)?.resolution).toMatch(
      /VPN/,
    );
    const delayed = required(
      state.ledger.find((entry) => entry.actionId === "dismiss_alert"),
    );
    expect(delayed.applied).toBe(false);
    expect(delayed.description).toMatch(/session identifiers/i);
    // Existing zero-assessment note action advances no clock; the regular scheduler
    // applies the consequence on the next work action at its deterministic due time.
    state = { ...state, simClock: required(delayed.dueAt) };
    state = applyAction(state, {
      id: "update_notebook",
      eventId: "handoff-1",
      actorId: "user",
      freeText: "Resume the case review.",
    }).state;
    expect(state.events.find((e) => e.id === eventId)?.status).toBe(
      "escalated",
    );
    expect(toClientView(state).operationalMessages.join(" ")).toContain(
      delayed.description,
    );
  });
});
