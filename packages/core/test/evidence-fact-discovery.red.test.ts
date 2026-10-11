import { describe, expect, it } from "vitest";
import type {
  AuthRecord,
  DatasetId,
  DeviceRecord,
  EvidenceFactDefinition,
  EvidenceFactDiscoveryState,
  QueryFilter,
  SimulationAction,
  VpnRecord,
  WorldState,
} from "@sim/schemas";
import {
  ActionLogEntrySchema,
  EvidenceFactDefinitionSchema,
  EvidenceFactDiscoveryStateSchema,
  WorldStateSchema,
} from "@sim/schemas";
import * as core from "../src/index.js";
import { applyAction, foldActionLog } from "../src/index.js";

// ---------------------------------------------------------------------------
// PHASE 3 RED-TEST FOUNDATION — deterministic Evidence Fact discovery.
//
// TEST-ONLY lane. No runtime implementation. No production edits.
//
// Canonical sources:
// - Evidence discovery separates truth from visibility and never serializes
//   hidden discovery state.
// - Authored records define absence coverage, noise, and correlations.
// - packages/schemas/src/evidence-facts.ts (frozen types-only contract).
// - packages/schemas/src/query.ts + packages/core/src/query.ts (Phase 2
//   canonical query provenance: normalized filters, resultIds, simMinutes).
//
// INTENTIONAL RED: these tests assert the Phase 3 discovery contract. They run
// through the real Phase 2 reducer (applyAction -> canonical query_history),
// then ask for the pure Phase 3 evaluator `@sim/core` must export. It does not
// exist yet, so every test currently fails with a RED marker. Do NOT make
// production changes to pass them. Phase 3 work only.
//
// PHASE 3 CONTRACT ASSUMPTIONS (from canonical spec; flagged for implementers):
// 1. Authored fact definitions snapshot into `state.rules.evidenceFacts`
//    (keyed by fact id), parsed by the frozen EvidenceFactDefinitionSchema.
//    Phase 2 ScenarioRulesSchema has no such key today; inject below models it.
// 2. Discovery derives ONLY from replayed canonical state: `queryHistory`
//    (dataset, normalizedFilters, resultIds, simMinutes) + the observed-record
//    substrate. Phase 0 names `observedArtifactIds` as the reusable observed
//    gating substrate; record-open must populate it (or the field Phase 3
//    lands) — tests model opened records on `observedArtifactIds`.
// 3. `discoverEvidenceFacts(state)` is a PURE function of canonical state:
//    same state in -> same discovery out, no wall clock, no client state.
//    applyAction/foldActionLog may call it; tests pin the pure core.
// 4. `discoveredAtSimMinutes` is canonical sim time. For absence facts it
//    equals the simMinutes of the earliest covering query in history. For
//    record-open facts Phase 3 defines the settling act's sim time; tests only
//    pin integer + replay equality here (flag: needs Phase 3 pinning).
// 5. Absence (query_absence_coverage) is coverage semantics, never an exact-
//    query-string match: normalized filters must carry every required
//    dimension AND a window ⊇ the authored window AND yield zero results.
// 6. Discovery output stays structurally separate from assessment
//    EvidenceSignal (no category/dimension/rhythm/pacingMode/occurredAt).
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// §2 synthetic fixtures — canonical subset (mirror query-engine.test.ts).
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
  {
    id: "AUTH-0738-GROUP",
    datasetId: "auth",
    simMinutes: 458,
    user: "j.patel@example.com",
    sourceIp: "203.0.113.44",
    method: "extra_identity_check",
    result: "fail",
    attemptCount: 6,
    relatedRecordIds: [],
  },
  {
    id: "AUTH-0741-PATEL",
    datasetId: "auth",
    simMinutes: 461,
    user: "j.patel@example.com",
    sourceIp: "203.0.113.44",
    deviceLabel: "unknown-laptop-17",
    method: "password",
    result: "success",
    sessionId: "S-0741",
    relatedRecordIds: [],
  },
  {
    id: "AUTH-0743-REFRESH",
    datasetId: "auth",
    simMinutes: 463,
    user: "j.patel@example.com",
    method: "session_refresh",
    result: "n/a",
    sessionId: "S-0741",
    relatedRecordIds: [],
  },
  {
    id: "AUTH-0740-GARCIA",
    datasetId: "auth",
    simMinutes: 460,
    user: "m.garcia@example.com",
    sourceIp: "10.20.4.9",
    deviceLabel: "corp-macbook-garcia",
    method: "password",
    result: "fail",
    relatedRecordIds: [],
  },
  {
    id: "AUTH-0733-OKONKWO",
    datasetId: "auth",
    simMinutes: 453,
    user: "c.okonkwo@example.com",
    sourceIp: "10.20.4.9",
    deviceLabel: "corp-macbook-okonkwo",
    method: "password + extra_identity_check",
    result: "success",
    sessionId: "S-0735",
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
  {
    id: "corp-macbook-patel",
    datasetId: "devices",
    deviceLabel: "corp-macbook-patel",
    assignedUser: "j.patel@example.com",
    deviceClass: "macbook",
    enrolled: true,
    assignmentState: "active",
    lastCheckinSimMinutes: 450,
    tags: [],
    relatedRecordIds: [],
  },
];

