import type { DomainEffect, SimulationActionId, WorldState } from "@sim/schemas";
import { consequence } from "./effects.js";
import {
  ensureNotificationsForEvent,
  wakeSnoozedNotifications,
} from "./notifications.js";

export function activatePendingEvents(
  state: WorldState,
  actionId: SimulationActionId,
  effects: DomainEffect[],
): void {
  for (const pendingEvent of state.events) {
    if (
      pendingEvent.status === "pending" &&
      state.simClock >= pendingEvent.triggeredAt
    ) {
      pendingEvent.status = "active";
      ensureNotificationsForEvent(state, pendingEvent.id);
      const entry = consequence(
        state,
        pendingEvent.id,
        actionId,
        `New work arrived: ${pendingEvent.title}.`,
      );
      state.ledger.push(entry);
      effects.push({
        type: "consequence_recorded",
        consequenceId: entry.id,
      });
    }
  }
}

export function expireOverdueEvents(state: WorldState): void {
  for (const activeEvent of state.events) {
    if (
      activeEvent.status === "active" &&
      state.simClock > activeEvent.deadlineAt
    ) {
      activeEvent.status = "expired";
      activeEvent.resolution =
        "The work remained incomplete when its operational deadline passed.";
      state.hidden.taskBacklog = Math.max(0, state.hidden.taskBacklog - 1);
    }
  }
}

export function applyDueConsequences(
  state: WorldState,
  effects: DomainEffect[],
): void {
  for (const entry of state.ledger) {
    if (
      !entry.applied &&
      entry.dueAt !== undefined &&
      state.simClock >= entry.dueAt
    ) {
      entry.applied = true;
      const template = state.events.find(({ id }) => id === entry.eventId);
      const effectSpec =
        template === undefined
          ? undefined
          : state.rules.eventTemplates[template.templateId]?.actionEffects[
              entry.actionId
            ]?.consequence;
      const affectedEvent = state.events.find(({ id }) => id === entry.eventId);
      if (
        affectedEvent &&
        affectedEvent.status !== "escalated" &&
        (effectSpec?.escalateOnApply ?? true)
      ) {
        affectedEvent.status = "escalated";
        affectedEvent.resolution =
          effectSpec?.escalateResolution ??
          "Related activity appeared after the alert was dismissed.";
        effects.push({
          type: "event_escalated",
          eventId: affectedEvent.id,
        });
      }
    }
  }
}

export { wakeSnoozedNotifications };
