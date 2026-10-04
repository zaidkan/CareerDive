import { useEffect, useRef, useState } from "react";
import type { AvailableAction, ClientArtifact, ClientView } from "@sim/schemas";
import { ArtifactOpenButton } from "./tools/ArtifactOpenButton.js";
import {
  actionMutationKey,
  EMPTY_MUTATION_STATE,
  type MutationState,
} from "../useMutationCoordinator.js";

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
  focus = false,
  onOpenArtifact,
  mutationState,
}: {
  artifact?: ClientArtifact | undefined;
  focus?: boolean;
  onOpenArtifact?: ((id: string) => Promise<unknown>) | undefined;
  mutationState?: MutationState | undefined;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previousArtifact = useRef({
    id: artifact?.id,
    observed: artifact?.observed,
  });
  useEffect(() => {
    const justOpened =
      previousArtifact.current.id === artifact?.id &&
      !previousArtifact.current.observed &&
      artifact?.observed;
    if (focus || justOpened) headingRef.current?.focus();
    previousArtifact.current = {
      id: artifact?.id,
      observed: artifact?.observed,
    };
  }, [artifact?.id, artifact?.observed, focus]);
  if (!artifact) {
    return <p>Select a record.</p>;
  }
  return (
    <article className="artifact-detail">
      <p className="eyebrow">{artifact.kind.replaceAll("_", " ")}</p>
      <h4 ref={headingRef} tabIndex={-1}>
        {artifact.title}
      </h4>
      <p>{artifact.summary}</p>
      {!artifact.observed && onOpenArtifact ? (
        <ArtifactOpenButton
          key={artifact.id}
          artifactId={artifact.id}
          label={`Open ${artifact.title}`}
          onOpenArtifact={onOpenArtifact}
          {...(mutationState ? { mutationState } : {})}
        />
      ) : null}
      {artifact.observed && artifact.body ? (
        artifact.kind === "kb_document" ? (
          <details className="guide-reference">
            <summary>Full reference</summary>
            <pre className="artifact-body">{artifact.body}</pre>
          </details>
        ) : (
          <pre className="artifact-body">{artifact.body}</pre>
        )
      ) : (
        <p className="artifact-unopened">Open record to inspect.</p>
      )}
      {artifact.observed && Object.keys(artifact.metadata ?? {}).length > 0 ? (
        <dl className="artifact-meta">
          {Object.entries(artifact.metadata ?? {}).map(([key, value]) => (
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
  mutationState = EMPTY_MUTATION_STATE,
}: {
  label: string;
  value: string;
  action?: AvailableAction | undefined;
  onSave: (action: AvailableAction, freeText: string) => void;
  mutationState?: MutationState;
}) {
  type DraftState = { canonical: string; dirty: boolean; draft: string };
  const actionKey = action ? actionMutationKey(action) : "notes:unavailable";
  const [drafts, setDrafts] = useState<Record<string, DraftState>>(() => ({
    [actionKey]: { canonical: value, dirty: false, draft: value },
  }));
  const entry = drafts[actionKey] ?? {
    canonical: value,
    dirty: false,
    draft: value,
  };

  useEffect(() => {
    setDrafts((current) => {
      const existing = current[actionKey];
      if (!existing) {
        return {
          ...current,
          [actionKey]: { canonical: value, dirty: false, draft: value },
        };
      }
      if (existing.dirty) {
        if (existing.draft !== value) return current;
        return {
          ...current,
          [actionKey]: { canonical: value, dirty: false, draft: value },
        };
      }
      if (existing.canonical === value) return current;
      return {
        ...current,
        [actionKey]: { canonical: value, dirty: false, draft: value },
      };
    });
  }, [actionKey, value]);

  if (!action) {
    return null;
  }
  return (
    <form
      className="notes-editor"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(action, entry.draft);
      }}
    >
      <label htmlFor={`notes-${action.id}-${action.eventId}`}>{label}</label>
      <textarea
        id={`notes-${action.id}-${action.eventId}`}
        onChange={(event) => {
          const draft = event.target.value;
          setDrafts((current) => ({
            ...current,
            [actionKey]: {
              canonical: current[actionKey]?.canonical ?? value,
              dirty: draft !== value,
              draft,
            },
          }));
        }}
        rows={4}
        value={entry.draft}
      />
      <button
        data-action-id={action.id}
        data-event-id={action.eventId}
        disabled={Boolean(mutationState.pendingKey)}
        type="submit"
      >
        {mutationState.pendingKey === actionKey
          ? `Saving ${action.label.toLowerCase()}…`
          : `Save ${action.label.toLowerCase()}`}
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
    return `${artifact.title} ${artifact.summary} ${artifact.searchableText ?? ""}`
      .toLowerCase()
      .includes(normalized);
  });
}
