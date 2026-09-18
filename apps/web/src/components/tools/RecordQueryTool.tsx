import { useState, type SyntheticEvent } from "react";
import {
  DATASET_FILTER_FIELDS,
  type AvailableAction,
  type ClientView,
  type DatasetId,
  type DatasetRecord,
  type QueryRecordsPayload,
  type QueryResultView,
} from "@sim/schemas";
import {
  EMPTY_MUTATION_STATE,
  type MutationState,
} from "../../useMutationCoordinator.js";

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
  "phishing",
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
  simMinutes: "Shift minute",
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
  mutationState = EMPTY_MUTATION_STATE,
}: {
  view: ClientView;
  queryAction?: AvailableAction | undefined;
  onQueryRecords?: QueryRecordsHandler | undefined;
  mutationState?: MutationState;
}) {
  const [datasetId, setDatasetId] = useState<DatasetId>("auth");
  const [stringFilters, setStringFilters] = useState<Record<string, string>>(
    {},
  );
  const [windowStart, setWindowStart] = useState("");
  const [windowEnd, setWindowEnd] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const resolvedAction =
    queryAction ??
    view.availableActions.find(({ id }) => id === "query_records");
  const canSubmit = Boolean(resolvedAction && onQueryRecords);
  const pending = Boolean(mutationState.pendingKey);
  const allowedFields = DATASET_FILTER_FIELDS[datasetId];

  function setStringFilter(field: string, value: string) {
    setStringFilters((current) => ({ ...current, [field]: value }));
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

  return (
    <section aria-label="Record search" className="record-query-tool">
      <h3>Record search</h3>
      <p className="tool-subtle">
        Search structured records by dataset and field. Results reflect the
        records on file, including empty ones.
      </p>
      <form onSubmit={handleSubmit}>
        <label htmlFor="record-query-dataset">Dataset</label>
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

        {allowedFields.map((field) => (
          <div key={field}>
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
        ))}

        <div>
          <label htmlFor={`record-query-${datasetId}-window-start`}>
            Time from (shift minute)
          </label>
          <input
            id={`record-query-${datasetId}-window-start`}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={windowStart}
            onChange={(event) => {
              setWindowStart(event.target.value);
            }}
            placeholder="Leave blank for no lower bound"
          />
        </div>
        <div>
          <label htmlFor={`record-query-${datasetId}-window-end`}>
            Time to (shift minute)
          </label>
          <input
            id={`record-query-${datasetId}-window-end`}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={windowEnd}
            onChange={(event) => {
              setWindowEnd(event.target.value);
            }}
            placeholder="Leave blank for no upper bound"
          />
        </div>

        {validationError ? <p role="alert">{validationError}</p> : null}
        <button
          type="submit"
          disabled={!canSubmit || pending}
          data-action-id={resolvedAction?.id}
          {...(resolvedAction
            ? { "data-event-id": resolvedAction.eventId }
            : {})}
        >
          {pending ? "Searching…" : "Search records"}
        </button>
        {!canSubmit ? (
          <p>Record search is not offered for the current work item.</p>
        ) : null}
      </form>

      <div aria-label="Search results" aria-live="off">
        {results.length === 0 ? (
          <p>
            No searches run yet. Results will appear here without changing
            anything already on file.
          </p>
        ) : (
          results.map((result, index) => {
            // Only the most recent (last-appended) result carries a live
            // role="status". Older results keep the same visible text as plain
            // paragraphs so screen readers announce only the newest query and
            // getByRole("status") stays unambiguous across repeated queries.
            const isLatest = index === results.length - 1;
            return (
            <article key={result.queryId} aria-label={resultHeading(result)}>
              <h4>{resultHeading(result)}</h4>
              {result.truncated ? (
                isLatest ? (
                  <p role="status" className="tool-subtle">
                    Showing the first {String(result.records.length)} of{" "}
                    {String(result.totalCount)}. Narrow the filters to see more.
                  </p>
                ) : (
                  <p className="tool-subtle">
                    Showing the first {String(result.records.length)} of{" "}
                    {String(result.totalCount)}. Narrow the filters to see more.
                  </p>
                )
              ) : null}
              {result.records.length === 0 ? (
                isLatest ? (
                  <p role="status">No matching records for these filters.</p>
                ) : (
                  <p>No matching records for these filters.</p>
                )
              ) : (
                <ol>
                  {result.records.map((record) => (
                    <li key={record.id}>
                      <article aria-label={`Record ${record.id}`}>
                        <h5>{record.id}</h5>
                        <dl>
                          {displayEntries(record)
                            .filter(([key]) => key !== "id")
                            .map(([key, value]) => (
                              <div key={key}>
                                <dt>{fieldLabel(key)}</dt>
                                <dd>{formatFieldValue(value)}</dd>
                              </div>
                            ))}
                        </dl>
                      </article>
                    </li>
                  ))}
                </ol>
              )}
            </article>
            );
          })
        )}
      </div>
    </section>
  );
}
