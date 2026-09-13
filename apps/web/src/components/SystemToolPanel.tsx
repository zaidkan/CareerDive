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
import { EmailTool } from "./tools/EmailTool.js";
import { GuideSearch } from "./tools/GuideSearch.js";
import { InventoryLookup } from "./tools/InventoryLookup.js";
import { TaskInteraction } from "./tools/TaskInteraction.js";
import { ArtifactOpenButton } from "./tools/ArtifactOpenButton.js";
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
  mutationState = EMPTY_MUTATION_STATE,
}: {
  actions: AvailableAction[];
  onAction: (action: AvailableAction, freeText?: string) => void;
  highlightActionId?: string;
  mutationState?: MutationState;
}) {
  const choices = primaryActions(actions);
  if (choices.length === 0) {
    return (
      <p className="empty-actions">
        No actions here yet. Try another tab or read the item on the left.
      </p>
    );
  }

  const highlighted =
    choices.find(({ id }) => id === highlightActionId) ?? choices[0];
  if (!highlighted) {
    return (
      <p className="empty-actions">
        No actions here yet. Try another tab or read the item on the left.
      </p>
    );
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
        disabled={pending}
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
                disabled={pending}
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
  onOpenArtifact,
  mutationState = EMPTY_MUTATION_STATE,
}: {
  actions: AvailableAction[];
  view: ClientView;
  onAction: (action: AvailableAction, freeText?: string) => void;
  onTaskAttempt?: TaskAttemptHandler;
  highlightActionId?: string;
  onOpenArtifact?: ((id: string) => Promise<unknown>) | undefined;
  mutationState?: MutationState;
}) {
  const taskActions = actions.filter(({ taskId }) => taskId !== undefined);
  const tasks = taskActions.flatMap((action) => {
    const task = view.tasks.find(
      ({ id, eventId }) => id === action.taskId && eventId === action.eventId,
    );
    return task ? [task] : [];
  });
  const uniqueTasks = [
    ...new Map(tasks.map((task) => [task.id, task])).values(),
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
      {uniqueTasks.map((task) => (
        <TaskInteraction
          key={task.id}
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
          {...(highlightActionId ? { highlightActionId } : {})}
          onAction={onAction}
          mutationState={mutationState}
        />
      ) : null}
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
  mutationState = EMPTY_MUTATION_STATE,
}: {
  view: ClientView;
  systemId: ClientView["events"][number]["systemId"];
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
    return (
      <div className="tool-panel" data-system={systemId}>
        <ToolChrome systemId={systemId} />
        <AlertTool
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

  if (systemId === "knowledge_base") {
    return (
      <div className="tool-panel" data-system={systemId}>
        <ToolChrome systemId={systemId} />
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
        {openArtifact ? <InventoryLookup view={view} onOpenArtifact={openArtifact} mutationState={mutationState} /> : null}
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
      </div>
    );
  }

  if (systemId === "team_chat") {
    const thread = eventArtifacts.find(({ kind }) => kind === "chat_thread") ?? view.artifacts.find(({ kind }) => kind === "chat_thread") ?? eventArtifacts[0];
    const guidance = [...view.operationalMessages].reverse().find((message) => message.startsWith("Morgan "));
    return (
      <div className="tool-panel" data-system={systemId}>
        <ToolChrome systemId={systemId} />
        {thread ? <article className="team-chat-thread" aria-label="Morgan message thread">
          <h3>{thread.title}</h3>
          <p>{thread.observed ? thread.body : thread.summary}</p>
          {!thread.observed ? <ArtifactOpenButton artifactId={thread.id} label={`Open ${thread.title}`} onOpenArtifact={openArtifact} mutationState={mutationState} /> : null}
        </article> : null}
        {guidance ? <aside className="manager-guidance" aria-label="Morgan guidance"><strong>Morgan’s guidance</strong><p>{guidance}</p></aside> : null}
        <WorkInteraction onOpenArtifact={openArtifact} actions={workInteractionActions(actions)} onAction={onAction} mutationState={mutationState} {...(onTaskAttempt ? { onTaskAttempt } : {})} view={view} />
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
              action={ticketNotesAction}
              label="Investigation notes"
              onSave={onAction}
              mutationState={mutationState}
              value={
                selectedEventId ? (view.ticketNotes[selectedEventId] ?? "") : ""
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
}
