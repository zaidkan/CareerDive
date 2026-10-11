/**
 * P2-T02 — Pack-level dataset validation (RED tests).
 *
 * Composes with P1-T05 pack cross-validation (see pack-validation.test.ts):
 * these tests never assert the P1-T05 rules are removed — they exercise the
 * new Phase-2 dataset checks layered into the same `CareerPackSchema`
 * `superRefine`.
 *
 * Frozen contract (records.ts / world.ts, do not redesign):
 * - closed `DatasetId` set; per-dataset `DATASET_FILTER_FIELDS` allowlist;
 * - per-dataset record schemas via `DatasetRecordSchema`;
 * - `RuntimeDatasetSchema` already validates duplicate ids + datasetId match.
 *
 * Contract: invalid dataset shapes, unknown fields, and duplicate records
 * must be rejected by the pack schema.
 */
import { describe, expect, it } from "vitest";
import { CareerPackSchema } from "@sim/schemas";

// ---------------------------------------------------------------------------
// Minimal valid pack builder (mirrors pack-validation.test.ts conventions).
// No datasets by default: proves backward compatibility (datasets optional).
// ---------------------------------------------------------------------------

const career = {
  id: "test-pack",
  title: "Test Pack",
  packVersion: "1.0.0",
  reviewStatus: "approved",
  lastReviewed: "2026-01-01",
  nextReview: "2027-01-01",
  reviewingRoles: ["designer", "engineer", "educator"],
  sources: [{ title: "Source", url: "https://example.com/source" }],
  rhythms: ["routine_monitoring", "quiet_investigation"],
  systems: ["alert_dashboard"],
  events: ["test-event"],
  rhythmBiasReview: {
    ordinaryWorkRepresented: true,
    calmWorkRepresented: true,
    technicalAndRelationalWorkRepresented: true,
  },
};

const artifact = (id: string) => ({
  id,
  systemId: "alert_dashboard",
  kind: "login_record",
  title: `Artifact ${id}`,
  summary: "Summary",
  body: "Body with quoted evidence.",
});

interface PackScenario {
  actions: Array<Record<string, unknown>>;
  eventTemplates: Record<string, Record<string, unknown>>;
  artifacts: Array<Record<string, unknown>>;
  datasets?: Record<string, unknown>;
  [key: string]: unknown;
}

interface PackDraft {
  career: Record<string, unknown> & { events: string[] };
  scenario: PackScenario;
}

const validPack = (): PackDraft => ({
  career: structuredClone(career),
  scenario: {
    location: {
      id: "office",
      name: "Office",
      connectedLocationIds: [],
      interactableIds: [],
    },
    maxAiCostUsd: 0,
    briefing: "Briefing",
    initialTaskBacklog: 0,
    facts: [
      {
        id: "fact-1",
        content: "A fact.",
        visibility: "public",
        knownBy: [],
        notKnownBy: [],
      },
    ],
    npcs: [
      {
        id: "npc-1",
        name: "Jules",
        role: "Peer",
        mood: "neutral",
        memoryFactIds: [],
      },
    ],
    actions: [
      {
        id: "review_alert",
        systemId: "alert_dashboard",
        label: "Review alert",
        description: "Review the alert.",
        simulatedMinutes: 1,
        defaultEffect: { observeArtifactIds: ["a-1"] },
      },
      {
        id: "ask_manager",
        systemId: "team_chat",
        label: "Ask manager",
        description: "Request guidance.",
        simulatedMinutes: 1,
        tracksCompletion: false,
      },
    ],
    eventTemplates: {
      "test-event": {
        instanceId: "test-event-1",
        title: "Test event",
        summary: "An event.",
        priority: "normal",
        systemId: "alert_dashboard",
        triggerAt: 0,
        deadlineMinutes: 10,
        initialStatus: "pending",
        prohibitedOutcomes: [],
        progression: {
          kind: "linear",
          sequence: ["review_alert"],
        },
        managerGuidance: "Ask for help.",
        actionEffects: {},
      },
    },
    artifacts: [artifact("a-1")],
    tasks: [],
    notifications: [],
    workplaceDefaults: {
      energyMax: 100,
      fridgeSnackBars: 2,
      snackBitesPerBar: 3,
      coffeeServings: 2,
    },
  },
});

// Canonical fixture rows (small, from the RED-test spec §2).
const authRow = (over: Record<string, unknown> = {}) => ({
  id: "AUTH-0741-PATEL",
  datasetId: "auth",
  simMinutes: 461,
  user: "j.patel@example.com",
  sourceIp: "203.0.113.44",
  deviceLabel: "unknown-laptop-17",
  method: "password",
  result: "success",
  sessionId: "S-0741",
  ...over,
});

