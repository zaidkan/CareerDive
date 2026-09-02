import { useState } from "react";
import type { AvailableAction, ClientView } from "@sim/schemas";
import {
  ArtifactDetail,
  ArtifactList,
  NotesEditor,
  filterKnowledgeBase,
  filterSystemArtifacts,
} from "./artifacts.js";
import { primaryActions, systemMeta, utilityActions } from "../systems.js";
import { WorkTaskPanel } from "./WorkTaskPanel.js";
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
  mutationState = EMPTY_MUTATION_STATE,
}: {
  actions: AvailableAction[];
  view: ClientView;
  onAction: (action: AvailableAction, freeText?: string) => void;
  onTaskAttempt?: TaskAttemptHandler;
  highlightActionId?: string;
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
        <WorkTaskPanel
          key={task.id}
          mutationState={mutationState}
          relatedArtifacts={view.artifacts.filter(({ id }) =>
            task.relatedArtifactIds.includes(id),
          )}
          task={task}
          {...(onTaskAttempt ? { onTaskAttempt } : {})}
        />
      ))}
      {missingTaskActions.length > 0 ? (
        <p className="empty-actions" role="status">
          A work step is refreshing. It will be available shortly.
        </p>
      ) : null}
      <ActionButtons
        actions={ordinary}
        {...(highlightActionId ? { highlightActionId } : {})}
        onAction={onAction}
        mutationState={mutationState}
      />
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
  highlightActionId,
  mutationState = EMPTY_MUTATION_STATE,
}: {
  view: ClientView;
  systemId: ClientView["events"][number]["systemId"];
  selectedEventId?: string;
  actions: AvailableAction[];
  onAction: (action: AvailableAction, freeText?: string) => void;
  onTaskAttempt?: TaskAttemptHandler;
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

  if (systemId === "knowledge_base") {
    const docs = filterKnowledgeBase(view, view.kbQuery);
    const selected =
      docs.find(({ id }) => id === selectedArtifactId) ?? docs[0];
    return (
      <div className="tool-panel" data-system={systemId}>
        <ToolChrome systemId={systemId} />
        <div className="tool-split">
          <div>
            {searchAction && !searchAction.taskId ? (
              <form
                className="kb-search"
                onSubmit={(event) => {
                  event.preventDefault();
                  const data = new FormData(event.currentTarget);
                  const raw = data.get("query");
                  const query = typeof raw === "string" ? raw : "";
                  onAction(searchAction, query);
                }}
              >
                <label htmlFor="kb-query">Search guides</label>
                <input
                  defaultValue={view.kbQuery}
                  id="kb-query"
                  name="query"
                  placeholder="e.g. login alert, phishing"
                  type="search"
                />
                <button
                  data-action-id={searchAction.id}
                  data-event-id={searchAction.eventId}
                  disabled={Boolean(mutationState.pendingKey)}
                  type="submit"
                >
                  {searchAction.label}
                </button>
              </form>
            ) : (
              <p className="eyebrow">Browse approved guides</p>
            )}
            <ArtifactList
              artifacts={docs}
              selectedId={selected?.id}
              onSelect={selectArtifact}
            />
          </div>
          <ArtifactDetail
            artifact={selected}
            focus={selected?.id === focusArtifactId}
          />
        </div>
        <WorkInteraction
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

  if (systemId === "ticket_queue") {
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
        <ArtifactDetail
          artifact={selected}
          focus={selected?.id === focusArtifactId}
        />
      </div>
      <WorkInteraction
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
