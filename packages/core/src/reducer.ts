import type {
  DomainEffect,
  QueryHistoryEntry,
  SimulationAction,
  TurnResult,
  WorldState,
} from "@sim/schemas";
import { WorldStateSchema } from "@sim/schemas";
import { availableActions } from "./availability.js";
import { applyResolvedEffect, resolveActionEffect } from "./effects.js";
import { runQuery } from "./query.js";
import { alertRecordSource } from "./workplace.js";
import {
  activatePendingEvents,
  applyDueConsequences,
  expireOverdueEvents,
  wakeSnoozedNotifications,
} from "./scheduler.js";

export class ActionUnavailableError extends Error {
  constructor(actionId: string) {
    super(`Action "${actionId}" is not available in the current state`);
    this.name = "ActionUnavailableError";
  }
}

export class TaskRequiredError extends ActionUnavailableError {
  constructor(actionId: string, taskId: string) {
    super(actionId);
    this.message = `Action "${actionId}" requires task "${taskId}" to be completed`;
    this.name = "TaskRequiredError";
  }
}

export function applyAction(
  currentState: WorldState,
  action: SimulationAction,
): TurnResult {
  if (action.id === "query_records") {
    return applyQueryRecords(currentState, action);
  }

  const allowedAction = availableActions(currentState).find(
    ({ id, eventId }) =>
      id === action.id &&
      (action.eventId === undefined || action.eventId === eventId),
  );
  if (!allowedAction) {
    throw new ActionUnavailableError(action.id);
  }
  const selectedId = currentState.workplace.selectedAlertIdsByEvent?.[allowedAction.eventId];
  if ((selectedId && allowedAction.systemId === "alert_dashboard") || action.sourceRecordId || action.sourceArtifactId) {
    const source = selectedId && alertRecordSource(currentState, selectedId);
    if (
      allowedAction.systemId !== "alert_dashboard" ||
      !source ||
      action.sourceRecordId !== source.record.id ||
      action.sourceArtifactId !== source.artifact.id ||
      !currentState.observedArtifactIds.includes(source.artifact.id)
    ) {
      throw new ActionUnavailableError(action.id);
    }
  }
  if (allowedAction.taskId) {
    // P1-T03: released bindings never gate, even if a taskId is present
    // (availability omits it; this covers any divergent caller state).
    const binding = currentState.rules.tasks[allowedAction.taskId];
    if (!binding?.releasesActionGate) {
      const progress =
        currentState.taskProgress[
          `${allowedAction.eventId}:${allowedAction.taskId}`
        ];
      if (!progress?.completed) {
        throw new TaskRequiredError(action.id, allowedAction.taskId);
      }
    }
  }

  const definition = currentState.rules.actions[action.id];
  if (!definition) {
    throw new ActionUnavailableError(action.id);
  }
  if (currentState.workplace.energy.current < definition.energyCost) {
    throw new ActionUnavailableError(action.id);
  }

  const state = structuredClone(currentState);
  const effects: DomainEffect[] = [
    { type: "action_applied", actionId: action.id },
  ];
  state.workplace.energy.current -= definition.energyCost;
  state.simClock += definition.simulatedMinutes;
  state.completedActionIds.push(action.id);
  const targetEventId = action.eventId ?? allowedAction.eventId;
  const event = state.events.find(({ id }) => id === targetEventId);

  if (event) {
    if (
      definition.tracksCompletion &&
      !event.completedActionIds.includes(action.id)
    ) {
      event.completedActionIds.push(action.id);
    }
    const effect = resolveActionEffect(state, event, action.id);
    applyResolvedEffect({ state, event, action, effect, effects });
  }

  activatePendingEvents(state, action.id, effects);
  wakeSnoozedNotifications(state);
  expireOverdueEvents(state);
  applyDueConsequences(state, effects);

  return { state: WorldStateSchema.parse(state), effects };
}

/**
 * P2-T03: `query_records` reducer branch. Runs the pure engine over
 * `rules.datasets`, appends exactly one append-only `QueryHistoryEntry`, and
 * advances `simClock` per the action definition. It never marks records
 * observed/opened and never evaluates evidence discovery (Phase 3).
 *
 * Invalid queries throw (via `runQuery` -> `QueryValidationError`) BEFORE any
 * clone or mutation, so no history entry is appended and `seq` is not consumed.
 * `simMinutes` on the entry is the POST-advance `simClock` (pinned convention).
 */
function applyQueryRecords(
  currentState: WorldState,
  action: SimulationAction,
): TurnResult {
  const definition = currentState.rules.actions.query_records;
  if (!definition) {
    throw new ActionUnavailableError(action.id);
  }
  if (!action.queryPayload) {
    throw new ActionUnavailableError(action.id);
  }
  if (currentState.workplace.energy.current < definition.energyCost) {
    throw new ActionUnavailableError(action.id);
  }

  // Evaluate BEFORE mutation. Throws for invalid requests (unknown dataset,
  // bad filter, start > end), leaving state untouched and `seq` unconsumed.
  const result = runQuery(currentState.rules.datasets, action.queryPayload);

  const state = structuredClone(currentState);
  const effects: DomainEffect[] = [
    { type: "action_applied", actionId: action.id },
  ];
  state.workplace.energy.current -= definition.energyCost;
  state.simClock += definition.simulatedMinutes;

  const seq = state.queryHistory.length + 1;
  const entry: QueryHistoryEntry = {
    queryId: `${state.sessionId}-q${String(seq)}`,
    seq,
    datasetId: result.datasetId,
    normalizedFilters: result.normalizedFilters,
    resultIds: result.resultIds,
    totalCount: result.totalCount,
    truncated: result.truncated,
    simMinutes: state.simClock,
    ...(action.eventId ? { actorEventId: action.eventId } : {}),
  };
  state.queryHistory.push(entry);

  return { state: WorldStateSchema.parse(state), effects };
}
