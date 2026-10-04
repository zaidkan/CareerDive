import type { AvailableAction, ClientView, HandoffPayload } from "@sim/schemas";
import { useTabDraft } from "../../useTabDraft.js";

export function HandoffBuilder({
  view,
  action,
  onAction,
  pending,
}: {
  view: ClientView;
  action: AvailableAction;
  onAction: (action: AvailableAction) => void;
  pending: boolean;
}) {
  const [draft, setDraft] = useTabDraft<HandoffPayload>(
    `handoff:${view.sessionId}`,
    { sourceArtifactIds: [], followUp: "senior-review", note: "" },
  );
  const sources = view.artifacts.filter(
    ({ id, eventIds }) =>
      view.workplace.inspectedArtifactIds?.includes(id) &&
      eventIds.some((eventId) =>
        ["suspicious-login-1", "routine-alert-1"].includes(eventId),
      ),
  );
  const cases = view.events.filter(({ id }) =>
    ["suspicious-login-1", "routine-alert-1"].includes(id),
  );
  const next = {
    "senior-review":
      "Ask senior reviewer to check session ownership and containment",
    "verify-employee":
      "Verify employee context through the approved contact route",
    "review-device": "Review flagged device and missing session activity",
    monitor: "Continue monitoring; reassess with new evidence",
  };
  return (
    <section aria-label="Build shift handoff" className="handoff-builder">
      <h4>Hand your work forward</h4>
      <p>Select references and the next check. Review before sending.</p>
      <fieldset>
        <legend>What I checked</legend>
        {sources.length ? (
          sources.map((source) => (
            <label key={source.id}>
              <input
                type="checkbox"
                checked={draft.sourceArtifactIds.includes(source.id)}
                onChange={() => {
                  setDraft((current) => ({
                    ...current,
                    sourceArtifactIds: current.sourceArtifactIds.includes(
                      source.id,
                    )
                      ? current.sourceArtifactIds.filter(
                          (id) => id !== source.id,
                        )
                      : [...current.sourceArtifactIds, source.id],
                  }));
                }}
              />
              {source.title}
            </label>
          ))
        ) : (
          <p>No inspected sources. Outstanding checks remain in the preview.</p>
        )}
      </fieldset>
      <h5>What I decided</h5>
      <ul>
        {cases.map((event) => (
          <li key={event.id}>
            <strong>
              {event.title}: {event.status}
            </strong>
            {event.resolution ? (
              <details>
                <summary>Decision details</summary>
                <p>{event.resolution}</p>
              </details>
            ) : (
              <p>No final decision recorded; remains open.</p>
            )}
          </li>
        ))}
      </ul>
      <fieldset>
        <legend>What the next person should do</legend>
        {Object.entries(next).map(([id, label]) => (
          <label key={id}>
            <input
              type="radio"
              name="handoff-follow-up"
              checked={draft.followUp === id}
              onChange={() => {
                setDraft((current) => ({
                  ...current,
                  followUp: id as HandoffPayload["followUp"],
                }));
              }}
            />
            {label}
          </label>
        ))}
      </fieldset>
      <label>
        Optional short note
        <textarea
          aria-label="Optional short note"
          maxLength={300}
          value={draft.note ?? ""}
          onChange={(event) => {
            setDraft((current) => ({ ...current, note: event.target.value }));
          }}
        />
      </label>
      <section aria-label="Handoff preview">
        <h5>Handoff preview</h5>
        <p>
          <strong>Found:</strong> Opened sources:{" "}
          {sources
            .filter(({ id }) => draft.sourceArtifactIds.includes(id))
            .map(({ title }) => title)
            .join(", ") || "No references selected"}
          .
        </p>
        <p>
          <strong>Decided:</strong>{" "}
          {cases.map(({ title, status }) => `${title}: ${status}`).join("; ")}.
        </p>
        <p>
          <strong>Still needs follow-up:</strong>{" "}
          {cases
            .filter(({ status }) => status === "active")
            .map(({ title }) => `${title} needs a final decision. `)}
          {view.structuredTickets?.["ticket-suspicious-login-1"]?.uncertainty ??
            "Session ownership has not been independently established."}{" "}
          {next[draft.followUp]}.
        </p>
        {draft.note ? <p>Your note: {draft.note}</p> : null}
      </section>
      <button
        type="button"
        disabled={pending}
        data-action-id={action.id}
        data-event-id={action.eventId}
        onClick={() => {
          onAction({ ...action, handoffPayload: draft });
        }}
      >
        Send handoff to next analyst
      </button>
    </section>
  );
}
