import { describe, expect, it } from "vitest";
import type {
  ActionLogEntry,
  DatasetId,
  QueryFilter,
  SimulationAction,
  SimulationActionId,
  WorldState,
} from "@sim/schemas";
import { ActionLogEntrySchema } from "@sim/schemas";
import { loadDefaultCybersecurityPack } from "../src/index.js";
import {
  applyAction,
  createInitialWorldState,
  discoverEvidenceFacts,
  foldActionLog,
  toClientView,
} from "@sim/core";

// V3 ACCEPTANCE CONTRACT — INTERRUPTION / CONTEXT-SWITCH EXPERIENCE.
//
// Test-only lane. This file deliberately does not change production code,
// pack.yaml, or canonical specifications.
//
// Product contract: an interruption creates another demand on the analyst's
// attention without destroying work already in progress. Context switching is
// demonstrated by canonical actions and preserved state, not explanatory text.
//
// GREEN assertions cover capabilities present today. EXPECTED RED assertions
// intentionally fail until the named production capability exists. Do not
// weaken or skip those assertions when implementing V3.

const HANDOFF = "handoff-1";
const A = "suspicious-login-1";
const B = "routine-alert-1";
const NOTIFICATION = "routine-scanner-arrived";

function world(sessionId = "v3-interruption"): WorldState {
  return createInitialWorldState(sessionId, 7, {}, loadDefaultCybersecurityPack());
}

function action(
  id: SimulationActionId,
  eventId: string,
  freeText?: string,
): SimulationAction {
  return { id, eventId, actorId: "player", ...(freeText ? { freeText } : {}) };
}

function queryAction(datasetId: DatasetId, filters: QueryFilter): SimulationAction {
  return {
    id: "query_records",
    actorId: "player",
    queryPayload: { datasetId, filters },
  };
}

function apply(state: WorldState, ...actions: SimulationAction[]): WorldState {
  return actions.reduce((current, next) => applyAction(current, next).state, state);
}

function event(state: WorldState, id: string) {
  const found = state.events.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`Missing event ${id}`);
  return found;
}

/** A has real investigation progress, but remains active/incomplete. */
function workOnA(start = world()): WorldState {
  return apply(
    start,
    action("read_handoff", HANDOFF),
    action("acknowledge_handoff", HANDOFF),
    action("review_alert", A),
    queryAction("auth", { user: "j.patel@example.com" }),
    action("inspect_login_context", A),
  );
}

/** Cross triggerAt:25 while A remains unfinished; B becomes active. */
function arriveB(start = workOnA()): WorldState {
  // Current action costs: handoff 10m, review 10m, query 2m, login inspection 5m.
  // A is meaningfully in progress at 27m; the next canonical action activates B.
  return apply(start, queryAction("devices", { assignedUser: "j.patel@example.com" }));
}

function log(actions: ActionLogEntry["interaction"][]): ActionLogEntry[] {
  return ActionLogEntrySchema.array().parse(
    actions.map((interaction, index) => ({ sequence: index + 1, interaction })),
  );
}

function actionEntry(next: SimulationAction): ActionLogEntry["interaction"] {
  return { type: "action", action: next };
}

function forbiddenPlayerMetadata(serialized: string): void {
  for (const key of [
    "requiredOptionIds",
    "correctOptionIds",
    "expectedAnswer",
    "expectedEvidence",
    "hiddenAnswer",
    "grading",
    "idealDisposition",
    "priorityAnswer",
    "relevanceMarker",
  ]) {
    expect(serialized).not.toMatch(new RegExp(`\\"${key}\\"`, "i"));
  }
  expect(serialized).not.toMatch(/\bcorrect\b|\bincorrect\b|\bgood choice\b|\bwrong priority\b|\bscore adjustment\b/i);
}

