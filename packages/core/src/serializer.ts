import type { ClientView, WorldState } from "@sim/schemas";
import { availableActions } from "./availability.js";
import { taskProgressKey } from "./tasks.js";
import { canOpenArtifact } from "./workplace.js";

export function toClientView(state: WorldState): ClientView {
  const location = state.locations[state.currentLocationId];
  if (!location) {
    throw new Error("Current location is missing");
  }
  const operationalMessages = state.ledger
    .filter(({ applied }) => applied)
    .map(({ description }) => description);
  const observed = new Set(state.observedArtifactIds);
  const actions = availableActions(state);
  const tasks = actions.flatMap((action) => {
    if (!action.taskId) return [];
    const task = state.rules.tasks[action.taskId];
    if (!task) return [];
    const progress = state.taskProgress[
      taskProgressKey(action.eventId, task.id)
    ] ?? {
      currentStep: 0,
      attempts: 0,
      completed: false,
    };
    const taskStep = task.steps[progress.currentStep];
    if (!taskStep || progress.completed) return [];
    return [
      {
        id: task.id,
        eventId: action.eventId,
        actionId: task.actionId,
        systemId: task.systemId,
        kind: task.kind,
        title: task.title,
        prompt: taskStep.prompt,
        instruction: taskStep.instruction,
        whyItMatters: task.whyItMatters,
        relatedArtifactIds: taskStep.relatedArtifactIds,
        stepIndex: progress.currentStep,
        stepCount: task.steps.length,
        options: taskStep.options,
        minSelections: taskStep.minSelections,
        maxSelections: taskStep.maxSelections,
      },
    ];
  });
  const notifications = state.notifications.flatMap((notification) => {
    const definition = state.rules.notifications[notification.id];
    const event = state.events.find(({ id }) => id === notification.eventId);
    if (!definition || !event || event.status !== "active") return [];
    return [
      {
        id: notification.id,
        eventId: notification.eventId,
        systemId: definition.systemId,
        title: definition.title,
        body: definition.body,
        priority: definition.priority,
        status: notification.status,
        canSnooze: !notification.snoozeUsed,
      },
    ];
  });
  return {
    sessionId: state.sessionId,
    sessionKind: state.sessionKind,
    simClock: state.simClock,
    currentLocation: location,
    events: state.events
      .filter(({ status }) => status !== "pending")
      .map(
        ({
          id,
          templateId,
          title,
          summary,
          priority,
          systemId,
          status,
          deadlineAt,
          completedActionIds,
          observedArtifactIds,
          resolution,
        }) => {
          const event = {
            id,
            templateId,
            title,
            summary,
            priority,
            systemId,
            status,
            deadlineAt,
            completedActionIds,
            observedArtifactIds,
          };
          return resolution === undefined ? event : { ...event, resolution };
        },
      ),
    availableActions: actions,
    operationalMessages,
    pacingMode: state.pacingMode,
    artifacts: Object.values(state.artifacts)
      .filter((artifact) => canOpenArtifact(state, artifact.id))
      .map((artifact) => {
        const isObserved = observed.has(artifact.id);
        const eventIds = artifact.eventIds.filter((eventId) =>
          state.events.some(
            (event) => event.id === eventId && event.status !== "pending",
          ),
        );
        const preview = {
          id: artifact.id,
          systemId: artifact.systemId,
          kind: artifact.kind,
          title: artifact.title,
          summary: artifact.summary,
          eventIds,
          observed: isObserved,
        };
        if (isObserved) {
          return {
            ...preview,
            body: artifact.body,
            metadata: artifact.metadata,
            relatedArtifactIds: artifact.relatedArtifactIds.filter(
              (artifactId) => canOpenArtifact(state, artifactId),
            ),
            searchableText: artifact.searchableText,
          };
        }
        if (artifact.kind === "kb_document") {
          return { ...preview, searchableText: artifact.searchableText };
        }
        return preview;
      }),
    ticketNotes: state.ticketNotes,
    notebook: state.notebook,
    kbQuery: state.kbQuery,
    tasks,
    notifications,
    workplace: structuredClone(state.workplace),
  };
}
