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
import { conditionsMet } from "./conditions.js";

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
      outcomeIdsByStep: {},
      correctionHistory: [],
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
  state: WorldState,
  step: PackTaskStep,
  selectedOptionIds: string[],
): boolean {
  const selected = new Set(selectedOptionIds);
  const required = [
    ...step.requiredOptionIds,
    ...step.conditionalRequiredOptionIds
      .filter(({ when }) => conditionsMet(state, when))
      .flatMap(({ optionIds }) => optionIds),
  ];
  if (selected.size !== selectedOptionIds.length) return false;
  if (
    selected.size < step.minSelections ||
    selected.size > step.maxSelections ||
    selected.size !== required.length
  ) {
    return false;
  }
  return required.every((id) => selected.has(id));
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

  const chosen = new Set(attempt.selectedOptionIds);
  const outcome = step.outcomes.find(
    ({ selectedOptionIds, when }) =>
      selectedOptionIds.length === chosen.size &&
      selectedOptionIds.every((id) => chosen.has(id)) &&
      conditionsMet(state, when),
  );

  if (
    chosen.size !== attempt.selectedOptionIds.length ||
    (!outcome &&
      !exactRequiredSelection(state, step, attempt.selectedOptionIds))
  ) {
    return TaskAttemptTurnSchema.parse({
      state,
      effects: [],
      accepted: false,
      completed: false,
      feedback: step.coachOnFailure,
    });
  }

  progress.selectedOptionIdsByStep[step.id] = [...attempt.selectedOptionIds];
  if (outcome) {
    progress.outcomeIdsByStep[step.id] = outcome.id;
    Object.assign(state.flags, outcome.setFlags);
    if (outcome.recordOmission) {
      progress.correctionHistory.push({
        stepId: step.id,
        initialOptionIds: [...attempt.selectedOptionIds],
      });
    }
    if (outcome.correctsOmission) {
      const omitted = progress.correctionHistory.find(
        (entry) => !entry.correctedOptionIds,
      );
      if (omitted) omitted.correctedOptionIds = [...attempt.selectedOptionIds];
    }
  }

  const finalStep =
    outcome?.completeTask || progress.currentStep === task.steps.length - 1;
  if (!finalStep) {
    progress.currentStep += 1;
    return TaskAttemptTurnSchema.parse({
      state,
      effects: [],
      accepted: true,
      completed: false,
      feedback: outcome?.feedback ?? step.successText,
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
    ...(task.id === "end-shift-continuity" && state.careerVersion === "2.0.0"
      ? {
          handoffPayload: {
            sourceArtifactIds: state.workplace.inspectedArtifactIds ?? [],
            followUp: "senior-review" as const,
          },
        }
      : {}),
  });
  if (outcome?.resolution) {
    const event = actionTurn.state.events.find(
      ({ id }) => id === attempt.eventId,
    );
    if (event) event.resolution = outcome.resolution;
  }
  return TaskAttemptTurnSchema.parse({
    state: actionTurn.state,
    effects: actionTurn.effects,
    accepted: true,
    completed: true,
    feedback: outcome?.feedback ?? step.successText,
  });
}
