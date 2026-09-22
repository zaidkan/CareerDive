import { describe, expect, it } from "vitest";
import type {
  DatasetId,
  QueryFilter,
  SimulationAction,
  SimulationActionId,
  WorldState,
} from "@sim/schemas";
import { loadDefaultCybersecurityPack } from "../src/index.js";
import { applyAction, createInitialWorldState, discoverEvidenceFacts } from "@sim/core";

// ---------------------------------------------------------------------------
// V3 ACCEPTANCE CONTRACT — INTERRUPTION / CONTEXT-SWITCH EXPERIENCE (RED ONLY).
//
// By-design RED markers moved out of the default (CI-gating) suite into a
// *.red.test.ts file so `pnpm test` can be green while these capabilities are
// still missing. Run with `pnpm test:red`; each test fails today with a
// descriptive marker naming the smallest production behavior that turns it
// green. When a capability lands, the marker stops throwing and the test turns
// green; then rename the file off `.red.test.ts` and fold the assertion back
// into the default V3 suite.
// ---------------------------------------------------------------------------

const HANDOFF = "handoff-1";
const A = "suspicious-login-1";

function world(sessionId = "v3-interruption-red"): WorldState {
  return createInitialWorldState(sessionId, 7, {}, loadDefaultCybersecurityPack());
}

function action(
  id: SimulationActionId,
  eventId: string,
): SimulationAction {
  return { id, eventId, actorId: "player" };
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

/** A is meaningfully in progress; the next canonical action activates B. */
function arriveB(start = workOnA()): WorldState {
  return apply(start, queryAction("devices", { assignedUser: "j.patel@example.com" }));
}

describe("V3 · interruption/context-switch experience (RED)", () => {
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