describe("V3 · interruption/context-switch experience", () => {
  it("GREEN — B arrives while A has meaningful unfinished canonical state", () => {
    const beforeArrival = workOnA();
    expect(event(beforeArrival, A).status).toBe("active");
    expect(event(beforeArrival, A).completedActionIds).toEqual(
      expect.arrayContaining(["review_alert", "inspect_login_context"]),
    );
    expect(event(beforeArrival, A).completedActionIds).not.toContain("check_device_inventory");

    const afterArrival = arriveB(beforeArrival);
    expect(event(afterArrival, A).status).toBe("active");
    expect(event(afterArrival, B).status).toBe("active");
    expect(afterArrival.notifications).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: NOTIFICATION, eventId: B, status: "unread" }),
      ]),
    );
    expect(event(afterArrival, A).completedActionIds).toEqual(
      event(beforeArrival, A).completedActionIds,
    );
    expect(event(afterArrival, A).observedArtifactIds).toEqual(
      event(beforeArrival, A).observedArtifactIds,
    );
  });

  it("GREEN — notification arrival does not force navigation or erase A", () => {
    const beforeArrival = workOnA();
    const afterArrival = arriveB(beforeArrival);
    const notification = afterArrival.notifications.find(({ id }) => id === NOTIFICATION);
    if (!notification) throw new Error("Routine notification did not arrive");

    const continued = foldActionLog(afterArrival, [
      {
        sequence: 1,
        interaction: {
          type: "notification_response",
          response: { notificationId: NOTIFICATION, response: "continue" },
        },
      },
    ]);

    expect(continued.notifications.find(({ id }) => id === NOTIFICATION)?.status).toBe(
      "acknowledged",
    );
    expect(event(continued, A).status).toBe("active");
    expect(event(continued, B).status).toBe("active");
    expect(event(continued, A).completedActionIds).toEqual(
      event(beforeArrival, A).completedActionIds,
    );
    expect(event(continued, A).observedArtifactIds).toEqual(
      event(beforeArrival, A).observedArtifactIds,
    );
  });

  it("GREEN — player can continue A or switch to B without priority grading", () => {
    const state = arriveB();
    const view = toClientView(state);
    const aActions = view.availableActions.filter(({ eventId }) => eventId === A);
    const bActions = view.availableActions.filter(({ eventId }) => eventId === B);

    expect(aActions.map(({ id }) => id)).toContain("inspect_account_history");
    expect(bActions.map(({ id }) => id)).toContain("review_alert");

    // Continue A briefly: this is a legal player choice while B waits.
    const continuedA = apply(state, action("inspect_account_history", A));
    expect(event(continuedA, A).completedActionIds).toContain("inspect_account_history");
    expect(event(continuedA, B).status).toBe("active");

    // Fresh branch switches to B instead: A remains unfinished, not graded.
    const switchedB = apply(state, action("review_alert", B));
    expect(event(switchedB, A).status).toBe("active");
    expect(event(switchedB, B).completedActionIds).toContain("review_alert");
    expect(switchedB.ledger.map(({ description }) => description).join("\n")).not.toMatch(
      /correct|incorrect|priority|score/i,
    );
  });

  it("GREEN — A context and B context both survive a real switch", () => {
    let state = arriveB();
    const aBeforeSwitch = {
      completedActionIds: [...event(state, A).completedActionIds],
      observedArtifactIds: [...state.observedArtifactIds],
      queryHistory: state.queryHistory.map((entry) => structuredClone(entry)),
    };

    // Work B, then return to A and perform a legitimate next A action.
    state = apply(state, action("review_alert", B));
    const bProgress = [...event(state, B).completedActionIds];
    state = apply(state, action("inspect_account_history", A));

    expect(event(state, A).status).toBe("active");
    expect(event(state, A).completedActionIds).toEqual(
      expect.arrayContaining([...aBeforeSwitch.completedActionIds, "inspect_account_history"]),
    );
    expect(state.observedArtifactIds).toEqual(
      expect.arrayContaining(aBeforeSwitch.observedArtifactIds),
    );
    expect(state.queryHistory.slice(0, aBeforeSwitch.queryHistory.length)).toEqual(
      aBeforeSwitch.queryHistory,
    );
    expect(event(state, B).status).toBe("active");
    expect(event(state, B).completedActionIds).toEqual(bProgress);
  });

  it("GREEN — ticket notes, query history, and observed records remain player-visible without hidden state", () => {
    let state = arriveB();
    state = apply(
      state,
      action("update_ticket_notes", A, "Auth context checked; device attribution remains open."),
      action("update_notebook", A, "Resume with account history, then compare device ownership."),
      action("review_alert", B),
      queryAction("scanner", { runId: "RUN-FIN-031" }),
    );

    expect(state.ticketNotes[A]).toContain("device attribution remains open");
    expect(state.notebook).toContain("Resume with account history");
    expect(state.queryHistory.at(-1)?.datasetId).toBe("scanner");
    expect(state.observedArtifactIds).toContain("scanner-alert");
    forbiddenPlayerMetadata(JSON.stringify(toClientView(state)));
  });

  it("GREEN — same A → B → A action sequence replays identical canonical state", () => {
    const script: ActionLogEntry["interaction"][] = [
      actionEntry(action("read_handoff", HANDOFF)),
      actionEntry(action("acknowledge_handoff", HANDOFF)),
      actionEntry(action("review_alert", A)),
      actionEntry(queryAction("auth", { user: "j.patel@example.com" })),
      actionEntry(action("inspect_login_context", A)),
      actionEntry(queryAction("devices", { assignedUser: "j.patel@example.com" })),
      {
        type: "notification_response",
        response: { notificationId: NOTIFICATION, response: "continue" },
      },
      actionEntry(action("review_alert", B)),
      actionEntry(action("inspect_account_history", A)),
    ];

    let direct = world("v3-replay");
    for (const interaction of script) {
      if (interaction.type === "action") direct = applyAction(direct, interaction.action).state;
      else if (interaction.type === "notification_response") {
        direct = foldActionLog(direct, [{ sequence: 1, interaction }]);
      }
    }
    const replayed = foldActionLog(world("v3-replay"), log(script));

    expect(replayed).toEqual(direct);
    expect(toClientView(replayed)).toEqual(toClientView(direct));
    expect(replayed.queryHistory).toEqual(direct.queryHistory);
    expect(event(replayed, A).completedActionIds).toEqual(event(direct, A).completedActionIds);
    expect(event(replayed, B).completedActionIds).toEqual(event(direct, B).completedActionIds);
  });

  it("EXPECTED RED — canonical selected work item survives notification and switch", () => {
    const state = arriveB();
    const selected = (state as WorldState & { selectedWorkItemId?: string }).selectedWorkItemId;
    if (selected !== A) {
      throw new Error(
        "EXPECTED RED — V3 IMPLEMENTATION REQUIRED: canonical active/selected Work Item " +
          "ownership is absent. Notification arrival currently exposes both active events " +
          "but has no server-owned selected work item to prove focus remains on A or changes " +
          "only after a player switch. Smallest production change: add deterministic selected " +
          "work-item state, preserve it through notification responses, and update it only via " +
          "an explicit open/switch action.",
      );
    }
    expect(selected).toBe(A);
  });

  it("EXPECTED RED — A's Evidence Facts survive B work and resume", () => {
    const state = arriveB();
    const facts = discoverEvidenceFacts(state);
    if (facts.length === 0) {
      throw new Error(
        "EXPECTED RED — V3 IMPLEMENTATION REQUIRED: current cybersecurity pack exposes no " +
          "authored Evidence Facts for A, so interruption replay can preserve query/artifact " +
          "substrate but cannot prove discovered facts survive a switch. Smallest production " +
          "change: author V3-relevant Evidence Fact definitions in the career pack and ensure " +
          "their canonical discovery state is instance-owned, replayed, and scoped to A.",
      );
    }
    expect(facts.every((fact) => fact.attachedToTicketIds.length === 0)).toBe(true);
  });
});
