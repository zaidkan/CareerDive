import { findingText } from "@sim/core";
import type { AvailableAction, ClientView } from "@sim/schemas";

/** Describe the recorded operation, never certify a player's claim. */
export function caseActionFeedback(
  action: AvailableAction,
  view: ClientView,
  before?: ClientView,
): string {
  if (view.caseActions) {
    const ticket = view.structuredTickets?.[`ticket-${action.eventId}`];
    if (action.id === "update_ticket_notes") {
      if (action.ticketPayload?.reasoning?.phase === "follow-up")
        return "Result interpretation saved. The original request stays in history; unanswered checks carry forward.";
      const candidates = action.ticketPayload?.reasoning?.caseFindings ?? [];
      const previous =
        before?.structuredTickets?.[`ticket-${action.eventId}`]?.reasoning
          ?.caseFindings ?? [];
      const finding = before
        ? candidates.find(
            (f) =>
              JSON.stringify(
                previous.find((old) => old.questionId === f.questionId),
              ) !== JSON.stringify(f),
          )
        : candidates.at(-1);
      const message = finding
        ? `Saved claim: ${findingText(action.eventId, finding)}. ${finding.rowIds.length ? `${String(finding.rowIds.length)} selected source rows saved with it.` : "No source rows selected."}`
        : "Memo draft saved.";
      return `${message} ${ticket?.decisionReasoning ? "Correction saved; the original response stays in history." : "The case stays open. Choose another question or review your findings in Tickets."}`;
    }
    if (
      [
        "document_ticket",
        "route_access_request",
        "resolve_login_help",
      ].includes(action.id)
    ) {
      const event = view.events.find((e) => e.id === action.eventId);
      return `${event?.resolution ?? "Response recorded."} ${action.eventId === "login-help-1" ? "Read the actual result in Email and save what it establishes." : "Review the response and remaining checks on this case. Delivery does not verify the memo’s claims."}`;
    }
    if (action.id === "acknowledge_handoff")
      return "Your manager has your first-case choice. Open the case to begin; no finding has been saved yet.";
    if (action.id === "send_status_update")
      return "Update sent with your recorded case notes. Your manager received the claims and open checks; delivery does not verify them.";
    if (action.id === "submit_shift_handoff")
      return "Handoff sent with your actual case outcomes and next checks. You can now finish and review your shift.";
  }
  return action.id === "update_ticket_notes"
    ? "Investigation notes saved."
    : action.id === "update_notebook"
      ? "Notebook saved."
      : action.id === "search_knowledge_base"
        ? "Guide search updated."
        : `${action.label} completed.`;
}

export function sourceFeedback(
  view: ClientView,
  artifactId: string,
  feedback: string,
): string {
  if (!view.caseActions) return "Workplace updated.";
  const title =
    view.artifacts.find((a) => a.id === artifactId)?.title ?? "Source";
  if (feedback !== "artifact_opened")
    return `${title} reopened; saved findings unchanged.`;
  if (artifactId === "handoff-email")
    return "Assignment open. Pick which case to start; your message tells your manager what you will work on.";
  return `${title} open. Read the source before choosing rows for your finding; reading alone saves no claim.`;
}
