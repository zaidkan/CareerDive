import { describe, expect, it } from "vitest";
import type {
  ActionLogEntry,
  AuthRecord,
  DatasetId,
  QueryRecordsPayload,
  RuntimeDataset,
  SimulationAction,
  WorldState,
} from "@sim/schemas";
import { QueryHistoryEntrySchema, WorldStateSchema } from "@sim/schemas";
import { RESULT_CAP } from "@sim/schemas";
import { applyAction, foldActionLog, runQuery } from "../src/index.js";

// ---------------------------------------------------------------------------
// P2-T05 — deterministic replay + query provenance guards.
//
// Proves the frozen Phase 2 contract end-to-end:
//   - identical replay folds to identical query history;
//   - equal-timestamp results use the id-lexicographic tie-break;
//   - RESULT_CAP truncation is deterministic from the END of stable order;
//   - zero-result queries are canonical successes with retained provenance;
//   - query history is strictly append-only (no dedup, no rewrite);
//   - each entry preserves provenance for Phase 3 (datasetId,
//     normalizedFilters, window, resultIds, count, truncation, simMinutes,
//     actor/event association);
//   - querying never mutates observation state;
//   - Phase 2 never activates Phase 3+ domains (evidence facts, structured
//     ticket truth, NPC intent/grading, delayed consequence interpretation).
//
// Guards here are read-only assertions over the canonical engine/reducer; no
// production code under test is modified by this lane.
// ---------------------------------------------------------------------------

const QUERY_MINUTES = 2;

/** Small synthetic auth dataset, patel + decoy + equal-timestamp tie rows. */
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
];

/** Equal-timestamp tie rows: same simMinutes, deliberately shuffled ids. */
const TIE_ROWS: AuthRecord[] = [
  {
    id: "AUTH-ZZ",
    datasetId: "auth",
    simMinutes: 450,
    user: "tie@example.com",
    method: "password",
    result: "success",
    relatedRecordIds: [],
  },
  {
    id: "AUTH-AA",
    datasetId: "auth",
    simMinutes: 450,
    user: "tie@example.com",
    method: "password",
    result: "success",
    relatedRecordIds: [],
  },
  {
    id: "AUTH-MM",
    datasetId: "auth",
    simMinutes: 450,
    user: "tie@example.com",
    method: "password",
    result: "success",
    relatedRecordIds: [],
  },
  {
    id: "AUTH-BB",
    datasetId: "auth",
    simMinutes: 450,
    user: "tie@example.com",
    method: "password",
    result: "success",
    relatedRecordIds: [],
  },
];

function dataset(datasetId: DatasetId, records: RuntimeDataset["records"]): RuntimeDataset {
  return { datasetId, records };
}

function fixtureDatasets(): Record<string, RuntimeDataset> {
  return { auth: dataset("auth", AUTH_ROWS) };
}

function stateWithDatasets(
  datasets: Record<string, RuntimeDataset> = fixtureDatasets(),
): WorldState {
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
  eventId?: string,
): SimulationAction & { queryPayload: QueryRecordsPayload } {
  return {
    id: "query_records",
    actorId: "player",
    ...(eventId ? { eventId } : {}),
    queryPayload: { datasetId, filters },
  };
}

function logEntry(
  sequence: number,
  action: SimulationAction,
): ActionLogEntry {
  return { sequence, interaction: { type: "action", action } };
}

function applyChain(
  initialState: WorldState,
  actions: SimulationAction[],
): WorldState {
  return actions.reduce(
    (state, action) => applyAction(state, action).state,
    initialState,
  );
}

// ---------------------------------------------------------------------------
// Q-RP-01 — identical replay
// ---------------------------------------------------------------------------

