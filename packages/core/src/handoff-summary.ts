import { reviewReasoning } from "./reasoning-options.js";
import type { ClientView } from "@sim/schemas";

type HandoffEventInput = {
  id: string;
  title: string;
  status: string;
  resolution?: string | undefined;
};

/**
 * Shared handoff disposition derivation.
 *
 * The reducer (canonical handoff message) and the Desk OS HandoffBuilder
 * (interactive preview) must agree on what each case's recorded disposition
 * is, so both call these helpers instead of re-deriving status strings.
 * Everything here reads recorded shift state only — no pack internals.
 */

/** Work-item bookkeeping events that are not case decisions. */
const NON_CASE_EVENT_IDS = new Set([
  "handoff-1",
  "shift-handoff-1",
  "status-check-1",
]);

type HandoffTicket =
  | {
      status?: string | undefined;
      uncertainty?: string | undefined;
      disposition?: string | undefined;
      decisionReasoning?: import("@sim/schemas").ReasoningSelection | undefined;
      decisionSourceIds?: string[] | undefined;
    }
  | undefined;

export type HandoffCaseLine = {
  eventId: string;
  title: string;
  /** Explicit disposition: open / escalated-pending-review / bounded closure. */
  label: string;
  /** Recorded resolution sentence, when one exists. */
  detail?: string;
};

function firstSentence(text: string): string {
  const match = /^(.*?[.!?])(?:\s|$)/u.exec(text.trim());
  return (match?.[1] ?? text.trim()).trim();
}

export function caseDispositionLabel(
  event: HandoffEventInput,
  ticket: HandoffTicket,
): string {
  if (event.status === "active") {
    return "active — still needs a final decision";
  }
  if (event.status === "expired") {
    return "closed unhandled after its deadline";
  }
  if (ticket?.status === "pending_review" || event.status === "escalated") {
    return "escalated — senior review pending; nothing recorded confirms misuse";
  }
  if (event.id === "routine-alert-1" && event.status === "resolved") {
    const supported =
      ticket?.decisionReasoning &&
      reviewReasoning(
        event.id,
        ticket.decisionReasoning,
        ticket.decisionSourceIds ?? [],
      ).verdict === "supported";
    return supported
      ? "closed as expected — bounded to the matched run and window"
      : "closed — recorded closure; run/window support still needs review";
  }
  if (ticket?.status === "closed") {
    return "closed on the documented record — bounded to what was checked";
  }
  if (event.status === "resolved") {
    if (event.id === "access-request-1") {
      if (event.resolution?.includes("without the data owner's authorization"))
        return "approval recorded — authorization review pending";
      if (event.resolution?.includes("deadline approver"))
        return "routed to deadline approver — data-owner authorization pending";
      if (event.resolution?.includes("rejected"))
        return "rejected — business need unresolved";
      return "routed — approval pending";
    }
    if (
      event.id === "suspicious-login-1" &&
      /escalat|senior review/i.test(event.resolution ?? "")
    )
      return "escalated — senior review pending; nothing recorded confirms misuse";
    if (event.id === "suspicious-login-1")
      return "closed — session ownership and missing activity remain unverified";
    return "completed — see recorded outcome";
  }
  return event.status;
}

/** The cases a handoff must account for, in shift order, with real dispositions. */
export function handoffCaseLines(
  events: readonly HandoffEventInput[],
  structuredTickets: ClientView["structuredTickets"],
): HandoffCaseLine[] {
  return events
    .filter(
      (event) =>
        event.status !== "pending" && !NON_CASE_EVENT_IDS.has(event.id),
    )
    .map((event) => {
      const ticket = structuredTickets?.[`ticket-${event.id}`];
      const label = caseDispositionLabel(event, ticket);
      return {
        eventId: event.id,
        title: event.title,
        label,
        ...(event.resolution
          ? { detail: firstSentence(event.resolution) }
          : {}),
      };
    });
}

/**
 * Continuation work the next person inherits: open decisions, plus resolved
 * work whose recorded state still obligates someone (owner approval pending,
 * monitoring conditions). Derived from recorded resolutions and responses.
 */
export function handoffFollowUps(
  events: readonly HandoffEventInput[],
): string[] {
  const followUps: string[] = [];
  const liveEvents = events.filter(
    (event) => event.status !== "pending" && !NON_CASE_EVENT_IDS.has(event.id),
  );
  for (const event of liveEvents) {
    if (event.status === "active") {
      followUps.push(`${event.title} still needs a final decision.`);
      continue;
    }
    if (event.id === "suspicious-login-1") {
      followUps.push(
        "S-0741: session ownership and missing activity remain unverified; preserve the recorded disposition.",
      );
    } else if (event.id === "access-request-1") {
      followUps.push(
        `${event.title}: finance data-owner authorization or business need still needs follow-up.`,
      );
    } else if (event.id === "login-help-1") {
      if (
        event.resolution?.includes("no further retries") ||
        event.resolution?.includes("monitoring shows no further retries")
      ) {
        followUps.push(
          "Rivera: bounded check completed. Reopen only if retries continue, an unfamiliar device appears or unrecognized activity is reported.",
        );
      } else
        followUps.push("Rivera: phone-specific follow-up remains untested.");
    }
  }
  return followUps;
}
