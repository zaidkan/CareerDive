import type { ClientView, WorkSystemId } from "@sim/schemas";
import { activeCases, closedCases } from "../workstation.js";

export type ResumeTarget = {
  eventId: string;
  systemId: WorkSystemId;
};

function caseType(templateId: string): string {
  if (templateId === "suspicious_login") return "Main case";
  if (templateId === "routine_alert_review") return "Interruption";
  if (templateId === "incomplete_handoff") return "Handoff";
  return "Work item";
}

export function CaseRail({
  view,
  onResume,
}: {
  view: ClientView;
  onResume: (target: ResumeTarget) => void;
}) {
  const active = activeCases(view);
  const closed = closedCases(view);
  return (
    <aside aria-label="Current shift" className="case-rail">
      <details className="case-rail-active" open>
        <summary className="case-rail-title">
          <span className="eyebrow">Current shift</span>
          <strong>{active.length} open</strong>
        </summary>
        <div className="case-rail-items">
          {active.length === 0 ? (
            <p className="case-rail-empty">No active cases.</p>
          ) : (
            active.map((event) => {
              const task = view.tasks.find(
                ({ eventId }) => eventId === event.id,
              );
              const systemId = task?.systemId ?? event.systemId;
              return (
                <button
                  className="case-rail-item"
                  data-priority={event.priority}
                  key={event.id}
                  onClick={() => {
                    onResume({ eventId: event.id, systemId });
                  }}
                  type="button"
                >
                  <span>{caseType(event.templateId)}</span>
                  <strong>{event.title}</strong>
                  <small>
                    {task?.title ?? event.status.replaceAll("_", " ")}
                  </small>
                  {event.resolution ? <small>{event.resolution}</small> : null}
                  <span className="visually-hidden">Resume {event.title}</span>
                </button>
              );
            })
          )}
        </div>
      </details>
      {closed.length > 0 ? (
        <details className="case-rail-history">
          <summary>Closed history ({closed.length})</summary>
          <ul>
            {closed.map((event) => (
              <li key={event.id}>
                <strong>{event.title}</strong>
                <small>{event.status}</small>
                {event.resolution ? <p>{event.resolution}</p> : null}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </aside>
  );
}
