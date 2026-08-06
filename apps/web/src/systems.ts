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

export const UTILITY_ACTION_IDS = new Set<SimulationActionId>([
  "update_ticket_notes",
  "update_notebook",
]);

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

export function isUtilityAction(action: AvailableAction): boolean {
  return UTILITY_ACTION_IDS.has(action.id);
}

export function primaryActions(actions: AvailableAction[]): AvailableAction[] {
  return actions.filter((action) => !isUtilityAction(action));
}

export function utilityActions(actions: AvailableAction[]): AvailableAction[] {
  return actions.filter((action) => isUtilityAction(action));
}

export function formatShiftClock(minutes: number): string {
  const startHour = 8;
  const total = startHour * 60 + minutes;
  const hour = Math.floor(total / 60) % 24;
  const minute = total % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}
