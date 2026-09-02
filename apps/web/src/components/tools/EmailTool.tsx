import type { ClientArtifact } from "@sim/schemas";
import {
  EMPTY_MUTATION_STATE,
  type MutationState,
  workplaceMutationKey,
} from "../../useMutationCoordinator.js";

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
  const opening =
    mutationState.pendingKey ===
    workplaceMutationKey({ type: "open_artifact", artifactId: selected.id });

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
          <button
            className="action-primary"
            disabled={!onOpenArtifact || Boolean(mutationState.pendingKey)}
            onClick={() => {
              void onOpenArtifact?.(selected.id);
            }}
            type="button"
          >
            {opening ? "Opening message…" : "Open message"}
          </button>
        )}
      </article>
    </div>
  );
}
