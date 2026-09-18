import { z } from "zod";

/**
 * P2-T01 — Structured scenario datasets (runtime).
 *
 * Promotes the P1-T06 sketch (`StructuredDataset`/`StructuredRecord`) into
 * runtime-validated per-dataset shapes. Canonical spec §5.1 (Queryable
 * Records) + §7 (Structured Datasets).
 *
 * Deliberately NO free-form query language: beta operations are exact-field
 * filter and half-open time window only (see `query.ts`). Closed vocabularies
 * are `z.enum`; every authoring object is `.strict()`.
 *
 * Phase boundary: this module is runtime as of Phase 2. It must NOT import
 * `evidence-facts` / `ticket` / `npc-intent` (those stay types-only, owned by
 * Phases 3/4/6).
 */

/** Closed set of beta datasets. Unknown dataset ids are rejected upstream. */
export const DatasetIdSchema = z.enum([
  "auth",
  "vpn",
  "devices",
  "alerts",
  "scanner",
  "phishing",
]);
export type DatasetId = z.infer<typeof DatasetIdSchema>;

/**
 * Backward-compatible base record shape (the P1-T06 sketch). Per-dataset
 * schemas below extend this; the generic form stays valid so old sketch
 * fixtures and the sketches test keep parsing.
 */
export const StructuredRecordSchema = z.object({
  id: z.string().min(1),
  fields: z.record(z.union([z.string(), z.number(), z.boolean()])),
  relatedRecordIds: z.array(z.string()).default([]),
});
export type StructuredRecord = z.infer<typeof StructuredRecordSchema>;

export const StructuredDatasetSchema = z
  .object({
    datasetId: z.string().min(1),
    allowedFilterFields: z.array(z.string()).min(1),
    records: z.array(StructuredRecordSchema),
  })
  .strict();
export type StructuredDataset = z.infer<typeof StructuredDatasetSchema>;

// ---------------------------------------------------------------------------
// Per-dataset closed filter-field allowlists (canonical, beta-small).
// The query payload schema (query.ts) and pack validation (career-pack.ts)
// both consume this map so authoring, transport, and engine agree by
// construction.
// ---------------------------------------------------------------------------

export const DATASET_FILTER_FIELDS = {
  auth: ["user", "sourceIp", "deviceLabel", "sessionId"],
  vpn: ["user", "sourceIp", "sessionId", "vpnId", "status"],
  devices: ["deviceLabel", "assignedUser", "assignmentState"],
  alerts: ["alertId", "account", "deviceLabel", "state"],
  scanner: ["scannerId", "runId", "scope"],
  phishing: ["reportId", "sender", "urlHost", "messageId"],
} as const satisfies Record<DatasetId, readonly string[]>;

/** Every dataset also supports the half-open time window filter dimensions. */
export const TIME_WINDOW_FILTER_FIELDS = [
  "windowStartSimMinutes",
  "windowEndSimMinutes",
] as const;

export type DatasetFilterField =
  (typeof DATASET_FILTER_FIELDS)[DatasetId][number];

/** All string filter dimensions across all datasets (for payload typing). */
export const StringFilterFieldSchema = z.enum([
  "user",
  "sourceIp",
  "deviceLabel",
  "sessionId",
  "vpnId",
  "status",
  "assignedUser",
  "assignmentState",
  "alertId",
  "account",
  "state",
  "scannerId",
  "runId",
  "scope",
  "reportId",
  "sender",
  "urlHost",
  "messageId",
]);
export type StringFilterField = z.infer<typeof StringFilterFieldSchema>;

// ---------------------------------------------------------------------------
// Closed field vocabularies (enum dimensions). Off-vocabulary values are
// rejected as invalid filters, never silently treated as zero rows.
// ---------------------------------------------------------------------------

export const AuthResultSchema = z.enum(["success", "fail", "n/a"]);
export const VpnStatusSchema = z.enum(["active", "closed", "provisioning"]);
export const DeviceAssignmentStateSchema = z.enum([
  "active",
  "retired",
  "loaner",
  "unassigned",
]);
export const AlertStateSchema = z.enum([
  "open",
  "acknowledged",
  "monitoring",
  "escalated",
  "closed",
]);

// ---------------------------------------------------------------------------
// Per-dataset record row schemas. Every field below is player-visible; there
// are NO authoring/verdict/importance fields. Optional fields model genuine
// data absence (e.g. a failed attempt creates no session) — never null.
// ---------------------------------------------------------------------------