const vpnRow = (over: Record<string, unknown> = {}) => ({
  id: "V-218",
  datasetId: "vpn",
  vpnId: "V-218",
  user: "j.patel@example.com",
  exitIp: "198.51.100.20",
  status: "active",
  ...over,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("P2-T02 backward compatibility (no datasets)", () => {
  it("loads a pack with no datasets field (datasets default {})", () => {
    expect(() => CareerPackSchema.parse(validPack())).not.toThrow();
  });

  it("loads a pack with an explicit empty datasets map", () => {
    const pack = validPack();
    pack.scenario.datasets = {};
    expect(() => CareerPackSchema.parse(pack)).not.toThrow();
  });

  it("does not remove P1-T05 checks when datasets are present", () => {
    // P1-T05 orphan detector must still fire alongside dataset validation.
    const pack = validPack();
    pack.scenario.datasets = {
      auth: { records: [authRow()], allowedFilterFields: ["user"] },
    };
    pack.scenario.actions.push({
      id: "dismiss_alert",
      systemId: "alert_dashboard",
      label: "Dismiss",
      description: "Dismiss.",
      simulatedMinutes: 1,
    });
    expect(() => CareerPackSchema.parse(pack)).toThrow(/dismiss_alert/);
  });
});

describe("P2-T02 valid datasets", () => {
  it("accepts a valid single-dataset pack", () => {
    const pack = validPack();
    pack.scenario.datasets = {
      auth: {
        records: [authRow(), authRow({ id: "AUTH-0731-PATEL", sessionId: "S-0731" })],
        allowedFilterFields: ["user", "sourceIp", "deviceLabel", "sessionId"],
      },
    };
    expect(() => CareerPackSchema.parse(pack)).not.toThrow();
  });

  it("accepts a dataset that also authorizes the time-window dimensions", () => {
    const pack = validPack();
    pack.scenario.datasets = {
      auth: {
        records: [authRow()],
        allowedFilterFields: [
          "user",
          "windowStartSimMinutes",
          "windowEndSimMinutes",
        ],
      },
    };
    expect(() => CareerPackSchema.parse(pack)).not.toThrow();
  });

  it("accepts multiple datasets keyed by distinct DatasetIds", () => {
    const pack = validPack();
    pack.scenario.datasets = {
      auth: { records: [authRow()], allowedFilterFields: ["user"] },
      vpn: { records: [vpnRow()], allowedFilterFields: ["user", "vpnId"] },
    };
    expect(() => CareerPackSchema.parse(pack)).not.toThrow();
  });

  it("accepts a dataset with no authored filter fields", () => {
    const pack = validPack();
    pack.scenario.datasets = {
      auth: { records: [authRow()] },
    };
    expect(() => CareerPackSchema.parse(pack)).not.toThrow();
  });
});

describe("P2-T02 invalid dataset keys", () => {
  it("rejects a dataset key that is not a valid DatasetId", () => {
    const pack = validPack();
    pack.scenario.datasets = {
      email: { records: [], allowedFilterFields: [] },
    };
    expect(() => CareerPackSchema.parse(pack)).toThrow();
  });
});

describe("P2-T02 record shape + per-dataset schema (reuse RuntimeDataset)", () => {
  it("rejects a record missing a required field for its dataset", () => {
    const pack = validPack();
    pack.scenario.datasets = {
      auth: {
        // missing `result` (required on AuthRecordSchema)
        records: [{ id: "AUTH-BAD", datasetId: "auth", user: "u", method: "password" }],
        allowedFilterFields: ["user"],
      },
    };
    expect(() => CareerPackSchema.parse(pack)).toThrow();
  });

  it("rejects an off-vocabulary enum value in a record (Q-NEG-08)", () => {
    const pack = validPack();
    pack.scenario.datasets = {
      auth: {
        records: [authRow({ result: "maybe" })],
        allowedFilterFields: ["user"],
      },
    };
    expect(() => CareerPackSchema.parse(pack)).toThrow();
  });

  it("rejects a record whose datasetId disagrees with its map key", () => {
    const pack = validPack();
    pack.scenario.datasets = {
      auth: {
        records: [vpnRow()], // datasetId "vpn" under the "auth" key
        allowedFilterFields: ["user"],
      },
    };
    expect(() => CareerPackSchema.parse(pack)).toThrow();
  });

  it("rejects duplicate record ids within a dataset (Q-NEG-08)", () => {
    const pack = validPack();
    pack.scenario.datasets = {
      auth: {
        records: [authRow({ id: "DUP" }), authRow({ id: "DUP", sessionId: "S-0731" })],
        allowedFilterFields: ["user"],
      },
    };
    expect(() => CareerPackSchema.parse(pack)).toThrow(/DUP/);
  });
});

describe("P2-T02 authored filter-field allowlist", () => {
  it("rejects an authored filter field outside the dataset allowlist", () => {
    const pack = validPack();
    pack.scenario.datasets = {
      // `deviceLabel` is not a scanner filter dimension.
      scanner: {
        records: [],
        allowedFilterFields: ["deviceLabel"],
      },
    };
    expect(() => CareerPackSchema.parse(pack)).toThrow(/deviceLabel/);
  });

  it("rejects an authored filter field valid on another dataset only", () => {
    const pack = validPack();
    pack.scenario.datasets = {
      // `sessionId` is an auth/vpn dimension, not a devices dimension.
      devices: {
        records: [],
        allowedFilterFields: ["sessionId"],
      },
    };
    expect(() => CareerPackSchema.parse(pack)).toThrow(/sessionId/);
  });

  it("rejects a filter field that is not a filter dimension anywhere", () => {
    const pack = validPack();
    pack.scenario.datasets = {
      auth: {
        records: [authRow()],
        allowedFilterFields: ["verdict"],
      },
    };
    expect(() => CareerPackSchema.parse(pack)).toThrow(/verdict/);
  });
});
