import { handoffOptions } from "./handoff-options.js";
import { reasoningGroups } from "./reasoning-options.js";
import type {
  ClientView,
  QueryResultView,
  WorkItemCategory,
  WorldState,
} from "@sim/schemas";
import { DatasetRecordSchema, InventoryLookupKeysSchema } from "@sim/schemas";
import { availableActions, availableCaseActions } from "./availability.js";
import { conditionsMet } from "./conditions.js";
import { taskProgressKey } from "./tasks.js";
import { alertRecordSource, canOpenArtifact } from "./workplace.js";

/**
 * Server-side Work Item bucket for client events. Fixed mapping evaluated
 * against canonical state only — never serialized inputs — so clients cannot
 * join events back to pack rules. Unknown templates fall back to "general".
 */
export function workItemCategoryForTemplate(
  templateId: string,
): WorkItemCategory {
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
        options: taskStep.options
          .filter((option) => conditionsMet(state, option.when ?? []))
          .map(({ source, when, ...option }) => {
            // Pack gates are server-only; omit them from the public option.
            void when;
            return {
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
            };
          }),
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
    completed: state.completedActionIds.includes("complete_shift"),
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
    ...(state.careerVersion === "2.0.0"
      ? { caseActions: availableCaseActions(state) }
      : {}),
    operationalMessages,
    consequenceUpdates: state.ledger
      .filter(
        (entry) =>
          entry.applied &&
          (entry.dueAt !== undefined ||
            state.pendingCallbacks.some(
              (callback) =>
                callback.applied &&
                callback.eventId === entry.eventId &&
                callback.actionId === entry.actionId &&
                callback.body === entry.description,
            )),
      )
      .map((entry) => ({
        id: entry.id,
        eventTitle:
          state.events.find(({ id }) => id === entry.eventId)?.title ??
          entry.eventId,
        actionLabel:
          state.rules.actions[entry.actionId]?.label ?? entry.actionId,
        body: entry.description,
      })),
    acknowledgements: state.acknowledgements,
    pacingMode: state.pacingMode,
    alertRecords: (state.rules.datasets.alerts?.records ?? []).flatMap(
      (record) => {
        if (record.datasetId !== "alerts") return [];
        const source = alertRecordSource(state, record.id);
        if (!source) return [];
        if (
          state.workplace.selectedAlertIdsByEvent?.[source.event.id] ===
          record.id
        )
          return [record];
        return [
          {
            id: record.id,
            datasetId: record.datasetId,
            alertId: record.alertId,
            category: record.category,
            severity: record.severity,
            state: record.state,
            linkedWorkItemId: source.event.id,
            sourceRefs: [],
            relatedRecordIds: [],
          },
        ];
      },
    ),
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
    handoffOptions: handoffOptions(state),
    reasoningOptions: Object.fromEntries(
      state.events
        .filter((e) => e.status !== "pending")
        .map((e) => [e.id, reasoningGroups(state, e.id)]),
    ),
    structuredTickets: state.structuredTickets,
    teamMessages: state.teamMessages ?? [],
    notebook: state.notebook,
    kbQuery: state.kbQuery,
    tasks,
    notifications,
    // P2-T04: per-query result views projected from server-side query history.
    // Only per-query views are exposed — never the full `queryHistory` array,
    // its `normalizedFilters`, `seq`, or `actorEventId`. Rows are re-projected
    // through the strict player-visible record schema, so any hidden authoring
    // field on a dataset row is stripped and no field marks a record observed.
    queryResults: projectQueryResults(state),
    workplace: structuredClone(state.workplace),
  };
}

/**
 * Project the append-only server-side `queryHistory` into the client-facing
 * `QueryResultView[]`. Each entry contributes exactly one view carrying its
 * own `queryId` plus the player-visible result metadata; record rows are
 * pulled from `state.rules.datasets` by `resultId` (stable order preserved)
 * and re-validated through `DatasetRecordSchema` (`.strict()`), which drops
 * any non-schema field. Querying never marks a record observed, so this
 * projection reads only and touches no observation state.
 */
function projectQueryResults(state: WorldState): QueryResultView[] {
  return state.queryHistory.map((entry) => {
    const dataset = state.rules.datasets[entry.datasetId];
    const byId = new Map(
      (dataset?.records ?? []).map((record) => [record.id, record]),
    );
    const records = entry.resultIds.flatMap((id) => {
      const row = byId.get(id);
      if (!row) return [];
      // Strict re-parse strips any hidden/authoring field that may have been
      // attached to the row outside the schema (defense in depth) and yields
      // a fresh, player-visible-only copy.
      const parsed = DatasetRecordSchema.safeParse(row);
      return parsed.success ? [parsed.data] : [];
    });
    return {
      ...(entry.actorEventId ? { actorEventId: entry.actorEventId } : {}),
      queryId: entry.queryId,
      datasetId: entry.datasetId,
      records,
      resultIds: [...entry.resultIds],
      totalCount: entry.totalCount,
      truncated: entry.truncated,
      simMinutes: entry.simMinutes,
    };
  });
}
