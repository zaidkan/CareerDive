import type {
  DomainEffect,
  QueryHistoryEntry,
  SimulationAction,
  TurnResult,
  WorldState,
} from "@sim/schemas";
import { TicketUpdatePayloadSchema, WorldStateSchema } from "@sim/schemas";
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

function validateTicketPayload(
  state: WorldState,
  action: SimulationAction,
  eventId: string,
) {
  if (!action.ticketPayload) return undefined;
  if (action.id !== "document_ticket" && action.id !== "update_ticket_notes")
    throw new ActionUnavailableError(action.id);
  const payload = TicketUpdatePayloadSchema.parse(action.ticketPayload);
  const event = state.events.find(({ id }) => id === eventId);
  if (
    !event ||
    payload.ticketId !== `ticket-${eventId}` ||
    !payload.sourceArtifactIds?.length
  )
    throw new ActionUnavailableError(action.id);
  if (
    new Set(payload.sourceArtifactIds).size !== payload.sourceArtifactIds.length
  )
    throw new ActionUnavailableError(action.id);
  for (const sourceId of payload.sourceArtifactIds) {
    const artifact = state.artifacts[sourceId];
    if (
      !artifact ||
      !artifact.eventIds.includes(eventId) ||
      !state.observedArtifactIds.includes(sourceId)
    )
      throw new ActionUnavailableError(action.id);
  }
  if (
    action.id === "document_ticket" &&
    (!payload.verifiedEvidence?.trim() ||
      !payload.uncertainty?.trim() ||
      !payload.followUp?.trim())
  )
    throw new ActionUnavailableError(action.id);
  if (
    payload.status ||
    payload.entityRefs ||
    payload.attachEvidenceFactIds ||
    payload.detachEvidenceFactIds ||
    payload.disposition ||
    payload.noteText
  )
    throw new ActionUnavailableError(action.id);
  return payload;
}

function updateTicket(
  state: WorldState,
  eventId: string,
  actionId: SimulationAction["id"],
  payload: NonNullable<SimulationAction["ticketPayload"]>,
) {
  const ticketId = payload.ticketId;
  const previous = state.structuredTickets[ticketId];
  state.structuredTickets[ticketId] = {
    ticketId,
    linkedWorkItemIds: [eventId],
    status: actionId === "document_ticket" ? "pending_review" : "in_progress",
    entityRefs: previous?.entityRefs ?? [],
    evidenceFactIds: previous?.evidenceFactIds ?? [],
    verifiedEvidence:
      payload.verifiedEvidence ?? previous?.verifiedEvidence ?? "",
    uncertainty: payload.uncertainty ?? previous?.uncertainty ?? "",
    followUp: payload.followUp ?? previous?.followUp ?? "",
    sourceArtifactIds: payload.sourceArtifactIds ?? [],
  };
  const ticket = state.structuredTickets[ticketId];
  state.ticketNotes[eventId] =
    `Verified evidence: ${ticket.verifiedEvidence ?? ""}\nUncertainty: ${ticket.uncertainty ?? ""}\nNext step: ${ticket.followUp ?? ""}\nSources: ${(ticket.sourceArtifactIds ?? []).join(", ")}`;
  const event = state.events.find(({ id }) => id === eventId);
  if (event) event.linkedTicketId = ticketId;
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
  const targetEventId = action.eventId ?? allowedAction.eventId;
  const ticketPayload = validateTicketPayload(
    currentState,
    action,
    targetEventId,
  );
  const selectedId =
    currentState.workplace.selectedAlertIdsByEvent?.[allowedAction.eventId];
  if (
    (selectedId && allowedAction.systemId === "alert_dashboard") ||
    action.sourceRecordId ||
    action.sourceArtifactId
  ) {
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
  if (
    allowedAction.taskId &&
    !(action.id === "document_ticket" && ticketPayload)
  ) {
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
  if (ticketPayload)
    updateTicket(state, targetEventId, action.id, ticketPayload);

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
