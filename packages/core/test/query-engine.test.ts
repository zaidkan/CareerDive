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
import { WorldStateSchema } from "@sim/schemas";
import {
  applyAction,
  QueryValidationError,
  runQuery,
  type QueryRuntimeDatasets,
} from "../src/index.js";

// ---------------------------------------------------------------------------
// §2 fixtures — small, canonical, synthetic. simMinutes mapping from the spec.
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
    id: "AUTH-0715-PATEL-HQ",
    datasetId: "auth",
    simMinutes: 435,
    user: "j.patel@example.com",
    sourceIp: "10.20.4.18",
    deviceLabel: "corp-macbook-patel",
    method: "password + extra_identity_check",
    result: "success",
    sessionId: "S-0722",
    relatedRecordIds: [],
  },
  {
    id: "AUTH-0658-PATEL-PHONE",
    datasetId: "auth",
    simMinutes: 418,
    user: "j.patel@example.com",
    sourceIp: "10.20.4.9",
    deviceLabel: "corp-phone-patel",
    method: "mobile_sso",
    result: "success",
    sessionId: "S-0719",
    relatedRecordIds: [],
  },
  {
    id: "AUTH-0612-PATEL-TYPO",
    datasetId: "auth",
    simMinutes: 372,
    user: "j.patel@example.com",
    sourceIp: "10.20.4.9",
    deviceLabel: "corp-macbook-patel",
    method: "password",
    result: "fail",
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
  {
    id: "AUTH-0802-RIVERA-VPN",
    datasetId: "auth",
    simMinutes: 482,
    user: "a.rivera@example.com",
    sourceIp: "198.51.100.21",
    deviceLabel: "corp-macbook-rivera",
    method: "password + extra_identity_check",
    result: "success",
    sessionId: "S-0802",
    vpnConnectionId: "V-219",
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
  {
    id: "V-219",
    datasetId: "vpn",
    simMinutes: 482,
    vpnId: "V-219",
    user: "a.rivera@example.com",
    startSimMinutes: 482,
    exitIp: "198.51.100.21",
    deviceLabel: "corp-macbook-rivera",
    sessionId: "S-0802",
    status: "active",
    relatedRecordIds: [],
  },
  {
    id: "V-217",
    datasetId: "vpn",
    simMinutes: 440,
    vpnId: "V-217",
    user: "c.okonkwo@example.com",
    startSimMinutes: 440,
    endSimMinutes: 470,
    exitIp: "198.51.100.20",
    deviceLabel: "corp-macbook-okonkwo",
    sessionId: "S-0735",
    status: "active",
    relatedRecordIds: [],
  },
  {
    id: "V-214",
    datasetId: "vpn",
    simMinutes: 0,
    vpnId: "V-214",
    user: "m.garcia@example.com",
    startSimMinutes: 0,
    endSimMinutes: 10080,
    exitIp: "198.51.100.20",
    deviceLabel: "corp-macbook-garcia",
    sessionId: "S-0697",
    status: "closed",
    relatedRecordIds: [],
  },
  {
    id: "V-220",
    datasetId: "vpn",
    simMinutes: 540,
    vpnId: "V-220",
    user: "d.nguyen@example.com",
    startSimMinutes: 540,
    status: "provisioning",
    relatedRecordIds: [],
  },
];

const DEVICE_ROWS: DeviceRecord[] = [
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
    id: "corp-macbook-patel-old",
    datasetId: "devices",
    deviceLabel: "corp-macbook-patel-old",
    assignedUser: "j.patel@example.com",
    deviceClass: "macbook",
    enrolled: false,
    assignmentState: "retired",
    tags: ["RETIRED"],
    relatedRecordIds: [],
  },
  {
    id: "unknown-laptop-04",
    datasetId: "devices",
    deviceLabel: "unknown-laptop-04",
    deviceClass: "laptop",
    enrolled: false,
    assignmentState: "unassigned",
    tags: [],
    relatedRecordIds: [],
  },
];

function dataset(datasetId: DatasetId, records: RuntimeDataset["records"]): RuntimeDataset {
  return { datasetId, records };
}

function fixtureDatasets(): QueryRuntimeDatasets {
  return {
    auth: dataset("auth", AUTH_ROWS),
    vpn: dataset("vpn", VPN_ROWS),
    devices: dataset("devices", DEVICE_ROWS),
  };
}

// The 7 j.patel auth rows in canonical stable order (Q-DET-02).
const PATEL_ORDER = [
  "AUTH-0612-PATEL-TYPO",
  "AUTH-0658-PATEL-PHONE",
  "AUTH-0715-PATEL-HQ",
  "AUTH-0731-PATEL",
  "AUTH-0738-GROUP",
  "AUTH-0741-PATEL",
  "AUTH-0743-REFRESH",
];

