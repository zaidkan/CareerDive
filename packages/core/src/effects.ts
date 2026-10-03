import type {
  ActionEffect,
  ConsequenceEntry,
  DomainEffect,
  EventInstance,
  SimulationAction,
  SimulationActionId,
  WorldState,
} from "@sim/schemas";
import { conditionsMet } from "./conditions.js";

export function resolveActionEffect(
  state: WorldState,
  event: EventInstance,
  actionId: SimulationActionId,
): ActionEffect {
  const template = state.rules.eventTemplates[event.templateId];
  const override = template?.actionEffects[actionId];
  const defaults = state.rules.actions[actionId]?.defaultEffect;
  return {
    hidden: {
      ...defaults?.hidden,
      ...override?.hidden,
    },
    observeArtifactIds: [
      ...(defaults?.observeArtifactIds ?? []),
      ...(override?.observeArtifactIds ?? []),
    ],
    resolve: override?.resolve ?? defaults?.resolve ?? false,
    resolution: override?.resolution ?? defaults?.resolution,
    consequence: override?.consequence ?? defaults?.consequence,
    callbacks: override?.callbacks ?? defaults?.callbacks ?? [],
    emitEventResolved:
      override?.emitEventResolved ?? defaults?.emitEventResolved ?? false,
    setTicketNotesFromFreeText:
      override?.setTicketNotesFromFreeText ??
      defaults?.setTicketNotesFromFreeText ??
      false,
    setKbQueryFromFreeText:
      override?.setKbQueryFromFreeText ??
      defaults?.setKbQueryFromFreeText ??
      false,
    setNotebookFromFreeText:
      override?.setNotebookFromFreeText ??
      defaults?.setNotebookFromFreeText ??
      false,
  };
}

export function applyHiddenDelta(
  state: WorldState,
  effect: ActionEffect,
): void {
  const hidden = effect.hidden;
  if (!hidden) return;
  if (hidden.cognitiveLoad !== undefined) {
    state.hidden.cognitiveLoad += hidden.cognitiveLoad;
  }
  if (hidden.accuracy !== undefined) {
    state.hidden.accuracy += hidden.accuracy;
  }
  if (hidden.riskExposure !== undefined) {
    state.hidden.riskExposure += hidden.riskExposure;
  }
  if (hidden.taskBacklog !== undefined) {
    state.hidden.taskBacklog = Math.max(
      0,
      state.hidden.taskBacklog + hidden.taskBacklog,
    );
  }
}

export function consequence(
  state: WorldState,
  eventId: string,
  actionId: SimulationActionId,
  description: string,
  dueAt?: number,
): ConsequenceEntry {
  const entry: ConsequenceEntry = {
    id: `${state.sessionId}-${String(state.ledger.length + 1)}`,
    eventId,
    actionId,
    description,
    createdAt: state.simClock,
    applied: dueAt === undefined,
  };
  if (dueAt !== undefined) {
    entry.dueAt = dueAt;
  }
  return entry;
}

function fillDescription(template: string, event: EventInstance): string {
  return template
    .replaceAll("{{eventTitle}}", event.title.toLowerCase())
    .replaceAll("{{event.title}}", event.title);
}

