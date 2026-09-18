import { describe, expect, it } from "vitest";
import type {
  AuthRecord,
  DatasetId,
  DeviceRecord,
  EvidenceFactDefinition,
  EvidenceFactDiscoveryState,
  QueryFilter,
  SimulationAction,
  StructuredTicket,
  TicketStatus,
  VpnRecord,
  WorldState,
} from "@sim/schemas";
import {
  ActionLogEntrySchema,
  EvidenceFactDefinitionSchema,
  EvidenceFactDiscoveryStateSchema,
  StructuredTicketSchema,
  TicketStatusSchema,
  WorldStateSchema,
} from "@sim/schemas";
import * as core from "../src/index.js";
import { applyAction, foldActionLog } from "../src/index.js";

// ---------------------------------------------------------------------------
// PHASE 4 RED-TEST FOUNDATION — structured ticket / meaningful documentation.
//
// TEST-ONLY lane. No production runtime. No production edits. No schema edits.
//
// Canonical sources:
// - docs/superpowers/specs/interactivity-and-content-depth-design.md §5.3
//   (Case Notebook and Ticket), §6.4 (Discovery state), §6.7 (Documentation
//   state), §7.5 (Ticket/case dataset), Phase 4 RED list.
// - docs/superpowers/specs/soc-structured-content-pack.md §14.4/§14.6/§20
//   (operational acknowledgements, handoff fields, "no grade" forbiddance).
// - packages/schemas/src/ticket.ts (frozen types-only contract: status enum,
//   structured fields) + packages/schemas/src/evidence-facts.ts (discovered
//   Evidence Facts) + packages/core/src/evidence-facts.ts (Phase 3 pure
//   discovery evaluator, now real).
//
// INTENTIONAL RED: Phase 4 structured-ticket runtime does not exist. The P3
// discovery evaluator (`discoverEvidenceFacts`) IS real and reused here; the
// structured-ticket store + reader + legality validator are NOT. Tests that
// depend on them fail with a RED marker, clearly separated from the GREEN
// schema-contract + invariant tests below.
//
// PHASE 4 CONTRACT ASSUMPTIONS (from canonical spec; flagged for implementers):
// 1. Structured tickets are canonical session state, owned by the backend
//    (spec §5.3, §6.7). Phase 4 must add a schema-backed instance store (the
//    tests model `state.structuredTickets` keyed by ticketId); it must survive
//    `applyAction`/`foldActionLog` re-parsing (WorldStateSchema currently
//    strips unknown keys — Phase 4 must land the field in the schema).
// 2. Every ticket carries a stable canonical association to the work item(s)
//    it documents (`linkedWorkItemIds`). Detached UI text is not a ticket.
// 3. Evidence attachment references DISCOVERED Evidence Fact IDs only
//    (spec §5.3: "referenced evidence must have been discovered"). Naming an
//    ID never attaches an undiscovered fact (spec §6.10: never serialize
//    undiscovered evidence definitions).
// 4. Free text is annotation only (spec §5.3 acceptance: "free text never
//    becomes authoritative world truth"; ticket.ts docstring). Writing
//    "VPN confirmed" must not create or mutate any Evidence Fact.
// 5. Statuses come ONLY from the frozen `TicketStatusSchema` enum; disposition
//    is `disposition` (intended action), not a grade.
// 6. No grading vocabulary anywhere in ticket state: no correct/incorrect/
//    score/expectedEvidence/hidden answer/ideal disposition.
// 7. Attachments stay Evidence Facts, never assessment `EvidenceSignal`.
// 8. Determinism: same canonical actions -> same ticket state, same attachment
//    ordering, same structured fields. No wall clock, no RNG, no client state.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// §2 synthetic fixtures — canonical subset (mirror evidence-fact-discovery
// RED tests; enough substrate to discover one real Evidence Fact).
// ---------------------------------------------------------------------------

const AUTH_ROWS: AuthRecord[] = [
  {
    id: "AUTH-0731-PATEL",
    datasetId: "auth",
    simMinutes: 451,
    user: "j.patel@example.com",
    sourceIp: "198.51.100.20",
    deviceLabel: "corp-macbook-patel",
    method: "password + extra_identity_check",
    result: "success",
    sessionId: "S-0731",
    vpnConnectionId: "V-218",
    relatedRecordIds: [],
  },
];