// ---------------------------------------------------------------------------
// §3 authored Phase 3 evidence-fact definitions (frozen schema contract).
// ---------------------------------------------------------------------------

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

const FACT_FLAGGED_SESSION_DEVICE: EvidenceFactDefinition = {
  id: "fact-flagged-session-device",
  statement:
    "Flagged session S-0741 used unknown-laptop-17 directly from 203.0.113.44 (auth + inventory correlation).",
  relatedWorkItemIds: ["suspicious-login-1"],
  provenance: {
    kind: "multi_record_open",
    recordIds: ["AUTH-0741-PATEL", "unknown-laptop-17"],
  },
  attachable: true,
};

// Absence authored requirement: account j.patel + source 203.0.113.44 across
// window [440, 460) minutes — length 20 = coveredWindowMinutes, no exact query
// string (spec §5.2; fixtures §10).
const FACT_NO_VPN_CVR: EvidenceFactDefinition = {
  id: "fact-no-vpn-covers-s0741",
  statement:
    "No org VPN connection record covers j.patel@example.com from 203.0.113.44 across the flagged window (coverage-gated).",
  relatedWorkItemIds: ["suspicious-login-1"],
  provenance: {
    kind: "query_absence_coverage",
    datasetId: "vpn",
    requiredDimensions: ["user", "sourceIp"],
    coveredWindowMinutes: 20,
    requiredFilters: {
      user: "j.patel@example.com",
      sourceIp: "203.0.113.44",
    },
  },
  attachable: true,
};

const FACT_DEVICE_EXACT_PRESENCE: EvidenceFactDefinition = {
  id: "fact-device-exact-presence",
  statement:
    "Device inventory contains exactly one 'unknown-laptop-17' record for the exact label.",
  relatedWorkItemIds: ["suspicious-login-1"],
  provenance: {
    kind: "query_presence",
    datasetId: "devices",
    requiredDimensions: ["deviceLabel"],
    requiredFilters: { deviceLabel: "unknown-laptop-17" },
  },
  attachable: true,
};

// ---------------------------------------------------------------------------
// §4 helpers — canonical state + Phase 3 contract shims (RED).
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
 * PHASE 3 CONTRACT SHIM — models `ScenarioRules.evidenceFacts`: authored fact
 * definitions snapshotted into rules, parsed through the frozen schema. The key
 * does not exist on the Phase 2 schema; this injection is the Phase 3 surface.
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
 * PHASE 3 CONTRACT SHIM (RED) — models the record-open surface on the Phase 0
 * observed-gating substrate. Querying never marks rows observed (Q-HIDE-04);
 * discovery requires the player to actually open the record. Phase 3 defines
 * the canonical `open_record` act; tests drive the substrate directly so the
 * pure evaluator can derive from canonical state shape.
 */