function managerGuidanceForA1042(
  state: WorldState,
  event: EventInstance,
  authoredGuidance: string,
): string {
  if (event.templateId !== "suspicious_login") return authoredGuidance;

  const completed = new Set<string>(event.completedActionIds);
  if (event.status !== "active")
    return "This case has a recorded disposition. Keep the saved ticket and any remaining questions available for the next analyst.";
  if (
    completed.has("inspect_login_context") &&
    !completed.has("check_device_inventory")
  )
    return "The records you opened are context, not proof of who used the flagged device. The device record has not been checked yet; it may help separate managed equipment from an unfamiliar label.";
  if (
    completed.has("check_device_inventory") &&
    !state.workplace.comparisons?.some(({ eventId }) => eventId === event.id)
  )
    return "The records you opened are context, not proof of who used the flagged device. The device check is recorded; the session timeline and VPN record can help test whether the two sign-ins followed the same route.";
  if (!completed.has("review_alert")) return authoredGuidance;

  const inspectedRelevantRecord = [
    "inspect_login_context",
    "inspect_account_history",
    "check_device_inventory",
  ].some((actionId) => completed.has(actionId));
  const queriedRelevantRecords = state.queryHistory.some(
    (entry) => entry.actorEventId === event.id,
  );
  if (!inspectedRelevantRecord && !queriedRelevantRecords) {
    return "I have seen the alert, but not enough context to add much yet. Tell me which record you checked and what still does not line up; I will help with the process, not choose the outcome.";
  }

  return "Morgan notes that the records you opened are context, not proof of who used the flagged device. Keep the exact identifier and the remaining uncertainty in your note.";
}

