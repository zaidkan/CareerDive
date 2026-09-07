import { useEffect, useRef } from "react";
import type { ClientArtifact } from "@sim/schemas";
import {
  EMPTY_MUTATION_STATE,
  type MutationState,
} from "../../useMutationCoordinator.js";
import { ArtifactOpenButton } from "./ArtifactOpenButton.js";

export function AlertTool({
  artifacts,
  selectedId,
  onSelect,
  onOpenArtifact,
  mutationState = EMPTY_MUTATION_STATE,
}: {
  artifacts: ClientArtifact[];
  selectedId?: string | undefined;
  onSelect: (id: string) => void;
  onOpenArtifact?: ((artifactId: string) => Promise<unknown>) | undefined;
  mutationState?: MutationState;
}) {
  const selected =
    artifacts.find(({ id }) => id === selectedId) ?? artifacts[0];
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (selectedId) headingRef.current?.focus();
  }, [selectedId]);
  if (!selected) return <p>No alerts are available yet.</p>;

  return (
    <div className="alert-tool">
      <ul className="alert-timeline" aria-label="Alert timeline">
        {artifacts.map((artifact) => (
          <li key={artifact.id}>
            <button
              aria-pressed={selected.id === artifact.id}
              onClick={() => {
                onSelect(artifact.id);
              }}
              type="button"
            >
              <strong>{artifact.title}</strong>
              <small>{artifact.summary}</small>
              <small>{artifact.observed ? "opened" : "unopened"}</small>
            </button>
          </li>
        ))}
      </ul>
      <article className="alert-record">
        <h4 ref={headingRef} tabIndex={selectedId ? -1 : undefined}>
          {selected.title}
        </h4>
        <p>{selected.summary}</p>
        {selected.observed ? (
          <>
            <pre className="artifact-body">{selected.body}</pre>
            {Object.keys(selected.metadata ?? {}).length > 0 ? (
              <dl className="alert-fields">
                {Object.entries(selected.metadata ?? {}).map(([key, value]) => (
                  <div key={key}>
                    <dt>{key}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </>
        ) : (
          <ArtifactOpenButton
            key={selected.id}
            artifactId={selected.id}
            label="Open alert"
            onOpenArtifact={onOpenArtifact}
            mutationState={mutationState}
          />
        )}
      </article>
    </div>
  );
}
