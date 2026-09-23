import { describe, expect, it } from "vitest";
import type {
  DatasetId,
  QueryFilter,
  SimulationAction,
  SimulationActionId,
  WorldState,
} from "@sim/schemas";
import { loadDefaultCybersecurityPack } from "../src/index.js";
import {
  applyAction,
  createInitialWorldState,
  discoverEvidenceFacts,
} from "@sim/core";
import * as core from "@sim/core";

// ---------------------------------------------------------------------------
// SOC CAREER-EXPERIENCE VERTICAL SLICE — RED CONTRACTS ONLY.
//
// By-design RED markers moved out of the default (CI-gating) suite into a
// *.red.test.ts file so `pnpm test` can be green while these capabilities are
// still missing. Run with `pnpm test:red`; each test fails today with a
// descriptive marker naming the smallest production behavior that turns it
// green. When a capability lands, the marker stops throwing and the test turns
// green; then rename the file off `.red.test.ts` and fold the assertion back
// into the default slice suite.
//
// Canonical source: docs/superpowers/specs/soc-structured-content-pack.md and
// docs/superpowers/specs/interactivity-and-content-depth-design.md.
// ---------------------------------------------------------------------------

const HANDOFF = "handoff-1";
const LOGIN = "suspicious-login-1";

function world(sessionId = "soc-slice-red"): WorldState {
  return createInitialWorldState(sessionId, 7, {}, loadDefaultCybersecurityPack());
}

function action(
  id: SimulationActionId,
  eventId: string,
): SimulationAction {
  return { id, eventId, actorId: "player" };
}

function queryAction(datasetId: DatasetId, filters: QueryFilter): SimulationAction {
  return { id: "query_records", actorId: "player", queryPayload: { datasetId, filters } };
}

function perform(world: WorldState, ...next: SimulationAction[]): WorldState {
  let state = world;
  for (const n of next) {
    state = applyAction(state, n).state;
  }
  return state;
}

/** Head of shift + main-case investigation through all four inspection acts. */
function fullyInvestigated(start: WorldState): WorldState {
  return perform(
    start,
    action("read_handoff", HANDOFF),
    action("acknowledge_handoff", HANDOFF),
    action("review_alert", LOGIN),
    queryAction("auth", { user: "j.patel@example.com" }),
    queryAction("devices", { assignedUser: "j.patel@example.com" }),
    queryAction("alerts", { state: "open" }),
    action("inspect_login_context", LOGIN),
    action("inspect_account_history", LOGIN),
    action("check_device_inventory", LOGIN),
  );
}

function requireAuthoredEvidenceFacts(state: WorldState): Record<string, unknown> {
  const definitions = state.rules.evidenceFacts;
  if (definitions && Object.keys(definitions).length > 0) return definitions;
  throw new Error(
    "RED[social-slice §6]: canonical Evidence Facts must be producible through " +
      "real shift play. Today the real pack ships zero `scenario.evidenceFacts` " +
      "definitions AND the engine exposes no record-open act for structured-dataset " +
      "rows, so a fully investigated A-1042 world still yields `[]` from " +
      "`discoverEvidenceFacts`. Smallest production behavior: author the pack " +
      "evidenceFacts AND land a canonical open/observe act for dataset record IDs " +
      "so provenance records resolve.",
  );
}

function requireStructuredTicketSubstrate(state: WorldState): Record<string, unknown> {
  const store = (state as unknown as { structuredTickets?: unknown }).structuredTickets;
  if (store !== undefined) return store as Record<string, unknown>;
  throw new Error(
    "RED[social-slice §8]: documentation must have a canonical substrate. Today " +
      "`document_ticket` is gated behind a legacy option-based task and writes only " +
      "free-text ticketNotes; there is no schema-backed structured-ticket store that " +
      "survives applyAction/foldActionLog, attaches only discovered Evidence Fact IDs, " +
      "and records disposition without a verdict. Smallest production behavior: land " +
      "the structured-ticket store/reader/validator (frozen contract already at " +
      "packages/schemas/src/ticket.ts).",
  );
}

function requireTopicScopedCoworkerGuidance(): object {
  const coreAny = core as unknown as { managerDialogueForQuestion?: unknown };
  if (typeof coreAny.managerDialogueForQuestion === "function") {
    return coreAny.managerDialogueForQuestion;
  }
  throw new Error(
    "RED[social-slice §9]: coworker guidance must be scoped to the player's actual " +
      "question. Today `ask_manager` carries no bounded question/topic payload and " +
      "the reply is a single canned template string per event, so a player cannot " +
      "meaningfully depend on Morgan/Jules for a specific operational question. " +
      "Smallest production behavior: accept an optional bounded question/topic on " +
      "the manager interaction, resolved deterministically to topic-bound guidance " +
      "from public state only.",
  );
}

describe("section 6 · query ≠ observation ≠ Evidence Fact (RED)", () => {
  it("EXPECTED RED — real shift play produces canonical Evidence Facts", () => {
    const state = fullyInvestigated(world());
    const definitions = requireAuthoredEvidenceFacts(state);
    const discovered = discoverEvidenceFacts(state);
    expect(definitions).toBeDefined();
    expect(discovered.length).toBeGreaterThan(0);
    for (const entry of discovered) {
      expect(entry.attachedToTicketIds).toEqual([]);
    }
  });
});

describe("section 8 · documentation substrate (RED)", () => {
  it("EXPECTED RED — documentation requires a canonical structured substrate", () => {
    const state = fullyInvestigated(world());
    const store = requireStructuredTicketSubstrate(state);
    expect(Object.keys(store)).toContain(LOGIN);
  });
});

describe("section 9 · coworker dependency (RED)", () => {
  it("EXPECTED RED — coworker guidance is scoped to the player's actual question", () => {
    expect(requireTopicScopedCoworkerGuidance()).toBeDefined();
  });
});