const VPN_ROWS: VpnRecord[] = [
  {
    id: "V-218",
    datasetId: "vpn",
    simMinutes: 449,
    vpnId: "V-218",
    user: "j.patel@example.com",
    startSimMinutes: 449,
    endSimMinutes: 485,
    exitIp: "198.51.100.20",
    deviceLabel: "corp-macbook-patel",
    sessionId: "S-0731",
    status: "active",
    relatedRecordIds: [],
  },
];

const DEVICE_ROWS: DeviceRecord[] = [
  {
    id: "unknown-laptop-17",
    datasetId: "devices",
    deviceLabel: "unknown-laptop-17",
    deviceClass: "laptop",
    enrolled: false,
    assignmentState: "unassigned",
    tags: [],
    relatedRecordIds: [],
  },
];

const FACT_DEVICE_UNENROLLED: EvidenceFactDefinition = {
  id: "fact-device-unenrolled",
  statement:
    "unknown-laptop-17 has no enrollment or managed-device check-in in the exact-label inventory.",
  relatedWorkItemIds: ["suspicious-login-1"],
  provenance: {
    kind: "single_record_open",
    recordIds: ["unknown-laptop-17"],
  },
  attachable: true,
};

// A second authored definition that is NEVER discovered in these fixtures —
// used to prove naming an ID is not attachment (spec §5.3 / §6.10).
const FACT_FLAGGED_SESSION_DEVICE: EvidenceFactDefinition = {
  id: "fact-flagged-session-device",
  statement:
    "Flagged session S-0741 used unknown-laptop-17 directly from 203.0.113.44.",
  relatedWorkItemIds: ["suspicious-login-1"],
  provenance: {
    kind: "multi_record_open",
    recordIds: ["AUTH-0741-PATEL", "unknown-laptop-17"],
  },
  attachable: true,
};

// ---------------------------------------------------------------------------
// §3 helpers — canonical state + Phase 4 contract shims.
// ---------------------------------------------------------------------------

const QUERY_MINUTES = 2;

function stateWithDatasets(): WorldState {
  return WorldStateSchema.parse({
    sessionId: "sess-1",
    sessionKind: "assessed",
    seed: 7,
    simClock: 400,
    currentLocationId: "desk",
    locations: {},
    facts: {},
    npcs: {},
    events: [],
    ledger: [],
    completedActionIds: [],
    pacingMode: "standard",
    rules: {
      actions: {
        query_records: {
          id: "query_records",
          systemId: "alert_dashboard",
          label: "Query records",
          description: "Run a structured record query.",
          simulatedMinutes: QUERY_MINUTES,
          energyCost: 0,
          tracksCompletion: false,
        },
      },
      eventTemplates: {},
      tasks: {},
      notifications: {},
      datasets: {
        auth: { datasetId: "auth", records: AUTH_ROWS },
        vpn: { datasetId: "vpn", records: VPN_ROWS },
        devices: { datasetId: "devices", records: DEVICE_ROWS },
      },
    },
    artifacts: {},
    observedArtifactIds: [],
    ticketNotes: {},
    notebook: "",
    kbQuery: "",
    taskProgress: {},
    notifications: [],
    queryHistory: [],
    workplace: {
      energy: { current: 100, max: 100 },
      carriedSnackBites: 0,
      fridgeSnackBars: 3,
      fridgeOpen: false,
      coffeeServings: 3,
      coffeeStage: "idle",
      julesTopicsSeen: [],
      emergencyRecoveryUsed: false,
    },
    hidden: {
      stress: 0,
      fatigue: 0,
      trust: {},
      reputation: 0,
      cognitiveLoad: 0,
      taskBacklog: 0,
      accuracy: 0,
      riskExposure: 0,
    },
  });
}

function queryAction(
  filters: QueryFilter = {},
  datasetId: DatasetId = "auth",
): SimulationAction {
  return {
    id: "query_records",
    actorId: "player",
    queryPayload: { datasetId, filters },
  };
}

function query(
  state: WorldState,
  datasetId: DatasetId,
  filters: QueryFilter,
): WorldState {
  return applyAction(state, queryAction(filters, datasetId)).state;
}

/**
 * PHASE 3 CONTRACT SHIM (REAL IMPLEMENTATION) — authored Evidence Fact
 * definitions snapshotted into rules, parsed through the frozen schema. Phase 3
 * landed `ScenarioRulesSchema.evidenceFacts`, so this survives re-parsing.
 */
function installFactDefinitions(
  state: WorldState,
  definitions: EvidenceFactDefinition[],
): WorldState {
  const rules = state.rules as unknown as {
    evidenceFacts: Record<string, EvidenceFactDefinition>;
  };
  rules.evidenceFacts = Object.fromEntries(
    definitions.map((definition) => [
      definition.id,
      EvidenceFactDefinitionSchema.parse(definition),
    ]),
  );
  return state;
}

