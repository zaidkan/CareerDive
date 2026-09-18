// P2-T06 RED TEST LANE (Worker D) — query renderer-parity acceptance.
//
// Scope: TEST ONLY. No production code, no schema/pack/doc changes.
// Canonical refs:
// - interactivity design §5.1 (Queryable Records), §13 (Renderer Parity)
// - interactivity-playtest-and-acceptance-pack.md §§9 (PT-ABSENCE), 13
//   (PT-PARITY), 14 (PT-A11Y), Appendix A (CONTENT GAP convention)
// - renderer-parity-accessibility-matrix.md §§4-6 (record search), Structured
//   query parity 1-6, Movement/Time/Information parity
//
// Lane policy: behavior-level tests over the frozen P2-T01 contract
// (single `query_records` action + validated payload + closed per-dataset
// allowlists). Renderer adapters below are pure intent→action mappings: they
// prove every renderer CAN reach the same canonical action/state without
// asserting visual equality. DOM reachability itself belongs to Worker C's
// web surface and is tracked as skipped-pending in
// query-accessibility.test.ts, never asserted here.

import { describe, expect, it } from "vitest";
import {
  AvailableActionSchema,
  DATASET_FILTER_FIELDS,
  DatasetIdSchema,
  QueryFilterSchema,
  QueryRecordsPayloadSchema,
  QueryRejectionCategorySchema,
  QueryResultViewSchema,
  SimulationActionSchema,
  TIME_WINDOW_FILTER_FIELDS,
  type DatasetId,
  type SimulationAction,
} from "@sim/schemas";

// ---------------------------------------------------------------------------
// Renderer-neutral adapter model. Each renderer offers the same intents and
// must produce the identical canonical action. `presentation` carries
// movement/chrome context that must NEVER leak into the action.
// ---------------------------------------------------------------------------

type RendererId = "desk" | "accessible" | "workstation-3d";

interface PresentationContext {
  position: string;
  path: string[];
  camera: string;
}

interface UiQueryIntent {
  datasetId: DatasetId;
  filters: Record<string, string | number>;
  presentation: PresentationContext;
}

function buildQueryAction(intent: UiQueryIntent): SimulationAction {
  return SimulationActionSchema.parse({
    id: "query_records",
    actorId: "player",
    queryPayload: {
      datasetId: intent.datasetId,
      filters: intent.filters,
    },
  });
}

const deskAdapter = (intent: UiQueryIntent): SimulationAction =>
  buildQueryAction(intent);
const accessibleAdapter = (intent: UiQueryIntent): SimulationAction =>
  buildQueryAction(intent);
const workstation3dAdapter = (intent: UiQueryIntent): SimulationAction =>
  buildQueryAction(intent);

const ADAPTERS: Record<RendererId, (intent: UiQueryIntent) => SimulationAction> =
  {
    desk: deskAdapter,
    accessible: accessibleAdapter,
    "workstation-3d": workstation3dAdapter,
  };

const RENDERERS = Object.keys(ADAPTERS) as RendererId[];

function intentFor(
  datasetId: DatasetId,
  filters: Record<string, string | number> = {},
  presentation: PresentationContext = {
    position: "desk",
    path: [],
    camera: "default",
  },
): UiQueryIntent {
  return { datasetId, filters, presentation };
}

// Anti-quiz denylist scoped to query surfaces. Asserts absence of answer-key,
// correctness-feedback, counter/score, and relevance-label vocabulary in
// canonical query JSON — without snapshotting any product copy.
const QUERY_QUIZ_DENYLIST =
  /requiredOptionIds|answerKey|correctPath|expectedAction|correct\b|incorrect|try.?again|wrong.?choice|missed.?clue|clue.?counter|clues?\s*found|completion\s*%|progress\s*(stars|meter)|\bstars\b|\bpoints\b|grade|score|percent|is_?suspicious|needs_?escalation|relevance|verdict|branchLabel|coachOnFailure|successText/i;

