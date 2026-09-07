import type { ClientArtifact } from "@sim/schemas";
import {
  EMPTY_MUTATION_STATE,
  type MutationState,
} from "../../useMutationCoordinator.js";
import { ArtifactOpenButton } from "./ArtifactOpenButton.js";

function senderFor(artifact: ClientArtifact): string {
  const match = /^From (.+?)(?: ·|$)/.exec(artifact.summary);
  return match?.[1] ?? "Workplace message";
}

export function EmailTool({
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
  if (!selected) return <p>No messages are available yet.</p>;

  return (
    <div className="email-tool">
      <ul className="email-queue" aria-label="Email messages">
        {artifacts.map((artifact) => (
          <li key={artifact.id}>
            <button
              aria-pressed={selected.id === artifact.id}
              onClick={() => {
                onSelect(artifact.id);
              }}
              type="button"
            >
              <span>{senderFor(artifact)}</span>
              <strong>{artifact.title}</strong>
              <small>
                This shift · {artifact.observed ? "read" : "unread"}
              </small>
            </button>
          </li>
        ))}
      </ul>
      <article className="email-message">
        <p className="eyebrow">From {senderFor(selected)} · This shift</p>
        <h4>{selected.title}</h4>
        <p>{selected.summary}</p>
        {selected.observed ? (
          <pre className="artifact-body">{selected.body}</pre>
        ) : (
          <ArtifactOpenButton
            key={selected.id}
            artifactId={selected.id}
            label="Open message"
            onOpenArtifact={onOpenArtifact}
            mutationState={mutationState}
          />
        )}
      </article>
    </div>
  );
}
