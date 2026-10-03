import { useMemo, useState, type SyntheticEvent } from "react";
import {
  DATASET_FILTER_FIELDS,
  type AvailableAction,
  type ClientView,
  type DatasetId,
  type DatasetRecord,
  type QueryRecordsPayload,
  type QueryResultView,
  type WorkplaceInteraction,
} from "@sim/schemas";
import {
  EMPTY_MUTATION_STATE,
  type MutationState,
} from "../../useMutationCoordinator.js";
import "./RecordQueryTool.css";
import { useTabDraft } from "../../useTabDraft.js";

export type QueryRecordsHandler = (
  action: AvailableAction,
  payload: QueryRecordsPayload,
) => void;

const DATASET_ORDER: DatasetId[] = [
  "auth",
  "vpn",
  "devices",
  "alerts",
  "scanner",
];

const DATASET_LABELS: Record<DatasetId, string> = {
  auth: "Authentication records",
  vpn: "VPN sessions",
  devices: "Device inventory",
  alerts: "Alerts",
  scanner: "Scanner runs",
  phishing: "Phishing reports",
};

const FILTER_LABELS: Record<string, string> = {
  user: "User",
  sourceIp: "Source IP",
  deviceLabel: "Device",
  sessionId: "Session ID",
  vpnId: "VPN connection ID",
  status: "Status",
  assignedUser: "Assigned user",
  assignmentState: "Assignment state",
  alertId: "Alert ID",
  account: "Account",
  state: "State",
  scannerId: "Scanner ID",
  runId: "Run ID",
  scope: "Scope",
  reportId: "Report ID",
  sender: "Sender",
  urlHost: "Link host",
  messageId: "Message ID",
};

const FIELD_LABEL_OVERRIDES: Record<string, string> = {
  ...FILTER_LABELS,
  id: "Record",
  method: "Method",
  result: "Result",
  vpnConnectionId: "VPN connection",
  attemptCount: "Attempts",
  vpnId: "VPN connection ID",
  exitIp: "Exit IP",
  startSimMinutes: "Window start",
  endSimMinutes: "Window end",
  deviceClass: "Class",
  enrolled: "Enrolled",
  lastCheckinSimMinutes: "Last check-in",
  tags: "Tags",
  category: "Category",
  severity: "Severity",
  sourceRefs: "Sources",
  linkedWorkItemId: "Work item",
  runId: "Run ID",
  scannerId: "Scanner ID",
  coverage: "Coverage",
  changeRef: "Change ref",
  recordType: "Kind",
  simMinutes: "Office-local minute (since midnight)",
  note: "Note",
};

function fieldLabel(key: string): string {
  const override = FIELD_LABEL_OVERRIDES[key];
  if (override) return override;
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (first) => first.toUpperCase());
}

/** Fields that never render: relevance-map internals, never analyst content. */
const SKIPPED_RECORD_FIELDS = new Set(["datasetId", "relatedRecordIds"]);

function formatFieldValue(value: unknown): string {
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "string") return value === "" ? "—" : value;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    return value.length > 0
      ? value.map((item) => formatFieldValue(item)).join(", ")
      : "—";
  }
  return "—";
}

function displayEntries(record: DatasetRecord): Array<[string, unknown]> {
  const entries = Object.entries(record as Record<string, unknown>).filter(
    ([key]) => !SKIPPED_RECORD_FIELDS.has(key),
  );
  entries.sort(([a], [b]) => {
    if (a === "id") return -1;
    if (b === "id") return 1;
    if (a === "note") return 1;
    if (b === "note") return -1;
    return 0;
  });
  return entries;
}

function resultHeading(result: QueryResultView): string {
  const count = result.totalCount;
  const unit = count === 1 ? "match" : "matches";
  return `${DATASET_LABELS[result.datasetId]} — ${String(count)} ${unit}`;
}