describe("Q-PAR-00 canonical query contract (frozen P2-T01 shape)", () => {
  it("exposes exactly the six beta datasets", () => {
    expect(DatasetIdSchema.options).toEqual([
      "auth",
      "vpn",
      "devices",
      "alerts",
      "scanner",
      "phishing",
    ]);
  });

  it("keeps closed per-dataset filter allowlists with time-window support", () => {
    expect([...DATASET_FILTER_FIELDS.auth]).toContain("sessionId");
    expect([...DATASET_FILTER_FIELDS.auth]).toContain("user");
    expect([...DATASET_FILTER_FIELDS.vpn]).toContain("vpnId");
    expect([...DATASET_FILTER_FIELDS.devices]).toContain("deviceLabel");
    expect([...TIME_WINDOW_FILTER_FIELDS]).toEqual([
      "windowStartSimMinutes",
      "windowEndSimMinutes",
    ]);
  });

  it("rejects unknown filter keys at parse time (strict payload)", () => {
    expect(() =>
      QueryFilterSchema.parse({ bogusDimension: "S-0741" }),
    ).toThrow();
  });

  it("parses the canonical query_records envelope with payload", () => {
    const action = buildQueryAction(
      intentFor("auth", { sessionId: "S-0741" }),
    );
    expect(action.id).toBe("query_records");
    expect(
      QueryRecordsPayloadSchema.parse(action.queryPayload),
    ).toMatchObject({
      datasetId: "auth",
      filters: { sessionId: "S-0741" },
    });
  });

  it("parses a query_records available-action shape (no visual coupling)", () => {
    const available = AvailableActionSchema.parse({
      id: "query_records",
      eventId: "suspicious-login-1",
      systemId: "alert_dashboard",
      label: "Query records",
      description: "Run a structured record query.",
      simulatedMinutes: 2,
    });
    expect(available.id).toBe("query_records");
  });
});

describe("Q-PAR-10 same intent, same canonical action in every renderer", () => {
  it("opens/accesses the query tool for every dataset identically", () => {
    for (const datasetId of DatasetIdSchema.options) {
      const actions = RENDERERS.map((renderer) =>
        ADAPTERS[renderer](intentFor(datasetId)),
      );
      for (const action of actions) {
        expect(action).toEqual(actions[0]);
        expect(action.queryPayload?.datasetId).toBe(datasetId);
      }
    }
  });

  it("selects each dataset as the same canonical payload", () => {
    const selections: Array<{
      datasetId: DatasetId;
      filters: Record<string, string | number>;
    }> = [
      { datasetId: "auth", filters: { sessionId: "S-0741" } },
      {
        datasetId: "vpn",
        filters: {
          user: "j.patel@example.com",
          windowStartSimMinutes: 445,
          windowEndSimMinutes: 465,
        },
      },
      { datasetId: "devices", filters: { deviceLabel: "unknown-laptop-17" } },
      { datasetId: "alerts", filters: { alertId: "A-1042" } },
      { datasetId: "scanner", filters: { runId: "RUN-FIN-031" } },
      { datasetId: "phishing", filters: { sender: "it-helpdesk@example.com" } },
    ];
    for (const { datasetId, filters } of selections) {
      const actions = RENDERERS.map((renderer) =>
        ADAPTERS[renderer](intentFor(datasetId, filters)),
      );
      for (const action of actions) expect(action).toEqual(actions[0]);
    }
  });

  it("submits structured queries without renderer-specific fields", () => {
    const intent = intentFor("auth", {
      user: "j.patel@example.com",
      sourceIp: "203.0.113.44",
      windowStartSimMinutes: 445,
      windowEndSimMinutes: 465,
    });
    for (const renderer of RENDERERS) {
      const action = ADAPTERS[renderer](intent);
      expect(Object.keys(action).sort()).toEqual(
        ["actorId", "id", "queryPayload"].sort(),
      );
      expect(action).toEqual(ADAPTERS.desk(intent));
    }
  });

  it("inspects the same result identity from the same query", () => {
    const identity = {
      queryId: "q-1",
      datasetId: "auth" as const,
      records: [],
      resultIds: ["AUTH-0741-PATEL"],
      totalCount: 1,
      truncated: false,
      simMinutes: 461,
    };
    const views = RENDERERS.map(() => QueryResultViewSchema.parse(identity));
    for (const view of views) {
      expect(view.resultIds).toEqual(["AUTH-0741-PATEL"]);
      expect(view).toEqual(views[0]);
    }
  });

  it("treats a legitimate zero-result query as valid (never a rejection)", () => {
    // Unknown device label with otherwise valid filters: parses fine at the
    // contract level; zero rows is an engine outcome, not a rejection.
    const intent = intentFor("devices", {
      deviceLabel: "no-such-laptop-99",
    });
    for (const renderer of RENDERERS) {
      expect(() => ADAPTERS[renderer](intent)).not.toThrow();
    }
    // Closed rejection categories contain no empty/zero-results member, so a
    // zero-row outcome can never be framed as an invalid request.
    expect(QueryRejectionCategorySchema.options).toEqual([
      "unknown_dataset",
      "invalid_filter",
      "invalid_payload",
    ]);
  });
});