// ---------------------------------------------------------------------------
// §3 Q-NORM — normalization
// ---------------------------------------------------------------------------

describe("Q-NORM normalization", () => {
  const datasets = fixtureDatasets();

  it("Q-NORM-01 filter-order independence", () => {
    const a = runQuery(datasets, {
      datasetId: "auth",
      filters: {
        user: "j.patel@example.com",
        sourceIp: "203.0.113.44",
        windowStartSimMinutes: 385,
        windowEndSimMinutes: 465,
      },
    });
    const b = runQuery(datasets, {
      datasetId: "auth",
      filters: {
        windowEndSimMinutes: 465,
        sourceIp: "203.0.113.44",
        windowStartSimMinutes: 385,
        user: "j.patel@example.com",
      },
    });
    expect(a.normalizedFilters).toEqual(b.normalizedFilters);
    expect(a.resultIds).toEqual(b.resultIds);
    expect(a.resultIds).toEqual(["AUTH-0738-GROUP", "AUTH-0741-PATEL"]);
  });

  it("Q-NORM-02 empty half-open interval matches zero rows (valid)", () => {
    const result = runQuery(datasets, {
      datasetId: "auth",
      filters: { windowStartSimMinutes: 461, windowEndSimMinutes: 461 },
    });
    expect(result.resultIds).toEqual([]);
    expect(result.totalCount).toBe(0);
  });

  it("Q-NORM-05 user folds to lowercase; IDs stay case-sensitive", () => {
    const folded = runQuery(datasets, {
      datasetId: "auth",
      filters: { user: "  J.Patel@Example.com " },
    });
    expect(folded.normalizedFilters.user).toBe("j.patel@example.com");
    expect(folded.resultIds).toEqual(PATEL_ORDER);

    const trimmedId = runQuery(datasets, {
      datasetId: "auth",
      filters: { sessionId: " S-0741 " },
    });
    expect(trimmedId.normalizedFilters.sessionId).toBe("S-0741");
    // S-0741 spans the accepted login (461) and its refresh continuation (463).
    expect(trimmedId.resultIds).toEqual([
      "AUTH-0741-PATEL",
      "AUTH-0743-REFRESH",
    ]);

    const wrongCase = runQuery(datasets, {
      datasetId: "auth",
      filters: { sessionId: "s-0741" },
    });
    expect(wrongCase.resultIds).toEqual([]);
  });

  it("Q-NORM-07 unsupported filter key rejected as invalid_filter", () => {
    expect.assertions(2);
    try {
      runQuery(datasets, {
        datasetId: "auth",
        // sessionId valid on auth, but `status` is not in the auth allowlist.
        filters: { status: "active" },
      });
    } catch (error) {
      expect(error).toBeInstanceOf(QueryValidationError);
      expect((error as QueryValidationError).category).toBe("invalid_filter");
    }
  });

  it("Q-NORM-09 start > end rejected as invalid_filter (not zero rows)", () => {
    expect.assertions(2);
    try {
      runQuery(datasets, {
        datasetId: "auth",
        filters: { windowStartSimMinutes: 465, windowEndSimMinutes: 385 },
      });
    } catch (error) {
      expect(error).toBeInstanceOf(QueryValidationError);
      expect((error as QueryValidationError).category).toBe("invalid_filter");
    }
  });
});

// ---------------------------------------------------------------------------
// §5 Q-FILT — filtering
// ---------------------------------------------------------------------------

