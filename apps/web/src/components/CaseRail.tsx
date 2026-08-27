import type { ClientView, WorkSystemId } from "@sim/schemas";

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
  const visible = view.events.filter(({ status }) => status !== "pending");
  return (
    <aside aria-label="Current shift" className="case-rail">
      <div className="case-rail-title">
        <p className="eyebrow">Current shift</p>
        <strong>
          {visible.filter(({ status }) => status === "active").length} open
        </strong>
      </div>
      <div className="case-rail-items">
        {visible.map((event) => {
          const task = view.tasks.find(({ eventId }) => eventId === event.id);
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
                {event.status === "active"
                  ? (task?.title ?? "Decision ready")
                  : event.status.replaceAll("_", " ")}
              </small>
              <span className="visually-hidden">Resume {event.title}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