describe("Q-RP-01 identical replay", () => {
  const actions = [
    queryAction({ user: "j.patel@example.com" }),
    queryAction({ user: "nobody@example.com" }, "auth"),
    queryAction({ sourceIp: "203.0.113.44" }),
  ];

  it("folds the action log to the identical canonical state as applyAction", () => {
    const initial = stateWithDatasets();
    const direct = applyChain(initial, actions);
    const replayed = foldActionLog(
      initial,
      actions.map((action, index) => logEntry(index + 1, action)),
    );
    expect(replayed).toEqual(direct);
  });

  it("produces byte-identical query history across repeated replays", () => {
    const initial = stateWithDatasets();
    const entries = actions.map((action, index) => logEntry(index + 1, action));
    const first = foldActionLog(initial, entries);
    const second = foldActionLog(initial, entries);
    expect(first.queryHistory).toEqual(second.queryHistory);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it("sequence numbers are canonical, not array order", () => {
    const initial = stateWithDatasets();
    // Same interactions, different array order, same sequence numbers.
    const scrambled = [
      logEntry(3, actions[2] as SimulationAction),
      logEntry(1, actions[0] as SimulationAction),
      logEntry(2, actions[1] as SimulationAction),
    ];
    const canonical = foldActionLog(
      initial,
      actions.map((action, index) => logEntry(index + 1, action)),
    );
    const shuffled = foldActionLog(initial, scrambled);
    expect(shuffled).toEqual(canonical);
  });
});

// ---------------------------------------------------------------------------
// Q-RP-02 — equal-timestamp stable ordering (id tie-break)
// ---------------------------------------------------------------------------

describe("Q-RP-02 equal-timestamp stable ordering", () => {
  it("ties sort by id lexicographic, independent of insertion order", () => {
    const base = queryAction({ user: "tie@example.com" });
    const canonical: Record<string, RuntimeDataset> = {
      auth: dataset("auth", TIE_ROWS),
    };
    const reversed: Record<string, RuntimeDataset> = {
      auth: dataset("auth", [...TIE_ROWS].reverse()),
    };
    // id-lexicographic: AA < BB < MM < ZZ.
    const expected = ["AUTH-AA", "AUTH-BB", "AUTH-MM", "AUTH-ZZ"];

    expect(runQuery(canonical, base.queryPayload).resultIds).toEqual(expected);
    expect(runQuery(reversed, base.queryPayload).resultIds).toEqual(expected);
    expect(applyChain(stateWithDatasets(canonical), [base]).queryHistory).toEqual(
      applyChain(stateWithDatasets(reversed), [base]).queryHistory,
    );
  });
});

// ---------------------------------------------------------------------------
// Q-RP-03 — deterministic RESULT_CAP truncation
// ---------------------------------------------------------------------------

describe("Q-RP-03 deterministic RESULT_CAP", () => {
  function rows(n: number): AuthRecord[] {
    return Array.from({ length: n }, (_, index) => ({
      id: `AUTH-${String(index).padStart(3, "0")}`,
      datasetId: "auth" as const,
      simMinutes: index,
      user: "cap@example.com",
      method: "password",
      result: "success" as const,
      relatedRecordIds: [],
    }));
  }

  it("caps at RESULT_CAP from the END of stable order, deterministically", () => {
    expect(RESULT_CAP).toBe(50);
    const over = rows(RESULT_CAP + 10); // 60 rows, all matching one filter.
    const filter = queryAction({ user: "cap@example.com" });

    const result = runQuery({ auth: dataset("auth", over) }, filter.queryPayload);
    expect(result.totalCount).toBe(60);
    expect(result.truncated).toBe(true);
    expect(result.resultIds).toHaveLength(RESULT_CAP);
    // Pure id order confirms simMinutes tie-free; first cap rows survive.
    expect(result.resultIds[0]).toBe("AUTH-000");
    expect(result.resultIds[result.resultIds.length - 1]).toBe("AUTH-049");

    const direct = applyChain(
      stateWithDatasets({ auth: dataset("auth", over) }),
      [filter],
    );
    const terminal = direct.queryHistory[0];
    expect(terminal?.resultIds).toEqual(result.resultIds);
    expect(terminal?.totalCount).toBe(60);
    expect(terminal?.truncated).toBe(true);

    // Determinism: same result every run, insertion order irrelevant.
    const replayed = foldActionLog(
      stateWithDatasets({ auth: dataset("auth", over) }),
      [logEntry(1, filter)],
    );
    expect(replayed.queryHistory).toEqual(direct.queryHistory);

    const reversedRows = [...over].reverse();
    const viaReverse = runQuery(
      { auth: dataset("auth", reversedRows) },
      filter.queryPayload,
    );
    expect(viaReverse.resultIds).toEqual(result.resultIds);
  });
});

// ---------------------------------------------------------------------------
// Q-RP-04 — zero-result queries are canonical, retained successes
// ---------------------------------------------------------------------------

describe("Q-RP-04 zero-result replay", () => {
  it("records zero-result queries as successful history entries", () => {
    const initial = stateWithDatasets();
    const zero = queryAction({ user: "nobody@example.com" });
    const state = applyAction(initial, zero).state;

    expect(state.queryHistory).toHaveLength(1);
    const entry = state.queryHistory[0];
    expect(entry?.resultIds).toEqual([]);
    expect(entry?.totalCount).toBe(0);
    expect(entry?.truncated).toBe(false);
    // Provenance survives the empty result: dataset + normalized filters.
    expect(entry?.datasetId).toBe("auth");
    expect(entry?.normalizedFilters).toEqual({
      user: "nobody@example.com",
    });
    expect(entry?.simMinutes).toBe(402);
  });

  it("replays zero-result queries identically", () => {
    const initial = stateWithDatasets();
    const zero = queryAction({ user: "nobody@example.com" });
    const direct = applyChain(initial, [zero, zero, zero]);
    const replayed = foldActionLog(
      initial,
      [logEntry(1, zero), logEntry(2, zero), logEntry(3, zero)],
    );
    expect(replayed).toEqual(direct);
    expect(replayed.queryHistory.map((e) => e.totalCount)).toEqual([0, 0, 0]);
  });
});

// ---------------------------------------------------------------------------
// Q-RP-05 — append-only history (no dedup, no rewrite)
// ---------------------------------------------------------------------------

describe("Q-RP-05 append-only history", () => {
  it("appends a fresh entry per query, never deduplicating", () => {
    const initial = stateWithDatasets();
    const same = queryAction({ user: "j.patel@example.com" });

    const once = applyChain(initial, [same]);
    const twice = applyChain(initial, [same, same]);

    expect(twice.queryHistory.map((e) => e.queryId)).toEqual([
      "sess-1-q1",
      "sess-1-q2",
    ]);
    expect(twice.queryHistory.map((e) => e.seq)).toEqual([1, 2]);
    expect(twice.queryHistory.map((e) => e.resultIds)).toEqual([
      once.queryHistory[0]?.resultIds,
      once.queryHistory[0]?.resultIds,
    ]);
  });

  it("never rewrites earlier entries after later queries", () => {
    const initial = stateWithDatasets();
    const first = queryAction({ user: "j.patel@example.com" });
    const second = queryAction({ sourceIp: "203.0.113.44" });

    const afterFirst = applyChain(initial, [first]);
    const snapshot = structuredClone(afterFirst.queryHistory[0]);

    const final = applyChain(afterFirst, [second, second]);
    expect(final.queryHistory[0]).toEqual(snapshot);
    expect(final.queryHistory).toHaveLength(3);
    expect(final.queryHistory.map((e) => e.seq)).toEqual([1, 2, 3]);
  });
});

// ---------------------------------------------------------------------------
// Q-RP-06 — provenance retention for Phase 3
// ---------------------------------------------------------------------------

describe("Q-RP-06 provenance retention", () => {
  it("stores frozen provenance fields on every replayed entry", () => {
    const initial = stateWithDatasets();
    const action = queryAction(
      {
        user: "  J.Patel@Example.com ",
        windowStartSimMinutes: 449,
        windowEndSimMinutes: 465,
      },
      "auth",
      "suspicious-login-1",
    );

    const state = applyChain(initial, [action]);
    const entry = state.queryHistory[0];
    expect(entry?.queryId).toBe("sess-1-q1");
    expect(entry?.seq).toBe(1);
    expect(entry?.datasetId).toBe("auth");
    // Normalization happened: trimmed + lowercased user, int windows kept.
    expect(entry?.normalizedFilters).toEqual({
      user: "j.patel@example.com",
      windowStartSimMinutes: 449,
      windowEndSimMinutes: 465,
    });
    expect(entry?.resultIds).toEqual([
      "AUTH-0731-PATEL",
      "AUTH-0738-GROUP",
      "AUTH-0741-PATEL",
      "AUTH-0743-REFRESH",
    ]);
    expect(entry?.totalCount).toBe(4);
    expect(entry?.truncated).toBe(false);
    // simMinutes is the post-advance clock timestamp of the query.
    expect(entry?.simMinutes).toBe(402);
    // Event association is retained when the action carried one.
    expect(entry?.actorEventId).toBe("suspicious-login-1");

    // Strict schema: entries carry exactly the frozen keys.
    expect(() => QueryHistoryEntrySchema.parse(entry)).not.toThrow();
  });

  it("replay preserves provenance fields exactly", () => {
    const initial = stateWithDatasets();
    const windowed = queryAction(
      { windowStartSimMinutes: 449, windowEndSimMinutes: 465 },
      "auth",
      "suspicious-login-1",
    );
    const replayed = foldActionLog(initial, [logEntry(1, windowed)]);
    expect(replayed.queryHistory[0]?.normalizedFilters).toEqual({
      windowStartSimMinutes: 449,
      windowEndSimMinutes: 465,
    });
    expect(replayed.queryHistory[0]?.actorEventId).toBe("suspicious-login-1");
    expect(replayed.queryHistory[0]?.resultIds).toEqual([
      "AUTH-0731-PATEL",
      "AUTH-0738-GROUP",
      "AUTH-0741-PATEL",
      "AUTH-0743-REFRESH",
    ]);
  });
});

// ---------------------------------------------------------------------------
// Q-RP-07 — querying never mutates observation state
// ---------------------------------------------------------------------------

describe("Q-RP-07 queries do not observe", () => {
  it("leaves observedArtifactIds untouched across many queries", () => {
    const initial = stateWithDatasets();
    const actions = [
      queryAction({ user: "j.patel@example.com" }),
      queryAction({ sourceIp: "203.0.113.44" }),
      queryAction({ user: "nobody@example.com" }),
    ];
    const before = structuredClone(initial.observedArtifactIds);

    const direct = applyChain(initial, actions);
    const replayed = foldActionLog(
      initial,
      actions.map((action, index) => logEntry(index + 1, action)),
    );

    expect(direct.observedArtifactIds).toEqual(before);
    expect(replayed.observedArtifactIds).toEqual(before);
    // Result rows returned by the engine must not imply observation either.
    const raw = runQuery(
      initial.rules.datasets,
      queryAction({ user: "j.patel@example.com" }).queryPayload,
    );
    expect(raw.records.length).toBeGreaterThan(0);
    expect(initial.observedArtifactIds).toEqual(before);
  });
});

// ---------------------------------------------------------------------------
// Q-RP-08 — no future-phase state activation
// ---------------------------------------------------------------------------

describe("Q-RP-08 no future-phase activation", () => {
  const FUTURE_PHASE_RESIDUE =
    /expectedAnswerKey|verdict|probability|npcIntent|grading|delayedConsequence|\bfactId\b|evidenceFacts|satisfiedProvenance|attachable|ruleTriggered/i;

  function futurePhaseResidue(state: WorldState): string | null {
    const json = JSON.stringify(state);
    const hit = FUTURE_PHASE_RESIDUE.exec(json);
    return hit?.[0] ?? null;
  }

  it("adds no Phase 3+ domain state (schema has no such stores)", () => {
    const initial = stateWithDatasets();
    const state = applyChain(initial, [
      queryAction({ user: "j.patel@example.com" }),
      queryAction({ sourceIp: "203.0.113.44" }),
      queryAction({ user: "nobody@example.com" }),
    ]);

    expect(state.queryHistory).toHaveLength(3);
    expect(futurePhaseResidue(state)).toBeNull();

    // No new top-level WorldState keys beyond the parsed schema.
    const schemaKeys = Object.keys(WorldStateSchema.parse(state)).sort();
    expect(Object.keys(state).sort()).toEqual(schemaKeys);

    // Baseline unchanged: canonical stores were not created or seeded.
    expect(JSON.stringify(state.facts)).toBe(JSON.stringify(initial.facts));
    expect(JSON.stringify(state.ticketNotes)).toBe(
      JSON.stringify(initial.ticketNotes),
    );
    expect(state.notebook).toBe(initial.notebook);
    expect(state.hidden).toEqual(initial.hidden);
  });

  it("replay activates no future-phase domains either", () => {
    const initial = stateWithDatasets();
    const zero = queryAction({ user: "nobody@example.com" });
    const replayed = foldActionLog(
      initial,
      [logEntry(1, zero), logEntry(2, zero)],
    );
    expect(futurePhaseResidue(replayed)).toBeNull();
    // Absence-style zero-result query: still just a query, never an
    // evidence-fact discovery.
    expect(replayed.queryHistory.map((e) => e.totalCount)).toEqual([0, 0]);
    expect(replayed.facts).toEqual({});
  });
});