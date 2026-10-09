import { useState } from "react";
import type {
  AvailableAction,
  ClientView,
  WorkplaceInteraction,
} from "@sim/schemas";
import {
  ArtifactDetail,
  ArtifactList,
  NotesEditor,
  filterSystemArtifacts,
} from "./artifacts.js";
import { AlertTool } from "./tools/AlertTool.js";
import {
  AlertRecords,
  bindAlertAction,
  selectedAlertSource,
} from "./tools/AlertRecords.js";
import { EmailTool } from "./tools/EmailTool.js";
import { GuideSearch } from "./tools/GuideSearch.js";
import { InventoryLookup } from "./tools/InventoryLookup.js";
import { RecordQueryTool } from "./tools/RecordQueryTool.js";
import { TaskInteraction } from "./tools/TaskInteraction.js";
import { CaseReview } from "./tools/CaseReview.js";
import { TeamChatTool } from "./tools/TeamChatTool.js";
import { CaseEvidence } from "./tools/CaseEvidence.js";
import { HandoffBuilder } from "./tools/HandoffBuilder.js";
import { TicketComposer } from "./tools/TicketComposer.js";
import { primaryActions, systemMeta, utilityActions } from "../systems.js";
import type { TaskAttemptHandler } from "./shared.js";
import {
  actionMutationKey,
  EMPTY_MUTATION_STATE,
  type MutationState,
} from "../useMutationCoordinator.js";

