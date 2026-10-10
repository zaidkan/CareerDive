import { caseDispositionLabel } from "@sim/core";
import type { AvailableAction, ClientView, WorkSystemId } from "@sim/schemas";
import { useEffect, useRef } from "react";
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
  onOpenSystem?: (systemId: WorkSystemId, eventId?: string) => void;
  mutationState?: MutationState;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const consumedFocusRequestRef = useRef(0);
  const { selectedEvent, contextualActions, highlightActionId } =
    deriveSystemState(view, systemId, {
      selectedEventId: focusEventId,
      guidance,
    });
  useEffect(() => {
    if (
      focusRequestId === 0 ||
      consumedFocusRequestRef.current === focusRequestId
    )
      return;
    consumedFocusRequestRef.current = focusRequestId;
    headingRef.current?.focus();
  }, [focusRequestId, selectedEvent?.id, systemId]);

  return (
    <div className="desk-os-system">
      <div className="desk-os-detail">
        {selectedEvent ? (
          <>
            <div className="desk-os-meta">
              <span>
                {caseDispositionLabel(
                  selectedEvent,
                  view.structuredTickets?.[`ticket-${selectedEvent.id}`],
                )}
              </span>
              <span
                className="case-priority"
                data-priority={selectedEvent.priority}
              >
                {selectedEvent.priority} priority
              </span>
              {selectedEvent.status === "active" ? (
                <span>
                  Due in{" "}
                  {remainingMinutes(selectedEvent.deadlineAt, view.simClock)}m
                </span>
              ) : null}
            </div>
            <h3 ref={headingRef} tabIndex={-1}>
              {selectedEvent.title}
            </h3>
            {!selectedEvent.resolution ? <p>{selectedEvent.summary}</p> : null}
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
