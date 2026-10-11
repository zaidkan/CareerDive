import { useEffect, useState } from "react";
import { matchingGuides } from "@sim/core";
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
  eventId,
}: {
  view: ClientView;
  selectedId?: string | undefined;
  focusArtifactId?: string | undefined;
  onSelect: (id: string) => void;
  onOpenArtifact?: ((id: string) => Promise<unknown>) | undefined;
  mutationState?: MutationState;
  canonicalSearchAction?: AvailableAction | undefined;
  onCanonicalSearch?: (action: AvailableAction, query: string) => void;
  eventId?: string | undefined;
}) {
  // A prior case's search must not hide the current case's guides on arrival.
  const [query, setQuery] = useState("");
  useEffect(() => {
    setQuery(view.kbQuery);
  }, [view.kbQuery]);
  useEffect(() => {
    setQuery("");
  }, [view.sessionId, eventId]);
  const docs = filterKnowledgeBase(view, query).sort(
    (a, b) =>
      Number(b.eventIds.includes(eventId ?? "")) -
      Number(a.eventIds.includes(eventId ?? "")),
  );
  const inventory = view.availableActions.some(
    (a) => a.id === "check_device_inventory" && a.eventId === eventId,
  );
  const selected =
    docs.find(
      (a) => a.id === selectedId && (!eventId || a.eventIds.includes(eventId)),
    ) ??
    (inventory ? docs.find((a) => a.id === "device-inventory-1") : undefined) ??
    docs[0];
  const relevant = matchingGuides(
    view.artifacts,
    query,
    canonicalSearchAction?.eventId,
  );
  const canRecord = Boolean(query.trim() && relevant.length);
  const followUp = view.events.some(
    (e) =>
      e.id === canonicalSearchAction?.eventId && e.category === "main_case",
  );
  return (
    <div className="tool-split">
      <div>
        <form
          className="kb-search"
          onSubmit={(event) => {
            event.preventDefault();
            if (canonicalSearchAction && onCanonicalSearch && canRecord)
              onCanonicalSearch(canonicalSearchAction, query);
          }}
        >
          <label htmlFor="guide-local-query">Find a guide</label>
          <select
            id="guide-local-query"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
            }}
          >
            <option value="">All available guides</option>
            {query && !view.artifacts.some(a => a.systemId === "knowledge_base" && a.title === query) ? <option value={query} disabled>Saved search: {query}</option> : null}
            {view.artifacts.filter(a => a.systemId === "knowledge_base").map(a => (
              <option key={a.id} value={a.title}>{a.title}</option>
            ))}
          </select>
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
              }}
            >
              Clear search
            </button>
          ) : null}
          {canonicalSearchAction && onCanonicalSearch ? (
            <>
              <p>
                Choose a guide. Only a match relevant
                to this case can record the procedure check. Open the guide to
                inspect its content.
              </p>
              <button
                type="submit"
                data-action-id={canonicalSearchAction.id}
                data-event-id={canonicalSearchAction.eventId}
                disabled={!canRecord || Boolean(mutationState.pendingKey)}
              >
                {followUp
                  ? `Need more evidence? ${canonicalSearchAction.label}`
                  : canonicalSearchAction.label}
              </button>
              {query.trim() && !relevant.length ? (
                <p role="status">
                  No relevant guide matches this query. Try a shorter keyword.
                  Your procedure step has not advanced.
                </p>
              ) : null}
              {followUp ? <p>Follow-up checks; the case stays open.</p> : null}
            </>
          ) : null}
        </form>
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
