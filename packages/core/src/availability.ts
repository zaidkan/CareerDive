import type {
  AvailableAction,
  EventInstance,
  ScenarioRules,
  SimulationActionId,
  WorldState,
} from "@sim/schemas";
import { conditionsMet } from "./conditions.js";
import { resolveActionEffect } from "./effects.js";

function hasCompleted(
  event: EventInstance,
  actionId: SimulationActionId,
): boolean {
  return event.completedActionIds.includes(actionId);
}

/**
 * Reading-vs-action clarity: when every record an action would observe has
 * already been opened some other way, say so. The action still records the
 * completed check — opening a source alone never advances the workflow.
 */
function stateNoteFor(
  state: WorldState,
  event: EventInstance,
  actionId: SimulationActionId,
): string | undefined {
  const observed = new Set(state.observedArtifactIds);
  const alreadyOpened = resolveActionEffect(state, event, actionId)
    .observeArtifactIds.filter((artifactId) => observed.has(artifactId));
  if (alreadyOpened.length === 0) return undefined;
  const titles = alreadyOpened.map(
    (artifactId) => state.artifacts[artifactId]?.title ?? artifactId,
  );
  return `You already opened ${titles.join(", ")}. This action records the check as done; opening a source alone does not complete it.`;
}

function target(
  state: WorldState,
  rules: ScenarioRules,
  event: EventInstance,
  actionId: SimulationActionId,
): AvailableAction {
  const definition = rules.actions[actionId];
  if (!definition) {
    throw new Error(`Unknown action "${actionId}" in scenario rules`);
  }
  const task = Object.values(rules.tasks).find(
    ({ eventTemplateId, actionId }) =>
      eventTemplateId === event.templateId && actionId === definition.id,
  );
  // Released bindings retain their existing canonical controls.
  const gated = task && !task.releasesActionGate;
  const finalStep = task?.steps.at(-1);
  const stateNote = stateNoteFor(state, event, actionId);
  return {
    id: definition.id,
    eventId: event.id,
    systemId: definition.systemId,
    label: definition.label,
    description: definition.description,
    simulatedMinutes: definition.simulatedMinutes,
    ...(stateNote ? { stateNote } : {}),
    ...(gated ? { taskId: task.id } : {}),
    ...(definition.id === "document_ticket" && finalStep?.outcomes.length
      ? {
          decisionOptions: finalStep.options
            .filter(({ id }) =>
              finalStep.outcomes.some((outcome) =>
                outcome.selectedOptionIds.includes(id),
              ),
            )
            .map(({ id, label }) => ({ id, label })),
        }
      : {}),
  };
}

function withManagerAndUtility(
  state: WorldState,
  rules: ScenarioRules,
  event: EventInstance,
  actions: AvailableAction[],
  allowManager: boolean,
  utilityActions: SimulationActionId[],
): AvailableAction[] {
  const next = [...actions];
  for (const actionId of utilityActions) {
    if (!next.some(({ id }) => id === actionId)) {
      next.push(target(state, rules, event, actionId));
    }
  }
  if (allowManager) {
    next.push(target(state, rules, event, "ask_manager"));
  }
  return next;
}

function nextLinearAction(
  state: WorldState,
  rules: ScenarioRules,
  event: EventInstance,
  sequence: SimulationActionId[],
): AvailableAction[] {
  const next = sequence.find((actionId) => !hasCompleted(event, actionId));
  return next ? [target(state, rules, event, next)] : [];
}

function actionsForEvent(
  state: WorldState,
  event: EventInstance,
): AvailableAction[] {
  const rules = state.rules;
  const template = rules.eventTemplates[event.templateId];
  if (!template) {
    return [];
  }
  const { progression } = template;
  if (progression.kind === "linear") {
    return withManagerAndUtility(
      state,
      rules,
      event,
      nextLinearAction(state, rules, event, progression.sequence),
      progression.allowManager,
      progression.utilityActions,
    ).filter(({ id }) =>
      conditionsMet(state, template.actionConditions[id] ?? []),
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
        ? remaining.map((actionId) => target(state, rules, event, actionId))
        : remaining[0]
          ? [target(state, rules, event, remaining[0])]
          : [];
    const also = stage.alsoOffer
      .filter(
        (actionId) =>
          !rules.actions[actionId]?.tracksCompletion ||
          !hasCompleted(event, actionId),
      )
      .map((actionId) => target(state, rules, event, actionId));
    return withManagerAndUtility(
      state,
      rules,
      event,
      [...offered, ...also],
      progression.allowManager,
      progression.utilityActions,
    ).filter(({ id }) =>
      conditionsMet(state, template.actionConditions[id] ?? []),
    );
  }

  return withManagerAndUtility(
    state,
    rules,
    event,
    [],
    progression.allowManager,
    progression.utilityActions,
  ).filter(({ id }) =>
    conditionsMet(state, template.actionConditions[id] ?? []),
  );
}

export function availableActions(state: WorldState): AvailableAction[] {
  const activeEvents = state.events.filter(({ status }) => status === "active");
  if (
    state.events.length > 0 &&
    state.events.every(
      (event) =>
        ["resolved", "escalated", "expired"].includes(event.status) ||
        (state.rules.eventTemplates[event.templateId]?.nonBlockingFollowUp &&
          ["pending", "waiting", "active"].includes(event.status)),
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
    actionsForEvent(state, event),
  );
  // A saved disposition can still have questions while the rest of the shift continues.
  for (const event of state.events.filter((e) =>
    ["resolved", "escalated"].includes(e.status),
  )) {
    if (state.rules.eventTemplates[event.templateId]?.progression.allowManager)
      eventActions.push(target(state, state.rules, event, "ask_manager"));
  }
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
