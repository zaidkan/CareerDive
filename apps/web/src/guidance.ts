import type { AvailableAction, ClientView, WorkSystemId } from "@sim/schemas";
import { canWrapUpShift, shiftWorkActions } from "./systems.js";

export type ShiftGuidance = {
  headline: string;
  detail: string;
  systemId: WorkSystemId;
  action?: AvailableAction;
};

export function getShiftGuidance(view: ClientView): ShiftGuidance | null {
  const work = shiftWorkActions(view.availableActions);
  const next =
    work.find(({ id }) => id === "read_handoff") ??
    work.find(({ id }) => id === "acknowledge_handoff") ??
    work[0];
  if (!next) {
    return canWrapUpShift(view.availableActions)
      ? {
          headline: "Wrap up your shift",
          detail: "When you are ready, finish the shift from Team Chat.",
          systemId: "team_chat",
        }
      : null;
  }

  const hints: Partial<Record<string, string>> = {
    read_handoff: "Start by reading what the last analyst left you.",
    review_alert: "Check the alert details before deciding anything.",
    inspect_login_context:
      "Look at login and device info to understand the alert.",
    open_phishing_report:
      "Open the employee report, but do not click suspicious links.",
    search_knowledge_base:
      "Search the knowledge base for the approved procedure.",
    ask_manager:
      "Ask Morgan if you are stuck. She can hint, not decide for you.",
  };

  return {
    headline: `Next: ${next.label}`,
    detail: hints[next.id] ?? next.description,
    systemId: next.systemId,
    action: next,
  };
}

export const FIRST_DAY_STEPS = [
  {
    id: "email",
    title: "Step 1 · Check your inbox",
    body: "Every shift starts with handoff notes. Open Email and read what the last analyst left behind.",
    match: (actionId: string) => actionId === "read_handoff",
  },
  {
    id: "handoff-done",
    title: "Step 2 · Confirm the handoff",
    body: "Tell Morgan what you will handle first. That is normal workplace communication.",
    match: (actionId: string) => actionId === "acknowledge_handoff",
  },
  {
    id: "alerts",
    title: "Step 3 · Investigate the alert",
    body: "Open Alerts and review the login warning. Read the evidence before you choose a next move.",
    match: (actionId: string) =>
      actionId === "review_alert" || actionId === "inspect_login_context",
  },
] as const;

export function getFirstDayStep(
  view: ClientView,
): (typeof FIRST_DAY_STEPS)[number] | null {
  const completed = new Set(
    view.events.flatMap((event) => event.completedActionIds),
  );
  if (!completed.has("read_handoff")) return FIRST_DAY_STEPS[0];
  if (!completed.has("acknowledge_handoff")) return FIRST_DAY_STEPS[1];
  if (
    !completed.has("review_alert") &&
    !completed.has("inspect_login_context")
  ) {
    return FIRST_DAY_STEPS[2];
  }
  return null;
}
