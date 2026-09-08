import { useEffect, useState } from "react";
import type { AvailableAction } from "@sim/schemas";
import {
  ArtifactDetail,
  NotesEditor,
  filterKnowledgeBase,
  filterSystemArtifacts,
} from "./artifacts.js";
import { OperationalMessages, type ModeProps } from "./shared.js";
import { TaskInteraction } from "./tools/TaskInteraction.js";
import { ArtifactOpenButton } from "./tools/ArtifactOpenButton.js";
import { GuideSearch } from "./tools/GuideSearch.js";
import { CaseRail } from "./CaseRail.js";
import { NotificationBanner } from "./NotificationBanner.js";
import { WORK_SYSTEMS, primaryActions, utilityActions } from "../systems.js";
import { eventsForSystem } from "../workstation.js";
import {
  EMPTY_MUTATION_STATE,
  type MutationState,
} from "../useMutationCoordinator.js";

export function AccessibleMode({
  view,
  onAction,
  onTaskAttempt,
  onNotification,
  onWorkplaceInteraction,
  mutationState = EMPTY_MUTATION_STATE,
}: ModeProps) {
  const [selectedGuide, setSelectedGuide] = useState<string>();
  const [notificationFocusTarget, setNotificationFocusTarget] = useState<{
    eventId: string;
    requestId: number;
  }>();

  useEffect(() => {
    if (!notificationFocusTarget) return;
    document
      .getElementById(`structured-event-${notificationFocusTarget.eventId}`)
      ?.focus();
    setNotificationFocusTarget(undefined);
  }, [notificationFocusTarget, view]);

  return (
    <section className="accessible-shell" aria-labelledby="structured-title">
      <h2 id="structured-title">Structured workplace view</h2>
      <p className="accessible-lede">
        Location: {view.currentLocation.name}. Simulated time elapsed:{" "}
        {view.simClock} minutes.
      </p>
      <NotificationBanner
        mutationState={mutationState}
        notifications={view.notifications}
        {...(onNotification
          ? {
              onNotification: async (notification, response) => {
                if (response !== "handle") {
                  await onNotification(notification, response);
                  return;
                }
                await onNotification(notification, response, () => {
                  setNotificationFocusTarget((current) => ({
                    eventId: notification.eventId,
                    requestId: (current?.requestId ?? 0) + 1,
                  }));
                });
              },
            }
          : {})}
      />
      <CaseRail
        onResume={({ eventId }) => {
          document.getElementById(`structured-event-${eventId}`)?.focus();
        }}
        view={view}
      />
      {WORK_SYSTEMS.map((system) => {
        const actions = view.availableActions.filter(
          ({ systemId }) => systemId === system.id,
        );
        const events = eventsForSystem(view, system.id);
        if (
          actions.length === 0 &&
          events.length === 0 &&
          !(
            system.id === "knowledge_base" &&
            filterKnowledgeBase(view, "").length > 0
          )
        )
          return null;
        const utilities = utilityActions(actions);
        const primary = primaryActions(actions);
        const interactionActions = actions.filter(
          (action) => action.taskId !== undefined || primary.includes(action),
        );
        return (
          <section className="structured-system" key={system.id}>
            <h3>{system.label}</h3>
            <ul>
              {events.map((event) => (
                <li
                  id={`structured-event-${event.id}`}
                  key={event.id}
                  tabIndex={-1}
                >
                  <strong>{event.title}</strong>: {event.summary} Status:{" "}
                  {event.status.replaceAll("_", " ")}.
                  <StructuredArtifacts
                    artifacts={filterSystemArtifacts(view, system.id, event.id)}
                    {...(onWorkplaceInteraction
                      ? { onWorkplaceInteraction }
                      : {})}
                    mutationState={mutationState}
                  />
                  {system.id === "ticket_queue" ? (
                    <>
                      <NotesEditor
                        action={utilities.find(
                          ({ id, eventId, taskId }) =>
                            id === "update_ticket_notes" &&
                            eventId === event.id &&
                            !taskId,
                        )}
                        label={`Investigation notes for ${event.title}`}
                        mutationState={mutationState}
                        onSave={onAction}
                        value={view.ticketNotes[event.id] ?? ""}
                      />
                      <NotesEditor
                        action={utilities.find(
                          ({ id, taskId }) =>
                            id === "update_notebook" && !taskId,
                        )}
                        label="Case notebook"
                        mutationState={mutationState}
                        onSave={onAction}
                        value={view.notebook}
                      />
                    </>
                  ) : null}
                </li>
              ))}
            </ul>
            {system.id === "knowledge_base" ? (
              <GuideSearch
                view={view}
                selectedId={selectedGuide}
                onSelect={setSelectedGuide}
                onOpenArtifact={
                  onWorkplaceInteraction
                    ? (artifactId) =>
                        onWorkplaceInteraction({
                          type: "open_artifact",
                          artifactId,
                        })
                    : undefined
                }
                mutationState={mutationState}
              />
            ) : null}
            <div className="accessible-actions">
              {interactionActions.map((action) => {
                const task = action.taskId
                  ? view.tasks.find(
                      ({ id, eventId }) =>
                        id === action.taskId && eventId === action.eventId,
                    )
                  : undefined;
                return task ? (
                  <TaskInteraction
                    key={`${action.id}:${action.eventId}`}
                    artifacts={view.artifacts}
                    onOpenArtifact={
                      onWorkplaceInteraction
                        ? (artifactId) =>
                            onWorkplaceInteraction({
                              type: "open_artifact",
                              artifactId,
                            })
                        : undefined
                    }
                    mutationState={mutationState}
                    {...(onTaskAttempt ? { onTaskAttempt } : {})}
                    openedArtifacts={view.artifacts.filter(
                      ({ observed }) => observed,
                    )}
                    task={task}
                  />
                ) : action.taskId ? (
                  <p key={`${action.id}:${action.eventId}`} role="status">
                    A work step is refreshing. It will be available shortly.
                  </p>
                ) : (
                  <StructuredActionButton
                    action={action}
                    key={`${action.id}:${action.eventId}`}
                    mutationState={mutationState}
                    onAction={onAction}
                  />
                );
              })}
              {utilities
                .filter(
                  ({ id, taskId }) =>
                    !taskId &&
                    id !== "update_ticket_notes" &&
                    id !== "update_notebook",
                )
                .map((action) => (
                  <StructuredActionButton
                    action={action}
                    key={`${action.id}:${action.eventId}`}
                    mutationState={mutationState}
                    onAction={onAction}
                  />
                ))}
            </div>
          </section>
        );
      })}
      <OperationalMessages messages={view.operationalMessages} />
    </section>
  );
}

