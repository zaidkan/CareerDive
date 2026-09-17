import type { ClientView, WorkItemCategory, WorldState } from "@sim/schemas";
import { InventoryLookupKeysSchema } from "@sim/schemas";
import { availableActions } from "./availability.js";
import { taskProgressKey } from "./tasks.js";
import { canOpenArtifact } from "./workplace.js";

/**
 * Server-side Work Item bucket for client events. Fixed mapping evaluated
 * against canonical state only — never serialized inputs — so clients cannot
 * join events back to pack rules. Unknown templates fall back to "general".
 */
export function workItemCategoryForTemplate(templateId: string): WorkItemCategory {
  switch (templateId) {
    case "suspicious_login":
      return "main_case";
    case "routine_alert_review":
      return "routine";
    case "incomplete_handoff":
      return "handoff";
    default:
      return "general";
  }
}

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
        options: taskStep.options.map(({ source, ...option }) => ({
          ...option,
          ...(source
            ? {
                source: {
                  artifactId: source.artifactId,
                  ...(observed.has(source.artifactId) &&
                  canOpenArtifact(state, source.artifactId)
                    ? { quote: source.quote }
                    : {}),
                },
              }
            : {}),
        })),
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
          acknowledgedAt,
          linkedTicketId,
          followUpRefs,
        }) => {
          const event = {
            id,
            category: workItemCategoryForTemplate(templateId),
            title,
            summary,
            priority,
            systemId,
            status,
            deadlineAt,
            completedActionIds,
            observedArtifactIds,
            acknowledgedAt,
            linkedTicketId,
            followUpRefs,
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
        // Pack authors explicitly approve this comma-separated identifier index
        // for public lookup. Do not infer identifiers from body/searchableText,
        // or copy the surrounding private metadata into an unopened preview.
        const lookupKeys = InventoryLookupKeysSchema.safeParse(
          artifact.kind === "device_record" &&
            artifact.systemId === "knowledge_base"
            ? artifact.metadata.lookupKeys?.split(",").map((key) => key.trim())
            : undefined,
        );
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
          ...(lookupKeys.success ? { lookupKeys: lookupKeys.data } : {}),
        };
        if (isObserved) {
          // Related-record lists stay server-side: references surface only
          // inside record bodies and query results, never as precomputed
          // relevance metadata (Phase 0 C4).
          return {
            ...preview,
            body: artifact.body,
            metadata: artifact.metadata,
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
