import type {
  DatasetId,
  DatasetRecord,
  NormalizedQueryFilter,
  QueryRecordsPayload,
  QueryRejectionCategory,
  ScenarioRules,
} from "@sim/schemas";
import {
  DATASET_FILTER_FIELDS,
  QueryRecordsPayloadSchema,
  RESULT_CAP,
} from "@sim/schemas";

/**
 * P2-T03 — deterministic core query engine (pure over `rules.datasets`).
 *
 * Frozen contract (do not redesign):
 * - closed per-dataset filter allowlist (DATASET_FILTER_FIELDS + time window);
 * - half-open integer time window `[start, end)` over record `simMinutes`;
 * - stable sort: `simMinutes` ascending, tie-break `id` lexicographic;
 * - RESULT_CAP truncates from the END of stable order, reporting
 *   `truncated` + `totalCount`;
 * - normalization: trim all strings; `user` also lowercased; ID/IP/label/etc.
 *   trim-only case-sensitive; empty-string-after-trim = absent (unspecified);
 * - NO randomness, NO wall-clock, NO iteration-order dependence.
 *
 * This module never marks records observed/opened and never evaluates evidence
 * discovery (Phase 3). It produces a result set + the normalized filter form.
 */

/** String filter dimensions normalized with trim + lowercase (`user` fold). */
const LOWERCASE_STRING_FIELDS = new Set<string>(["user", "account"]);

/** Time-window dimensions handled separately from the string allowlist. */
const TIME_WINDOW_FIELDS = new Set<string>([
  "windowStartSimMinutes",
  "windowEndSimMinutes",
]);

/** Hard bounds guarding against malformed huge input (Q-BOUND-CAP-04). */
const MAX_FILTER_KEYS = 32;
const MAX_STRING_VALUE_LENGTH = 2_000;
const MAX_WINDOW_MAGNITUDE = 2 ** 31;

export type QueryRuntimeDatasets = ScenarioRules["datasets"];

export interface QueryEngineResult {
  datasetId: DatasetId;
  records: DatasetRecord[];
  resultIds: string[];
  totalCount: number;
  truncated: boolean;
  normalizedFilters: NormalizedQueryFilter;
}

/**
 * Invalid-request error. Distinguishes "bad request" from "valid request with
 * zero rows"; carries a closed rejection category so the reducer maps it
 * without leaking internal rule text (spec §13, Q-HIDE-07).
 */
export class QueryValidationError extends Error {
  readonly category: QueryRejectionCategory;

  constructor(category: QueryRejectionCategory, message: string) {
    super(message);
    this.name = "QueryValidationError";
    this.category = category;
  }
}

function isPlainString(value: unknown): value is string {
  return typeof value === "string";
}

/**
 * Normalize a raw filter payload into the canonical stored form. Empty-string
 * dimensions (after trim) are dropped (treated as unspecified). Throws
 * `invalid_filter` for keys outside the dataset allowlist, start > end, and
 * oversize input.
 */
function normalizeFilters(
  datasetId: DatasetId,
  rawFilters: QueryRecordsPayload["filters"],
): NormalizedQueryFilter {
  const allowed = new Set<string>([
    ...DATASET_FILTER_FIELDS[datasetId],
    ...TIME_WINDOW_FIELDS,
  ]);

  const keys = Object.keys(rawFilters);
  if (keys.length > MAX_FILTER_KEYS) {
    throw new QueryValidationError(
      "invalid_filter",
      `Too many filter dimensions (${String(keys.length)})`,
    );
  }

  const normalized: Record<string, string | number> = {};

  for (const key of keys) {
    const value = (rawFilters as Record<string, unknown>)[key];
    if (value === undefined) {
      continue;
    }

    if (TIME_WINDOW_FIELDS.has(key)) {
      if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
        throw new QueryValidationError(
          "invalid_filter",
          `Filter "${key}" must be a non-negative integer`,
        );
      }
      if (value > MAX_WINDOW_MAGNITUDE) {
        throw new QueryValidationError(
          "invalid_filter",
          `Filter "${key}" exceeds the allowed range`,
        );
      }
      normalized[key] = value;
      continue;
    }

    if (!allowed.has(key)) {
      // Key is not legal for this dataset (unknown, or valid on a different
      // dataset only). Never silently treated as zero rows.
      throw new QueryValidationError(
        "invalid_filter",
        `Filter "${key}" is not supported for dataset "${datasetId}"`,
      );
    }

    if (!isPlainString(value)) {
      throw new QueryValidationError(
        "invalid_filter",
        `Filter "${key}" must be a string`,
      );
    }
    if (value.length > MAX_STRING_VALUE_LENGTH) {
      throw new QueryValidationError(
        "invalid_filter",
        `Filter "${key}" exceeds the allowed length`,
      );
    }

    const trimmed = value.trim();
    if (trimmed === "") {
      // Empty-string-after-trim = absent (unspecified dimension), never a
      // literal empty-string match.
      continue;
    }
    normalized[key] = LOWERCASE_STRING_FIELDS.has(key)
      ? trimmed.toLowerCase()
      : trimmed;
  }

  const start = normalized.windowStartSimMinutes;
  const end = normalized.windowEndSimMinutes;
  if (
    typeof start === "number" &&
    typeof end === "number" &&
    start > end
  ) {
    throw new QueryValidationError(
      "invalid_filter",
      "windowStartSimMinutes must not exceed windowEndSimMinutes",
    );
  }

  return normalized;
}

