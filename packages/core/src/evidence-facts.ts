import type {
  DatasetRecord,
  EvidenceFactDefinition,
  EvidenceFactDiscoveryState,
  EvidenceProvenance,
  NormalizedQueryFilter,
  QueryHistoryEntry,
  WorldState,
} from "@sim/schemas";
import {
  EvidenceFactDiscoveryStateSchema,
  QueryFilterSchema,
} from "@sim/schemas";

const LOWERCASE_FILTER_FIELDS = new Set(["user", "account"]);

function recordById(
  state: WorldState,
  recordId: string,
): DatasetRecord | undefined {
  const datasetIds = Object.keys(state.rules.datasets).sort();
  for (const datasetId of datasetIds) {
    const record = state.rules.datasets[
      datasetId as keyof typeof state.rules.datasets
    ]?.records.find(({ id }) => id === recordId);
    if (record) return record;
  }
  return undefined;
}

function normalizeRequiredFilters(
  filters: Record<string, unknown> | undefined,
): NormalizedQueryFilter {
  if (!filters) return {};
  const parsed = QueryFilterSchema.parse(filters);
  const normalized: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (value === undefined) continue;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        normalized[key] = LOWERCASE_FILTER_FIELDS.has(key)
          ? trimmed.toLowerCase()
          : trimmed;
      }
    } else {
      normalized[key] = value;
    }
  }
  return normalized;
}

function hasRequiredFilterCoverage(
  entry: QueryHistoryEntry,
  provenance: Extract<
    EvidenceProvenance,
    { kind: "query_presence" | "query_absence_coverage" }
  >,
): boolean {
  const filters = entry.normalizedFilters as Record<string, string | number>;
  if (
    !provenance.requiredDimensions.every(
      (dimension) => filters[dimension] !== undefined,
    )
  ) {
    return false;
  }

  const requiredFilters = normalizeRequiredFilters(provenance.requiredFilters);
  return Object.entries(requiredFilters).every(
    ([dimension, expected]) => filters[dimension] === expected,
  );
}

function orderedHistory(state: WorldState): QueryHistoryEntry[] {
  return [...state.queryHistory].sort(
    (left, right) =>
      left.seq - right.seq ||
      left.simMinutes - right.simMinutes ||
      left.queryId.localeCompare(right.queryId),
  );
}

function earliestQuery(
  state: WorldState,
  predicate: (entry: QueryHistoryEntry) => boolean,
): QueryHistoryEntry | undefined {
  return orderedHistory(state).find(predicate);
}

function discoveryForProvenance(
  state: WorldState,
  provenance: EvidenceProvenance,
):
  | { discoveredAtSimMinutes: number; satisfiedProvenance: string[] }
  | undefined {
  if (
    provenance.kind === "single_record_open" ||
    provenance.kind === "multi_record_open"
  ) {
    const allOpened = provenance.recordIds.every(
      (recordId) =>
        state.observedArtifactIds.includes(recordId) &&
        recordById(state, recordId),
    );
    if (!allOpened) return undefined;
    return {
      discoveredAtSimMinutes: state.simClock,
      satisfiedProvenance: [...provenance.recordIds],
    };
  }

  if (provenance.kind === "query_presence") {
    const match = earliestQuery(
      state,
      (entry) =>
        entry.datasetId === provenance.datasetId &&
        entry.resultIds.length > 0 &&
        hasRequiredFilterCoverage(entry, provenance),
    );
    if (!match) return undefined;
    return {
      discoveredAtSimMinutes: match.simMinutes,
      satisfiedProvenance: [match.queryId],
    };
  }

  if (provenance.kind === "query_absence_coverage") {
    const match = earliestQuery(state, (entry) => {
      if (
        entry.datasetId !== provenance.datasetId ||
        entry.resultIds.length !== 0 ||
        !hasRequiredFilterCoverage(entry, provenance)
      ) {
        return false;
      }
      const start = entry.normalizedFilters.windowStartSimMinutes;
      const end = entry.normalizedFilters.windowEndSimMinutes;
      return (
        typeof start === "number" &&
        typeof end === "number" &&
        end > start &&
        end - start >= provenance.coveredWindowMinutes
      );
    });
    if (!match) return undefined;
    return {
      discoveredAtSimMinutes: match.simMinutes,
      satisfiedProvenance: [match.queryId],
    };
  }

  // Dialogue and KB provenance need their own canonical observation actions;
  // silently inferring them from unrelated state would create hidden facts.
  return undefined;
}

/**
 * Pure Phase 3 evaluator. Authored definitions come from rules; eligibility
 * comes only from canonical opened-record and query-history state.
 */
export function discoverEvidenceFacts(
  state: WorldState,
): EvidenceFactDiscoveryState[] {
  const definitions = state.rules.evidenceFacts;
  if (!definitions) return [];

  return Object.values(definitions)
    .map((definition: EvidenceFactDefinition) => {
      const satisfied = discoveryForProvenance(state, definition.provenance);
      if (!satisfied) return undefined;
      return EvidenceFactDiscoveryStateSchema.parse({
        factId: definition.id,
        discoveredAtSimMinutes: satisfied.discoveredAtSimMinutes,
        satisfiedProvenance: satisfied.satisfiedProvenance,
        attachedToTicketIds: [],
      });
    })
    .filter((entry): entry is EvidenceFactDiscoveryState => entry !== undefined)
    .sort((left, right) => left.factId.localeCompare(right.factId));
}
