import { useEffect, useState } from "react";
import type { AvailableAction, ClientView } from "@sim/schemas";
import {
  ArtifactDetail,
  ArtifactList,
  filterKnowledgeBase,
} from "../artifacts.js";
import {
  EMPTY_MUTATION_STATE,
  type MutationState,
} from "../../useMutationCoordinator.js";

export function GuideSearch({
  view,
  selectedId,
  focusArtifactId,
  onSelect,
  onOpenArtifact,
  mutationState = EMPTY_MUTATION_STATE,
  canonicalSearchAction,
  onCanonicalSearch,
}: {
  view: ClientView;
  selectedId?: string | undefined;
  focusArtifactId?: string | undefined;
  onSelect: (id: string) => void;
  onOpenArtifact?: ((id: string) => Promise<unknown>) | undefined;
  mutationState?: MutationState;
  canonicalSearchAction?: AvailableAction | undefined;
  onCanonicalSearch?: (action: AvailableAction, query: string) => void;
}) {
  const [query, setQuery] = useState(() => view.kbQuery);
  useEffect(() => {
    setQuery(view.kbQuery);
  }, [view.sessionId, view.kbQuery]);
  const docs = filterKnowledgeBase(view, query);
  const selected = docs.find(({ id }) => id === selectedId) ?? docs[0];
  const isLoginFollowUp = view.events.some(
    (event) =>
      event.id === canonicalSearchAction?.eventId &&
      event.templateId === "suspicious_login",
  );

  return (
    <div className="tool-split">
      <div>
        <form
          className="kb-search"
          onSubmit={(event) => {
            event.preventDefault();
          }}
        >
          <label htmlFor="guide-local-query">Filter guides locally</label>
          <input
            id="guide-local-query"
            onChange={(event) => {
              setQuery(event.target.value);
            }}
            placeholder="e.g. login alert, phishing"
            type="search"
            value={query}
          />
          {query ? (
            <button
              onClick={() => {
                setQuery("");
              }}
              type="button"
            >
              Clear search
            </button>
          ) : null}
        </form>
        {canonicalSearchAction && onCanonicalSearch ? (
          <form
            className="kb-search kb-canonical-search"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              const raw = data.get("query");
              onCanonicalSearch(
                canonicalSearchAction,
                typeof raw === "string" ? raw : "",
              );
            }}
          >
            <label htmlFor="kb-query">Search guides</label>
            <input
              defaultValue={view.kbQuery}
              key={`${view.sessionId}:${view.kbQuery}`}
              id="kb-query"
              name="query"
              placeholder="e.g. login alert, phishing"
              type="search"
            />
            <button
              data-action-id={canonicalSearchAction.id}
              data-event-id={canonicalSearchAction.eventId}
              disabled={Boolean(mutationState.pendingKey)}
              type="submit"
            >
              {isLoginFollowUp
                ? `Need more evidence? ${canonicalSearchAction.label}`
                : canonicalSearchAction.label}
            </button>
            {isLoginFollowUp ? (
              <p>
                Review the follow-up procedure and keep this case open. Save the
                remaining question in Tickets; this check does not contact a
                reviewer or contain an account.
              </p>
            ) : null}
          </form>
        ) : null}
        {docs.length === 0 && query.trim() ? (
          <p role="status">No guides match “{query.trim()}”.</p>
        ) : (
          <ArtifactList
            artifacts={docs}
            selectedId={selected?.id}
            onSelect={onSelect}
          />
        )}
      </div>
      <ArtifactDetail
        artifact={selected}
        focus={selected?.id === focusArtifactId}
        onOpenArtifact={onOpenArtifact}
        mutationState={mutationState}
      />
    </div>
  );
}
