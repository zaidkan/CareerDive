import { describe, expect, it } from "vitest";
import { loadDefaultCybersecurityPack } from "../src/index.js";
import type {
  ActionLogEntry,
  QueryFilter,
  SimulationAction,
  SimulationActionId,
  WorldState,
} from "@sim/schemas";
import { ActionLogEntrySchema } from "@sim/schemas";
import {
  applyAction,
  createInitialWorldState,
  foldActionLog,
  toClientView,
} from "@sim/core";

/**
 * P3-T01 acceptance contract — test only.
 *
 * These tests deliberately drive the real pack through canonical actions. They
 * must stay independent from task option IDs: a player should progress by
 * opening the handoff, reviewing the alert, and inspecting/querying records,
 * not by selecting an authored answer key.
 */

const HANDOFF_EVENT_ID = "handoff-1";
const LOGIN_EVENT_ID = "suspicious-login-1";

function world(sessionId = "p3-t01"): WorldState {
  return createInitialWorldState(
    sessionId,
    7,
    {},
    loadDefaultCybersecurityPack(),
  );
}

function action(id: SimulationActionId, eventId: string): SimulationAction {
  return { id, eventId, actorId: "player" };
}

function queryAction(
  datasetId: "auth" | "devices" | "vpn",
  filters: QueryFilter,
): SimulationAction {
  return {
    id: "query_records",
    actorId: "player",
    queryPayload: { datasetId, filters },
  };
}

function apply(state: WorldState, next: SimulationAction): WorldState {
  return applyAction(state, next).state;
}

function event(state: WorldState, eventId: string) {
  const found = state.events.find(({ id }) => id === eventId);
  if (!found) throw new Error(`event ${eventId} missing`);
  return found;
}

function investigationActions(order: "auth-first" | "device-first") {
  const orderedChecks =
    order === "auth-first"
      ? [
          action("inspect_account_history", LOGIN_EVENT_ID),
          action("check_device_inventory", LOGIN_EVENT_ID),
        ]
      : [
          action("check_device_inventory", LOGIN_EVENT_ID),
          action("inspect_account_history", LOGIN_EVENT_ID),
        ];
  const orderedQueries =
    order === "auth-first"
      ? [
          queryAction("auth", { sessionId: "S-0741" }),
          queryAction("devices", { deviceLabel: "unknown-laptop-17" }),
        ]
      : [
          queryAction("devices", { deviceLabel: "unknown-laptop-17" }),
          queryAction("auth", { sessionId: "S-0741" }),
        ];

  return [
    action("read_handoff", HANDOFF_EVENT_ID),
    action("acknowledge_handoff", HANDOFF_EVENT_ID),
    action("review_alert", LOGIN_EVENT_ID),
    action("inspect_login_context", LOGIN_EVENT_ID),
    ...orderedChecks,
    ...orderedQueries,
    queryAction("vpn", {
      user: "j.patel@example.com",
      sourceIp: "203.0.113.44",
      windowStartSimMinutes: 440,
      windowEndSimMinutes: 460,
    }),
  ];
}

function replayEntries(actions: SimulationAction[]): ActionLogEntry[] {
  return ActionLogEntrySchema.array().parse(
    actions.map((next, index) => ({
      sequence: index + 1,
      interaction: { type: "action", action: next },
    })),
  );
}

