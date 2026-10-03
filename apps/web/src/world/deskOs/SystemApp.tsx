import type { AvailableAction, ClientView, WorkSystemId } from "@sim/schemas";
import { useEffect, useRef, useState } from "react";
import { SystemToolPanel } from "../../components/SystemToolPanel.js";
import type { ShiftGuidance } from "../../guidance.js";
import { systemLabel } from "../../systems.js";
import { deriveSystemState } from "../../workstation.js";
import type {
  TaskAttemptHandler,
  WorkplaceInteractionHandler,
} from "../../components/shared.js";
import {
  EMPTY_MUTATION_STATE,
  type MutationState,
} from "../../useMutationCoordinator.js";
import { remainingMinutes } from "../../workstation.js";

export function SystemApp({
  view,
  systemId,
  onAction,
  onTaskAttempt,
  onWorkplaceInteraction,
  focusEventId,
  guidance,
  focusRequestId = 0,
  onSelectCase,
  onOpenSystem,
  mutationState = EMPTY_MUTATION_STATE,
}: {
  view: ClientView;
  systemId: WorkSystemId;
  onAction: (action: AvailableAction, freeText?: string) => void;
  onTaskAttempt?: TaskAttemptHandler;
  onWorkplaceInteraction?: WorkplaceInteractionHandler;
  focusEventId?: string;
  guidance: ShiftGuidance | null;
  focusRequestId?: number;
  onSelectCase?: (id: string) => void;
  onOpenSystem?: (systemId: WorkSystemId, eventId?: string) => void;
  mutationState?: MutationState;
}) {
  const [selectedEventIds, setSelectedEventIds] = useState<
    Partial<Record<WorkSystemId, string>>
  >({});
  const [localFocusRequest, setLocalFocusRequest] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const consumedFocusRequestRef = useRef("0:0");
  const selectedEventId = selectedEventIds[systemId];
  useEffect(() => {
    if (focusEventId) {
      setSelectedEventIds((current) => ({
        ...current,
        [systemId]: focusEventId,
      }));
    }
  }, [focusEventId, focusRequestId, systemId]);
  const { systemEvents, selectedEvent, contextualActions, highlightActionId } =
    deriveSystemState(view, systemId, { selectedEventId, guidance });

  useEffect(() => {
    if (focusRequestId === 0 && localFocusRequest === 0) return;
    const request = `${String(focusRequestId)}:${String(localFocusRequest)}`;
    if (consumedFocusRequestRef.current === request) return;
    consumedFocusRequestRef.current = request;
    headingRef.current?.focus();
  }, [focusRequestId, localFocusRequest, selectedEvent?.id, systemId]);

  return (
    <div className="desk-os-system">
      <aside
        className="desk-os-queue"
        aria-label={`${systemLabel(systemId)} items`}
      >
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
                setSelectedEventIds((current) => ({
                  ...current,
                  [systemId]: event.id,
                }));
                onSelectCase?.(event.id);
                setLocalFocusRequest((current) => current + 1);
              }}
              type="button"
            >
              <span>{event.title}</span>
              <small>
                {event.priority} · due in{" "}
                {remainingMinutes(event.deadlineAt, view.simClock)}m
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
              <span
                className="case-priority"
                data-priority={selectedEvent.priority}
              >
                {selectedEvent.priority} priority
              </span>
              <span>
                Due in{" "}
                {remainingMinutes(selectedEvent.deadlineAt, view.simClock)}m
              </span>
            </div>
            <h3 ref={headingRef} tabIndex={-1}>
              {selectedEvent.title}
            </h3>
            <p>{selectedEvent.summary}</p>
            {selectedEvent.resolution ? (
              <p className="desk-os-resolution">{selectedEvent.resolution}</p>
            ) : null}
            <SystemToolPanel
              actions={contextualActions}
              {...(highlightActionId ? { highlightActionId } : {})}
              onAction={onAction}
              mutationState={mutationState}
              {...(onTaskAttempt ? { onTaskAttempt } : {})}
              {...(onWorkplaceInteraction ? { onWorkplaceInteraction } : {})}
              {...(onOpenSystem
                ? {
                    onOpenCaseSources: () => {
                      onOpenSystem("alert_dashboard", selectedEvent.id);
                    },
                  }
                : {})}
              selectedEventId={selectedEvent.id}
              systemId={systemId}
              view={view}
            />
          </>
        ) : (
          <>
            <h3 ref={headingRef} tabIndex={-1}>
              {systemLabel(systemId)}
            </h3>
            <p>Nothing assigned here yet.</p>
            <SystemToolPanel
              actions={contextualActions}
              {...(highlightActionId ? { highlightActionId } : {})}
              onAction={onAction}
              mutationState={mutationState}
              {...(onTaskAttempt ? { onTaskAttempt } : {})}
              {...(onWorkplaceInteraction ? { onWorkplaceInteraction } : {})}
              systemId={systemId}
              view={view}
            />
          </>
        )}
      </div>
    </div>
  );
}
