import type {
  PackTaskDefinition,
  PackTaskStep,
  TaskAttempt,
  TaskAttemptTurn,
  TaskProgress,
  WorldState,
} from "@sim/schemas";
import { TaskAttemptTurnSchema } from "@sim/schemas";
import { availableActions } from "./availability.js";
import { ActionUnavailableError, applyAction } from "./reducer.js";

export function taskProgressKey(eventId: string, taskId: string): string {
  return `${eventId}:${taskId}`;
}

function currentProgress(
  state: WorldState,
  eventId: string,
  taskId: string,
): TaskProgress {
  return (
    state.taskProgress[taskProgressKey(eventId, taskId)] ?? {
      currentStep: 0,
      attempts: 0,
      completed: false,
      selectedOptionIdsByStep: {},
    }
  );
}

function findAvailableTask(
  state: WorldState,
  attempt: TaskAttempt,
): { task: PackTaskDefinition; step: PackTaskStep } {
  const action = availableActions(state).find(
    ({ eventId, taskId }) =>
      eventId === attempt.eventId && taskId === attempt.taskId,
  );
  if (!action) throw new ActionUnavailableError(attempt.taskId);
  const task = state.rules.tasks[attempt.taskId];
  if (!task) throw new ActionUnavailableError(attempt.taskId);
  const progress = currentProgress(state, attempt.eventId, attempt.taskId);
  if (progress.completed) throw new ActionUnavailableError(attempt.taskId);
  const step = task.steps[progress.currentStep];
  if (!step) throw new ActionUnavailableError(attempt.taskId);
  return { task, step };
}

function exactRequiredSelection(
  step: PackTaskStep,
  selectedOptionIds: string[],
): boolean {
  const selected = new Set(selectedOptionIds);
  if (selected.size !== selectedOptionIds.length) return false;
  if (
    selected.size < step.minSelections ||
    selected.size > step.maxSelections ||
    selected.size !== step.requiredOptionIds.length
  ) {
    return false;
  }
  return step.requiredOptionIds.every((id) => selected.has(id));
}

export function applyTaskAttempt(
  currentState: WorldState,
  attempt: TaskAttempt,
): TaskAttemptTurn {
  const { task, step } = findAvailableTask(currentState, attempt);
  if (
    step.options.some(
      ({ source }) =>
        source && !currentState.observedArtifactIds.includes(source.artifactId),
    )
  ) {
    throw new Error("Open the source records before submitting findings.");
  }
  const state = structuredClone(currentState);
  const key = taskProgressKey(attempt.eventId, attempt.taskId);
  const progress = currentProgress(state, attempt.eventId, attempt.taskId);
  progress.attempts += 1;
  state.taskProgress[key] = progress;

  if (!exactRequiredSelection(step, attempt.selectedOptionIds)) {
    return TaskAttemptTurnSchema.parse({
      state,
      effects: [],
      accepted: false,
      completed: false,
      feedback: step.coachOnFailure,
    });
  }

  progress.selectedOptionIdsByStep[step.id] = [...attempt.selectedOptionIds];

  const finalStep = progress.currentStep === task.steps.length - 1;
  if (!finalStep) {
    progress.currentStep += 1;
    return TaskAttemptTurnSchema.parse({
      state,
      effects: [],
      accepted: true,
      completed: false,
      feedback: step.successText,
    });
  }

  progress.completed = true;
  const summary =
    task.kind === "build_summary"
      ? task.steps
          .flatMap((taskStep) => {
            const selected = new Set(
              progress.selectedOptionIdsByStep[taskStep.id] ?? [],
            );
            return taskStep.options
              .filter(({ id }) => selected.has(id))
              .map(({ label }) => label);
          })
          .map((label) => `- ${label}`)
          .join("\n")
      : undefined;
  const actionTurn = applyAction(state, {
    id: task.actionId,
    eventId: attempt.eventId,
    actorId: "user",
    ...(summary ? { freeText: summary } : {}),
  });
  return TaskAttemptTurnSchema.parse({
    state: actionTurn.state,
    effects: actionTurn.effects,
    accepted: true,
    completed: true,
    feedback: step.successText,
  });
}