describe("Q-PAR-20 movement never creates or changes query capability", () => {
  it("produces identical actions for different movement contexts", () => {
    const base = { sessionId: "S-0731" };
    const contexts: PresentationContext[] = [
      { position: "desk", path: [], camera: "default" },
      { position: "alert-wall", path: ["desk", "wall"], camera: "pan-left" },
      {
        position: "break-room",
        path: ["desk", "hall", "break-room", "desk"],
        camera: "wander",
      },
    ];
    const actions = contexts.map((presentation) =>
      deskAdapter(intentFor("auth", base, presentation)),
    );
    for (const action of actions) expect(action).toEqual(actions[0]);
  });

  it("holds movement independence in every renderer pathway", () => {
    const intent = intentFor(
      "vpn",
      { user: "j.patel@example.com" },
      { position: "morgan-desk", path: ["desk", "morgan"], camera: "close-up" },
    );
    const baseline = intentFor("vpn", { user: "j.patel@example.com" });
    for (const renderer of RENDERERS) {
      expect(ADAPTERS[renderer](intent)).toEqual(ADAPTERS[renderer](baseline));
    }
  });

  it("creates no action from position alone (proximity is not a query)", () => {
    // No intent, no action: the adapter model has no position-to-action path.
    // Encoded as: building an action always requires an explicit dataset.
    const withoutDataset = () =>
      SimulationActionSchema.parse({
        id: "query_records",
        actorId: "player",
      });
    // Schema envelope alone cannot carry meaning without payload; the reducer
    // owns the pairing rule, so the stranded envelope must not equal a real
    // query action.
    const stranded = withoutDataset() as SimulationAction;
    const real = buildQueryAction(intentFor("auth", { user: "x" }));
    expect(stranded.queryPayload).toBeUndefined();
    expect(real.queryPayload).toBeDefined();
    expect(stranded).not.toEqual(real);
  });
});

describe("Q-PAR-30 anti-quiz guards on query surfaces", () => {
  it("carries no answer-key or correctness vocabulary in query actions", () => {
    const samples = [
      intentFor("auth", { sessionId: "S-0741" }),
      intentFor("vpn", {
        user: "j.patel@example.com",
        windowStartSimMinutes: 445,
        windowEndSimMinutes: 465,
      }),
      intentFor("devices", { deviceLabel: "unknown-laptop-17" }),
    ];
    for (const sample of samples) {
      const action = deskAdapter(sample);
      expect(JSON.stringify(action)).not.toMatch(QUERY_QUIZ_DENYLIST);
    }
  });

  it("keeps result views free of counters, scores, and relevance labels", () => {
    const view = QueryResultViewSchema.parse({
      queryId: "q-zero",
      datasetId: "devices",
      records: [],
      resultIds: [],
      totalCount: 0,
      truncated: false,
      simMinutes: 465,
    });
    expect(JSON.stringify(view)).not.toMatch(QUERY_QUIZ_DENYLIST);
    // totalCount is a result-set size for pagination, never a score: the view
    // carries no score/grade/rating key alongside it.
    expect(view).not.toHaveProperty("score");
    expect(view).not.toHaveProperty("grade");
    expect(view).not.toHaveProperty("relevance");
  });

  it("exposes no hidden required query order in the canonical shape", () => {
    // Each intent builds a standalone action: device-first, VPN-first, and
    // auth-first all parse without any predecessor field.
    const deviceFirst = buildQueryAction(
      intentFor("devices", { deviceLabel: "unknown-laptop-17" }),
    );
    const vpnFirst = buildQueryAction(
      intentFor("vpn", { user: "j.patel@example.com" }),
    );
    const authFirst = buildQueryAction(
      intentFor("auth", { sessionId: "S-0741" }),
    );
    for (const action of [deviceFirst, vpnFirst, authFirst]) {
      expect(action).not.toHaveProperty("requiresPriorQuery");
      expect(action).not.toHaveProperty("stepIndex");
      expect(JSON.stringify(action)).not.toMatch(QUERY_QUIZ_DENYLIST);
    }
  });
});
