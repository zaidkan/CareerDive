/**
 * P2-T01 — Query-engine schema foundation tests (Batch 1).
 *
 * Layer: schema (packages/schemas). Asserts record definitions, the query
 * payload envelope, query-history entry shape, and client result-view shape.
 * Contracts cover validation, closed allowlists, and safe client projection.
 */
import { describe, expect, it } from "vitest";

import {
  AlertRecordSchema,
  AuthRecordSchema,
  DATASET_FILTER_FIELDS,
  DatasetIdSchema,
  DatasetRecordSchema,
  DeviceRecordSchema,
  RuntimeDatasetSchema,
} from "../src/records.js";
import {
  NormalizedQueryFilterSchema,
  QueryHistoryEntrySchema,
  QueryRecordsPayloadSchema,
  QueryResultViewSchema,
  RESULT_CAP,
} from "../src/query.js";
import { SimulationActionSchema } from "../src/actions.js";

describe("P2-T01 dataset id + filter field allowlists", () => {
  it("freezes the six beta datasets", () => {
    expect(DatasetIdSchema.options).toEqual([
      "auth",
      "vpn",
      "devices",
      "alerts",
      "scanner",
      "phishing",
    ]);
  });

  it("exposes a closed filter allowlist per dataset", () => {
    for (const dataset of DatasetIdSchema.options) {
      expect(DATASET_FILTER_FIELDS[dataset].length).toBeGreaterThan(0);
    }
    expect(DATASET_FILTER_FIELDS.auth).toContain("sessionId");
    expect(DATASET_FILTER_FIELDS.devices).toContain("deviceLabel");
    // Cross-dataset dimension is not silently allowed everywhere.
    expect(DATASET_FILTER_FIELDS.scanner).not.toContain("deviceLabel");
  });
});

describe("P2-T01 per-dataset record schemas", () => {
  it("accepts a minimum auth row and rejects unknown keys (.strict)", () => {
    const row = AuthRecordSchema.parse({
      id: "AUTH-0741-PATEL",
      datasetId: "auth",
      simMinutes: 461,
      user: "j.patel@example.com",
      sourceIp: "203.0.113.44",
      deviceLabel: "unknown-laptop-17",
      method: "password",
      result: "success",
      sessionId: "S-0741",
    });
    expect(row.result).toBe("success");
    expect(() =>
      AuthRecordSchema.parse({
        id: "x",
        datasetId: "auth",
        user: "u",
        method: "password",
        result: "success",
        verdict: "malicious", // hidden authoring field must not exist
      }),
    ).toThrow();
  });

  it("rejects off-vocabulary enum values", () => {
    expect(() =>
      AuthRecordSchema.parse({
        id: "x",
        datasetId: "auth",
        user: "u",
        method: "password",
        result: "maybe",
      }),
    ).toThrow();
    expect(() =>
      AlertRecordSchema.parse({
        id: "A-1",
        datasetId: "alerts",
        alertId: "A-1",
        category: "sign-in",
        severity: "high",
        state: "not-a-state",
      }),
    ).toThrow();
  });

  it("models genuine absence as optional, never null", () => {
    const dev = DeviceRecordSchema.parse({
      id: "unknown-laptop-17",
      datasetId: "devices",
      deviceLabel: "unknown-laptop-17",
      deviceClass: "laptop",
      enrolled: false,
      assignmentState: "unassigned",
    });
    expect(dev.lastCheckinSimMinutes).toBeUndefined();
    expect(() =>
      DeviceRecordSchema.parse({
        id: "x",
        datasetId: "devices",
        deviceLabel: "x",
        deviceClass: "laptop",
        enrolled: false,
        assignmentState: "unassigned",
        lastCheckinSimMinutes: null,
      }),
    ).toThrow();
  });

  it("discriminates records by datasetId", () => {
    const parsed = DatasetRecordSchema.parse({
      id: "V-218",
      datasetId: "vpn",
      vpnId: "V-218",
      user: "j.patel@example.com",
      exitIp: "198.51.100.20",
      status: "active",
    });
    expect(parsed.datasetId).toBe("vpn");
  });
});

