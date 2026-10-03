import type { ClientArtifact, ClientTaskView } from "@sim/schemas";
import type { TaskAttemptHandler } from "../shared.js";
import { WorkTaskPanel } from "../WorkTaskPanel.js";
import { ArtifactOpenButton } from "./ArtifactOpenButton.js";
import {
  EMPTY_MUTATION_STATE,
  type MutationState,
} from "../../useMutationCoordinator.js";

export function TaskInteraction({
  task,
  openedArtifacts,
  artifacts = openedArtifacts,
  onOpenArtifact,
  onTaskAttempt,
  mutationState = EMPTY_MUTATION_STATE,
}: {
  task: ClientTaskView;
  openedArtifacts: ClientArtifact[];
  artifacts?: ClientArtifact[];
  onOpenArtifact?: ((id: string) => Promise<unknown>) | undefined;
  onTaskAttempt?: TaskAttemptHandler;
  mutationState?: MutationState;
}) {
  const openedRelated = openedArtifacts.filter(({ id }) =>
    task.relatedArtifactIds.includes(id),
  );
  return (
    <section className="task-interaction">
      {artifacts
        .filter(
          ({ id, observed }) =>
            !observed && task.relatedArtifactIds.includes(id),
        )
        .map((artifact) => (
          <ArtifactOpenButton
            key={artifact.id}
            artifactId={artifact.id}
            label={`Open source: ${artifact.title}`}
            onOpenArtifact={onOpenArtifact}
            mutationState={mutationState}
          />
        ))}
      {openedRelated.length > 0 ? (
        <p className="task-evidence-status">
          Sources available for this step: {openedRelated.map(({ title }) => title).join(", ")}.
        </p>
      ) : null}
      <WorkTaskPanel
        relatedArtifacts={openedRelated}
        mutationState={mutationState}
        {...(onTaskAttempt ? { onTaskAttempt } : {})}
        task={task}
      />
    </section>
  );
}