function openRecords(state: WorldState, ...recordIds: string[]): WorldState {
  for (const recordId of recordIds) {
    const observed = state.observedArtifactIds;
    if (!observed.includes(recordId)) {
      observed.push(recordId);
    }
  }
  return state;
}

/**
 * PHASE 3 CONTRACT READER (RED) — the pure evaluator Phase 3 exports from
 * @sim/core. Absent today: every call throws, so every test below is
 * intentionally RED. When Phase 3 lands, keep this signature.
 */
type DiscoverFn = (state: WorldState) => EvidenceFactDiscoveryState[];

function discoverEvidenceFacts(state: WorldState): EvidenceFactDiscoveryState[] {
  const fn = (
    core as unknown as { discoverEvidenceFacts?: DiscoverFn }
  ).discoverEvidenceFacts;
  if (!fn) {
    throw new Error(
      "RED[Phase 3]: @sim/core does not export `discoverEvidenceFacts` yet. " +
        "Phase 3 must expose this pure evaluator (called on replayed canonical " +
        "state); do not satisfy these tests by editing Phase 2 runtime.",
    );
  }
  return EvidenceFactDiscoveryStateSchema.array().parse(fn(state));
}

function byFactId(
  discovered: EvidenceFactDiscoveryState[],
  factId: string,
): EvidenceFactDiscoveryState[] {
  return discovered.filter((entry) => entry.factId === factId);
}

// ---------------------------------------------------------------------------
// EFD-1 — positive record discovery: query result alone is not discovery.
// ---------------------------------------------------------------------------

