import type {
  ActionEffect,
  ConsequenceEntry,
  DomainEffect,
  EventInstance,
  SimulationAction,
  SimulationActionId,
  WorldState,
} from "@sim/schemas";

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

  const context = state.facts["manager-managed-device-context"]?.content;
  if (!context) {
    return "I do not recognize that device name from our managed-device work, but that is context rather than proof of who used it. Keep the exact identifier and the remaining uncertainty in your note.";
  }
  return `${context} That does not establish who used the flagged device. Keep the exact identifier and the remaining uncertainty in your note.`;
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
      id: `${state.sessionId}-chat-${state.teamMessages.length + 1}`,
      eventId: event.id,
      author: "player",
      body: action.freeText.trim(),
      actionId: action.id,
      simMinutes: state.simClock,
    });
  }

  if (action.id === "ask_manager") {
    event.managerConsulted = true;
    const template = state.rules.eventTemplates[event.templateId];
    const guidance = managerGuidanceForA1042(
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
      id: `${state.sessionId}-chat-${state.teamMessages.length + 1}`,
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
      fillDescription(effect.consequence.description, event),
      dueAt,
    );
    state.ledger.push(entry);
    effects.push({ type: "consequence_recorded", consequenceId: entry.id });
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
