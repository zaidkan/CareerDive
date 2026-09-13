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

function MessageTime({ artifact }: { artifact: ClientArtifact }) {
  // The authored summary is already an approved public preview. Never read
  // unopened metadata or invent a wall-clock arrival time for an old session.
  const time = /(?:^| · )((?:[01]\d|2[0-3]):[0-5]\d)(?: ·|$)/.exec(
    artifact.summary,
  );
  const label = time?.[1];
  return label ? (
    <time dateTime={label}>{label}</time>
  ) : (
    <span>Time not recorded</span>
  );
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
                <MessageTime artifact={artifact} /> ·{" "}
                {artifact.observed ? "read" : "unread"}
              </small>
            </button>
          </li>
        ))}
      </ul>
      <article className="email-message">
        <p className="eyebrow">
          From {senderFor(selected)} · <MessageTime artifact={selected} />
        </p>
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
