import { useState } from "react";
import type { AvailableAction, ClientArtifact, ClientView } from "@sim/schemas";

export function ArtifactList({
  artifacts,
  selectedId,
  onSelect,
}: {
  artifacts: ClientArtifact[];
  selectedId?: string | undefined;
  onSelect: (id: string) => void;
}) {
  if (artifacts.length === 0) {
    return <p>No workplace artifacts in this system yet.</p>;
  }
  return (
    <ul className="artifact-list">
      {artifacts.map((artifact) => (
        <li key={artifact.id}>
          <button
            aria-pressed={selectedId === artifact.id}
            className={artifact.observed ? "observed" : undefined}
            onClick={() => {
              onSelect(artifact.id);
            }}
            type="button"
          >
            <span>{artifact.title}</span>
            <small>
              {artifact.kind.replaceAll("_", " ")}
              {artifact.observed ? " · opened" : " · unread"}
            </small>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function ArtifactDetail({
  artifact,
}: {
  artifact?: ClientArtifact | undefined;
}) {
  if (!artifact) {
    return <p>Select an artifact to inspect its contents.</p>;
  }
  return (
    <article className="artifact-detail">
      <p className="eyebrow">{artifact.kind.replaceAll("_", " ")}</p>
      <h4>{artifact.title}</h4>
      <p>{artifact.summary}</p>
      <pre className="artifact-body">{artifact.body}</pre>
      {Object.keys(artifact.metadata).length > 0 ? (
        <dl className="artifact-meta">
          {Object.entries(artifact.metadata).map(([key, value]) => (
            <div key={key}>
              <dt>{key}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </article>
  );
}

export function NotesEditor({
  label,
  value,
  action,
  onSave,
}: {
  label: string;
  value: string;
  action?: AvailableAction | undefined;
  onSave: (action: AvailableAction, freeText: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  if (!action) {
    return null;
  }
  return (
    <form
      className="notes-editor"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(action, draft);
      }}
    >
      <label htmlFor={`notes-${action.id}-${action.eventId}`}>{label}</label>
      <textarea
        id={`notes-${action.id}-${action.eventId}`}
        onChange={(event) => {
          setDraft(event.target.value);
        }}
        rows={4}
        value={draft}
      />
      <button
        data-action-id={action.id}
        data-event-id={action.eventId}
        type="submit"
      >
        Save {action.label.toLowerCase()}
      </button>
    </form>
  );
}

export function filterSystemArtifacts(
  view: ClientView,
  systemId: ClientArtifact["systemId"],
  eventId?: string,
): ClientArtifact[] {
  return view.artifacts.filter((artifact) => {
    if (artifact.systemId !== systemId) return false;
    if (!eventId) return true;
    return (
      artifact.eventIds.length === 0 || artifact.eventIds.includes(eventId)
    );
  });
}

export function filterKnowledgeBase(
  view: ClientView,
  query: string,
): ClientArtifact[] {
  const normalized = query.trim().toLowerCase();
  return view.artifacts.filter((artifact) => {
    if (artifact.systemId !== "knowledge_base") return false;
    if (!normalized) return true;
    return `${artifact.title} ${artifact.summary} ${artifact.body} ${artifact.searchableText}`
      .toLowerCase()
      .includes(normalized);
  });
}
