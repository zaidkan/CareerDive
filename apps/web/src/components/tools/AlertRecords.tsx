import { useEffect, useRef, useState } from "react";
import type { AlertRecord, AvailableAction, ClientView } from "@sim/schemas";
import { EMPTY_MUTATION_STATE, type MutationState } from "../../useMutationCoordinator.js";

export function selectedAlertSource(view: ClientView, eventId: string) {
  const recordId = view.workplace.selectedAlertIdsByEvent?.[eventId];
  const record = view.alertRecords?.find(
    (item) => item.id === recordId && item.linkedWorkItemId === eventId,
  );
  const artifact = view.artifacts.find(
    (item) => item.kind === "alert" && item.eventIds.includes(eventId) &&
      item.observed && item.metadata?.alertId === record?.alertId,
  );
  return record && artifact
    ? { sourceRecordId: record.id, sourceArtifactId: artifact.id }
    : undefined;
}

export function bindAlertAction(view: ClientView, action: AvailableAction): AvailableAction {
  if (action.systemId !== "alert_dashboard") return action;
  const source = selectedAlertSource(view, action.eventId);
  return source ? { ...action, ...source } : action;
}

export function AlertRecords({
  view,
  eventId,
  onOpenRecord,
  mutationState = EMPTY_MUTATION_STATE,
}: {
  view: ClientView;
  eventId?: string | undefined;
  onOpenRecord?: ((id: string) => Promise<unknown>) | undefined;
  mutationState?: MutationState;
}) {
  const [failedId, setFailedId] = useState<string>();
  const [openingId, setOpeningId] = useState<string>();
  const [focusId, setFocusId] = useState<string>();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const focusedIdRef = useRef<string | undefined>(undefined);
  const records = (view.alertRecords ?? []).filter(
    (record): record is AlertRecord => !eventId || record.linkedWorkItemId === eventId,
  );
  const selectedRecords = records.filter(
    (record) => view.workplace.selectedAlertIdsByEvent?.[record.linkedWorkItemId ?? ""] === record.id,
  );
  useEffect(() => {
    if (focusId && focusedIdRef.current !== focusId && selectedRecords.some(({ id }) => id === focusId)) {
      headingRef.current?.focus();
      focusedIdRef.current = focusId;
    }
  }, [focusId, view]);
  if (records.length === 0) return null;

  return (
    <section className="alert-tool" aria-label="Alert records">
      <ul className="alert-timeline" aria-label="Alert timeline">
        {records.map((record) => (
          <li key={record.id}>
            <button
              type="button"
              aria-pressed={selectedRecords.some(({ id }) => id === record.id)}
              data-record-id={record.id}
              disabled={!onOpenRecord || Boolean(mutationState.pendingKey) || Boolean(openingId)}
              onClick={() => {
                if (!onOpenRecord) return;
                setFailedId(undefined);
                focusedIdRef.current = undefined;
                setFocusId(record.id);
                setOpeningId(record.id);
                void onOpenRecord(record.id)
                  .catch(() => { setFailedId(record.id); })
                  .finally(() => { setOpeningId(undefined); });
              }}
            >
              <strong>{record.alertId} · {record.category}</strong>
              <small>{record.severity} · {record.state}</small>
              <small>{selectedRecords.some(({ id }) => id === record.id) ? "selected" : "Open record"}</small>
            </button>
          </li>
        ))}
      </ul>
      {failedId ? <p role="alert">Could not open alert {failedId}. Try again.</p> : null}
      {selectedRecords.length > 0 ? selectedRecords.map((selected) => {
        const artifact = view.artifacts.find(
          (item) => item.kind === "alert" && item.eventIds.includes(selected.linkedWorkItemId ?? "") &&
            item.metadata?.alertId === selected.alertId,
        );
        return <article className="alert-record" key={selected.id}>
          <h4 ref={selected.id === focusId ? headingRef : undefined} tabIndex={-1}>{selected.alertId} · {selected.category}</h4>
          <dl className="alert-fields">
            {Object.entries(selected).filter(([key]) => !["datasetId", "relatedRecordIds", "linkedWorkItemId"].includes(key)).map(([key, value]) => (
              <div key={key}><dt>{key}</dt><dd>{Array.isArray(value) ? value.join(", ") : String(value)}</dd></div>
            ))}
          </dl>
          {artifact?.observed && artifact.body ? <pre className="artifact-body">{artifact.body}</pre> : null}
          {artifact ? <p>Source artifact: {artifact.title}</p> : null}
        </article>;
      }) : <p>Open an alert record to inspect it and continue the investigation.</p>}
    </section>
  );
}
