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
} from "./scheduler.js";

export class ActionUnavailableError extends Error {
  constructor(actionId: string) {
    super(`Action "${actionId}" is not available in the current state`);
    this.name = "ActionUnavailableError";
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
  expireOverdueEvents(state);
  applyDueConsequences(state, effects);

  return { state: WorldStateSchema.parse(state), effects };
}