describe("P3-T01 investigation-driven handoff and alert flow", () => {
  it("requires analyst work, not a hidden answer selection, to advance", () => {
    const initial = world();
    const initialView = toClientView(initial);
    const handoffAction = initialView.availableActions.find(
      ({ id, eventId }) =>
        id === "read_handoff" && eventId === HANDOFF_EVENT_ID,
    );
    const alertAction = initialView.availableActions.find(
      ({ id, eventId }) => id === "review_alert" && eventId === LOGIN_EVENT_ID,
    );

    expect(handoffAction).toBeDefined();
    expect(alertAction).toBeDefined();
    expect(handoffAction?.taskId).toBeUndefined();
    expect(alertAction?.taskId).toBeUndefined();
    expect(JSON.stringify(initialView)).not.toMatch(
      /requiredOptionIds|correctOptionIds|expectedAnswer/i,
    );

    // Career-feel contract: direct workplace actions must produce canonical
    // progress. No task-attempt or select-the-correct-clue call is involved.
    const afterHandoff = apply(
      initial,
      action("read_handoff", HANDOFF_EVENT_ID),
    );
    expect(afterHandoff.observedArtifactIds).toContain("handoff-email");
    expect(event(afterHandoff, HANDOFF_EVENT_ID).status).toBe("active");
    expect(
      toClientView(afterHandoff).availableActions.some(
        ({ id, eventId }) =>
          id === "acknowledge_handoff" && eventId === HANDOFF_EVENT_ID,
      ),
    ).toBe(true);

    const afterAlert = apply(
      apply(afterHandoff, action("acknowledge_handoff", HANDOFF_EVENT_ID)),
      action("review_alert", LOGIN_EVENT_ID),
    );
    expect(afterAlert.observedArtifactIds).toContain("suspicious-login-alert");
    expect(event(afterAlert, LOGIN_EVENT_ID).status).toBe("active");
    expect(event(afterAlert, LOGIN_EVENT_ID).completedActionIds).toContain(
      "review_alert",
    );
    expect(afterAlert.taskProgress).toEqual({});
  });

  it.each(["auth-first", "device-first"] as const)(
    "supports reasonable %s investigation ordering",
    (order) => {
      const actions = investigationActions(order);
      const final = actions.reduce(apply, world(`p3-t01-${order}`));
      const login = event(final, LOGIN_EVENT_ID);

      expect(login.status).toBe("active");
      expect(login.completedActionIds).toEqual(
        expect.arrayContaining([
          "review_alert",
          "inspect_login_context",
          "inspect_account_history",
          "check_device_inventory",
        ]),
      );
      expect(final.observedArtifactIds).toEqual(
        expect.arrayContaining([
          "handoff-email",
          "suspicious-login-alert",
          "login-context-1",
          "account-history-1",
          "device-inventory-1",
        ]),
      );
      expect(final.queryHistory.map(({ datasetId }) => datasetId)).toEqual(
        order === "auth-first"
          ? ["auth", "devices", "vpn"]
          : ["devices", "auth", "vpn"],
      );
      expect(final.queryHistory.at(-1)?.resultIds).toEqual([]);
      expect(
        toClientView(final).availableActions.map(({ id }) => id),
      ).not.toContain("complete_shift");
    },
  );

  it("keeps a superficial opening incomplete", () => {
    let state = apply(world(), action("read_handoff", HANDOFF_EVENT_ID));
    state = apply(state, action("acknowledge_handoff", HANDOFF_EVENT_ID));
    state = apply(state, action("review_alert", LOGIN_EVENT_ID));

    expect(event(state, LOGIN_EVENT_ID).status).toBe("active");
    expect(event(state, LOGIN_EVENT_ID).completedActionIds).toEqual([
      "review_alert",
    ]);
    expect(
      toClientView(state).availableActions.map(({ id }) => id),
    ).not.toEqual(
      expect.arrayContaining(["document_ticket", "escalate_alert"]),
    );
  });

  it("keeps query retrieval separate from record observation and accepts zero results", () => {
    const initial = world();
    const beforeObservation = [...initial.observedArtifactIds];
    const queried = apply(
      initial,
      queryAction("devices", { deviceLabel: "unknown-laptop-17" }),
    );
    expect(queried.queryHistory.at(-1)?.resultIds).toEqual([
      "unknown-laptop-17",
    ]);
    expect(queried.observedArtifactIds).toEqual(beforeObservation);

    const zero = apply(
      queried,
      queryAction("vpn", {
        user: "j.patel@example.com",
        sourceIp: "203.0.113.44",
        windowStartSimMinutes: 440,
        windowEndSimMinutes: 460,
      }),
    );
    expect(zero.queryHistory.at(-1)?.resultIds).toEqual([]);
    expect(zero.queryHistory.at(-1)?.totalCount).toBe(0);
    expect(zero.queryHistory.at(-1)?.truncated).toBe(false);
  });

  it("does not expose quiz keys, hidden artifact relations, or correctness feedback", () => {
    const final = investigationActions("auth-first").reduce(
      apply,
      world("p3-t01-hidden-state"),
    );
    const view = toClientView(final);
    const serialized = JSON.stringify(view);

    expect(serialized).not.toMatch(
      /requiredOptionIds|correctOptionIds|expectedAnswer|templateId|relevance/i,
    );
    // P3-T01 releases handoff + A-1042 inspection gates; routine ticket tasks remain gated
    // by design. Verify no hidden artifact relation leak on client artifacts.
    expect(view.artifacts.every((a) => !("relatedArtifactIds" in a))).toBe(true);
    expect(view.operationalMessages.join(" ")).not.toMatch(
      /\b(correct|incorrect|right answer|wrong answer|clue found)\b/i,
    );
  });

  it("replays the same investigation history to equivalent progression", () => {
    const actions = investigationActions("auth-first");
    const entries = replayEntries(actions);
    const first = foldActionLog(world("p3-t01-replay"), entries);
    const second = foldActionLog(world("p3-t01-replay"), entries);

    expect(first).toEqual(second);
    expect(toClientView(first)).toEqual(toClientView(second));
    expect(first.queryHistory).toEqual(second.queryHistory);
    expect(event(first, LOGIN_EVENT_ID).completedActionIds).toEqual(
      event(second, LOGIN_EVENT_ID).completedActionIds,
    );
  });
});
