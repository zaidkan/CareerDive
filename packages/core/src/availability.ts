import type {
  AvailableAction,
  EventInstance,
  ScenarioRules,
  SimulationActionId,
  WorldState,
} from "@sim/schemas";

function hasCompleted(
  event: EventInstance,
  actionId: SimulationActionId,
): boolean {
  return event.completedActionIds.includes(actionId);
}

function target(
  rules: ScenarioRules,
  event: EventInstance,
  actionId: SimulationActionId,
): AvailableAction {
  const definition = rules.actions[actionId];
  if (!definition) {
    throw new Error(`Unknown action "${actionId}" in scenario rules`);
  }
  return {
    id: definition.id,
    eventId: event.id,
    systemId: definition.systemId,
    label: definition.label,
    description: definition.description,
    simulatedMinutes: definition.simulatedMinutes,
  };
}

function withManagerAndUtility(
  rules: ScenarioRules,
  event: EventInstance,
  actions: AvailableAction[],
  allowManager: boolean,
  utilityActions: SimulationActionId[],
): AvailableAction[] {
  const next = [...actions];
  for (const actionId of utilityActions) {
    if (!next.some(({ id }) => id === actionId)) {
      next.push(target(rules, event, actionId));
    }
  }
  if (allowManager && !event.managerConsulted) {
    next.push(target(rules, event, "ask_manager"));
  }
  return next;
}

function nextLinearAction(
  rules: ScenarioRules,
  event: EventInstance,
  sequence: SimulationActionId[],
): AvailableAction[] {
  const next = sequence.find((actionId) => !hasCompleted(event, actionId));
  return next ? [target(rules, event, next)] : [];
}

function actionsForEvent(
  rules: ScenarioRules,
  event: EventInstance,
): AvailableAction[] {
  const template = rules.eventTemplates[event.templateId];
  if (!template) {
    return [];
  }
  const { progression } = template;
  if (progression.kind === "linear") {
    return withManagerAndUtility(
      rules,
      event,
      nextLinearAction(rules, event, progression.sequence),
      progression.allowManager,
      progression.utilityActions,
    );
  }

  for (const stage of progression.stages) {
    if (!stage.after.every((actionId) => hasCompleted(event, actionId))) {
      continue;
    }
    const remaining = stage.offer.filter(
      (actionId) => !hasCompleted(event, actionId),
    );
    if (remaining.length === 0) {
      continue;
    }
    const offered =
      stage.mode === "all_remaining"
        ? remaining.map((actionId) => target(rules, event, actionId))
        : remaining[0]
          ? [target(rules, event, remaining[0])]
          : [];
    const also = stage.alsoOffer.map((actionId) =>
      target(rules, event, actionId),
    );
    return withManagerAndUtility(
      rules,
      event,
      [...offered, ...also],
      progression.allowManager,
      progression.utilityActions,
    );
  }

  return withManagerAndUtility(
    rules,
    event,
    [],
    progression.allowManager,
    progression.utilityActions,
  );
}

export function availableActions(state: WorldState): AvailableAction[] {
  const activeEvents = state.events.filter(({ status }) => status === "active");
  if (
    state.events.length > 0 &&
    state.events.every(({ status }) =>
      ["resolved", "escalated", "expired"].includes(status),
    )
  ) {
    const complete = state.rules.actions.complete_shift;
    if (!complete) {
      return [];
    }
    return [
      {
        id: complete.id,
        eventId: "shift",
        systemId: complete.systemId,
        label: complete.label,
        description: complete.description,
        simulatedMinutes: complete.simulatedMinutes,
      },
    ];
  }
  const eventActions = activeEvents.flatMap((event) =>
    actionsForEvent(state.rules, event),
  );
  const notebook = state.rules.actions.update_notebook;
  if (notebook && activeEvents[0]) {
    eventActions.push({
      id: notebook.id,
      eventId: activeEvents[0].id,
      systemId: notebook.systemId,
      label: notebook.label,
      description: notebook.description,
      simulatedMinutes: notebook.simulatedMinutes,
    });
  }
  return eventActions;
}
