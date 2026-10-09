import { selectedStatus, caseMemoLines } from "./case-communication.js";
import {
  validateHandoffSelections,
  reviewHandoffSelections,
} from "./handoff-options.js";
import { validateReasoning, sourceBundle } from "./reasoning-options.js";
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
import { availableActions, availableCaseActions } from "./availability.js";
import { reasoningFromFindings } from "./case-findings.js";
import { applyResolvedEffect, resolveActionEffect } from "./effects.js";
import { handoffCaseLines, handoffFollowUps } from "./handoff-summary.js";
import { runQuery } from "./query.js";
import { matchingGuides } from "./knowledge.js";
import { alertRecordSource, canOpenArtifact } from "./workplace.js";
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
  if (
    ![
      "document_ticket",
      "update_ticket_notes",
      "route_access_request",
      "resolve_login_help",
      "send_status_update",
      "acknowledge_handoff",
    ].includes(action.id)
  )
    throw new ActionUnavailableError(action.id);
  const payload = TicketUpdatePayloadSchema.parse(action.ticketPayload);
  if (payload.ownershipCaseId !== undefined) {
    if (
      action.id !== "acknowledge_handoff" ||
      eventId !== "handoff-1" ||
      payload.ticketId !== "ticket-handoff-1" ||
      !["suspicious-login-1", "routine-alert-1"].includes(
        payload.ownershipCaseId,
      ) ||
      !state.observedArtifactIds.includes("handoff-email") ||
      Object.keys(payload).some(
        (k) => !["ticketId", "ownershipCaseId"].includes(k),
      )
    )
      throw new ActionUnavailableError(
        "Ownership needs the inspected incoming handoff and an actual assigned case.",
      );
    return payload;
  }
  if (payload.statusOptionIds !== undefined) {
    if (
      action.id !== "send_status_update" ||
      eventId !== "status-check-1" ||
      payload.ticketId !== "ticket-status-check-1" ||
      Object.keys(payload).some(
        (k) => !["ticketId", "statusOptionIds"].includes(k),
      )
    )
      throw new ActionUnavailableError(
        "Status selections belong to the team status message.",
      );
    const options = selectedStatus(state, payload.statusOptionIds);
    const inspected = [
      ...state.observedArtifactIds,
      ...(state.workplace.inspectedRecordIds ?? []),
    ];
    const refs = [
      ...new Set(
        options.flatMap((o) =>
          o.sourceId ? sourceBundle(o.sourceId, inspected) : [],
        ),
      ),
    ];
    return {
      ...payload,
      verifiedEvidence:
        options.map((o) => o.label).join("\n") || "No claims selected.",
      uncertainty:
        "These are the player's recorded claims, not a validated case conclusion.",
      sourceArtifactIds: refs.filter((id) => state.artifacts[id]),
      sourceRecordIds: refs.filter((id) => !state.artifacts[id]),
    };
  }
  if (["send_status_update", "acknowledge_handoff"].includes(action.id))
    throw new ActionUnavailableError(action.id);
  if (
    payload.dispatch &&
    (action.id !== "document_ticket" || !payload.reasoning?.caseFindings)
  )
    throw new ActionUnavailableError(
      "Only a case memo can dispatch an alert response",
    );
  if (payload.reasoning) {
    if (payload.ticketId !== `ticket-${eventId}`)
      throw new ActionUnavailableError(action.id);
    const reasoning = reasoningFromFindings(eventId, payload.reasoning);
    return {
      ...payload,
      reasoning,
      ...validateReasoning(state, eventId, reasoning),
    };
  }
  if (["route_access_request", "resolve_login_help"].includes(action.id))
    throw new ActionUnavailableError(action.id);
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
      actionId === "update_ticket_notes" && previous?.decisionReasoning
        ? previous.status
        : actionId === "document_ticket" ||
            previous?.status === "pending_review"
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
    sourceRecordIds: payload.sourceRecordIds ?? [],
    ...(payload.reasoning ? { reasoning: payload.reasoning } : {}),
    revision: (previous?.revision ?? 0) + 1,
    ...(previous?.decisionReasoning
      ? {
          decisionReasoning: previous.decisionReasoning,
          decisionRevision: previous.decisionRevision,
          decisionSourceIds: previous.decisionSourceIds,
        }
      : {}),
  };
  const ticket = state.structuredTickets[ticketId];
  if (
    eventId === "suspicious-login-1" &&
    ticket.reasoning?.evidence.includes("login-evidence-1") &&
    ticket.reasoning.evidence.includes("login-evidence-2")
  ) {
    state.workplace.comparisons ??= [];
    const artifactIds = [
      ticket.sourceArtifactIds?.includes("login-session-timeline")
        ? "login-session-timeline"
        : "AUTH-0741-PATEL",
      ticket.sourceArtifactIds?.includes("vpn-context-1")
        ? "vpn-context-1"
        : "V-218",
    ];
    if (
      !state.workplace.comparisons.some(
        (item) =>
          item.eventId === eventId &&
          artifactIds.every((id) => item.artifactIds.includes(id)),
      )
    )
      state.workplace.comparisons.push({ eventId, artifactIds });
  }
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

  if (
    action.ticketPayload?.ownershipCaseId &&
    action.eventId === "handoff-1" &&
    !currentState.events
      .find((e) => e.id === "handoff-1")
      ?.completedActionIds.includes("read_handoff")
  ) {
    validateTicketPayload(currentState, action, "handoff-1");
    const read = applyAction(currentState, {
      id: "read_handoff",
      eventId: "handoff-1",
      actorId: action.actorId,
    });
    const owned = applyAction(read.state, action);
    return { state: owned.state, effects: [...read.effects, ...owned.effects] };
  }
  const caseWorkspace =
    action.ticketPayload?.statusOptionIds !== undefined ||
    action.ticketPayload?.ownershipCaseId !== undefined ||
    action.ticketPayload?.reasoning?.caseFindings !== undefined ||
    currentState.structuredTickets[`ticket-${action.eventId ?? ""}`]?.reasoning
      ?.caseFindings !== undefined;
  const allowedAction = [
    ...availableActions(currentState),
    ...(caseWorkspace ? availableCaseActions(currentState) : []),
  ].find(
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
  if (handoff?.selections) {
    const selected = validateHandoffSelections(
      currentState,
      handoff.selections,
    );
    const inspected = [
      ...currentState.observedArtifactIds,
      ...(currentState.workplace.inspectedRecordIds ?? []),
    ];
    const refs = [
      ...new Set(
        selected.flatMap((o) =>
          o.sourceArtifactIds.flatMap((id) => sourceBundle(id, inspected)),
        ),
      ),
    ];
    handoff.sourceArtifactIds = refs.filter((id) => currentState.artifacts[id]);
    handoff.sourceRecordIds = refs.filter((id) => !currentState.artifacts[id]);
  }
  if (
    handoff &&
    (targetEventId !== "shift-handoff-1" ||
      new Set(handoff.sourceArtifactIds).size !==
        handoff.sourceArtifactIds.length ||
      !handoff.sourceArtifactIds.every(
        (id) =>
          (handoff.selections
            ? currentState.observedArtifactIds.includes(id)
            : currentState.workplace.inspectedArtifactIds?.includes(id)) &&
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
    !handoff &&
    !ticketPayload?.reasoning &&
    ticketPayload?.statusOptionIds === undefined &&
    !ticketPayload?.ownershipCaseId
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

  if (
    action.id === "search_knowledge_base" &&
    currentState.careerVersion === "2.0.0" &&
    !matchingGuides(
      Object.values(currentState.artifacts).filter((a) =>
        canOpenArtifact(currentState, a.id),
      ),
      action.freeText ?? "",
      targetEventId,
    ).length
  ) {
    const error = new ActionUnavailableError(action.id);
    error.message =
      "No relevant guide matched this query. Try a short keyword from this case, such as scanner or device. No task, time, or energy changed.";
    throw error;
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
  if (ticketPayload?.ownershipCaseId)
    state.flags.d1_triage =
      ticketPayload.ownershipCaseId === "routine-alert-1"
        ? "routine-first"
        : "login-first";
  if (ticketPayload?.statusOptionIds) {
    if (!state.flags.d9_status)
      state.flags.d9_status = ticketPayload.statusOptionIds.includes(
        "confirmed-sequence",
      )
        ? "sequence"
        : ticketPayload.statusOptionIds.includes("confirmed-source")
          ? "source-only"
          : "unsupported-claim";
  }
  if (handoff) {
    state.workplace.handoffSourceArtifactIds = [...handoff.sourceArtifactIds];
    state.workplace.handoffSourceRecordIds = [
      ...(handoff.sourceRecordIds ?? []),
    ];
    if (!state.flags.b3_choice)
      state.flags.b3_choice = handoff.selections
        ? reviewHandoffSelections(
            handoff.selections,
            [
              ...state.observedArtifactIds,
              ...(state.workplace.inspectedRecordIds ?? []),
            ],
            handoff.followUp,
          ).verdict === "supported"
          ? "complete"
          : "thin"
        : handoff.sourceArtifactIds.length
          ? "complete"
          : "thin";
    const findings = [
      ...handoff.sourceArtifactIds,
      ...(handoff.sourceRecordIds ?? []),
    ].map((id) => state.artifacts[id]?.title ?? id);
    const dispositions = handoffCaseLines(
      state.events,
      state.structuredTickets,
    ).map(
      ({ title, label, detail, memo }) =>
        `${title}: ${label}.${detail ? ` ${detail}` : ""}${memo ? ` Recorded memo revision ${String(memo.revision)}: ${memo.claims.join(" ") || "No findings."} Unknowns: ${memo.unknowns} Requested next check: ${memo.nextCheck}` : ""}`,
    );
    const open = handoffFollowUps(state.events);
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
    const carried = handoff.selections
      ? validateHandoffSelections(state, handoff.selections)
          .map((o) => o.label)
          .join(" ")
      : handoff.note?.trim();
    const body = `FOUND — Sources inspected and selected: ${findings.join(", ") || "No source references selected"}.\nDECIDED — ${dispositions.join(" ")}\nSTILL NEEDS FOLLOW-UP — ${[...open, caseTicket?.uncertainty ? `Saved uncertainty (your note): ${caseTicket.uncertainty}` : "Session ownership has not been independently established.", followUp].join(" ")}${carried ? `\n${handoff.selections ? "Carries forward" : "Additional note (your words)"}: ${carried}` : ""}`;
    state.teamMessages ??= [];
    state.teamMessages.push({
      id: `${state.sessionId}-handoff-${String((state.teamMessages ?? []).filter((m) => m.actionId === "submit_shift_handoff").length + 1)}`,
      eventId: targetEventId,
      author: "player",
      actionId: "submit_shift_handoff",
      body,
      simMinutes: state.simClock,
    });
  }
  if (
    ["document_ticket", "route_access_request", "resolve_login_help"].includes(
      action.id,
    ) &&
    action.decisionOptionId
  ) {
    const eventTemplateId = state.events.find(
      ({ id }) => id === targetEventId,
    )?.templateId;
    const task = Object.values(state.rules.tasks).find(
      ({ eventTemplateId: templateId, actionId }) =>
        templateId === eventTemplateId && actionId === action.id,
    );
    const outcome = task?.steps
      .at(-1)
      ?.outcomes.find(
        ({ selectedOptionIds }) =>
          selectedOptionIds.length === 1 &&
          selectedOptionIds[0] === action.decisionOptionId,
      );
    if (!outcome) throw new ActionUnavailableError("Unknown case decision");
    Object.assign(state.flags, outcome.setFlags);
    if (outcome.resolution && ticketPayload?.reasoning) {
      const event = state.events.find((e) => e.id === targetEventId);
      if (event) event.resolution = outcome.resolution;
    }
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
  const previousFindings =
    currentState.structuredTickets[`ticket-${targetEventId}`]?.reasoning
      ?.caseFindings ?? [];
  // Time belongs to the first constructed finding, not a separate check button.
  // Revisiting records and correcting a saved finding never earn extra progress.
  const findingMinutes =
    action.id === "update_ticket_notes"
      ? (ticketPayload?.reasoning?.caseFindings ?? [])
          .filter(
            (f) => !previousFindings.some((p) => p.questionId === f.questionId),
          )
          .reduce(
            (minutes, f) =>
              minutes +
              ({
                signal: 10,
                route: 10,
                device: 10,
                coverage: 10,
                "scan-match": 10,
                "scan-boundary": 10,
                "request-scope": 4,
                "approval-boundary": 4,
                "device-pattern": 6,
              }[f.questionId] ?? 0),
            0,
          )
      : 0;
  state.workplace.energy.current -= definition.energyCost;
  state.simClock += definition.simulatedMinutes + findingMinutes;
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
    if (
      caseWorkspace &&
      ["dismiss_alert", "escalate_alert"].includes(action.id)
    ) {
      const memo = state.structuredTickets[`ticket-${event.id}`];
      effect.resolution =
        action.id === "escalate_alert"
          ? `Escalated — senior review pending. The reviewer received your recorded memo with ${String(memo?.decisionSourceIds?.length ?? memo?.sourceArtifactIds?.length ?? 0)} attached sources; session ownership remains unverified.`
          : event.id === "routine-alert-1"
            ? "A-1180 closed with your recorded run/window claim; its support is evaluated in review. A-1214 and later activity remain separate checks."
            : "S-0741 closed on your recorded judgment. Closure does not verify the session user, route, device or activity; its support is evaluated in review.";
      if (effect.consequence)
        effect.consequence.description = effect.resolution;
    }
    if (ticketPayload?.statusOptionIds) {
      effect.resolution =
        "Morgan received your status message. Receipt confirms delivery; its claims have not been verified.";
      if (effect.consequence)
        effect.consequence.description =
          "Morgan received the recorded claims and current case memo. Remaining questions stay with their recorded owners.";
      effect.callbacks = [];
    }
    applyResolvedEffect({ state, event, action, effect, effects });
  }
  if (
    ticketPayload?.reasoning &&
    ["route_access_request", "resolve_login_help"].includes(action.id)
  ) {
    const task = Object.values(state.rules.tasks).find(
      (t) => t.actionId === action.id,
    );
    const outcome = task?.steps
      .at(-1)
      ?.outcomes.find((o) =>
        o.selectedOptionIds.includes(action.decisionOptionId ?? ""),
      );
    const event = state.events.find((e) => e.id === targetEventId);
    if (event && outcome?.resolution) event.resolution = outcome.resolution;
  }
  if (ticketPayload) {
    updateTicket(state, targetEventId, action.id, ticketPayload);
    const savedTicket = state.structuredTickets[ticketPayload.ticketId];
    if (
      action.id !== "update_ticket_notes" &&
      action.decisionOptionId &&
      savedTicket
    )
      savedTicket.disposition = action.decisionOptionId;
  }
  if (ticketPayload?.statusOptionIds) {
    state.teamMessages ??= [];
    const packet = caseMemoLines(state)
      .map(
        (c) =>
          `${c.title}: ${c.label}. Your recorded findings: ${c.claims.join(" ") || "None."} Remaining: ${c.unknowns} Next check: ${c.nextCheck}`,
      )
      .join("\n");
    state.teamMessages.push({
      id: `${state.sessionId}-status-${String(state.teamMessages.length + 1)}`,
      eventId: targetEventId,
      author: "player",
      actionId: action.id,
      simMinutes: state.simClock,
      body: `${ticketPayload.verifiedEvidence ?? "No claims selected."}\nCurrent case memos (recorded claims, not verification):\n${packet}`,
    });
    state.teamMessages.push({
      id: `${state.sessionId}-status-${String(state.teamMessages.length + 1)}`,
      eventId: targetEventId,
      author: "morgan",
      actionId: action.id,
      simMinutes: state.simClock,
      body: "Thanks, I have your case notes and open questions. I’ll use those to follow up; receiving them doesn’t verify the findings. Reviews and approvals stay with the people already handling them.",
    });
  }
  if (ticketPayload?.ownershipCaseId) {
    state.teamMessages ??= [];
    const owned = state.events.find(
      (e) => e.id === ticketPayload.ownershipCaseId,
    );
    state.teamMessages.push({
      id: `${state.sessionId}-ownership-${String(state.teamMessages.length + 1)}`,
      eventId: ticketPayload.ownershipCaseId,
      author: "morgan",
      actionId: action.id,
      simMinutes: state.simClock,
      body: `I’ve noted that you’ll start with ${owned?.title ?? "this case"}. The last analyst left A-1042’s user and device unchecked and left out the scanner’s approval reference. Those are starting questions, not findings you’ve made.`,
    });
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
      body: `${previouslyAsked ? "Following up on your handoff question: " : "I have your saved case note. "}${ticketSourceAcknowledgement(toClientView(state), targetEventId)} ${ticket.uncertainty ? `Your recorded claims (not yet verified): ${ticket.uncertainty}` : "No uncertainty is written in this note; silence is not confirmation."} I will use the recorded decision when routing the follow-up.`,
    });
  }

  const finalTicket = state.structuredTickets[`ticket-${targetEventId}`];
  if (finalTicket && action.id === "route_access_request")
    finalTicket.status = "in_progress";
  if (finalTicket && action.id === "resolve_login_help")
    finalTicket.status = "closed";
  if (finalTicket && ["dismiss_alert", "escalate_alert"].includes(action.id)) {
    finalTicket.status =
      action.id === "dismiss_alert" ? "closed" : "pending_review";
    finalTicket.disposition ??= action.id;
  }

  if (
    finalTicket?.reasoning &&
    !finalTicket.decisionReasoning &&
    [
      "dismiss_alert",
      "escalate_alert",
      "route_access_request",
      "resolve_login_help",
    ].includes(action.id)
  ) {
    finalTicket.decisionRevision = finalTicket.revision;
    finalTicket.decisionReasoning = structuredClone(finalTicket.reasoning);
    finalTicket.decisionSourceIds = [
      ...(finalTicket.sourceArtifactIds ?? []),
      ...(finalTicket.sourceRecordIds ?? []),
    ];
  }
  if (action.id === "resolve_login_help") {
    const event = state.events.find((e) => e.id === targetEventId);
    state.artifacts["rivera-result-receipt"] = {
      id: "rivera-result-receipt",
      systemId: "email",
      kind: "email",
      title: "Rivera result receipt · recorded case response",
      summary:
        "Authored simulation result, not an independent pre-action observation",
      body: `${event?.resolution ?? "No completed phone check recorded."} Reopen if retries continue, an unfamiliar device appears or unrecognized activity is reported.`,
      eventIds: ["login-help-1", "shift-handoff-1"],
      relatedArtifactIds: ["rivera-auth-summary"],
      searchableText: "Rivera result receipt case response",
      metadata: {},
    };
  }
  activatePendingEvents(state, action.id, effects);
  wakeSnoozedNotifications(state);
  expireOverdueEvents(state);
  applyDueConsequences(state, effects);
  applyDueCallbacks(state, effects);

  if (ticketPayload?.dispatch) {
    const expected =
      targetEventId === "routine-alert-1" ||
      state.flags.b1_terminal === "dismiss"
        ? "dismiss_alert"
        : "escalate_alert";
    if (
      !["suspicious-login-1", "routine-alert-1"].includes(targetEventId) ||
      ticketPayload.dispatch !== expected
    )
      throw new ActionUnavailableError(
        "The response must match the memo's disposition",
      );
    const dispatched = applyAction(state, {
      id: ticketPayload.dispatch,
      eventId: targetEventId,
      actorId: action.actorId,
    });
    return {
      state: dispatched.state,
      effects: [...effects, ...dispatched.effects],
    };
  }
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
