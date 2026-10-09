/**
 * Shared derivation of "what the player sees in one work system".
 *
 * The 3D desk OS and the 2D work surface are peer renderers of the same
 * `ClientView`, so this module owns the routing rules they must agree on:
 * which events land in which system, and which actions apply to the item the
 * player has open.
 */
import type {
  AvailableAction,
  ClientView,
  SimulationActionId,
  WorkSystemId,
} from "@sim/schemas";
import type { ShiftGuidance } from "./guidance.js";

export type WorkstationEvent = ClientView["events"][number];

export type WorkstationSystemState = {
  systemEvents: WorkstationEvent[];
  selectedEvent: WorkstationEvent | undefined;
  contextualActions: AvailableAction[];
  highlightActionId?: SimulationActionId;
};

export function remainingMinutes(deadlineAt: number, simClock: number): number {
  return Math.max(0, deadlineAt - simClock);
}

export function isActiveCase(event: WorkstationEvent): boolean {
  return event.status === "active" || event.status === "escalated";
}

export function activeCases(view: ClientView): WorkstationEvent[] {
  return view.events.filter(isActiveCase);
}

export function closedCases(view: ClientView): WorkstationEvent[] {
  return view.events.filter(
    ({ status }) => status === "resolved" || status === "expired",
  );
}

/** An event shows in a system if it lives there or an action there targets it. */
function belongsToSystem(
  view: ClientView,
  event: WorkstationEvent,
  systemId: WorkSystemId,
): boolean {
  return (
    event.systemId === systemId ||
    view.artifacts.some(
      (artifact) =>
        artifact.systemId === systemId && artifact.eventIds.includes(event.id),
    ) ||
    view.availableActions.some(
      (action) => action.eventId === event.id && action.systemId === systemId,
    )
  );
}

export function eventsForSystem(
  view: ClientView,
  systemId: WorkSystemId,
): WorkstationEvent[] {
  return view.events.filter(
    (event) =>
      (isActiveCase(event) ||
        view.availableActions.some(
          (a) => a.systemId === systemId && a.eventId === event.id,
        )) &&
      belongsToSystem(view, event, systemId),
  );
}

/** Badge counts for every system dock/tile, keyed by system. */
export function systemOpenCounts(
  view: ClientView,
): Record<WorkSystemId, number> {
  const visible = activeCases(view);
  const countIn = (systemId: WorkSystemId) =>
    visible.filter((event) => belongsToSystem(view, event, systemId)).length;
  return {
    alert_dashboard: countIn("alert_dashboard"),
    email: countIn("email"),
    ticket_queue: countIn("ticket_queue"),
    knowledge_base: countIn("knowledge_base"),
    team_chat: countIn("team_chat"),
  };
}

export function deriveSystemState(
  view: ClientView,
  systemId: WorkSystemId,
  input: {
    selectedEventId?: string | undefined;
    /** Passed in so a render tree resolves guidance once, not per panel. */
    guidance: ShiftGuidance | null;
  },
): WorkstationSystemState {
  const { selectedEventId, guidance } = input;
  const systemEvents = eventsForSystem(view, systemId);
  const selectedEvent =
    view.events.find(({ id }) => id === selectedEventId) ?? systemEvents[0];
  const contextualActions = view.availableActions.filter(
    (action) =>
      action.systemId === systemId &&
      (action.eventId === selectedEvent?.id ||
        action.eventId === "shift" ||
        action.id === "update_notebook"),
  );
  const highlightActionId =
    guidance?.action?.systemId === systemId ? guidance.action.id : undefined;

  return {
    systemEvents,
    selectedEvent,
    contextualActions,
    ...(highlightActionId ? { highlightActionId } : {}),
  };
}