function ActionButtons({
  actions,
  onAction,
  highlightActionId,
  disableAction = false,
  mutationState = EMPTY_MUTATION_STATE,
}: {
  actions: AvailableAction[];
  onAction: (action: AvailableAction, freeText?: string) => void;
  highlightActionId?: string;
  disableAction?: boolean;
  mutationState?: MutationState;
}) {
  const choices = primaryActions(actions).filter(
    ({ id }) => id !== "query_records" && id !== "submit_shift_handoff",
  );
  if (choices.length === 0) {
    return null;
  }

  const highlighted =
    choices.find(({ id }) => id === highlightActionId) ?? choices[0];
  if (!highlighted) {
    return null;
  }
  const others = choices.filter(({ id }) => id !== highlighted.id);
  const highlightedKey = actionMutationKey(highlighted);
  const pending = Boolean(mutationState.pendingKey);

  return (
    <div className="context-actions" aria-label="Workplace actions">
      <button
        className="action-primary"
        data-action-id={highlighted.id}
        data-event-id={highlighted.eventId}
        disabled={pending || disableAction}
        key={`${highlighted.id}:${highlighted.eventId}`}
        onClick={() => {
          onAction(highlighted);
        }}
        type="button"
      >
        <span>
          {mutationState.pendingKey === highlightedKey
            ? `Saving ${highlighted.label}…`
            : highlighted.label}
        </span>
        <small>{highlighted.description}</small>
        <small className="action-time">
          Takes about {highlighted.simulatedMinutes} minutes
        </small>
      </button>
      {others.length > 0 ? (
        <details className="more-actions">
          <summary>
            {others.length} other option{others.length === 1 ? "" : "s"}
          </summary>
          <div className="more-actions-grid">
            {others.map((action) => (
              <button
                data-action-id={action.id}
                data-event-id={action.eventId}
                disabled={pending || disableAction}
                key={`${action.id}:${action.eventId}`}
                onClick={() => {
                  onAction(action);
                }}
                type="button"
              >
                <span>{action.label}</span>
                <small>{action.description}</small>
              </button>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}

function WorkInteraction({
  actions,
  view,
  onAction,
  onTaskAttempt,
  highlightActionId,
  disableAction = false,
  onOpenArtifact,
  mutationState = EMPTY_MUTATION_STATE,
}: {
  actions: AvailableAction[];
  view: ClientView;
  onAction: (action: AvailableAction, freeText?: string) => void;
  onTaskAttempt?: TaskAttemptHandler;
  highlightActionId?: string;
  disableAction?: boolean;
  onOpenArtifact?: ((id: string) => Promise<unknown>) | undefined;
  mutationState?: MutationState;
}) {
  const converted = actions.filter(
    (action) =>
      ["route_access_request", "resolve_login_help"].includes(action.id) &&
      view.reasoningOptions?.[action.eventId]?.length,
  );
  actions = actions.filter((action) => !converted.includes(action));
  const taskActions = actions.filter(({ taskId }) => taskId !== undefined);
  const tasks = taskActions.flatMap((action) => {
    const task = view.tasks.find(
      ({ id, eventId }) => id === action.taskId && eventId === action.eventId,
    );
    return task ? [task] : [];
  });
  const uniqueTasks = [
    ...new Map(
      tasks.map((task) => [`${task.eventId}:${task.id}`, task]),
    ).values(),
  ];
  const missingTaskActions = taskActions.filter(
    (action) =>
      !view.tasks.some(
        ({ id, eventId }) => id === action.taskId && eventId === action.eventId,
      ),
  );
  const ordinary = actions.filter(({ taskId }) => taskId === undefined);
  return (
    <>
      {converted.map((action) => (
        <TicketComposer
          key={action.eventId}
          view={view}
          action={action}
          onAction={onAction}
          onOpenArtifact={onOpenArtifact}
          mutationState={mutationState}
        />
      ))}
      {uniqueTasks.map((task) => (
        <TaskInteraction
          key={`${task.eventId}:${task.id}`}
          artifacts={view.artifacts}
          onOpenArtifact={onOpenArtifact}
          mutationState={mutationState}
          openedArtifacts={view.artifacts.filter(({ observed }) => observed)}
          task={task}
          {...(onTaskAttempt ? { onTaskAttempt } : {})}
        />
      ))}
      {missingTaskActions.length > 0 ? (
        <p className="empty-actions" role="status">
          A work step is refreshing. It will be available shortly.
        </p>
      ) : null}
      {ordinary.length > 0 ||
      (uniqueTasks.length === 0 && missingTaskActions.length === 0) ? (
        <ActionButtons
          actions={ordinary}
          disableAction={disableAction}
          {...(highlightActionId ? { highlightActionId } : {})}
          onAction={onAction}
          mutationState={mutationState}
        />
      ) : null}
      <CaseReview view={view} actions={actions} />
    </>
  );
}

function workInteractionActions(actions: AvailableAction[]): AvailableAction[] {
  const ordinaryPrimaryActions = primaryActions(actions);
  return actions.filter(
    (action) =>
      action.taskId !== undefined || ordinaryPrimaryActions.includes(action),
  );
}

function ToolChrome({
  systemId,
}: {
  systemId: ClientView["events"][number]["systemId"];
}) {
  const meta = systemMeta(systemId);
  return (
    <div className="tool-chrome">
      <p className="tool-title">{meta.toolTitle}</p>
      <span className="tool-hint">{meta.hint}</span>
    </div>
  );
}

export function SystemToolPanel({
  view,
  systemId,
  selectedEventId,
  actions,
  onAction,
  onTaskAttempt,
  onWorkplaceInteraction,
  highlightActionId,
  onOpenCaseSources,
  mutationState = EMPTY_MUTATION_STATE,
}: {
  view: ClientView;
  systemId: ClientView["events"][number]["systemId"];
  onOpenCaseSources?: () => void;
  selectedEventId?: string;
  actions: AvailableAction[];
  onAction: (action: AvailableAction, freeText?: string) => void;
  onTaskAttempt?: TaskAttemptHandler;
  onWorkplaceInteraction?: (
    interaction: WorkplaceInteraction,
  ) => Promise<unknown>;
  highlightActionId?: string;
  mutationState?: MutationState;
}) {
  const eventArtifacts = filterSystemArtifacts(view, systemId, selectedEventId);
  const scopeKey = `${systemId}:${selectedEventId ?? "system"}`;
  const [selectedArtifactIds, setSelectedArtifactIds] = useState<
    Record<string, string>
  >({});
  const [focusArtifactId, setFocusArtifactId] = useState<string>();
  const selectedArtifactId = selectedArtifactIds[scopeKey];
  const selectArtifact = (id: string) => {
    setSelectedArtifactIds((current) => ({ ...current, [scopeKey]: id }));
    setFocusArtifactId(id);
  };
  const utilities = utilityActions(actions);
  const ticketNotesAction = utilities.find(
    ({ id, taskId }) => id === "update_ticket_notes" && !taskId,
  );
  const notebookAction = utilities.find(
    ({ id, taskId }) => id === "update_notebook" && !taskId,
  );
  const searchAction = actions.find(({ id }) => id === "search_knowledge_base");

  const openArtifact = onWorkplaceInteraction
    ? (artifactId: string) =>
        onWorkplaceInteraction({ type: "open_artifact", artifactId })
    : undefined;

  if (systemId === "email") {
    return (
      <div className="tool-panel" data-system={systemId}>
        <ToolChrome systemId={systemId} />
        {selectedEventId && onWorkplaceInteraction ? (
          <CaseEvidence
            key={selectedEventId}
            view={view}
            eventId={selectedEventId}
            onInspect={onWorkplaceInteraction}
            bodyShownElsewhere={eventArtifacts.map(({ id }) => id)}
            pending={Boolean(mutationState.pendingKey)}
          />
        ) : null}
        <EmailTool
          artifacts={eventArtifacts}
          onOpenArtifact={openArtifact}
          onSelect={selectArtifact}
          selectedId={selectedArtifactId}
          mutationState={mutationState}
        />
        <WorkInteraction
          onOpenArtifact={openArtifact}
          actions={workInteractionActions(actions)}
          {...(highlightActionId ? { highlightActionId } : {})}
          onAction={onAction}
          mutationState={mutationState}
          {...(onTaskAttempt ? { onTaskAttempt } : {})}
          view={view}
        />
      </div>
    );
  }

  if (systemId === "alert_dashboard") {
    const records = (view.alertRecords ?? []).filter(
      (record) =>
        !selectedEventId || record.linkedWorkItemId === selectedEventId,
    );
    const source = selectedEventId
      ? selectedAlertSource(view, selectedEventId)
      : undefined;
    return (
      <div className="tool-panel" data-system={systemId}>
        <ToolChrome systemId={systemId} />
        {records.length > 0 ? (
          <AlertRecords
            view={view}
            eventId={selectedEventId}
            onOpenRecord={
              onWorkplaceInteraction
                ? (recordId) =>
                    onWorkplaceInteraction({
                      type: "open_alert_record",
                      recordId,
                    })
                : undefined
            }
            mutationState={mutationState}
          />
        ) : (
          <AlertTool
            artifacts={eventArtifacts}
            onOpenArtifact={openArtifact}
            onSelect={selectArtifact}
            selectedId={selectedArtifactId}
            mutationState={mutationState}
          />
        )}
        {records.length > 0 && !source ? (
          <p role="status">Open the alert to begin.</p>
        ) : null}
        <WorkInteraction
          onOpenArtifact={openArtifact}
          actions={workInteractionActions(actions)}
          disableAction={records.length > 0 && !source}
          {...(highlightActionId ? { highlightActionId } : {})}
          onAction={(action, freeText) => {
            onAction(bindAlertAction(view, action), freeText);
          }}
          mutationState={mutationState}
          {...(onTaskAttempt ? { onTaskAttempt } : {})}
          view={view}
        />
        {selectedEventId && onWorkplaceInteraction ? (
          <CaseEvidence
            key={selectedEventId}
            view={view}
            eventId={selectedEventId}
            onInspect={onWorkplaceInteraction}
            pending={Boolean(mutationState.pendingKey)}
          />
        ) : null}
        <RecordQueryTool
          view={view}
          queryAction={view.availableActions.find(
            ({ id, eventId }) =>
              id === "query_records" && eventId === selectedEventId,
          )}
          onQueryRecords={(action, payload) => {
            onAction({ ...action, queryPayload: payload });
          }}
          onInspectRecord={onWorkplaceInteraction}
          mutationState={mutationState}
        />
      </div>
    );
  }

  if (systemId === "knowledge_base") {
    return (
      <div className="tool-panel" data-system={systemId}>
        <ToolChrome systemId={systemId} />
        {onOpenCaseSources ? (
          <button
            className="case-sources-link"
            type="button"
            onClick={onOpenCaseSources}
          >
            Open case sources and record search in Alerts
          </button>
        ) : null}
        <WorkInteraction
          onOpenArtifact={openArtifact}
          actions={workInteractionActions(actions).filter(
            ({ id, taskId }) =>
              id !== "search_knowledge_base" || Boolean(taskId),
          )}
          {...(highlightActionId ? { highlightActionId } : {})}
          onAction={onAction}
          mutationState={mutationState}
          {...(onTaskAttempt ? { onTaskAttempt } : {})}
          view={view}
        />
        <GuideSearch
          canonicalSearchAction={
            searchAction && !searchAction.taskId ? searchAction : undefined
          }
          focusArtifactId={focusArtifactId}
          mutationState={mutationState}
          onCanonicalSearch={onAction}
          onOpenArtifact={openArtifact}
          onSelect={selectArtifact}
          selectedId={selectedArtifactId}
          view={view}
        />
        {openArtifact ? (
          <InventoryLookup
            eventId={selectedEventId}
            view={view}
            onOpenArtifact={openArtifact}
            mutationState={mutationState}
          />
        ) : null}
      </div>
    );
  }

  if (systemId === "team_chat") {
    return (
      <div className="tool-panel" data-system={systemId}>
        <ToolChrome systemId={systemId} />
        {actions
          .filter(({ id }) => id === "submit_shift_handoff")
          .map((action) => (
            <HandoffBuilder
              key={action.eventId}
              view={view}
              action={action}
              onAction={onAction}
              onOpenArtifact={openArtifact}
              pending={Boolean(mutationState.pendingKey)}
            />
          ))}
        <WorkInteraction
          onOpenArtifact={openArtifact}
          actions={workInteractionActions(actions).filter(
            ({ id }) =>
              id !== "ask_manager" &&
              id !== "acknowledge_handoff" &&
              id !== "submit_shift_handoff",
          )}
          onAction={onAction}
          mutationState={mutationState}
          {...(onTaskAttempt ? { onTaskAttempt } : {})}
          view={view}
        />
        {selectedEventId && onWorkplaceInteraction ? (
          <CaseEvidence
            key={selectedEventId}
            view={view}
            eventId={selectedEventId}
            onInspect={onWorkplaceInteraction}
            pending={Boolean(mutationState.pendingKey)}
          />
        ) : null}
        <TeamChatTool
          view={view}
          onOpenArtifact={openArtifact}
          mutationState={mutationState}
          actions={actions}
          onAction={onAction}
        />
      </div>
    );
  }

  // systemId is exhausted to "ticket_queue" here; render the ticket queue tools.
  {
    const selected =
      eventArtifacts.find(({ id }) => id === selectedArtifactId) ??
      eventArtifacts[0];
    return (
      <div className="tool-panel" data-system={systemId}>
        <ToolChrome systemId={systemId} />
        {actions
          .filter(
            (action) =>
              action.id === "document_ticket" ||
              (action.id === "update_ticket_notes" &&
                Boolean(
                  view.structuredTickets?.[`ticket-${action.eventId}`]
                    ?.reasoning,
                ) &&
                !actions.some(
                  (other) =>
                    other.id === "document_ticket" &&
                    other.eventId === action.eventId,
                )),
          )
          .map((action) => (
            <TicketComposer
              key={action.eventId}
              view={view}
              action={action}
              draftAction={actions.find(
                ({ id, eventId }) =>
                  id === "update_ticket_notes" && eventId === action.eventId,
              )}
              onAction={onAction}
              onOpenArtifact={openArtifact}
              mutationState={mutationState}
            />
          ))}
        <WorkInteraction
          onOpenArtifact={openArtifact}
          actions={workInteractionActions(actions).filter(
            ({ id }) =>
              id !== "document_ticket" && id !== "update_ticket_notes",
          )}
          {...(highlightActionId ? { highlightActionId } : {})}
          onAction={onAction}
          mutationState={mutationState}
          {...(onTaskAttempt ? { onTaskAttempt } : {})}
          view={view}
        />
        {selectedEventId && onWorkplaceInteraction ? (
          <CaseEvidence
            key={selectedEventId}
            view={view}
            eventId={selectedEventId}
            onInspect={onWorkplaceInteraction}
            pending={Boolean(mutationState.pendingKey)}
            comparisonInNote={Boolean(view.reasoningOptions?.[selectedEventId]?.length)}
          />
        ) : null}
        <details className="case-files-disclosure">
          <summary>Case files and notes</summary>
          <div className="tool-split">
            <div>
              <ArtifactList
                artifacts={eventArtifacts}
                selectedId={selected?.id}
                onSelect={selectArtifact}
              />
            </div>
            <div>
              <ArtifactDetail
                artifact={selected}
                focus={selected?.id === focusArtifactId}
                onOpenArtifact={openArtifact}
                mutationState={mutationState}
              />
              <NotesEditor
                action={
                  actions.some(({ id }) => id === "document_ticket")
                    ? undefined
                    : ticketNotesAction
                }
                label="Investigation notes"
                onSave={onAction}
                mutationState={mutationState}
                value={
                  selectedEventId
                    ? (view.ticketNotes[selectedEventId] ?? "")
                    : ""
                }
              />
              <NotesEditor
                action={notebookAction}
                label="Personal notebook (optional)"
                onSave={onAction}
                mutationState={mutationState}
                value={view.notebook}
              />
            </div>
          </div>
        </details>
      </div>
    );
  }
}