export function RecordQueryTool({
  view,
  queryAction,
  onQueryRecords,
  onInspectRecord,
  mutationState = EMPTY_MUTATION_STATE,
}: {
  view: ClientView;
  queryAction?: AvailableAction | undefined;
  onQueryRecords?: QueryRecordsHandler | undefined;
  onInspectRecord?:
    | ((interaction: WorkplaceInteraction) => Promise<unknown>)
    | undefined;
  mutationState?: MutationState;
}) {
  const [datasetId, setDatasetId] = useTabDraft<DatasetId>(
    `search:${view.sessionId}:dataset`,
    "auth",
  );
  const [stringFilters, setStringFilters] = useTabDraft<Record<string, string>>(
    `search:${view.sessionId}:filters`,
    {},
  );
  const [windowStart, setWindowStart] = useTabDraft(
    `search:${view.sessionId}:from`,
    "",
  );
  const [windowEnd, setWindowEnd] = useTabDraft(
    `search:${view.sessionId}:to`,
    "",
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  const resolvedAction =
    queryAction ??
    view.availableActions.find(({ id }) => id === "query_records");
  const canSubmit = Boolean(resolvedAction && onQueryRecords);
  const pending = Boolean(mutationState.pendingKey);
  const allowedFields = DATASET_FILTER_FIELDS[datasetId];

  const activeFilterCount = useMemo(() => {
    let count = 0;
    for (const field of allowedFields) {
      if ((stringFilters[field] ?? "").trim()) count += 1;
    }
    if (windowStart.trim() || windowEnd.trim()) count += 1;
    return count;
  }, [allowedFields, stringFilters, windowStart, windowEnd]);

  function setStringFilter(field: string, value: string) {
    setStringFilters((current) => ({ ...current, [field]: value }));
  }

  function handleClearFilters() {
    setStringFilters({});
    setWindowStart("");
    setWindowEnd("");
    setValidationError(null);
  }

  function parseWindowBound(raw: string): number | undefined {
    const trimmed = raw.trim();
    if (!trimmed) return undefined;
    if (!/^\d+$/.test(trimmed)) return undefined;
    return Number.parseInt(trimmed, 10);
  }

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!resolvedAction || !onQueryRecords) return;

    const start = parseWindowBound(windowStart);
    const end = parseWindowBound(windowEnd);
    if (
      (windowStart.trim() && start === undefined) ||
      (windowEnd.trim() && end === undefined)
    ) {
      setValidationError(
        "Time window bounds must be whole numbers zero or above.",
      );
      return;
    }
    if (start !== undefined && end !== undefined && start > end) {
      setValidationError(
        "Time window start must be at or before the window end.",
      );
      return;
    }

    const filters: Record<string, string | number> = {};
    for (const field of allowedFields) {
      const value = (stringFilters[field] ?? "").trim();
      if (value) filters[field] = value;
    }
    if (start !== undefined) filters.windowStartSimMinutes = start;
    if (end !== undefined) filters.windowEndSimMinutes = end;

    setValidationError(null);
    onQueryRecords(resolvedAction, {
      datasetId,
      filters,
    });
  }

  const results = view.queryResults;
  const windowRangeInvalid =
    validationError ===
    "Time window start must be at or before the window end.";
  const windowNumberInvalid =
    validationError ===
    "Time window bounds must be whole numbers zero or above.";

  return (
    <section aria-label="Record search" className="record-query-tool">
      <div className="rq-head">
        <p className="eyebrow">Investigate · structured records</p>
        <h3>Record search</h3>
        <p className="rq-subtle">
          Search operational records by dataset and field. Results reflect the
          records on file, including empty ones. Adjust filters and run again.
        </p>
      </div>

      <form
        className="rq-form"
        onSubmit={handleSubmit}
        aria-busy={pending || undefined}
      >
        <div className="rq-dataset-row">
          <label htmlFor="record-query-dataset">
            Dataset
            {activeFilterCount > 0
              ? ` · ${String(activeFilterCount)} active filter${activeFilterCount === 1 ? "" : "s"}`
              : ""}
          </label>
          <select
            id="record-query-dataset"
            value={datasetId}
            onChange={(event) => {
              setDatasetId(event.target.value as DatasetId);
              setValidationError(null);
            }}
          >
            {DATASET_ORDER.map((id) => (
              <option key={id} value={id}>
                {DATASET_LABELS[id]}
              </option>
            ))}
          </select>
        </div>

        <div
          className="rq-filters"
          role="group"
          aria-label="Filters for selected dataset"
        >
          {allowedFields.map((field) => {
            const hasValue = Boolean((stringFilters[field] ?? "").trim());
            return (
              <div
                key={field}
                className={hasValue ? "rq-field rq-field--active" : "rq-field"}
              >
                <label htmlFor={`record-query-${datasetId}-${field}`}>
                  {FILTER_LABELS[field] ?? field}
                </label>
                <input
                  id={`record-query-${datasetId}-${field}`}
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  value={stringFilters[field] ?? ""}
                  onChange={(event) => {
                    setStringFilter(field, event.target.value);
                  }}
                  placeholder="Leave blank to include all"
                />
              </div>
            );
          })}
        </div>

        <div className="rq-time-row" role="group" aria-label="Time window">
          <div className="rq-time-grid">
            <div>
              <label htmlFor={`record-query-${datasetId}-window-start`}>
                Time from (minute since midnight)
              </label>
              <input
                id={`record-query-${datasetId}-window-start`}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={windowStart}
                aria-invalid={
                  windowNumberInvalid || windowRangeInvalid ? "true" : undefined
                }
                onChange={(event) => {
                  setWindowStart(event.target.value);
                }}
                placeholder="Leave blank for no lower bound"
              />
            </div>
            <div>
              <label htmlFor={`record-query-${datasetId}-window-end`}>
                Time to (minute since midnight)
              </label>
              <input
                id={`record-query-${datasetId}-window-end`}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={windowEnd}
                aria-invalid={
                  windowNumberInvalid || windowRangeInvalid ? "true" : undefined
                }
                onChange={(event) => {
                  setWindowEnd(event.target.value);
                }}
                placeholder="Leave blank for no upper bound"
              />
            </div>
          </div>
          <p className="rq-time-help">
            Office-local minutes since midnight: 07:30 = 450; 08:00 = 480. Leave
            blank for open-ended. A bounded search reflects the interval you
            choose.
          </p>
        </div>

        {validationError ? (
          <p className="rq-validation" role="alert">
            {validationError}
          </p>
        ) : null}
        <div className="rq-actions">
          <button
            className="rq-submit"
            type="submit"
            disabled={!canSubmit || pending}
            data-action-id={resolvedAction?.id}
            {...(resolvedAction
              ? { "data-event-id": resolvedAction.eventId }
              : {})}
          >
            {pending ? "Searching…" : "Search records"}
          </button>
          <button
            className="rq-clear"
            type="button"
            onClick={handleClearFilters}
            disabled={activeFilterCount === 0 && !validationError}
            aria-label="Clear all record search filters"
          >
            Clear filters
          </button>
          {!canSubmit ? (
            <span className="rq-hint">
              Record search is not offered for the current work item.
            </span>
          ) : null}
        </div>
      </form>

      <div className="rq-results" aria-label="Search results" aria-live="off">
        {results.length === 0 ? (
          <p className="rq-empty">
            No searches run yet. Results will appear here without changing
            anything already on file.
          </p>
        ) : (
          <>
            <div className="rq-results-head">
              <p className="rq-results-title">
                Recent results · {String(results.length)} quer
                {results.length === 1 ? "y" : "ies"}
              </p>
              <span className="rq-results-meta">
                Newest last · adjust filters and search again any time
              </span>
            </div>
            <div className="rq-stack">
              {results.map((result, index) => {
                const isLatest = index === results.length - 1;
                return (
                  <article
                    key={result.queryId}
                    className="rq-result-block"
                    aria-label={resultHeading(result)}
                  >
                    <div className="rq-result-head">
                      <h4>{resultHeading(result)}</h4>
                      <span
                        className={
                          result.totalCount === 0
                            ? "rq-badge rq-badge--zero"
                            : "rq-badge"
                        }
                      >
                        {result.truncated
                          ? `${String(result.records.length)} shown · ${String(result.totalCount)} total`
                          : `${String(result.totalCount)} ${result.totalCount === 1 ? "record" : "records"}`}
                      </span>
                    </div>
                    {result.truncated ? (
                      <p
                        className="rq-truncated"
                        {...(isLatest ? { role: "status" as const } : {})}
                      >
                        Showing the first {String(result.records.length)} of{" "}
                        {String(result.totalCount)}. Narrow the filters to see
                        more.
                      </p>
                    ) : null}
                    {result.records.length === 0 && !result.truncated ? (
                      <p
                        className="rq-zero"
                        {...(isLatest ? { role: "status" as const } : {})}
                      >
                        No matching records for these filters.
                      </p>
                    ) : result.records.length > 0 ? (
                      <ol className="rq-records">
                        {result.records.map((record) => (
                          <li key={record.id}>
                            <article
                              className="rq-record"
                              aria-label={`Record ${record.id}`}
                            >
                              <h5>{record.id}</h5>
                              {onInspectRecord ? (
                                <button
                                  type="button"
                                  disabled={pending}
                                  onClick={() => {
                                    void onInspectRecord({
                                      type: "inspect_query_record",
                                      queryId: result.queryId,
                                      recordId: record.id,
                                    }).catch(() => {});
                                  }}
                                >
                                  {view.workplace.inspectedRecordIds?.includes(
                                    record.id,
                                  )
                                    ? `Revisit ${record.id}`
                                    : `Inspect ${record.id}`}
                                </button>
                              ) : null}
                              <details
                                open={
                                  view.workplace.inspectedRecordIds?.includes(
                                    record.id,
                                  ) || !onInspectRecord
                                }
                              >
                                <summary>Record details</summary>
                                <dl className="rq-fields">
                                  {displayEntries(record)
                                    .filter(([key]) => key !== "id")
                                    .map(([key, value]) => (
                                      <div key={key}>
                                        <dt data-field={key}>
                                          {fieldLabel(key)}
                                        </dt>
                                        <dd>{formatFieldValue(value)}</dd>
                                      </div>
                                    ))}
                                </dl>
                                {onInspectRecord
                                  ? view.artifacts
                                      .filter(
                                        (artifact) =>
                                          artifact.body?.includes(record.id) ||
                                          ("sessionId" in record &&
                                            typeof record.sessionId ===
                                              "string" &&
                                            artifact.body?.includes(
                                              record.sessionId,
                                            )),
                                      )
                                      .map((artifact) => (
                                        <button
                                          key={artifact.id}
                                          type="button"
                                          disabled={pending}
                                          onClick={() => {
                                            void onInspectRecord({
                                              type: "open_artifact",
                                              artifactId: artifact.id,
                                            }).catch(() => {});
                                          }}
                                        >
                                          Open related source: {artifact.title}
                                        </button>
                                      ))
                                  : null}
                              </details>
                            </article>
                          </li>
                        ))}
                      </ol>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
