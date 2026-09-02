import type { ReactNode } from "react";
import type {
  ClientArtifact,
  ClientTaskView,
  WorkTaskKind,
} from "@sim/schemas";
import type { TaskAttemptHandler } from "../shared.js";
import { WorkTaskPanel } from "../WorkTaskPanel.js";
import {
  EMPTY_MUTATION_STATE,
  type MutationState,
} from "../../useMutationCoordinator.js";

type TaskRenderer = (props: {
  task: ClientTaskView;
  onTaskAttempt?: TaskAttemptHandler;
  mutationState: MutationState;
}) => ReactNode;

function StructuredTask(props: Parameters<typeof WorkTaskPanel>[0]) {
  return <WorkTaskPanel {...props} relatedArtifacts={[]} />;
}

const taskRenderers: Record<WorkTaskKind, TaskRenderer> = {
  compare_records: StructuredTask,
  select_clues: StructuredTask,
  match_reference: StructuredTask,
  build_summary: StructuredTask,
  choose_response: StructuredTask,
};

export function TaskInteraction({
  task,
  openedArtifacts,
  onTaskAttempt,
  mutationState = EMPTY_MUTATION_STATE,
}: {
  task: ClientTaskView;
  openedArtifacts: ClientArtifact[];
  onTaskAttempt?: TaskAttemptHandler;
  mutationState?: MutationState;
}) {
  const Renderer = taskRenderers[task.kind];
  const openedRelated = openedArtifacts.filter(({ id }) =>
    task.relatedArtifactIds.includes(id),
  );
  return (
    <section className="task-interaction">
      {openedRelated.length > 0 ? (
        <p className="task-evidence-status">
          Opened evidence: {openedRelated.map(({ title }) => title).join(", ")}.
        </p>
      ) : null}
      <Renderer
        mutationState={mutationState}
        {...(onTaskAttempt ? { onTaskAttempt } : {})}
        task={task}
      />
    </section>
  );
}