/**
 * PHASE 3 CONTRACT SHIM (REAL OBSERVED-GATING) — querying never marks rows
 * observed (Q-HIDE-04); discovery requires actually opening the record.
 */
function openRecords(state: WorldState, ...recordIds: string[]): WorldState {
  for (const recordId of recordIds) {
    if (!state.observedArtifactIds.includes(recordId)) {
      state.observedArtifactIds.push(recordId);
    }
  }
  return state;
}

/**
 * PHASE 3 discovery reader — REAL (exported from @sim/core since 5361c7d).
 * Pure evaluator: same canonical state in -> same discovery out.
 */
function discover(state: WorldState): EvidenceFactDiscoveryState[] {
  return EvidenceFactDiscoveryStateSchema.array()
    .parse(core.discoverEvidenceFacts(state))
    .slice();
}

// ---------------------------------------------------------------------------
// PHASE 4 CONTRACT SHIMS (RED) — model the store the Phase 4 runtime must land.
// ---------------------------------------------------------------------------

/**
 * PHASE 4 CONTRACT SHIM (RED) — models a schema-backed canonical ticket store
 * keyed by ticketId (spec §5.3, §6.7; suggested dataset §7.5). Phase 4 must
 * add this field to WorldStateSchema so it survives applyAction/foldActionLog;
 * today WorldStateSchema strips it on re-parse. These shims therefore mutate
 * the state AFTER any replay/applyAction of interest, and the RED reader below
 * is the surface Phase 4 must make canonical.
 */
interface StructuredTicketStore {
  structuredTickets?: Record<string, StructuredTicket>;
}

function installTicket(
  state: WorldState,
  ticket: StructuredTicket,
): WorldState {
  const parsed = StructuredTicketSchema.parse(ticket);
  const store = state as unknown as StructuredTicketStore;
  store.structuredTickets ??= {};
  store.structuredTickets[parsed.ticketId] = parsed;
  return state;
}

/**
 * PHASE 4 CONTRACT READER (RED) — the pure structured-ticket reader Phase 4
 * must export from @sim/core. Absent today: every call throws, so every test
 * that needs it is intentionally RED. When Phase 4 lands, keep this signature.
 */
type TicketMapFn = (state: WorldState) => Record<string, StructuredTicket>;

function readStructuredTickets(state: WorldState): Record<string, StructuredTicket> {
  const fn = (
    core as unknown as { readStructuredTickets?: TicketMapFn }
  ).readStructuredTickets;
  if (!fn) {
    throw new Error(
      "RED[Phase 4]: @sim/core does not export `readStructuredTickets` yet. " +
        "Phase 4 must expose this pure reader over the canonical structured " +
        "ticket store (schema-backed, replay-preserved); do not satisfy these " +
        "tests by editing Phase 2/3 runtime.",
    );
  }
  const tickets = fn(state);
  return Object.fromEntries(
    Object.entries(tickets).map(([ticketId, ticket]) => [
      ticketId,
      StructuredTicketSchema.parse(ticket),
    ]),
  );
}

/**
 * PHASE 4 CONTRACT VALIDATOR (RED) — the pure legality validator Phase 4 must
 * export from @sim/core. Backend validates only structural/legal constraints
 * (spec §5.3): referenced evidence discovered, referenced work items exist,
 * status transition legal, no duplicates, no grading vocabulary. It never
 * grades prose semantically (spec §5.3 "The backend must not grade prose").
 */
type TicketViolationsFn = (
  state: WorldState,
  ticketId: string,
) => string[];

function validateStructuredTicket(
  state: WorldState,
  ticketId: string,
): string[] {
  const fn = (
    core as unknown as { validateStructuredTicket?: TicketViolationsFn }
  ).validateStructuredTicket;
  if (!fn) {
    throw new Error(
      "RED[Phase 4]: @sim/core does not export `validateStructuredTicket` yet. " +
        "Phase 4 must expose this pure structural/legal validator over the " +
        "canonical ticket store (undiscovered attachment, missing work item, " +
        "illegal status, duplicate attachment); do not satisfy these tests by " +
        "editing Phase 2/3 runtime.",
    );
  }
  return fn(state, ticketId).map(String);
}

function byTicketId(
  tickets: Record<string, StructuredTicket>,
  ticketId: string,
): StructuredTicket | undefined {
  return tickets[ticketId];
}