describe("P2-T01 RuntimeDataset validation", () => {
  it("rejects duplicate record ids within a dataset", () => {
    expect(() =>
      RuntimeDatasetSchema.parse({
        datasetId: "auth",
        records: [
          {
            id: "DUP",
            datasetId: "auth",
            user: "u",
            method: "password",
            result: "success",
          },
          {
            id: "DUP",
            datasetId: "auth",
            user: "u",
            method: "password",
            result: "success",
          },
        ],
      }),
    ).toThrow();
  });

  it("rejects a record whose datasetId does not match the dataset", () => {
    expect(() =>
      RuntimeDatasetSchema.parse({
        datasetId: "auth",
        records: [
          {
            id: "V-1",
            datasetId: "vpn",
            vpnId: "V-1",
            user: "u",
            status: "active",
          },
        ],
      }),
    ).toThrow();
  });
});

describe("P2-T01 query payload + action envelope", () => {
  it("accepts query_records on the SimulationAction envelope with a payload", () => {
    const action = SimulationActionSchema.parse({
      id: "query_records",
      actorId: "player",
      eventId: "evt-suspicious-login-1",
      queryPayload: {
        datasetId: "auth",
        filters: { sessionId: "S-0741" },
      },
    });
    expect(action.queryPayload?.datasetId).toBe("auth");
  });

  it("defaults empty filters and rejects unknown filter keys (.strict)", () => {
    const payload = QueryRecordsPayloadSchema.parse({ datasetId: "auth" });
    expect(payload.filters).toEqual({});
    expect(() =>
      QueryRecordsPayloadSchema.parse({
        datasetId: "auth",
        filters: { unknownField: "x" },
      }),
    ).toThrow();
  });

  it("rejects non-integer / negative / string window bounds (Q-NORM-08)", () => {
    for (const bad of [461.5, -5, "461", "07:41", Number.NaN]) {
      expect(() =>
        QueryRecordsPayloadSchema.parse({
          datasetId: "auth",
          filters: { windowStartSimMinutes: bad },
        }),
      ).toThrow();
    }
  });

  it("rejects an unknown dataset id", () => {
    expect(() =>
      QueryRecordsPayloadSchema.parse({ datasetId: "email" }),
    ).toThrow();
  });
});

describe("P2-T01 query history entry", () => {
  it("accepts a zero-result entry and rejects a non-array resultIds", () => {
    const entry = QueryHistoryEntrySchema.parse({
      queryId: "sess-1-q1",
      seq: 1,
      datasetId: "vpn",
      normalizedFilters: { user: "j.patel@example.com" },
      resultIds: [],
      totalCount: 0,
      truncated: false,
      simMinutes: 465,
    });
    expect(entry.resultIds).toEqual([]);
    expect(() =>
      QueryHistoryEntrySchema.parse({
        queryId: "q",
        seq: 0, // must be positive
        datasetId: "vpn",
        normalizedFilters: {},
        resultIds: [],
        totalCount: 0,
        truncated: false,
        simMinutes: 1,
      }),
    ).toThrow();
  });

  it("normalized filter schema round-trips a canonical form", () => {
    const nf = NormalizedQueryFilterSchema.parse({
      user: "j.patel@example.com",
      windowStartSimMinutes: 385,
      windowEndSimMinutes: 465,
    });
    expect(nf.user).toBe("j.patel@example.com");
  });
});

describe("P2-T01 client result view", () => {
  it("exposes ids + records + this query's own id, with a result cap constant", () => {
    expect(RESULT_CAP).toBe(50);
    const view = QueryResultViewSchema.parse({
      queryId: "sess-1-q1",
      datasetId: "auth",
      records: [
        {
          id: "AUTH-0741-PATEL",
          datasetId: "auth",
          simMinutes: 461,
          user: "j.patel@example.com",
          method: "password",
          result: "success",
        },
      ],
      resultIds: ["AUTH-0741-PATEL"],
      totalCount: 1,
      truncated: false,
      simMinutes: 461,
    });
    expect(view.resultIds).toEqual(["AUTH-0741-PATEL"]);
    // Full history array must not be part of a per-query result view.
    expect(() =>
      QueryResultViewSchema.parse({
        queryId: "q",
        datasetId: "auth",
        records: [],
        resultIds: [],
        totalCount: 0,
        truncated: false,
        simMinutes: 1,
        history: [], // unknown key rejected by .strict()
      }),
    ).toThrow();
  });
});
