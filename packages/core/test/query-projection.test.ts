import { describe, expect, it } from "vitest";
import type {
  AuthRecord,
  DatasetId,
  DeviceRecord,
  RuntimeDataset,
  SimulationAction,
  VpnRecord,
  WorldState,
} from "@sim/schemas";
import { ClientViewSchema, WorldStateSchema } from "@sim/schemas";
import { applyAction, toClientView } from "../src/index.js";

// ---------------------------------------------------------------------------
// P2-T04 — serializer query-result projection + hidden-state gating.
//
// Batch 5 (§16): Q-SER-01/02/03/05 + Q-HIDE-01/02/03/04. These tests build a
// real WorldState, run canonical `query_records` actions through `applyAction`
// (so `state.queryHistory` is populated exactly as production does), then
// project with `toClientView` and assert the client `queryResults` shape.
//
// Frozen contract: ClientView.queryResults is an array of QueryResultView
// (queryId, datasetId, records, resultIds, totalCount, truncated, simMinutes).
// The full server-side queryHistory array must NEVER be serialized. Query
// results never mark records observed and never carry hidden authoring data.
// ---------------------------------------------------------------------------

// §2 fixtures (subset) — synthetic, small, canonical simMinutes mapping.
const AUTH_ROWS: AuthRecord[] = [
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

function fixtureDatasets(): Record<string, RuntimeDataset> {
  return {
    auth: { datasetId: "auth", records: AUTH_ROWS },
    vpn: { datasetId: "vpn", records: VPN_ROWS },
    devices: { datasetId: "devices", records: DEVICE_ROWS },
  };
}

const QUERY_MINUTES = 2;

function stateWithDatasets(
  datasets: Record<string, RuntimeDataset> = fixtureDatasets(),
): WorldState {
  return WorldStateSchema.parse({
    sessionId: "sess-1",
    sessionKind: "assessed",
    seed: 7,
    simClock: 400,
    currentLocationId: "desk",
    locations: {
      desk: {
        id: "desk",
        name: "Workstation",
        connectedLocationIds: [],
        interactableIds: [],
      },
    },
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
      datasets,
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
      stress: 11,
      fatigue: 22,
      trust: { jules: 33 },
      reputation: 44,
      cognitiveLoad: 55,
      taskBacklog: 66,
      accuracy: 77,
      riskExposure: 88,
    },
  });
}

function queryAction(
  filters: Record<string, string | number>,
  datasetId: DatasetId = "auth",
): SimulationAction {
  return {
    id: "query_records",
    actorId: "player",
    queryPayload: { datasetId, filters },
  };
}

/**
 * Inject non-schema (hidden authoring) fields directly onto a live dataset row
 * AFTER schema parse. Models a data/authoring leak the serializer must defend
 * against; the strict record schema would reject these at parse time, so we
 * bypass it to prove the projection strips them.
 */
function injectHidden(
  state: WorldState,
  datasetId: DatasetId,
  recordId: string,
  fields: Record<string, unknown>,
): void {
  const row = state.rules.datasets[datasetId]?.records.find(
    (r) => r.id === recordId,
  );
  if (!row) throw new Error(`missing fixture row ${recordId}`);
  Object.assign(row as unknown as Record<string, unknown>, fields);
}

// Denylist regex over canonical JSON of the projected queryResults. Any hit is
// a hidden-state leak (§8 Q-HIDE-01..08).
const HIDDEN_STATE_DENYLIST =
  /fact-|satisfiedProvenance|attachable|requiredOptionIds|templateId|correctPath|expectedAction|verdict|answerKey|branchLabel|coachOnFailure|successText|delayMinutes|dueAt|escalate|consequence|stress|fatigue|cognitiveLoad|riskExposure|taskBacklog|reputation|accuracy|confidenceLevel|evidenceSignal|normalizedFilters|actorEventId/i;

// Allowlisted top-level keys on a QueryResultView (frozen contract).
const ALLOWED_VIEW_KEYS = [
  "queryId",
  "datasetId",
  "records",
  "resultIds",
  "totalCount",
  "truncated",
  "simMinutes",
].sort();

