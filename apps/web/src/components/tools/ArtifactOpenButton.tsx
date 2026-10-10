import { useRef, useState } from "react";
import {
  EMPTY_MUTATION_STATE,
  workplaceMutationKey,
  type MutationState,
} from "../../useMutationCoordinator.js";

/** Contains UI promise failures; the coordinator still owns canonical retry/state. */
export function ArtifactOpenButton({
  artifactId,
  label,
  onOpenArtifact,
  mutationState = EMPTY_MUTATION_STATE,
  disabled = false,
}: {
  disabled?: boolean;
  artifactId: string;
  label: string;
  onOpenArtifact?: ((id: string) => Promise<unknown>) | undefined;
  mutationState?: MutationState;
}) {
  const pendingRef = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const [opened, setOpened] = useState(false);
  const opening =
    pending ||
    mutationState.pendingKey ===
      workplaceMutationKey({ type: "open_artifact", artifactId });

  async function open() {
    if (
      disabled ||
      !onOpenArtifact ||
      pendingRef.current ||
      mutationState.pendingKey
    )
      return;
    pendingRef.current = true;
    setPending(true);
    setError(false);
    try {
      await onOpenArtifact(artifactId);
      setOpened(true);
    } catch {
      setError(true);
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }

  return (
    <>
      <button
        className="action-primary"
        type="button"
        data-interaction-id="open_artifact"
        data-artifact-id={artifactId}
        data-source-id={artifactId}
        disabled={
          disabled ||
          !onOpenArtifact ||
          pending ||
          Boolean(mutationState.pendingKey)
        }
        onClick={() => {
          void open();
        }}
      >
        {opening ? "Opening…" : opened ? `Opened · ${label}` : label}
      </button>
      {error ? <p role="alert">Could not open this item. Try again.</p> : null}
    </>
  );
}