/** Read a string field off a record row (undefined if absent). */
function recordString(
  record: DatasetRecord,
  field: string,
): string | undefined {
  const value = (record as unknown as Record<string, unknown>)[field];
  return typeof value === "string" ? value : undefined;
}

function matchesStringFilters(
  record: DatasetRecord,
  normalized: NormalizedQueryFilter,
): boolean {
  for (const [field, expected] of Object.entries(normalized)) {
    if (TIME_WINDOW_FIELDS.has(field)) {
      continue;
    }
    const actual = recordString(record, field);
    if (actual === undefined || actual !== expected) {
      return false;
    }
  }
  return true;
}

function matchesWindow(
  record: DatasetRecord,
  normalized: NormalizedQueryFilter,
): boolean {
  const start = normalized.windowStartSimMinutes;
  const end = normalized.windowEndSimMinutes;
  if (start === undefined && end === undefined) {
    return true;
  }
  const simMinutes = (record as { simMinutes?: number }).simMinutes;
  // A window filter cannot match a row with no timestamp.
  if (typeof simMinutes !== "number") {
    return false;
  }
  if (typeof start === "number" && simMinutes < start) {
    return false;
  }
  // Half-open: a record at exactly `end` is excluded.
  if (typeof end === "number" && simMinutes >= end) {
    return false;
  }
  return true;
}

/** Stable comparator: `simMinutes` asc (untimed rows last), then id asc. */
function compareRecords(left: DatasetRecord, right: DatasetRecord): number {
  const leftMinutes = (left as { simMinutes?: number }).simMinutes;
  const rightMinutes = (right as { simMinutes?: number }).simMinutes;
  const leftHas = typeof leftMinutes === "number";
  const rightHas = typeof rightMinutes === "number";
  if (leftHas && rightHas && leftMinutes !== rightMinutes) {
    return leftMinutes - rightMinutes;
  }
  if (leftHas !== rightHas) {
    // Untimed rows sort after timed rows; among untimed, id order only.
    return leftHas ? -1 : 1;
  }
  if (left.id < right.id) return -1;
  if (left.id > right.id) return 1;
  return 0;
}

/**
 * Pure query evaluation over the runtime datasets snapshot. Deterministic:
 * identical `datasets` + identical raw filters → identical result every time.
 * Throws `QueryValidationError` for invalid requests before producing output.
 */
export function runQuery(
  datasets: QueryRuntimeDatasets,
  payload: QueryRecordsPayload,
): QueryEngineResult {
  const parsed = QueryRecordsPayloadSchema.parse(payload);
  const datasetId = parsed.datasetId;

  const dataset = datasets[datasetId];
  if (!dataset) {
    throw new QueryValidationError(
      "unknown_dataset",
      `Unknown dataset "${datasetId}"`,
    );
  }

  const normalizedFilters = normalizeFilters(datasetId, parsed.filters);

  const matched = dataset.records.filter(
    (record) =>
      matchesStringFilters(record, normalizedFilters) &&
      matchesWindow(record, normalizedFilters),
  );

  // Sort a copy so pack insertion order can never leak into results.
  const ordered = [...matched].sort(compareRecords);

  const totalCount = ordered.length;
  const truncated = totalCount > RESULT_CAP;
  const capped = truncated ? ordered.slice(0, RESULT_CAP) : ordered;

  return {
    datasetId,
    records: capped,
    resultIds: capped.map((record) => record.id),
    totalCount,
    truncated,
    normalizedFilters,
  };
}