describe("Q-FILT filtering", () => {
  const datasets = fixtureDatasets();

  it("Q-FILT-01 exact account", () => {
    const result = runQuery(datasets, {
      datasetId: "auth",
      filters: { user: "j.patel@example.com" },
    });
    expect(result.resultIds).toEqual(PATEL_ORDER);
  });

  it("Q-FILT-02 exact IP", () => {
    expect(
      runQuery(datasets, {
        datasetId: "auth",
        filters: { sourceIp: "203.0.113.44" },
      }).resultIds,
    ).toEqual(["AUTH-0738-GROUP", "AUTH-0741-PATEL"]);
    expect(
      runQuery(datasets, {
        datasetId: "auth",
        filters: { sourceIp: "198.51.100.20" },
      }).resultIds,
    ).toEqual(["AUTH-0731-PATEL"]);
  });

  it("Q-FILT-03 exact device excludes namesake + prefix traps", () => {
    expect(
      runQuery(datasets, {
        datasetId: "devices",
        filters: { deviceLabel: "unknown-laptop-17" },
      }).resultIds,
    ).toEqual(["unknown-laptop-17"]);
    expect(
      runQuery(datasets, {
        datasetId: "devices",
        filters: { deviceLabel: "corp-macbook-patel" },
      }).resultIds,
    ).toEqual(["corp-macbook-patel"]);
  });

  it("Q-FILT-04 time interval", () => {
    expect(
      runQuery(datasets, {
        datasetId: "auth",
        filters: { windowStartSimMinutes: 449, windowEndSimMinutes: 465 },
      }).resultIds,
    ).toEqual([
      "AUTH-0731-PATEL",
      "AUTH-0733-OKONKWO",
      "AUTH-0738-GROUP",
      "AUTH-0740-GARCIA",
      "AUTH-0741-PATEL",
      "AUTH-0743-REFRESH",
    ]);
  });

  it("Q-FILT-05 combined account + interval", () => {
    expect(
      runQuery(datasets, {
        datasetId: "auth",
        filters: {
          user: "j.patel@example.com",
          windowStartSimMinutes: 449,
          windowEndSimMinutes: 465,
        },
      }).resultIds,
    ).toEqual([
      "AUTH-0731-PATEL",
      "AUTH-0738-GROUP",
      "AUTH-0741-PATEL",
      "AUTH-0743-REFRESH",
    ]);
  });

  it("Q-FILT-06 combined IP + interval, including outside-window zero", () => {
    expect(
      runQuery(datasets, {
        datasetId: "auth",
        filters: {
          sourceIp: "203.0.113.44",
          windowStartSimMinutes: 385,
          windowEndSimMinutes: 465,
        },
      }).resultIds,
    ).toEqual(["AUTH-0738-GROUP", "AUTH-0741-PATEL"]);
    expect(
      runQuery(datasets, {
        datasetId: "auth",
        filters: {
          sourceIp: "203.0.113.44",
          windowStartSimMinutes: 465,
          windowEndSimMinutes: 475,
        },
      }).resultIds,
    ).toEqual([]);
  });

  it("Q-FILT-07 account + IP + interval", () => {
    expect(
      runQuery(datasets, {
        datasetId: "auth",
        filters: {
          user: "j.patel@example.com",
          sourceIp: "203.0.113.44",
          windowStartSimMinutes: 385,
          windowEndSimMinutes: 465,
        },
      }).resultIds,
    ).toEqual(["AUTH-0738-GROUP", "AUTH-0741-PATEL"]);
    expect(
      runQuery(datasets, {
        datasetId: "auth",
        filters: {
          user: "j.patel@example.com",
          sourceIp: "198.51.100.20",
          windowStartSimMinutes: 385,
          windowEndSimMinutes: 465,
        },
      }).resultIds,
    ).toEqual(["AUTH-0731-PATEL"]);
  });

  it("Q-FILT-08 empty filters return whole dataset in stable order", () => {
    const result = runQuery(datasets, { datasetId: "auth", filters: {} });
    expect(result.totalCount).toBe(AUTH_ROWS.length);
    expect(result.truncated).toBe(false);
    // Stable order: simMinutes asc, id tie-break (458 GROUP < 460 GARCIA).
    expect(result.resultIds).toEqual([
      "AUTH-0612-PATEL-TYPO",
      "AUTH-0658-PATEL-PHONE",
      "AUTH-0715-PATEL-HQ",
      "AUTH-0731-PATEL",
      "AUTH-0733-OKONKWO",
      "AUTH-0738-GROUP",
      "AUTH-0740-GARCIA",
      "AUTH-0741-PATEL",
      "AUTH-0743-REFRESH",
      "AUTH-0802-RIVERA-VPN",
    ]);
  });

  it("Q-FILT-09 unsupported filter forbidden (invalid_filter, no results)", () => {
    expect.assertions(2);
    try {
      runQuery(datasets, {
        datasetId: "auth",
        filters: { urlHost: "mailbox-check.example.net" },
      });
    } catch (error) {
      expect(error).toBeInstanceOf(QueryValidationError);
      expect((error as QueryValidationError).category).toBe("invalid_filter");
    }
  });
});

// ---------------------------------------------------------------------------
// §4 Q-DET — determinism & ordering
// ---------------------------------------------------------------------------