const RecordBase = {
  id: z.string().min(1),
  datasetId: DatasetIdSchema,
  /** Canonical ordering + time-window key. Integer office-local sim minutes. */
  simMinutes: z.number().int().nonnegative().optional(),
  /** Natural joins only — never an exhaustive relevance map (spec §6.10/R8). */
  relatedRecordIds: z.array(z.string()).default([]),
  /** Player-visible scope caveat / display note. */
  note: z.string().optional(),
};

export const AuthRecordSchema = z
  .object({
    ...RecordBase,
    datasetId: z.literal("auth"),
    user: z.string().min(1),
    sourceIp: z.string().optional(),
    deviceLabel: z.string().optional(),
    method: z.string(),
    result: AuthResultSchema,
    sessionId: z.string().optional(),
    vpnConnectionId: z.string().optional(),
    attemptCount: z.number().int().positive().optional(),
  })
  .strict();
export type AuthRecord = z.infer<typeof AuthRecordSchema>;

export const VpnRecordSchema = z
  .object({
    ...RecordBase,
    datasetId: z.literal("vpn"),
    vpnId: z.string().min(1),
    user: z.string().min(1),
    startSimMinutes: z.number().int().nonnegative().optional(),
    endSimMinutes: z.number().int().nonnegative().optional(),
    exitIp: z.string().optional(),
    deviceLabel: z.string().optional(),
    sessionId: z.string().optional(),
    status: VpnStatusSchema,
  })
  .strict();
export type VpnRecord = z.infer<typeof VpnRecordSchema>;

export const DeviceRecordSchema = z
  .object({
    ...RecordBase,
    datasetId: z.literal("devices"),
    deviceLabel: z.string().min(1),
    assignedUser: z.string().optional(),
    deviceClass: z.string(),
    enrolled: z.boolean(),
    assignmentState: DeviceAssignmentStateSchema,
    lastCheckinSimMinutes: z.number().int().nonnegative().optional(),
    tags: z.array(z.string()).default([]),
  })
  .strict();
export type DeviceRecord = z.infer<typeof DeviceRecordSchema>;

export const AlertRecordSchema = z
  .object({
    ...RecordBase,
    datasetId: z.literal("alerts"),
    alertId: z.string().min(1),
    category: z.string(),
    severity: z.string(),
    account: z.string().optional(),
    deviceLabel: z.string().optional(),
    sourceRefs: z.array(z.string()).default([]),
    state: AlertStateSchema,
    linkedWorkItemId: z.string().optional(),
  })
  .strict();
export type AlertRecord = z.infer<typeof AlertRecordSchema>;

export const ScannerRecordSchema = z
  .object({
    ...RecordBase,
    datasetId: z.literal("scanner"),
    runId: z.string().min(1),
    scannerId: z.string(),
    scope: z.string(),
    startSimMinutes: z.number().int().nonnegative().optional(),
    endSimMinutes: z.number().int().nonnegative().optional(),
    status: z.string(),
    coverage: z.string().optional(),
    changeRef: z.string().optional(),
    linkedWorkItemId: z.string().optional(),
  })
  .strict();
export type ScannerRecord = z.infer<typeof ScannerRecordSchema>;

export const PhishingRecordSchema = z
  .object({
    ...RecordBase,
    datasetId: z.literal("phishing"),
    reportId: z.string().optional(),
    sender: z.string().optional(),
    urlHost: z.string().optional(),
    messageId: z.string().optional(),
    recordType: z.string(),
    status: z.string().optional(),
  })
  .strict();
export type PhishingRecord = z.infer<typeof PhishingRecordSchema>;

/** Discriminated union of every runtime record row, keyed by dataset. */
export const DatasetRecordSchema = z.discriminatedUnion("datasetId", [
  AuthRecordSchema,
  VpnRecordSchema,
  DeviceRecordSchema,
  AlertRecordSchema,
  ScannerRecordSchema,
  PhishingRecordSchema,
]);
export type DatasetRecord = z.infer<typeof DatasetRecordSchema>;

/** A runtime dataset in the pack rules snapshot. */
export const RuntimeDatasetSchema = z
  .object({
    datasetId: DatasetIdSchema,
    records: z.array(DatasetRecordSchema),
  })
  .strict()
  .superRefine((dataset, ctx) => {
    const seen = new Set<string>();
    for (const record of dataset.records) {
      if (record.datasetId !== dataset.datasetId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Record "${record.id}" datasetId "${record.datasetId}" does not match dataset "${dataset.datasetId}"`,
        });
      }
      if (seen.has(record.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate record id "${record.id}" in dataset "${dataset.datasetId}"`,
        });
      }
      seen.add(record.id);
    }
  });
export type RuntimeDataset = z.infer<typeof RuntimeDatasetSchema>;