function discoveredFactIds(state: WorldState): Set<string> {
  return new Set(discover(state).map((entry) => entry.factId));
}

// ---------------------------------------------------------------------------
// §4 GREEN schema-contract foundation (no runtime needed).
// ---------------------------------------------------------------------------

describe("P4-0 frozen ticket schema contract (GREEN)", () => {
  const VALID: StructuredTicket = {
    ticketId: "suspicious-login-1",
    linkedWorkItemIds: ["suspicious-login-1"],
    status: "in_progress",
    entityRefs: ["j.patel@example.com", "unknown-laptop-17"],
    evidenceFactIds: ["fact-device-unenrolled"],
    disposition: "review identity containment",
    noteText: "Checked auth history, device inventory, and VPN coverage.",
    followUp: "Ask Morgan for account containment review.",
  };

  it("full valid ticket parses through the frozen schema", () => {
    expect(() => StructuredTicketSchema.parse(VALID)).not.toThrow();
  });

  it("accepts every canonical status from the frozen enum", () => {
    for (const status of ["open", "in_progress", "pending_review", "closed", "escalated"]) {
      expect(TicketStatusSchema.parse(status)).toBe(status);
    }
  });

  it("rejects a status outside the canonical enum", () => {
    expect(() => TicketStatusSchema.parse("complete")).toThrow();
    expect(() => TicketStatusSchema.parse("approved")).toThrow();
  });

  it("rejects grading / answer-key vocabulary by construction", () => {
    for (const bad of [
      { ...VALID, correct: true },
      { ...VALID, incorrect: false },
      { ...VALID, score: 1 },
      { ...VALID, expectedEvidence: ["x"] },
      { ...VALID, hiddenAnswer: "y" },
      { ...VALID, idealDisposition: "escalate" },
      { ...VALID, grade: "pass" },
    ]) {
      expect(() => StructuredTicketSchema.parse(bad)).toThrow();
    }
  });

  it("rejects EvidenceSignal-shaped fields on a ticket", () => {
    const lookalike = { ...VALID, capturedCategory: "guardrail" };
    expect(() => StructuredTicketSchema.parse(lookalike)).toThrow();
  });

  it("ticketId, linkedWorkItemIds, and status are mandatory (no detached UI text)", () => {
    const { ticketId: _tid, ...noId } = VALID;
    expect(() => StructuredTicketSchema.parse(noId)).toThrow();
    const { linkedWorkItemIds: _l, ...noLink } = VALID;
    expect(() => StructuredTicketSchema.parse(noLink)).toThrow();
    const { status: _s, ...noStatus } = VALID;
    expect(() => StructuredTicketSchema.parse(noStatus)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// P4-1 — ticket belongs to a work item / investigation.
// ---------------------------------------------------------------------------

describe("P4-1 ticket-work-item association (RED until Phase 4)", () => {
  const TICKET: StructuredTicket = {
    ticketId: "suspicious-login-1",
    linkedWorkItemIds: ["suspicious-login-1"],
    status: "in_progress",
    entityRefs: [],
    evidenceFactIds: ["fact-device-unenrolled"],
    disposition: "review",
    noteText: "See entity refs.",
  };

  it("P4-1a a well-formed ticket bound to a known work item validates clean", () => {
    let state = installFactDefinitions(
      stateWithDatasets(),
      [FACT_DEVICE_UNENROLLED],
    );
    state = query(state, "devices", { deviceLabel: "unknown-laptop-17" });
    state = openRecords(state, "unknown-laptop-17");
    state = installTicket(state, TICKET);
    expect(discoveredFactIds(state)).toContain("fact-device-unenrolled");
    expect(validateStructuredTicket(state, "suspicious-login-1")).toEqual([]);
  });

  it("P4-1b a ticket referencing an unknown work item is flagged", () => {
    const detached: StructuredTicket = {
      ...TICKET,
      ticketId: "suspicious-login-1",
      linkedWorkItemIds: ["not-a-real-work-item"],
    };
    const state = installTicket(stateWithDatasets(), detached);
    expect(validateStructuredTicket(state, "suspicious-login-1").length).toBeGreaterThan(0);
  });

  it("P4-1c reader exposes the ticket only through its stable ticketId", () => {
    const state = installTicket(stateWithDatasets(), TICKET);
    const tickets = readStructuredTickets(state);
    expect(Object.keys(tickets).sort()).toEqual(["suspicious-login-1"]);
    expect(byTicketId(tickets, "suspicious-login-1")?.linkedWorkItemIds).toEqual([
      "suspicious-login-1",
    ]);
  });
});

// ---------------------------------------------------------------------------
// P4-2 — evidence attachment uses DISCOVERED Evidence Facts only.
// ---------------------------------------------------------------------------

describe("P4-2 evidence attachment legality (RED until Phase 4)", () => {
  function stateWithDiscoveredDeviceFact(): WorldState {
    let state = installFactDefinitions(
      stateWithDatasets(),
      [FACT_DEVICE_UNENROLLED, FACT_FLAGGED_SESSION_DEVICE],
    );
    state = query(state, "devices", { deviceLabel: "unknown-laptop-17" });
    state = openRecords(state, "unknown-laptop-17");
    return state;
  }

  it("P4-2a discovered fact attaches cleanly", () => {
    const state = installTicket(stateWithDiscoveredDeviceFact(), {
      ticketId: "suspicious-login-1",
      linkedWorkItemIds: ["suspicious-login-1"],
      status: "in_progress",
      entityRefs: [],
      evidenceFactIds: ["fact-device-unenrolled"],
    });
    expect(discoveredFactIds(state)).toContain("fact-device-unenrolled");
    expect(validateStructuredTicket(state, "suspicious-login-1")).toEqual([]);
  });

  it("P4-2b naming an undiscovered fact ID is NOT a valid attachment", () => {
    // fact-flagged-session-device exists in rules but is NOT discovered (its
    // required second record AUTH-0741-PATEL was never queried/opened).
    const state = installTicket(stateWithDiscoveredDeviceFact(), {
      ticketId: "suspicious-login-1",
      linkedWorkItemIds: ["suspicious-login-1"],
      status: "in_progress",
      entityRefs: [],
      evidenceFactIds: ["fact-flagged-session-device"],
    });
    expect(discoveredFactIds(state)).not.toContain("fact-flagged-session-device");
    const violations = validateStructuredTicket(state, "suspicious-login-1");
    expect(violations.length).toBeGreaterThan(0);
    expect(violations.join(" ")).toMatch(/undiscovered/i);
  });

  it("P4-2c duplicate attachment is never created", () => {
    const state = installTicket(stateWithDiscoveredDeviceFact(), {
      ticketId: "suspicious-login-1",
      linkedWorkItemIds: ["suspicious-login-1"],
      status: "in_progress",
      entityRefs: [],
      evidenceFactIds: ["fact-device-unenrolled", "fact-device-unenrolled"],
    });
    expect(validateStructuredTicket(state, "suspicious-login-1").length).toBeGreaterThan(0);
  });

  it("P4-2d attachments reference Evidence Fact IDs, never raw authoring metadata", () => {
    // Attaching a definition statement / provenance rule / record body as if
    // it were a fact is an authoring-metadata leak and must be rejected.
    const badRefs = ["fact-device-unenrolled.statement", "AUTH-0741-PATEL"];
    const state = installTicket(stateWithDiscoveredDeviceFact(), {
      ticketId: "suspicious-login-1",
      linkedWorkItemIds: ["suspicious-login-1"],
      status: "in_progress",
      entityRefs: [],
      evidenceFactIds: badRefs,
    });
    const violations = validateStructuredTicket(state, "suspicious-login-1");
    expect(violations.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// P4-3 — free text is never canonical truth (GREEN invariant today).
// ---------------------------------------------------------------------------

describe("P4-3 free text cannot mutate investigation truth (GREEN)", () => {
  it("writing \"VPN confirmed\" in ticket notes changes no discovery", () => {
    let state = installFactDefinitions(stateWithDatasets(), [
      FACT_DEVICE_UNENROLLED,
      FACT_FLAGGED_SESSION_DEVICE,
    ]);
    state = query(state, "devices", { deviceLabel: "unknown-laptop-17" });
    state = openRecords(state, "unknown-laptop-17");

    const before = discover(state);
    state.ticketNotes["suspicious-login-1"] = "VPN confirmed for j.patel";
    state.notebook = "VPN confirmed for j.patel from 203.0.113.44";
    const after = discover(state);

    expect(after).toEqual(before);
    expect(after.map((e) => e.factId).sort()).toEqual([
      "fact-device-unenrolled",
    ]);
    // The invented "VPN confirmed" claim never manufactures fact-flagged-…
    expect(after.map((e) => e.factId)).not.toContain(
      "fact-flagged-session-device",
    );
  });

  it("structured noteText also cannot create or mutate facts", () => {
    const state = installTicket(stateWithDatasets(), {
      ticketId: "suspicious-login-1",
      linkedWorkItemIds: ["suspicious-login-1"],
      status: "in_progress",
      entityRefs: [],
      evidenceFactIds: [],
      noteText: "VPN confirmed for j.patel",
      disposition: "VPN confirmed",
    });
    expect(discover(state)).toEqual([]);
  });

  it("free text never enters the discovery payload shape", () => {
    let state = installFactDefinitions(stateWithDatasets(), [
      FACT_DEVICE_UNENROLLED,
    ]);
    state = query(state, "devices", { deviceLabel: "unknown-laptop-17" });
    state = openRecords(state, "unknown-laptop-17");
    state.ticketNotes["suspicious-login-1"] = "VPN confirmed";
    const serialized = JSON.stringify(discover(state));
    expect(serialized).not.toMatch(/VPN confirmed|noteText|ticketNotes/i);
  });
});

// ---------------------------------------------------------------------------
// P4-4 — structured disposition / status (schema GREEN; legality RED).
// ---------------------------------------------------------------------------

describe("P4-4 structured status and disposition", () => {
  it("all five canonical statuses are valid ticket statuses (GREEN)", () => {
    for (const status of ["open", "in_progress", "pending_review", "closed", "escalated"]) {
      const ticket: StructuredTicket = {
        ticketId: `t-${status}`,
        linkedWorkItemIds: ["suspicious-login-1"],
        status: status as TicketStatus,
        entityRefs: [],
        evidenceFactIds: [],
      };
      expect(() => StructuredTicketSchema.parse(ticket)).not.toThrow();
    }
  });

  it("disposition carries the intended action, never a verdict (GREEN)", () => {
    const ticket: StructuredTicket = {
      ticketId: "suspicious-login-1",
      linkedWorkItemIds: ["suspicious-login-1"],
      status: "pending_review",
      entityRefs: [],
      evidenceFactIds: [],
      disposition: "request identity containment review",
    };
    const parsed = StructuredTicketSchema.parse(ticket);
    expect(parsed.disposition).toBe("request identity containment review");
    // No grade-shaped synonym field is representable.
    expect(Object.keys(parsed).sort()).not.toContain("verdict");
  });

  it("P4-4a runtime rejects an illegal status transition (RED until Phase 4)", () => {
    // Spec Phase 4 RED list: "valid status transitions". The runtime validator
    // owns transition legality (spec §5.3); the schema only stores status.
    const ticket: StructuredTicket = {
      ticketId: "suspicious-login-1",
      linkedWorkItemIds: ["suspicious-login-1"],
      status: "escalated",
      entityRefs: [],
      evidenceFactIds: [],
    };
    const state = installTicket(stateWithDatasets(), ticket);
    const violations = validateStructuredTicket(state, "suspicious-login-1");
    expect(Array.isArray(violations)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// P4-5 — documentation persists across tools, actions, replay.
// ---------------------------------------------------------------------------

describe("P4-5 documentation persistence", () => {
  function foldLogged(
    initial: WorldState,
  ): WorldState {
    const entries = ActionLogEntrySchema.array().parse([
      {
        sequence: 1,
        interaction: {
          type: "action",
          action: queryAction(
            { deviceLabel: "unknown-laptop-17" },
            "devices",
          ),
        },
      },
    ]);
    return foldActionLog(initial, entries);
  }

  it("same action log replays to identical canonical state (GREEN)", () => {
    const first = foldLogged(stateWithDatasets());
    const second = foldLogged(stateWithDatasets());
    expect(first.queryHistory).toEqual(second.queryHistory);
    expect(first.simClock).toBe(second.simClock);
  });

  it("P4-5a structured tickets survive replay bit-for-bit (RED until Phase 4)", () => {
    const ticket: StructuredTicket = {
      ticketId: "suspicious-login-1",
      linkedWorkItemIds: ["suspicious-login-1"],
      status: "in_progress",
      entityRefs: [],
      evidenceFactIds: ["fact-device-unenrolled"],
    };
    // Phase 4 must make the ticket store schema-backed so foldActionLog
    // reparses it. Today WorldStateSchema strips unknown keys; this RED reader
    // documents the requirement.
    const first = foldLogged(installTicket(stateWithDatasets(), ticket));
    const second = foldLogged(installTicket(stateWithDatasets(), ticket));
    const a = readStructuredTickets(first);
    const b = readStructuredTickets(second);
    expect(a).toEqual(b);
  });

  it("P4-5b additional actions after documentation do not erase it (RED until Phase 4)", () => {
    const ticket: StructuredTicket = {
      ticketId: "suspicious-login-1",
      linkedWorkItemIds: ["suspicious-login-1"],
      status: "open",
      entityRefs: [],
      evidenceFactIds: [],
    };
    let state = installTicket(stateWithDatasets(), ticket);
    // This is a PROVIDED separate action; today it is a plain query that
    // would (by design of the unimplemented store) not persist extra state.
    state = query(state, "devices", { deviceLabel: "unknown-laptop-17" });
    expect(byTicketId(readStructuredTickets(state), "suspicious-login-1")).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// P4-6 — append/update semantics stay deterministic and stable.
// ---------------------------------------------------------------------------

describe("P4-6 append and update semantics (RED until Phase 4)", () => {
  it("P4-6a later update never corrupts prior canonical attachment", () => {
    // Two distinct updates (open -> in_progress with attachment) must land as
    // two deterministic, non-collapsing states: prior evidence stays attached.
    const open: StructuredTicket = {
      ticketId: "suspicious-login-1",
      linkedWorkItemIds: ["suspicious-login-1"],
      status: "open",
      entityRefs: [],
      evidenceFactIds: [],
    };
    const updated: StructuredTicket = {
      ...open,
      status: "in_progress",
      entityRefs: [],
      evidenceFactIds: ["fact-device-unenrolled"],
    };
    let state = installTicket(stateWithDatasets(), open);
    state = installTicket(state, updated);
    const finalTicket = byTicketId(
      readStructuredTickets(state),
      "suspicious-login-1",
    );
    expect(finalTicket?.status).toBe("in_progress");
    expect(finalTicket?.evidenceFactIds).toEqual(["fact-device-unenrolled"]);
  });

  it("P4-6b attached evidence remains stable unless explicitly changed", () => {
    const withEvidence: StructuredTicket = {
      ticketId: "suspicious-login-1",
      linkedWorkItemIds: ["suspicious-login-1"],
      status: "in_progress",
      entityRefs: [],
      evidenceFactIds: ["fact-device-unenrolled"],
      noteText: "first pass",
    };
    const laterNote: StructuredTicket = {
      ...withEvidence,
      noteText: "second pass — adding context only",
    };
    let state = installTicket(stateWithDatasets(), withEvidence);
    state = installTicket(state, laterNote);
    const finalTicket = byTicketId(
      readStructuredTickets(state),
      "suspicious-login-1",
    );
    // Note update must not strip the attachment.
    expect(finalTicket?.evidenceFactIds).toEqual(["fact-device-unenrolled"]);
  });

  it("P4-6c duplicate update actions are deterministic, never a duplicate ticket", () => {
    const ticket: StructuredTicket = {
      ticketId: "suspicious-login-1",
      linkedWorkItemIds: ["suspicious-login-1"],
      status: "in_progress",
      entityRefs: [],
      evidenceFactIds: ["fact-device-unenrolled"],
    };
    const state = installTicket(installTicket(stateWithDatasets(), ticket), ticket);
    const tickets = readStructuredTickets(state);
    expect(Object.keys(tickets).filter((id) => id === "suspicious-login-1")).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// P4-7 — handoff-ready substrate (data contract only, no consequence).
// ---------------------------------------------------------------------------

describe("P4-7 handoff substrate (RED until Phase 4)", () => {
  it("P4-7a ticket exposes every field a handoff reads, in canonical shape", () => {
    const ticket: StructuredTicket = {
      ticketId: "suspicious-login-1",
      linkedWorkItemIds: ["suspicious-login-1"],
      status: "escalated",
      entityRefs: ["j.patel@example.com"],
      evidenceFactIds: ["fact-device-unenrolled"],
      disposition: "escalate for containment review",
      noteText: "Auth + device correlated; VPN coverage pending.",
      followUp: "Tier 2 to confirm route coverage.",
    };
    const state = installTicket(stateWithDatasets(), ticket);
    const read = byTicketId(
      readStructuredTickets(state),
      "suspicious-login-1",
    );
    expect(read).toBeDefined();
    expect(read?.linkedWorkItemIds).toEqual(["suspicious-login-1"]);
    expect(read?.status).toBe("escalated");
    expect(read?.disposition).toBe("escalate for containment review");
    expect(read?.followUp).toBe("Tier 2 to confirm route coverage.");
  });

  it("P4-7b handoff fields never grade the documenting player", () => {
    const ticket: StructuredTicket = {
      ticketId: "suspicious-login-1",
      linkedWorkItemIds: ["suspicious-login-1"],
      status: "closed",
      entityRefs: [],
      evidenceFactIds: [],
      disposition: "monitoring only; reopen if second session appears",
    };
    const state = installTicket(stateWithDatasets(), ticket);
    const serialized = JSON.stringify(readStructuredTickets(state));
    expect(serialized).not.toMatch(/score|correct|incorrect|expectedEvidence|ideal/i);
  });
});

// ---------------------------------------------------------------------------
// P4-8 — no grading anywhere (GREEN schema guard).
// ---------------------------------------------------------------------------

describe("P4-8 no grading in ticket state (GREEN)", () => {
  const BASE: StructuredTicket = {
    ticketId: "suspicious-login-1",
    linkedWorkItemIds: ["suspicious-login-1"],
    status: "open",
    entityRefs: [],
    evidenceFactIds: [],
  };

  it("parsed ticket keys are exactly the canonical documentation fields", () => {
    const full: StructuredTicket = {
      ...BASE,
      entityRefs: ["j.patel@example.com"],
      evidenceFactIds: ["fact-device-unenrolled"],
      disposition: "monitor",
      noteText: "Correlated auth + device; VPN coverage pending.",
      followUp: "confirm route coverage",
    };
    const parsed = StructuredTicketSchema.parse(full);
    expect(Object.keys(parsed).sort()).toEqual([
      "disposition",
      "entityRefs",
      "evidenceFactIds",
      "followUp",
      "linkedWorkItemIds",
      "noteText",
      "status",
      "ticketId",
    ]);
  });

  it("no grading vocabulary survives parsing", () => {
    const parsed = StructuredTicketSchema.parse(BASE);
    const serialized = JSON.stringify(parsed);
    for (const banned of [
      "correct",
      "incorrect",
      "score",
      "expectedEvidence",
      "hiddenAnswer",
      "idealDisposition",
    ]) {
      expect(serialized).not.toContain(banned);
    }
  });
});

// ---------------------------------------------------------------------------
// P4-9 — EvidenceSignal separation (GREEN discovery side today).
// ---------------------------------------------------------------------------

describe("P4-9 structured attachments use Evidence Facts, not EvidenceSignal (GREEN)", () => {
  it("discovery payload carries only discovery-state fields, no signal vocabulary", () => {
    let state = installFactDefinitions(stateWithDatasets(), [
      FACT_DEVICE_UNENROLLED,
    ]);
    state = query(state, "devices", { deviceLabel: "unknown-laptop-17" });
    state = openRecords(state, "unknown-laptop-17");
    const discovered = discover(state);
    expect(discovered).toHaveLength(1);
    const entry = discovered[0];
    if (!entry) throw new Error("expected one discovery entry");
    expect(Object.keys(entry).sort()).toEqual([
      "attachedToTicketIds",
      "discoveredAtSimMinutes",
      "factId",
      "satisfiedProvenance",
    ]);
    const serialized = JSON.stringify(discovered);
    expect(serialized).not.toMatch(/category|dimension|rhythm|pacingMode|occurredAt|annotation/i);
  });
});

// ---------------------------------------------------------------------------
// P4-10 — determinism (GREEN substrate today; RED reader for ticket store).
// ---------------------------------------------------------------------------

describe("P4-10 determinism", () => {
  function foldedTwice() {
    const entries = ActionLogEntrySchema.array().parse([
      {
        sequence: 1,
        interaction: { type: "action" as const, action: queryAction({}) },
      },
      {
        sequence: 2,
        interaction: { type: "action" as const, action: queryAction({}) },
      },
    ]);
    return foldActionLog(stateWithDatasets(), entries);
  }

  it("same actions -> identical canonical discovery, no wall clock (GREEN)", () => {
    const first = foldedTwice();
    const second = foldedTwice();
    expect(discover(first)).toEqual(discover(second));
  });

  it("P4-10a same actions -> identical structured ticket state (RED until Phase 4)", () => {
    const ticket: StructuredTicket = {
      ticketId: "suspicious-login-1",
      linkedWorkItemIds: ["suspicious-login-1"],
      status: "in_progress",
      entityRefs: [],
      evidenceFactIds: ["fact-device-unenrolled"],
    };
    let first = installTicket(stateWithDatasets(), ticket);
    first = query(first, "devices", { deviceLabel: "unknown-laptop-17" });
    let second = installTicket(stateWithDatasets(), ticket);
    second = query(second, "devices", { deviceLabel: "unknown-laptop-17" });
    expect(readStructuredTickets(first)).toEqual(readStructuredTickets(second));
  });
});