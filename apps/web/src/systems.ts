import type {
  AvailableAction,
  SimulationActionId,
  WorkSystemId,
} from "@sim/schemas";

export const WORK_SYSTEMS: Array<{
  id: WorkSystemId;
  label: string;
  hint: string;
  toolTitle: string;
}> = [
  {
    id: "alert_dashboard",
    label: "Alerts",
    hint: "Security warnings",
    toolTitle: "Alert monitor",
  },
  {
    id: "email",
    label: "Email",
    hint: "Messages and reports",
    toolTitle: "Work email",
  },
  {
    id: "ticket_queue",
    label: "Tickets",
    hint: "Case notes",
    toolTitle: "Investigation tickets",
  },
  {
    id: "knowledge_base",
    label: "Guides",
    hint: "How-to procedures",
    toolTitle: "Knowledge base",
  },
  {
    id: "team_chat",
    label: "Team chat",
    hint: "Talk to Morgan",
    toolTitle: "Team channel",
  },
];

/** Actions that edit the player's own scratch space rather than advance work. */
const UTILITY_ACTION_IDS = new Set<SimulationActionId>([
  "update_ticket_notes",
  "update_notebook",
]);

/** Terminal action; it ends the shift rather than progressing it. */
const WRAP_UP_ACTION_ID: SimulationActionId = "complete_shift";

export function systemLabel(systemId: WorkSystemId): string {
  return WORK_SYSTEMS.find(({ id }) => id === systemId)?.label ?? "Work system";
}

export function systemMeta(systemId: WorkSystemId) {
  return (
    WORK_SYSTEMS.find(({ id }) => id === systemId) ?? {
      id: systemId,
      label: "Work system",
      hint: "",
      toolTitle: "Workplace system",
    }
  );
}

function isUtilityAction(action: AvailableAction): boolean {
  return UTILITY_ACTION_IDS.has(action.id);
}

/** Everything the player can act on in a system panel. */
export function primaryActions(actions: AvailableAction[]): AvailableAction[] {
  return actions.filter((action) => !isUtilityAction(action));
}

export function utilityActions(actions: AvailableAction[]): AvailableAction[] {
  return actions.filter((action) => isUtilityAction(action));
}

/**
 * Actions that move the shift forward. Narrower than `primaryActions` because
 * guidance should never point at "finish the shift" while work remains.
 */
export function shiftWorkActions(actions: AvailableAction[]): AvailableAction[] {
  return primaryActions(actions).filter(
    (action) => action.id !== WRAP_UP_ACTION_ID,
  );
}

export function canWrapUpShift(actions: AvailableAction[]): boolean {
  return actions.some(({ id }) => id === WRAP_UP_ACTION_ID);
}

export function formatShiftClock(minutes: number): string {
  const startHour = 8;
  const total = startHour * 60 + minutes;
  const hour = Math.floor(total / 60) % 24;
  const minute = total % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}
