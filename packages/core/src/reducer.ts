import type {
  DomainEffect,
  SimulationAction,
  TurnResult,
  WorldState,
} from "@sim/schemas";
import { WorldStateSchema } from "@sim/schemas";
import { availableActions } from "./availability.js";
import { applyResolvedEffect, resolveActionEffect } from "./effects.js";
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
  const allowedAction = availableActions(currentState).find(
    ({ id, eventId }) =>
      id === action.id &&
      (action.eventId === undefined || action.eventId === eventId),
  );
  if (!allowedAction) {
    throw new ActionUnavailableError(action.id);
  }
  if (allowedAction.taskId) {
    const progress =
      currentState.taskProgress[`${allowedAction.eventId}:${allowedAction.taskId}`];
    if (!progress?.completed) {
      throw new TaskRequiredError(action.id, allowedAction.taskId);
    }
  }

  const state = structuredClone(currentState);
  const effects: DomainEffect[] = [
    { type: "action_applied", actionId: action.id },
  ];
  const definition = state.rules.actions[action.id];
  if (!definition) {
    throw new ActionUnavailableError(action.id);
  }
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
