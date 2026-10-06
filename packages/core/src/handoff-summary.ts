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
const NON_CASE_EVENT_IDS = new Set(["handoff-1", "shift-handoff-1"]);

type HandoffTicket = {
  status?: string | undefined;
  uncertainty?: string | undefined;
} | undefined;

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

/** True when the recorded disposition still obligates someone later. */
function isContinuation(text: string): boolean {
  return /\b(pending|remains|remain|monitoring|follow-up|review)\b/i.test(text);
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
  if (ticket?.status === "pending_review") {
    return "escalated — senior review pending; nothing recorded confirms misuse";
  }
  if (ticket?.status === "closed") {
    return "closed on the documented record — bounded to what was checked";
  }
  return event.status === "resolved" ? "resolved" : event.status;
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
  teamMessages: ClientView["teamMessages"],
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
    const responses = (teamMessages ?? [])
      .filter(
        (message) =>
          message.eventId === event.id &&
          (message.author === "reviewer" || message.author === "employee"),
      )
      .map(({ body }) => firstSentence(body))
      .filter((body) => body.length > 0);
    const candidates = [...responses.reverse(), ...(event.resolution ? [firstSentence(event.resolution)] : [])];
    const continuation = candidates.find((text) => isContinuation(text));
    if (continuation) {
      followUps.push(`${event.title}: ${continuation}`);
    }
  }
  return followUps;
}