export function applyResolvedEffect(input: {
  state: WorldState;
  event: EventInstance;
  action: SimulationAction;
  effect: ActionEffect;
  effects: DomainEffect[];
}): void {
  const { state, event, action, effect, effects } = input;
  applyHiddenDelta(state, effect);

  const inspectedByAction: Record<string, string[]> = {
    read_handoff: ["handoff-note"],
    review_alert:
      event.id === "suspicious-login-1"
        ? ["suspicious-login-alert"]
        : event.id === "routine-alert-1"
          ? ["scanner-alert"]
          : [],
    inspect_login_context: ["login-context-1"],
    inspect_account_history: ["account-history-1"],
    check_device_inventory: ["device-inventory-1"],
  };
  for (const id of inspectedByAction[action.id] ?? []) {
    if (effect.observeArtifactIds.includes(id)) {
      state.workplace.lastInspectedArtifactId = id;
      state.workplace.inspectedArtifactIds ??= [];
      if (!state.workplace.inspectedArtifactIds.includes(id))
        state.workplace.inspectedArtifactIds.push(id);
    }
  }
  for (const artifactId of effect.observeArtifactIds) {
    if (!event.observedArtifactIds.includes(artifactId)) {
      event.observedArtifactIds.push(artifactId);
    }
    if (!state.observedArtifactIds.includes(artifactId)) {
      state.observedArtifactIds.push(artifactId);
    }
  }

  if (effect.setTicketNotesFromFreeText && action.freeText !== undefined) {
    state.ticketNotes[event.id] = action.freeText;
  }
  if (effect.setKbQueryFromFreeText) {
    state.kbQuery = action.freeText ?? state.kbQuery;
  }
  if (effect.setNotebookFromFreeText && action.freeText !== undefined) {
    state.notebook = action.freeText;
  }

  if (
    ["ask_manager", "acknowledge_handoff"].includes(action.id) &&
    action.freeText?.trim()
  ) {
    state.teamMessages ??= [];
    state.teamMessages.push({
      id: `${state.sessionId}-chat-${String(state.teamMessages.length + 1)}`,
      eventId: event.id,
      author: "player",
      body: action.freeText.trim(),
      actionId: action.id,
      simMinutes: state.simClock,
    });
  }

  if (action.id === "escalate_alert") {
    const ticket = state.structuredTickets[`ticket-${event.id}`];
    if (ticket) {
      state.teamMessages ??= [];
      state.teamMessages.push({
        id: `${state.sessionId}-chat-${String(state.teamMessages.length + 1)}`,
        eventId: event.id,
        author: "player",
        body: `Escalated ${ticket.ticketId} for review. Verified evidence: ${ticket.verifiedEvidence ?? ""} Uncertainty: ${ticket.uncertainty ?? ""} Next step: ${ticket.followUp ?? ""} Sources: ${(ticket.sourceArtifactIds ?? []).join(", ")}.`,
        actionId: action.id,
        simMinutes: state.simClock,
      });
    }
  }

  if (action.id === "ask_manager") {
    const relevant =
      !action.freeText ||
      /\b(login|alert|case|record|device|vpn|session|account|ticket|handoff|review|scanner|approval|access|evidence|check|priority|patel|rivera|finance|investigat\w*)\b/i.test(
        action.freeText,
      );
    event.managerConsulted = relevant;
    const template = state.rules.eventTemplates[event.templateId];
    const guidance = !relevant
      ? "I can help with this shift’s cases and procedure. Which case or record are you asking about?"
      : managerGuidanceForA1042(
          state,
          event,
          (
            template?.managerGuidance ??
            "Morgan has no additional operational context for this work."
          ).trim(),
        );
    const entry = consequence(state, event.id, action.id, guidance);
    state.ledger.push(entry);
    effects.push({ type: "consequence_recorded", consequenceId: entry.id });
    state.teamMessages ??= [];
    state.teamMessages.push({
      id: `${state.sessionId}-chat-${String(state.teamMessages.length + 1)}`,
      eventId: event.id,
      author: "morgan",
      body: guidance,
      actionId: action.id,
      simMinutes: state.simClock,
    });
    return;
  }

  if (effect.consequence) {
    const dueAt =
      effect.consequence.delayMinutes === undefined
        ? undefined
        : state.simClock + effect.consequence.delayMinutes;
    const entry = consequence(
      state,
      event.id,
      action.id,
      action.id === "send_status_update" &&
        state.events.some(
          ({ id, status }) =>
            id === "suspicious-login-1" && status === "resolved",
        )
        ? "Morgan received your bounded status update. The login decision is already recorded; keep its unresolved questions with the next analyst."
        : fillDescription(effect.consequence.description, event),
      dueAt,
    );
    state.ledger.push(entry);
    effects.push({ type: "consequence_recorded", consequenceId: entry.id });
  }

  for (const callback of effect.callbacks) {
    if (!conditionsMet(state, callback.when)) continue;
    if (
      state.pendingCallbacks.some(
        ({ id, eventId }) => id === callback.id && eventId === event.id,
      )
    )
      continue;
    const compared = state.workplace.comparisons?.some(
      ({ eventId, artifactIds }) =>
        eventId === event.id &&
        ["login-session-timeline", "vpn-context-1"].every((id) =>
          artifactIds.includes(id),
        ),
    );
    const attached =
      state.structuredTickets[`ticket-${event.id}`]?.sourceArtifactIds ?? [];
    const comparisonSupported =
      compared &&
      ["login-session-timeline", "vpn-context-1", "device-inventory-1"].every(
        (id) =>
          attached.includes(id) &&
          state.workplace.inspectedArtifactIds?.includes(id),
      );
    state.pendingCallbacks.push({
      ...callback,
      ...(callback.id === "b1-comparison-review" && !comparisonSupported
        ? {
            body: "I received your review request. The flagged-session/VPN comparison or required source attachments are missing from the saved review request. I will recover the missing record before deciding next steps.",
          }
        : {}),
      eventId: event.id,
      actionId: action.id,
      dueAt: state.simClock + callback.delayMinutes,
      applied: false,
    });
    if (
      callback.acknowledgement &&
      state.acknowledgements.length < 3 &&
      !state.acknowledgements.some(
        ({ decisionId }) => decisionId === (callback.decisionId ?? callback.id),
      )
    ) {
      state.acknowledgements.push({
        id: callback.id,
        decisionId: callback.decisionId ?? callback.id,
        text: callback.acknowledgement,
        simMinutes: state.simClock,
      });
    }
  }

  if (effect.resolve) {
    event.status = "resolved";
    if (effect.resolution !== undefined) {
      event.resolution = fillDescription(effect.resolution, event);
    }
  }
  if (effect.emitEventResolved) {
    effects.push({ type: "event_resolved", eventId: event.id });
  }
}
