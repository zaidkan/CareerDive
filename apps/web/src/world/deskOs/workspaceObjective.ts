import type { ClientView, WorkSystemId } from "@sim/schemas";
import { getShiftGuidance } from "../../guidance.js";
import { shiftWorkActions } from "../../systems.js";
import { findingQuestions } from "@sim/core";

/** Navigation cues only. Never evaluate evidence or recommend a disposition. */
export function workspaceObjective(view: ClientView, eventId?: string) {
  if (eventId === "suspicious-login-1" && view.caseActions) {
    const ticket = view.structuredTickets?.[`ticket-${eventId}`];
    const event = view.events.find((e) => e.id === eventId);
    if (event?.status === "active") {
      const question = findingQuestions(eventId).find(
        (q) =>
          !ticket?.reasoning?.caseFindings?.some((f) => f.questionId === q.id),
      );
      return {
        objective:
          question?.title ??
          "What judgment and next check will your memo carry?",
        systemId: question?.systemId ?? ("ticket_queue" as WorkSystemId),
        eventId,
      };
    }
    return {
      objective: "What does the recipient still need from this case?",
      systemId: "team_chat" as WorkSystemId,
      eventId,
    };
  }
  const guidance = getShiftGuidance(view);
  const actions = shiftWorkActions(view.availableActions).filter(
    (action) => !["ask_manager", "query_records"].includes(action.id),
  );
  const action = eventId
    ? actions.find((item) => item.eventId === eventId)
    : guidance?.action;
  const task = view.tasks.find(
    (item) => item.id === action?.taskId && item.eventId === action.eventId,
  );
  const cues: Partial<Record<string, string>> = {
    read_handoff: "Read the previous shift's handoff",
    acknowledge_handoff: "Check in with your team",
    review_alert: "Review the alert",
    inspect_login_context: "Compare the case records",
    search_knowledge_base: "Check the relevant guide",
    document_ticket: "Record your reasoning",
    update_ticket_notes: "Review your case note",
    escalate_alert: "Choose how to handle this case",
    dismiss_alert: "Choose how to handle this case",
    route_access_request: "Review the access request",
    resolve_login_help: "Review the sign-in problem",
    send_status_update: "Update your team",
    submit_shift_handoff: "Prepare the next analyst's handoff",
  };
  if (action)
    return {
      objective: cues[action.id] ?? task?.title ?? action.label,
      systemId: action.systemId,
      eventId: action.eventId,
      action,
    };
  const finish = view.availableActions.find(
    ({ id }) => id === "complete_shift",
  );
  if (finish && !actions.length)
    return {
      objective: "Ready to review your shift",
      systemId: "team_chat" as WorkSystemId,
      eventId: eventId ?? "shift",
    };
  return {
    objective: eventId
      ? "Review the recorded outcome"
      : "No assigned work right now",
    systemId: undefined,
    eventId,
  };
}