describe("EFD-1 positive record discovery (RED until Phase 3)", () => {
  const facts = [FACT_DEVICE_UNENROLLED];

  it("EFD-1a returning the row in a query establishes nothing", () => {
    const result = query(
      installFactDefinitions(stateWithDatasets(), facts),
      "devices",
      { deviceLabel: "unknown-laptop-17" },
    );
    expect(result.queryHistory.at(-1)?.resultIds).toEqual([
      "unknown-laptop-17",
    ]);
    // No record opened; discovery must stay empty.
    expect(discoverEvidenceFacts(result)).toEqual([]);
  });

  it("EFD-1b query then a real open of the record is required", () => {
    let state = query(
      installFactDefinitions(stateWithDatasets(), facts),
      "devices",
      { deviceLabel: "unknown-laptop-17" },
    );
    state = openRecords(state, "unknown-laptop-17");
    const discovered = discoverEvidenceFacts(state);
    const entry = byFactId(discovered, "fact-device-unenrolled");
    expect(entry).toHaveLength(1);
    expect(entry[0]?.discoveredAtSimMinutes).toEqual(
      expect.any(Number),
    );
    expect(Number.isInteger(entry[0]?.discoveredAtSimMinutes)).toBe(true);
    expect(entry[0]?.discoveredAtSimMinutes).toBeGreaterThanOrEqual(400);
    expect(entry[0]?.satisfiedProvenance.length).toBeGreaterThan(0);
    expect(entry[0]?.attachedToTicketIds).toEqual([]);
  });

  it("EFD-1c opening a different record never satisfies this fact", () => {
    let state = query(
      installFactDefinitions(stateWithDatasets(), facts),
      "devices",
      { deviceLabel: "unknown-laptop-17" },
    );
    state = openRecords(state, "corp-macbook-patel");
    expect(discoverEvidenceFacts(state)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// EFD-2 — multi-record correlation requires every authored source.
// ---------------------------------------------------------------------------

describe("EFD-2 multi-record correlation (RED until Phase 3)", () => {
  const facts = [FACT_FLAGGED_SESSION_DEVICE];

  it("EFD-2a auth row alone never becomes eligible", () => {
    let state = query(
      installFactDefinitions(stateWithDatasets(), facts),
      "auth",
      { sessionId: "S-0741" },
    );
    state = openRecords(state, "AUTH-0741-PATEL");
    expect(discoverEvidenceFacts(state)).toEqual([]);
  });

  it("EFD-2b device row alone never becomes eligible", () => {
    let state = query(
      installFactDefinitions(stateWithDatasets(), facts),
      "devices",
      { deviceLabel: "unknown-laptop-17" },
    );
    state = openRecords(state, "unknown-laptop-17");
    expect(discoverEvidenceFacts(state)).toEqual([]);
  });

  it("EFD-2c both authored records open becomes eligible", () => {
    let state = query(
      installFactDefinitions(stateWithDatasets(), facts),
      "auth",
      { sessionId: "S-0741" },
    );
    state = query(state, "devices", { deviceLabel: "unknown-laptop-17" });
    state = openRecords(state, "AUTH-0741-PATEL", "unknown-laptop-17");
    const entry = byFactId(
      discoverEvidenceFacts(state),
      "fact-flagged-session-device",
    );
    expect(entry).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// EFD-3 — VPN absence proof is coverage semantics, never an exact query.
// Authored window [440, 460), dims {user, sourceIp}, length 20.
// ---------------------------------------------------------------------------

describe("EFD-3 VPN absence proof (RED until Phase 3)", () => {
  const facts = [FACT_NO_VPN_CVR];

  it("EFD-3a full required interval + dims + zero rows -> eligible", () => {
    const state = query(
      installFactDefinitions(stateWithDatasets(), facts),
      "vpn",
      {
        user: "j.patel@example.com",
        sourceIp: "203.0.113.44",
        windowStartSimMinutes: 440,
        windowEndSimMinutes: 460,
      },
    );
    expect(state.queryHistory[state.queryHistory.length - 1]?.resultIds).toEqual([]);
    expect(byFactId(discoverEvidenceFacts(state), "fact-no-vpn-covers-s0741")).toHaveLength(1);
  });

  it("EFD-3b broader window that semantically covers is eligible", () => {
    const state = query(
      installFactDefinitions(stateWithDatasets(), facts),
      "vpn",
      {
        user: "j.patel@example.com",
        sourceIp: "203.0.113.44",
        windowStartSimMinutes: 430,
        windowEndSimMinutes: 480,
      },
    );
    expect(state.queryHistory[state.queryHistory.length - 1]?.resultIds).toEqual([]);
    expect(byFactId(discoverEvidenceFacts(state), "fact-no-vpn-covers-s0741")).toHaveLength(1);
  });

  it("EFD-3c too-narrow interval is never eligible", () => {
    const state = query(
      installFactDefinitions(stateWithDatasets(), facts),
      "vpn",
      {
        user: "j.patel@example.com",
        sourceIp: "203.0.113.44",
        windowStartSimMinutes: 450,
        windowEndSimMinutes: 455,
      },
    );
    expect(state.queryHistory[state.queryHistory.length - 1]?.resultIds).toEqual([]);
    expect(discoverEvidenceFacts(state)).toEqual([]);
  });

  it("EFD-3d wrong account is never eligible", () => {
    const state = query(
      installFactDefinitions(stateWithDatasets(), facts),
      "vpn",
      {
        user: "c.okonkwo@example.com",
        sourceIp: "203.0.113.44",
        windowStartSimMinutes: 440,
        windowEndSimMinutes: 460,
      },
    );
    expect(state.queryHistory[state.queryHistory.length - 1]?.resultIds).toEqual([]);
    expect(discoverEvidenceFacts(state)).toEqual([]);
  });

  it("EFD-3e a covering query that returns a row is presence, not absence", () => {
    // Account + window only — V-218 (sim 449) is inside window -> row present.
    const state = query(
      installFactDefinitions(stateWithDatasets(), facts),
      "vpn",
      {
        user: "j.patel@example.com",
        windowStartSimMinutes: 440,
        windowEndSimMinutes: 460,
      },
    );
    expect(state.queryHistory[state.queryHistory.length - 1]?.resultIds).toEqual([
      "V-218",
    ]);
    expect(discoverEvidenceFacts(state)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// EFD-4 — repeated qualified query never duplicates a discovery.
// ---------------------------------------------------------------------------

describe("EFD-4 repeated query idempotence (RED until Phase 3)", () => {
  const facts = [FACT_NO_VPN_CVR];

  it("EFD-4a same qualifying query twice yields one discovery, once", () => {
    const filters = {
      user: "j.patel@example.com",
      sourceIp: "203.0.113.44",
      windowStartSimMinutes: 440,
      windowEndSimMinutes: 460,
    };
    let state = query(installFactDefinitions(stateWithDatasets(), facts), "vpn", filters);
    state = query(state, "vpn", filters);
    // Two stored queries, both zero-result covering.
    expect(state.queryHistory).toHaveLength(2);
    expect(state.queryHistory[0]?.resultIds).toEqual([]);
    expect(state.queryHistory[1]?.resultIds).toEqual([]);

    const discovered = discoverEvidenceFacts(state);
    expect(byFactId(discovered, "fact-no-vpn-covers-s0741")).toHaveLength(1);
    expect(discovered).toHaveLength(1);
    expect(discovered[0]?.satisfiedProvenance).toHaveLength(1);
  });

  it("EFD-4b evaluator is idempotent over unchanged state", () => {
    const filters = {
      user: "j.patel@example.com",
      sourceIp: "203.0.113.44",
      windowStartSimMinutes: 440,
      windowEndSimMinutes: 460,
    };
    const state = query(installFactDefinitions(stateWithDatasets(), facts), "vpn", filters);
    expect(discoverEvidenceFacts(state)).toEqual(discoverEvidenceFacts(state));
  });
});

// ---------------------------------------------------------------------------
// EFD-5 — noise / distractors never manufacture central-case facts.
// ---------------------------------------------------------------------------

describe("EFD-5 noise and distractor integrity (RED until Phase 3)", () => {
  const facts = [FACT_FLAGGED_SESSION_DEVICE, FACT_DEVICE_UNENROLLED];

  it("EFD-5a filler rows in broad results, nothing opened -> nothing discovered", () => {
    let state = query(installFactDefinitions(stateWithDatasets(), facts), "auth", {});
    state = query(state, "devices", {});
    // Open only routine/filler rows; V-218-like noise never joins central keys.
    state = openRecords(state, "AUTH-0740-GARCIA", "AUTH-0733-OKONKWO");
    expect(discoverEvidenceFacts(state)).toEqual([]);
  });

  it("EFD-5b opening the filler 'corp-macbook-patel' does not surface flagged-device fact", () => {
    let state = query(installFactDefinitions(stateWithDatasets(), facts), "auth", {
      deviceLabel: "corp-macbook-patel",
    });
    state = query(state, "devices", { deviceLabel: "corp-macbook-patel" });
    state = openRecords(state, "corp-macbook-patel");
    const discovered = discoverEvidenceFacts(state);
    expect(byFactId(discovered, "fact-flagged-session-device")).toEqual([]);
  });

  it("EFD-5c a query on the wrong dataset never satisfies a dataset-scoped fact", () => {
    // FACT_DEVICE_EXACT_PRESENCE is scoped to `devices`; a DEVICE filter run
    // against `auth` results (even returning the same label text) is not the
    // devices-dataset presence requirement.
    const state = query(
      installFactDefinitions(stateWithDatasets(), [FACT_DEVICE_EXACT_PRESENCE]),
      "auth",
      { deviceLabel: "unknown-laptop-17" },
    );
    expect(state.queryHistory[state.queryHistory.length - 1]?.resultIds).toEqual([
      "AUTH-0741-PATEL",
    ]);
    expect(discoverEvidenceFacts(state)).toEqual([]);
  });

  it("EFD-5d the same filter on the right dataset satisfies presence", () => {
    let state = query(
      installFactDefinitions(stateWithDatasets(), [FACT_DEVICE_EXACT_PRESENCE]),
      "devices",
      { deviceLabel: "unknown-laptop-17" },
    );
    state = query(state, "devices", {});
    const entry = byFactId(
      discoverEvidenceFacts(state),
      "fact-device-exact-presence",
    );
    expect(entry).toHaveLength(1);
    // Distractor presence rows never manufacture the central record fact.
    expect(byFactId(discoverEvidenceFacts(state), "fact-device-unenrolled")).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// EFD-6 — replay: discovery derives from replayed canonical state, not clock.
// ---------------------------------------------------------------------------

describe("EFD-6 replay determinism (RED until Phase 3)", () => {
  const facts = [FACT_NO_VPN_CVR, FACT_DEVICE_UNENROLLED];

  function foldLogged() {
    const entries = ActionLogEntrySchema.array().parse([
      {
        sequence: 1,
        interaction: {
          type: "action",
          action: queryAction(
            {
              user: "j.patel@example.com",
              sourceIp: "203.0.113.44",
              windowStartSimMinutes: 440,
              windowEndSimMinutes: 460,
            },
            "vpn",
          ),
        },
      },
      {
        sequence: 2,
        interaction: {
          type: "action",
          action: queryAction(
            { deviceLabel: "unknown-laptop-17" },
            "devices",
          ),
        },
      },
    ]);
    let state = foldActionLog(stateWithDatasets(), entries);
    state = installFactDefinitions(state, facts);
    return openRecords(state, "unknown-laptop-17");
  }

  it("EFD-6a two folds of the same action log produce identical discovery", () => {
    const first = foldLogged();
    const second = foldLogged();
    expect(first.queryHistory).toEqual(second.queryHistory);
    expect(discoverEvidenceFacts(first)).toEqual(discoverEvidenceFacts(second));
  });

  it("EFD-6b absence discovery time equals the covering query's canonical simMinutes", () => {
    const state = foldLogged();
    const covering = state.queryHistory.filter(
      (entry) =>
        entry.datasetId === "vpn" &&
        entry.resultIds.length === 0 &&
        entry.normalizedFilters.windowStartSimMinutes === 440,
    );
    expect(covering.length).toBeGreaterThan(0);
    const earliest = covering.reduce(
      (min, entry) => Math.min(min, entry.simMinutes),
      covering[0]?.simMinutes ?? Infinity,
    );
    const absence = byFactId(
      discoverEvidenceFacts(state),
      "fact-no-vpn-covers-s0741",
    );
    expect(absence).toHaveLength(1);
    // Pins: no wall-clock, no client state — canonical sim time only.
    expect(absence[0]?.discoveredAtSimMinutes).toBe(earliest);
    expect(typeof earliest).toBe("number");
  });
});

// ---------------------------------------------------------------------------
// EFD-7 — discovered facts stay separate from assessment EvidenceSignal.
// ---------------------------------------------------------------------------

describe("EFD-7 separation from assessment EvidenceSignal (RED until Phase 3)", () => {
  const facts = [FACT_DEVICE_UNENROLLED];

  it("EFD-7a discovery payload carries only the discovery-state fields", () => {
    let state = query(installFactDefinitions(stateWithDatasets(), facts), "devices", {
      deviceLabel: "unknown-laptop-17",
    });
    state = openRecords(state, "unknown-laptop-17");
    const discovered = discoverEvidenceFacts(state);
    expect(discovered).toHaveLength(1);
    const entry = discovered[0];
    if (!entry) throw new Error("expected one discovery entry");
    expect(Object.keys(entry).sort()).toEqual([
      "attachedToTicketIds",
      "discoveredAtSimMinutes",
      "factId",
      "satisfiedProvenance",
    ]);
  });

  it("EFD-7b no EvidenceSignal vocabulary leaks into discovery output", () => {
    let state = query(installFactDefinitions(stateWithDatasets(), facts), "devices", {
      deviceLabel: "unknown-laptop-17",
    });
    state = openRecords(state, "unknown-laptop-17");
    const serialized = JSON.stringify(discoverEvidenceFacts(state));
    expect(serialized).not.toMatch(
      /category|dimension|rhythm|pacingMode|occurredAt|annotation/i,
    );
  });

  it("EFD-7c authored definitions reject signal-shaped fields by construction", () => {
    const lookalike = {
      ...FACT_DEVICE_UNENROLLED,
      category: "guardrail",
      dimension: "observability",
      rhythm: "rhythmic",
      pacingMode: "standard",
    };
    expect(() => EvidenceFactDefinitionSchema.parse(lookalike)).toThrow();
  });
});
