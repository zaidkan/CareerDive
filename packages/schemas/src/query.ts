import { z } from "zod";

import { DatasetIdSchema, DatasetRecordSchema } from "./records.js";

/**
 * P2-T01 — Query action payload, normalized filters, query history, and
 * client result views. Canonical spec §5.1/§6/§7, prep §4/§5/§7.
 *
 * Frozen contract:
 * - single canonical action id `query_records` carried on `SimulationAction`
 *   with a validated `payload` (smallest replay-compatible diff; prep §4);
 * - closed per-dataset filter allowlist (records.ts DATASET_FILTER_FIELDS);
 * - half-open integer time window `[start, end)`;
 * - no OR/negation/regex/free text inside structured filters;
 * - deterministic: no randomness, sort-based ordering only.
 */

export const RESULT_CAP = 50;

/**
 * Raw query filter payload. Object-form only (no array-form duplicates).
 * `.strict()` so unknown filter keys are rejected at parse time; per-dataset
 * field legality (a key valid on one dataset but not another) is enforced in
 * the engine/pack layer against DATASET_FILTER_FIELDS.
 *
 * String dimensions are unconstrained here (normalization trims/lowercases in
 * the engine); numeric window bounds are strict non-negative integers so
 * `"07:41"`, `461.5`, `NaN`, negatives, and string integers are rejected.
 */
export const QueryFilterSchema = z
  .object({
    user: z.string().optional(),
    sourceIp: z.string().optional(),
    deviceLabel: z.string().optional(),
    sessionId: z.string().optional(),
    vpnId: z.string().optional(),
    status: z.string().optional(),
    assignedUser: z.string().optional(),
    assignmentState: z.string().optional(),
    alertId: z.string().optional(),
    account: z.string().optional(),
    state: z.string().optional(),
    scannerId: z.string().optional(),
    runId: z.string().optional(),
    scope: z.string().optional(),
    reportId: z.string().optional(),
    sender: z.string().optional(),
    urlHost: z.string().optional(),
    messageId: z.string().optional(),
    windowStartSimMinutes: z.number().int().nonnegative().optional(),
    windowEndSimMinutes: z.number().int().nonnegative().optional(),
  })
  .strict();
export type QueryFilter = z.infer<typeof QueryFilterSchema>;

/** Payload carried alongside `SimulationAction.id === "query_records"`. */
export const QueryRecordsPayloadSchema = z
  .object({
    datasetId: DatasetIdSchema,
    filters: QueryFilterSchema.default({}),
  })
  .strict();
export type QueryRecordsPayload = z.infer<typeof QueryRecordsPayloadSchema>;

/**
 * Normalized filter form stored in history and used for matching. This is the
 * post-normalization canonical shape (trimmed strings, lowercased `user`,
 * integer windows). Key order is irrelevant; deep-equality on this object is
 * the identity of a query for replay/coverage purposes.
 */
export const NormalizedQueryFilterSchema = QueryFilterSchema;
export type NormalizedQueryFilter = z.infer<
  typeof NormalizedQueryFilterSchema
>;

/**
 * Append-only, reducer-local, replayed query-history entry (instance state).
 * Server-side only — never serialized to the client as a full array.
 * Immutable after append (Phase 3 reads it, never rewrites it).
 */
export const QueryHistoryEntrySchema = z
  .object({
    queryId: z.string().min(1),
    seq: z.number().int().positive(),
    datasetId: DatasetIdSchema,
    normalizedFilters: NormalizedQueryFilterSchema,
    resultIds: z.array(z.string()),
    totalCount: z.number().int().nonnegative(),
    truncated: z.boolean(),
    simMinutes: z.number().int().nonnegative(),
    actorEventId: z.string().optional(),
  })
  .strict();
export type QueryHistoryEntry = z.infer<typeof QueryHistoryEntrySchema>;

/**
 * Client-facing per-query result. Exposes IDs + player-visible record fields +
 * this query's own id. Never the full history array. Result rows reuse the
 * runtime record shape (all record fields are player-visible by design; hidden
 * authoring fields do not exist on these schemas).
 */
export const QueryResultViewSchema = z
  .object({
    queryId: z.string().min(1),
    datasetId: DatasetIdSchema,
    records: z.array(DatasetRecordSchema),
    resultIds: z.array(z.string()),
    totalCount: z.number().int().nonnegative(),
    truncated: z.boolean(),
    simMinutes: z.number().int().nonnegative(),
  })
  .strict();
export type QueryResultView = z.infer<typeof QueryResultViewSchema>;

/** Closed rejection categories (invalid request vs. valid-with-zero-rows). */
export const QueryRejectionCategorySchema = z.enum([
  "unknown_dataset",
  "invalid_filter",
  "invalid_payload",
]);
export type QueryRejectionCategory = z.infer<
  typeof QueryRejectionCategorySchema
>;