describe("Q-DET determinism", () => {
  it("Q-DET-02 stable order for j.patel", () => {
    expect(
      runQuery(fixtureDatasets(), {
        datasetId: "auth",
        filters: { user: "j.patel@example.com" },
      }).resultIds,
    ).toEqual(PATEL_ORDER);
  });

  it("Q-DET-03 insertion-order independence (reverse + fixed shuffle)", () => {
    const reversed: QueryRuntimeDatasets = {
      auth: dataset("auth", [...AUTH_ROWS].reverse()),
    };
    // Deterministic fixed permutation (no Math.random): rotate by 3.
    const rotated = [...AUTH_ROWS.slice(3), ...AUTH_ROWS.slice(0, 3)];
    const shuffled: QueryRuntimeDatasets = { auth: dataset("auth", rotated) };
    const query = {
      datasetId: "auth" as const,
      filters: { user: "j.patel@example.com" },
    };
    expect(runQuery(reversed, query).resultIds).toEqual(PATEL_ORDER);
    expect(runQuery(shuffled, query).resultIds).toEqual(PATEL_ORDER);
  });

  it("Q-DET-04 boundary timestamps (half-open windows)", () => {
    const datasets = fixtureDatasets();
    expect(
      runQuery(datasets, {
        datasetId: "auth",
        filters: { windowStartSimMinutes: 461, windowEndSimMinutes: 463 },
      }).resultIds,
    ).toEqual(["AUTH-0741-PATEL"]);
    expect(
      runQuery(datasets, {
        datasetId: "auth",
        filters: { windowStartSimMinutes: 458, windowEndSimMinutes: 460 },
      }).resultIds,
    ).toEqual(["AUTH-0738-GROUP"]);
    expect(
      runQuery(datasets, {
        datasetId: "auth",
        filters: { windowStartSimMinutes: 460, windowEndSimMinutes: 461 },
      }).resultIds,
    ).toEqual(["AUTH-0740-GARCIA"]);
  });
});

// ---------------------------------------------------------------------------
// §6 Q-ZERO — zero results
// ---------------------------------------------------------------------------

describe("Q-ZERO zero results", () => {
  const datasets = fixtureDatasets();

  it("Q-ZERO-01 legitimate zero succeeds with metadata", () => {
    const result = runQuery(datasets, {
      datasetId: "vpn",
      filters: {
        user: "j.patel@example.com",
        sourceIp: "203.0.113.44",
        windowStartSimMinutes: 385,
        windowEndSimMinutes: 465,
      },
    });
    expect(result.records).toEqual([]);
    expect(result.totalCount).toBe(0);
    expect(result.truncated).toBe(false);
    expect(result.normalizedFilters.user).toBe("j.patel@example.com");
  });

  it("Q-ZERO-03 result IDs are empty array, not null", () => {
    const result = runQuery(datasets, {
      datasetId: "vpn",
      filters: { user: "nobody@example.com" },
    });
    expect(result.resultIds).toEqual([]);
    expect(result.records).toEqual([]);
    expect(result.totalCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §7 Q-HIST — reducer branch + query history
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
      datasets: fixtureDatasets(),
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
  filters: Record<string, string | number>,
  datasetId: DatasetId = "auth",
): SimulationAction {
  return {
    id: "query_records",
    actorId: "player",
    queryPayload: { datasetId, filters },
  };
}

describe("Q-HIST query history reducer branch", () => {
  it("Q-HIST-01 appends one entry per accepted query with monotonic seq", () => {
    let state = stateWithDatasets();
    state = applyAction(
      state,
      queryAction({ user: "j.patel@example.com" }),
    ).state;
    state = applyAction(
      state,
      queryAction({ user: "nobody@example.com" }, "vpn"),
    ).state;
    state = applyAction(
      state,
      queryAction({ deviceLabel: "unknown-laptop-17" }, "devices"),
    ).state;

    expect(state.queryHistory).toHaveLength(3);
    expect(state.queryHistory.map((entry) => entry.seq)).toEqual([1, 2, 3]);
    expect(state.queryHistory.map((entry) => entry.queryId)).toEqual([
      "sess-1-q1",
      "sess-1-q2",
      "sess-1-q3",
    ]);
    // Zero-result middle query retained explicitly.
    expect(state.queryHistory[1]?.resultIds).toEqual([]);
    expect(state.queryHistory[1]?.totalCount).toBe(0);
    // simMinutes is post-advance simClock (400 + 2 per query).
    expect(state.queryHistory.map((entry) => entry.simMinutes)).toEqual([
      402, 404, 406,
    ]);
    // Query results NEVER mark records observed/opened.
    expect(state.observedArtifactIds).toEqual([]);
  });

  it("Q-HIST-08 invalid query appends nothing and does not consume seq", () => {
    const state = stateWithDatasets();
    expect(() =>
      applyAction(state, queryAction({ user: "j.patel@example.com" }, "email" as DatasetId)),
    ).toThrow();
    expect(() =>
      applyAction(state, queryAction({ windowStartSimMinutes: 465, windowEndSimMinutes: 385 })),
    ).toThrow(QueryValidationError);
    // No mutation: history empty, clock unchanged.
    expect(state.queryHistory).toEqual([]);
    expect(state.simClock).toBe(400);

    // Next accepted query reuses the un-consumed seq (1).
    const next = applyAction(
      state,
      queryAction({ user: "j.patel@example.com" }),
    ).state;
    expect(next.queryHistory).toHaveLength(1);
    expect(next.queryHistory[0]?.seq).toBe(1);
    expect(next.queryHistory[0]?.normalizedFilters).toEqual({
      user: "j.patel@example.com",
    });
  });
});
