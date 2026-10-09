import type {
  DomainEffect,
  QueryHistoryEntry,
  SimulationAction,
  TurnResult,
  WorldState,
} from "@sim/schemas";
import {
  HandoffPayloadSchema,
  TicketUpdatePayloadSchema,
  WorldStateSchema,
} from "@sim/schemas";
import { managerRecap, ticketSourceAcknowledgement } from "./morgan.js";
import { toClientView } from "./serializer.js";
import { availableActions } from "./availability.js";
import { applyResolvedEffect, resolveActionEffect } from "./effects.js";
import { handoffCaseLines, handoffFollowUps } from "./handoff-summary.js";
import { runQuery } from "./query.js";
import { alertRecordSource } from "./workplace.js";
import {
  activatePendingEvents,
  applyDueConsequences,
  applyDueCallbacks,
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
    status:
      actionId === "document_ticket" || previous?.status === "pending_review"
        ? "pending_review"
        : "in_progress",
    ...(previous?.disposition ? { disposition: previous.disposition } : {}),
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
  if (action.handoffPayload && action.id !== "submit_shift_handoff")
    throw new ActionUnavailableError(action.id);
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
  const handoff = action.handoffPayload
    ? HandoffPayloadSchema.parse(action.handoffPayload)
    : undefined;
  if (
    handoff &&
    (targetEventId !== "shift-handoff-1" ||
      new Set(handoff.sourceArtifactIds).size !==
        handoff.sourceArtifactIds.length ||
      !handoff.sourceArtifactIds.every(
        (id) =>
          currentState.workplace.inspectedArtifactIds?.includes(id) &&
          currentState.artifacts[id]?.eventIds.some((eventId) =>
            currentState.events.some(
              (event) => event.id === eventId && event.status !== "pending",
            ),
          ),
      ))
  )
    throw new ActionUnavailableError("Handoff can cite only inspected sources");
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
    !(action.id === "document_ticket" && ticketPayload) &&
    !handoff
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

  if (
    action.id === "ask_manager" &&
    managerRecap(
      toClientView(currentState),
      targetEventId,
      action.freeText ?? "",
    )
  )
    return { state: structuredClone(currentState), effects: [] };

  const state = structuredClone(currentState);
  const effects: DomainEffect[] = [
    { type: "action_applied", actionId: action.id },
  ];
  if (handoff) {
    state.workplace.handoffSourceArtifactIds = [...handoff.sourceArtifactIds];
    if (!state.flags.b3_choice)
      state.flags.b3_choice = handoff.sourceArtifactIds.length
        ? "complete"
        : "thin";
    const findings = handoff.sourceArtifactIds.map(
      (id) => state.artifacts[id]?.title ?? id,
    );
    const dispositions = handoffCaseLines(
      state.events,
      state.structuredTickets,
    ).map(({ title, label, detail }) =>
      detail ? `${title}: ${label}. ${detail}` : `${title}: ${label}.`,
    );
    const open = handoffFollowUps(state.events, state.teamMessages ?? []);
    const caseTicket = state.structuredTickets["ticket-suspicious-login-1"];
    const followUp = {
      "senior-review":
        "Senior reviewer: check unresolved session ownership and whether containment is warranted.",
      "verify-employee":
        "Next analyst: verify the employee's account of the activity through the approved contact route.",
      "review-device":
        "Next analyst: review the flagged device and missing session activity.",
      monitor:
        "Next analyst: continue monitoring and reassess if new evidence arrives.",
    }[handoff.followUp];
    const body = `FOUND — Sources inspected and selected: ${findings.join(", ") || "No source references selected"}.\nDECIDED — ${dispositions.join(" ")}\nSTILL NEEDS FOLLOW-UP — ${[...open, caseTicket?.uncertainty ? `Saved uncertainty (your note): ${caseTicket.uncertainty}` : "Session ownership has not been independently established.", followUp].join(" ")}${handoff.note?.trim() ? `\nAdditional note (your words): ${handoff.note.trim()}` : ""}`;
    state.teamMessages ??= [];
    state.teamMessages.push({
      id: `${state.sessionId}-handoff`,
      eventId: targetEventId,
      author: "player",
      actionId: "submit_shift_handoff",
      body,
      simMinutes: state.simClock,
    });
  }
  if (action.id === "document_ticket" && action.decisionOptionId) {
    const eventTemplateId = state.events.find(
      ({ id }) => id === targetEventId,
    )?.templateId;
    const task = Object.values(state.rules.tasks).find(
      ({ eventTemplateId: templateId, actionId }) =>
        templateId === eventTemplateId && actionId === "document_ticket",
    );
    const outcome = task?.steps
      .at(-1)
      ?.outcomes.find(
        ({ selectedOptionIds }) =>
          selectedOptionIds.length === 1 &&
          selectedOptionIds[0] === action.decisionOptionId,
      );
    if (!outcome) throw new ActionUnavailableError("Unknown ticket decision");
    Object.assign(state.flags, outcome.setFlags);
  }
  if (
    action.id === "document_ticket" &&
    targetEventId === "suspicious-login-1" &&
    state.careerVersion === "2.0.0" &&
    !state.flags.b1_choice
  ) {
    throw new ActionUnavailableError("Choose a final case disposition");
  }
  if (state.careerVersion === "2.0.0") {
    if (
      action.id === "acknowledge_handoff" &&
      targetEventId === "handoff-1" &&
      !state.flags.d1_triage
    ) {
      state.flags.d1_triage = state.events
        .find(({ id }) => id === "routine-alert-1")
        ?.completedActionIds.includes("review_alert")
        ? "routine-first"
        : "login-first";
    }
    if (
      action.id === "review_alert" &&
      targetEventId === "suspicious-login-1" &&
      !state.flags.d2_first_read
    ) {
      state.flags.d2_first_read = state.observedArtifactIds.includes(
        "login-session-timeline",
      )
        ? "location-limit"
        : "priority-first";
    }
    if (
      action.id === "inspect_account_history" &&
      targetEventId === "suspicious-login-1" &&
      !state.flags.d3_vpn
    ) {
      state.flags.d3_vpn = state.workplace.comparisons?.some(
        ({ eventId, artifactIds }) =>
          eventId === targetEventId &&
          ["vpn-context-1", "login-session-timeline"].every((id) =>
            artifactIds.includes(id),
          ),
      )
        ? "route-compared"
        : "not-recorded";
    }
  }
  if (action.id === "complete_shift") {
    applyDueConsequences(state, effects, true);
    applyDueCallbacks(state, effects, true);
  }
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
  if (ticketPayload) {
    updateTicket(state, targetEventId, action.id, ticketPayload);
    const savedTicket = state.structuredTickets[ticketPayload.ticketId];
    if (action.decisionOptionId && savedTicket)
      savedTicket.disposition = action.decisionOptionId;
  }
  const dialogueTicket = state.structuredTickets[`ticket-${targetEventId}`];
  if (action.id === "document_ticket" && dialogueTicket) {
    const ticket = dialogueTicket;
    const previouslyAsked = state.teamMessages?.some(
      (m) =>
        m.eventId === targetEventId &&
        m.author === "player" &&
        m.body === "What should the next analyst know?",
    );
    state.teamMessages ??= [];
    state.teamMessages.push({
      id: `${state.sessionId}-chat-${String(state.teamMessages.length + 1)}`,
      eventId: targetEventId,
      author: "morgan",
      actionId: action.id,
      simMinutes: state.simClock,
      body: `${previouslyAsked ? "Following up on your handoff question: " : "I have your saved case note. "}${ticketSourceAcknowledgement(toClientView(state), targetEventId)} ${ticket.uncertainty ? `The open question remains: ${ticket.uncertainty}` : "No uncertainty is written in this note; silence is not confirmation."} I will use the recorded decision when routing the follow-up.`,
    });
  }

  const finalTicket = state.structuredTickets[`ticket-${targetEventId}`];
  if (finalTicket && ["dismiss_alert", "escalate_alert"].includes(action.id)) {
    finalTicket.status =
      action.id === "dismiss_alert" ? "closed" : "pending_review";
    finalTicket.disposition ??= action.id;
  }

  activatePendingEvents(state, action.id, effects);
  wakeSnoozedNotifications(state);
  expireOverdueEvents(state);
  applyDueConsequences(state, effects);
  applyDueCallbacks(state, effects);

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