function StructuredArtifacts({
  artifacts,
  onWorkplaceInteraction,
  mutationState = EMPTY_MUTATION_STATE,
}: {
  artifacts: ReturnType<typeof filterSystemArtifacts>;
  onWorkplaceInteraction?: ModeProps["onWorkplaceInteraction"];
  mutationState?: MutationState;
}) {
  if (artifacts.length === 0) return null;
  return (
    <div className="structured-artifacts">
      {artifacts.map((artifact) => (
        <div key={artifact.id}>
          <ArtifactDetail artifact={artifact} />
          {!artifact.observed ? (
            <ArtifactOpenButton
              artifactId={artifact.id}
              label={`Open ${artifact.title}`}
              mutationState={mutationState}
              onOpenArtifact={
                onWorkplaceInteraction
                  ? (artifactId) =>
                      onWorkplaceInteraction({
                        type: "open_artifact",
                        artifactId,
                      })
                  : undefined
              }
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}

function StructuredActionButton({
  action,
  onAction,
  mutationState = EMPTY_MUTATION_STATE,
}: {
  action: AvailableAction;
  onAction: ModeProps["onAction"];
  mutationState?: MutationState;
}) {
  return (
    <button
      data-action-id={action.id}
      data-event-id={action.eventId}
      disabled={Boolean(mutationState.pendingKey)}
      onClick={() => {
        onAction(action);
      }}
      type="button"
    >
      {action.label}. {action.description}
    </button>
  );
}
