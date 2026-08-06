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

function ActionButtons({
  actions,
  onAction,
  highlightActionId,
}: {
  actions: AvailableAction[];
  onAction: (action: AvailableAction, freeText?: string) => void;
  highlightActionId?: string;
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

  return (
    <div className="context-actions" aria-label="Workplace actions">
      <button
        className="action-primary"
        data-action-id={highlighted.id}
        data-event-id={highlighted.eventId}
        key={`${highlighted.id}:${highlighted.eventId}`}
        onClick={() => {
          onAction(highlighted);
        }}
        type="button"
      >
        <span>{highlighted.label}</span>
        <small>{highlighted.description}</small>
        <small className="action-time">
          Takes about {highlighted.simulatedMinutes} minutes
        </small>
      </button>
      {others.length > 0 ? (
        <details className="more-actions">
          <summary>{others.length} other option{others.length === 1 ? "" : "s"}</summary>
          <div className="more-actions-grid">
            {others.map((action) => (
              <button
                data-action-id={action.id}
                data-event-id={action.eventId}
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
  highlightActionId,
}: {
  view: ClientView;
  systemId: ClientView["events"][number]["systemId"];
  selectedEventId?: string;
  actions: AvailableAction[];
  onAction: (action: AvailableAction, freeText?: string) => void;
  highlightActionId?: string;
}) {
  const eventArtifacts = filterSystemArtifacts(view, systemId, selectedEventId);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string>();
  const utilities = utilityActions(actions);
  const ticketNotesAction = utilities.find(
    ({ id }) => id === "update_ticket_notes",
  );
  const notebookAction = utilities.find(({ id }) => id === "update_notebook");
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
            {searchAction ? (
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
              onSelect={setSelectedArtifactId}
            />
          </div>
          <ArtifactDetail artifact={selected} />
        </div>
        <ActionButtons
          actions={primaryActions(actions).filter(
            ({ id }) => id !== "search_knowledge_base",
          )}
          {...(highlightActionId ? { highlightActionId } : {})}
          onAction={onAction}
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
              onSelect={setSelectedArtifactId}
            />
          </div>
          <div>
            <ArtifactDetail artifact={selected} />
            <NotesEditor
              action={ticketNotesAction}
              label="Investigation notes"
              onSave={onAction}
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
              value={view.notebook}
            />
          </div>
        </div>
        <ActionButtons
          actions={primaryActions(actions)}
          {...(highlightActionId ? { highlightActionId } : {})}
          onAction={onAction}
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
            onSelect={setSelectedArtifactId}
          />
        </div>
        <ArtifactDetail artifact={selected} />
      </div>
      <ActionButtons
        actions={primaryActions(actions)}
        {...(highlightActionId ? { highlightActionId } : {})}
        onAction={onAction}
      />
    </div>
  );
}
