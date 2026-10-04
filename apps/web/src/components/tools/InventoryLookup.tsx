import { useState } from "react";
import type { ClientArtifact, ClientView } from "@sim/schemas";
import { ArtifactOpenButton } from "./ArtifactOpenButton.js";
import {
  EMPTY_MUTATION_STATE,
  type MutationState,
} from "../../useMutationCoordinator.js";

export function InventoryLookup({
  view,
  eventId,
  onOpenArtifact,
  mutationState = EMPTY_MUTATION_STATE,
}: {
  view: ClientView;
  eventId?: string | undefined;
  onOpenArtifact?: (id: string) => Promise<unknown>;
  mutationState?: MutationState;
}) {
  const [query, setQuery] = useState("");
  const records = view.artifacts.filter(
    (artifact) => artifact.kind === "device_record",
  );
  const exactQuery = query.trim().toLowerCase();
  const matches = exactQuery
    ? records.filter((record) =>
        record.lookupKeys?.some((key) => key.toLowerCase() === exactQuery),
      )
    : eventId
      ? records.filter(
          ({ id, eventIds }) =>
            eventIds.includes(eventId) &&
            view.workplace.inspectedArtifactIds?.includes(id),
        )
      : [];
  return (
    <section aria-label="Device inventory lookup" className="inventory-lookup">
      <h3>Device inventory</h3>
      <label htmlFor="inventory-device-query">Find an exact device</label>
      <input
        id="inventory-device-query"
        type="search"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
        }}
        placeholder="Enter the device name shown in the alert"
      />
      {query.trim() && matches.length === 0 ? (
        <p role="status">
          No inventory records match that device. Check the full device name in
          the alert and try again; a missing match does not tell you who used
          it.
        </p>
      ) : null}
      {matches.map((record: ClientArtifact) => (
        <article key={record.id}>
          <h4>{record.title}</h4>
          <p>{record.summary}</p>
          {record.observed && record.body ? (
            <details>
              <summary>Inventory record</summary>
              <pre className="artifact-body">{record.body}</pre>
            </details>
          ) : null}
          {onOpenArtifact ? (
            <ArtifactOpenButton
              artifactId={record.id}
              label={`Open ${record.title}`}
              onOpenArtifact={onOpenArtifact}
              mutationState={mutationState}
            />
          ) : null}
        </article>
      ))}
    </section>
  );
}