describe("Q-SER query-result projection", () => {
  it("Q-SER-01 exposes only player-visible record fields for a returned row", () => {
    let state = stateWithDatasets();
    state = applyAction(state, queryAction({ sessionId: "S-0741" })).state;

    const view = toClientView(state);
    expect(view.queryResults).toHaveLength(1);

    const result = view.queryResults[0];
    if (!result) throw new Error("expected one query result view");
    expect(result.datasetId).toBe("auth");
    expect(result.resultIds).toEqual(["AUTH-0741-PATEL", "AUTH-0743-REFRESH"]);
    expect(result.totalCount).toBe(2);
    expect(result.truncated).toBe(false);
    expect(result.queryId).toBe("sess-1-q1");

    // The projected rows equal the player-visible dataset rows verbatim.
    expect(result.records).toEqual([AUTH_ROWS[0], AUTH_ROWS[1]]);

    // Whole view still parses against the frozen client schema.
    expect(() => ClientViewSchema.parse(view)).not.toThrow();
  });

  it("Q-SER-02 strips hidden fields via denylist scan + top-level allowlist", () => {
    let state = stateWithDatasets();
    state = applyAction(state, queryAction({ sessionId: "S-0741" })).state;

    // Inject hidden authoring fields onto the live dataset rows AFTER schema
    // parse (models a data/authoring leak). The serializer must strip them via
    // its player-visible record allowlist; only queryResults are under test.
    injectHidden(state, "auth", "AUTH-0741-PATEL", {
      verdict: "compromised",
      requiredOptionIds: ["opt-1"],
      templateId: "suspicious_login",
    });

    const view = toClientView(state);
    const projected = JSON.stringify(view.queryResults);
    expect(projected).not.toMatch(HIDDEN_STATE_DENYLIST);

    for (const result of view.queryResults) {
      expect(Object.keys(result).sort()).toEqual(ALLOWED_VIEW_KEYS);
      for (const record of result.records) {
        expect(record).not.toHaveProperty("verdict");
        expect(record).not.toHaveProperty("requiredOptionIds");
        expect(record).not.toHaveProperty("templateId");
      }
    }
  });

  it("Q-SER-03 never serializes the full server-side history array", () => {
    let state = stateWithDatasets();
    state = applyAction(state, queryAction({ sessionId: "S-0741" })).state;
    state = applyAction(
      state,
      queryAction({ user: "j.patel@example.com" }, "vpn"),
    ).state;

    // Server-side history exists and is richer (carries seq/normalizedFilters).
    expect(state.queryHistory).toHaveLength(2);
    expect(state.queryHistory[0]).toHaveProperty("seq");
    expect(state.queryHistory[0]).toHaveProperty("normalizedFilters");

    const view = toClientView(state) as unknown as Record<string, unknown>;
    expect(view).not.toHaveProperty("queryHistory");
    expect(view).not.toHaveProperty("history");

    // Per-query views only: no server-side-only fields leak through.
    for (const result of view.queryResults as Record<string, unknown>[]) {
      expect(result).not.toHaveProperty("seq");
      expect(result).not.toHaveProperty("normalizedFilters");
      expect(result).not.toHaveProperty("actorEventId");
    }
  });

  it("Q-SER-05 preserves stable order across serialize -> parse", () => {
    let state = stateWithDatasets();
    // Multi-row query: AUTH rows sort by simMinutes asc (461 then 463).
    state = applyAction(state, queryAction({ user: "j.patel@example.com" })).state;

    const before = toClientView(state).queryResults[0]?.resultIds;
    expect(before).toEqual(["AUTH-0741-PATEL", "AUTH-0743-REFRESH"]);

    const roundTripped = ClientViewSchema.parse(
      JSON.parse(JSON.stringify(toClientView(state))),
    );
    expect(roundTripped.queryResults[0]?.resultIds).toEqual(before);
    // Row order matches resultIds order after serialization.
    expect(roundTripped.queryResults[0]?.records.map((r) => r.id)).toEqual(
      before,
    );
  });
});

describe("Q-HIDE hidden-state gating on projected query results", () => {
  it("Q-HIDE-01 carries no exhaustive related-record relevance map", () => {
    let state = stateWithDatasets();
    state = applyAction(state, queryAction({ sessionId: "S-0741" })).state;
    // Give a returned row a natural join list; projection may keep the schema
    // field but must not synthesize an authoring relevance map elsewhere.
    injectHidden(state, "auth", "AUTH-0741-PATEL", {
      relatedRecordIds: ["V-218"],
    });

    const view = toClientView(state);
    const row = view.queryResults[0]?.records.find(
      (r) => r.id === "AUTH-0741-PATEL",
    );
    // The natural-join field is the record's own (bounded) list, never an
    // enumerated map of every joinable row.
    expect(row?.relatedRecordIds).toEqual(["V-218"]);
    expect(row?.relatedRecordIds.length).toBeLessThan(3);
  });

  it("Q-HIDE-02 exposes no Evidence Fact IDs / provenance / attachable flags", () => {
    let state = stateWithDatasets();
    state = applyAction(state, queryAction({ sessionId: "S-0741" })).state;
    injectHidden(state, "auth", "AUTH-0741-PATEL", {
      factId: "fact-compromise-1",
      satisfiedProvenance: ["fact-compromise-1"],
      attachable: true,
    });

    const projected = JSON.stringify(toClientView(state).queryResults);
    expect(projected).not.toMatch(/fact-|satisfiedProvenance|attachable/i);
  });

  it("Q-HIDE-03 exposes no answer keys / verdicts / template ids", () => {
    let state = stateWithDatasets();
    state = applyAction(state, queryAction({ sessionId: "S-0741" })).state;
    injectHidden(state, "auth", "AUTH-0741-PATEL", {
      verdict: "compromised",
      correctPath: "escalate",
      templateId: "suspicious_login",
    });

    const projected = JSON.stringify(toClientView(state).queryResults);
    expect(projected).not.toMatch(
      /verdict|compromised|correctPath|expectedAction|templateId/i,
    );
  });

  it("Q-HIDE-04 querying does not mark rows observed or expose gated fields", () => {
    let state = stateWithDatasets();
    const before = [...state.observedArtifactIds];
    state = applyAction(
      state,
      queryAction({ deviceLabel: "unknown-laptop-17" }, "devices"),
    ).state;

    // Query results NEVER imply a record is observed/opened.
    expect(state.observedArtifactIds).toEqual(before);

    const view = toClientView(state);
    // The device row appears in results...
    const row = view.queryResults[0]?.records.find(
      (r) => r.id === "unknown-laptop-17",
    );
    expect(row).toBeDefined();
    // ...but no matching artifact was marked observed by the projection.
    expect(view.artifacts.every((a) => typeof a.observed === "boolean")).toBe(
      true,
    );
    expect(state.observedArtifactIds).toEqual([]);
    // And no assessment/hidden numerics rode along with the projection.
    expect(JSON.stringify(view.queryResults)).not.toMatch(
      /stress|fatigue|cognitiveLoad|riskExposure/i,
    );
  });
});
