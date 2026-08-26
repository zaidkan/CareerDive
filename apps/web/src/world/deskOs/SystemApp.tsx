import type { AvailableAction, ClientView, WorkSystemId } from "@sim/schemas";
import { useState } from "react";
import { SystemToolPanel } from "../../components/SystemToolPanel.js";
import type { ShiftGuidance } from "../../guidance.js";
import { systemLabel } from "../../systems.js";
import { deriveSystemState } from "../../workstation.js";

export function SystemApp({
  view,
  systemId,
  onAction,
  guidance,
  guided,
}: {
  view: ClientView;
  systemId: WorkSystemId;
  onAction: (action: AvailableAction, freeText?: string) => void;
  guidance: ShiftGuidance | null;
  guided?: boolean;
}) {
  const [selectedEventId, setSelectedEventId] = useState<string>();
  const { systemEvents, selectedEvent, contextualActions, highlightActionId } =
    deriveSystemState(view, systemId, { selectedEventId, guidance });

  return (
    <div className="desk-os-system">
      <aside className="desk-os-queue" aria-label={`${systemLabel(systemId)} items`}>
        <p className="eyebrow">{systemLabel(systemId)}</p>
        {systemEvents.length === 0 ? (
          <p className="desk-os-empty">Nothing here right now.</p>
        ) : (
          systemEvents.map((event) => (
            <button
              aria-pressed={selectedEvent?.id === event.id}
              className="desk-os-queue-item"
              data-priority={event.priority}
              key={event.id}
              onClick={() => {
                setSelectedEventId(event.id);
              }}
              type="button"
            >
              <span>{event.title}</span>
              <small>
                {event.priority} · due {event.deadlineAt}m
              </small>
            </button>
          ))
        )}
      </aside>
      <div className="desk-os-detail">
        {selectedEvent ? (
          <>
            <div className="desk-os-meta">
              <span>{selectedEvent.status.replaceAll("_", " ")}</span>
              <span>Due in {selectedEvent.deadlineAt}m</span>
            </div>
            <h3>{selectedEvent.title}</h3>
            <p>{selectedEvent.summary}</p>
            {selectedEvent.resolution ? (
              <p className="desk-os-resolution">{selectedEvent.resolution}</p>
            ) : null}
            <SystemToolPanel
              actions={contextualActions}
              {...(highlightActionId ? { highlightActionId } : {})}
              onAction={onAction}
              selectedEventId={selectedEvent.id}
              systemId={systemId}
              view={view}
            />
          </>
        ) : (
          <>
            <h3>{systemLabel(systemId)}</h3>
            <p>
              {guided
                ? "Follow the suggested step, or pick another tab."
                : "Nothing assigned here yet."}
            </p>
            <SystemToolPanel
              actions={contextualActions}
              {...(highlightActionId ? { highlightActionId } : {})}
              onAction={onAction}
              systemId={systemId}
              view={view}
            />
          </>
        )}
      </div>
    </div>
  );
}
