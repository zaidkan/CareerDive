import { findingQuestions } from "@sim/core";
import type { AvailableAction, ClientView, WorkSystemId } from "@sim/schemas";
import { canWrapUpShift, shiftWorkActions } from "./systems.js";

export type ShiftGuidance = {
  headline: string;
  detail: string;
  systemId: WorkSystemId;
  action?: AvailableAction;
  eventId?: string;
};

export function getShiftGuidance(view: ClientView): ShiftGuidance | null {
  if (view.caseActions) {
    if (view.completed) return null;
    if (view.availableActions.some((a) => a.id === "complete_shift"))
      return {
        headline: "Ready to review your shift",
        detail:
          "Open Team Chat when you are ready to finish and review your work.",
        systemId: "team_chat",
      };
    const event =
      view.events.find((e) => e.status === "active" && e.id === "handoff-1") ??
      view.events.find(
        (e) =>
          e.status === "active" &&
          (findingQuestions(e.id).length ||
            ["status-check-1", "shift-handoff-1"].includes(e.id)),
      );
    if (!event) return null;
    const action = view.caseActions.find(
      (a) =>
        a.eventId === event.id &&
        !["ask_manager", "query_records"].includes(a.id),
    );
    const question = findingQuestions(event.id).find(
      (q) =>
        !view.structuredTickets?.[
          `ticket-${event.id}`
        ]?.reasoning?.caseFindings?.some((f) => f.questionId === q.id),
    );
    const systemId =
      question?.systemId ??
      (event.id === "handoff-1"
        ? "email"
        : ["status-check-1", "shift-handoff-1"].includes(event.id)
          ? "team_chat"
          : "ticket_queue");
    return {
      eventId: event.id,
      headline:
        question?.title ??
        (event.id === "handoff-1"
          ? "Read your first assignment"
          : event.id === "status-check-1"
            ? "Update your manager"
            : event.id === "shift-handoff-1"
              ? "Leave the next analyst a handoff"
              : "Choose what to do with your findings"),
      detail: question
        ? `${question.why} Save the rows and claim you want to carry forward; opening a source alone saves no finding.`
        : event.id === "handoff-1"
          ? "Read the previous analyst’s note in Email, then pick a case to start. Morgan is your manager; the message tells them which case you will work on."
          : event.id === "status-check-1"
            ? "Use your saved case notes to tell your manager what changed and what still needs checking."
            : event.id === "shift-handoff-1"
              ? "Carry your actual case outcomes and open questions forward for the next analyst."
              : "In Tickets, review your saved findings and choose a response. Sending the memo carries that choice out once.",
      systemId,
      ...(action ? { action: { ...action, systemId } } : {}),
    };
  }
  const work = shiftWorkActions(view.availableActions).filter(
    ({ id }) => id !== "query_records" && id !== "ask_manager",
  );
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

  return {
    headline: `Next: ${next.label}`,
    detail: actionHint(next),
    systemId: next.systemId,
    action: next,
  };
}

/** Tool help uses public work state, never an answer key or hidden outcome. */
function actionHint(action: AvailableAction): string {
  const hints: Partial<Record<string, string>> = {
    read_handoff:
      "Open Email and read the previous analyst's handoff. Notice which checks they did not finish.",
    acknowledge_handoff:
      "In Team chat, select the open questions you are carrying forward, then confirm your message to Morgan.",
    review_alert:
      "In Alerts, open the case warning. Separate when the event happened from when it reached the queue.",
    inspect_login_context:
      "In Alerts, open the case sources. Compare session and device IDs before interpreting a location.",
    search_knowledge_base:
      "In Guides, use the exact device label or the case topic. Read what the guide can establish and what it cannot.",
    document_ticket:
      "In Tickets, select the records and statements supporting your finding. Review the selection before saving; this does not send an escalation.",
    update_ticket_notes:
      "In Tickets, change the saved selections to correct your note. Save the correction to add a new revision.",
    escalate_alert:
      "Return to Alerts to choose a disposition. Saving a ticket alone does not send the case for review.",
    dismiss_alert:
      "Return to Alerts to choose a disposition. Keep any unanswered question visible whichever route you take.",
    route_access_request:
      "In Tickets, compare the request with the access guide. A deadline and permission to approve a role are different things.",
    resolve_login_help:
      "In Tickets, compare this person's device-specific results before recording what to do next.",
    send_status_update:
      "In Team chat, send the current case update. Keep confirmed checks separate from questions still open.",
    submit_shift_handoff:
      "In Team chat, select what still matters for the next analyst. Check the preview against your actual earlier decisions before sending.",
  };
  return hints[action.id] ?? action.description;
}

export const FIRST_DAY_STEPS = [
  {
    id: "email",
    title: "Step 1 · Check your inbox",
    body: "Open Email and read the previous analyst's handoff. Its unfinished checks tell you what still needs investigation.",
    match: (actionId: string) => actionId === "read_handoff",
  },
  {
    id: "handoff-done",
    title: "Step 2 · Confirm the handoff",
    body: "Open Team chat. Select the open questions you are taking forward and confirm the message to Morgan.",
    match: (actionId: string) => actionId === "acknowledge_handoff",
  },
  {
    id: "alerts",
    title: "Step 3 · Investigate the alert",
    body: "Open Alerts, read the warning, then open its sources. Look for matching session and device IDs, not just a matching city.",
    match: (actionId: string) =>
      actionId === "review_alert" || actionId === "inspect_login_context",
  },
] as const;

export function getFirstDayStep(
  view: ClientView,
):
  | (Omit<(typeof FIRST_DAY_STEPS)[number], "title" | "body"> & {
      title: string;
      body: string;
    })
  | null {
  if (view.caseActions) {
    const assignment = view.events.find((e) => e.id === "handoff-1");
    if (assignment?.status !== "active") return null;
    return view.artifacts.some((a) => a.id === "handoff-email" && a.observed)
      ? {
          ...FIRST_DAY_STEPS[1],
          title: "Step 2 · Pick a case to start",
          body: "Choose which case to work on first. Your message tells Morgan, your manager, where you are starting.",
        }
      : {
          ...FIRST_DAY_STEPS[0],
          body: "Open Email and read your first assignment. Then pick a case to start.",
        };
  }
  const completed = new Set(
    view.events.flatMap((event) => event.completedActionIds),
  );
  if (!completed.has("read_handoff")) return FIRST_DAY_STEPS[0];
  if (!completed.has("acknowledge_handoff")) return FIRST_DAY_STEPS[1];
  if (!completed.has("review_alert") && !completed.has("inspect_login_context"))
    return FIRST_DAY_STEPS[2];
  return null;
}

/** Opt-in navigation and record-reading help; never chooses a disposition. */
export function getOptionalShiftHints(
  view: ClientView,
  phase: string,
  selectedEventId?: string,
  selectedQuestionId?: string,
): string[] {
  if (view.completed) return [];
  if (phase === "floor_map")
    return [
      "Choose Security Operations on the floor map to enter your work area. Your desk is inside that room.",
    ];
  if (phase === "room_walk")
    return [
      "Follow the workstation marker to the chair, using the open aisle around the cubicles. When the Ready prompt says Sit at computer, press E or click that action. Move closer means the chair is still out of reach.",
    ];
  if (phase === "desk_login")
    return [
      "Click the monitor to wake sign-in. Copy the first-day username and password shown on that screen into the matching fields, then choose Sign in.",
    ];
  const guidance = getShiftGuidance(view);
  const eventId =
    selectedEventId ?? guidance?.eventId ?? guidance?.action?.eventId;
  if (view.caseActions) {
    const ticket = view.structuredTickets?.[`ticket-${eventId ?? ""}`];
    const questions = findingQuestions(eventId ?? "");
    const question =
      questions.find((q) => q.id === selectedQuestionId) ??
      questions.find(
        (q) =>
          !ticket?.reasoning?.caseFindings?.some((f) => f.questionId === q.id),
      );
    const caseHint: Record<string, string> = {
      signal:
        "Open the session timeline in Alerts. Pick the rows showing what happened before and when the sign-in session began, then choose the claim those rows support. A session is one sign-in connection, not proof of who used it.",
      route:
        "In Alerts, compare the earlier session, flagged session, and VPN connection rows. Match connection IDs and source addresses, not just a city. Choose the relationship you think they show, then Save finding.",
      device:
        "In Guides, compare the exact laptop label from the flagged session with device inventory. Enrollment means registered with the company; it does not identify who used a device. Save the claim you can support.",
      coverage:
        "In Guides, read what the activity export includes and leaves out. Missing records and a recorded ‘nothing happened’ result are different. Save that limit in your finding.",
      "scan-match":
        "In Alerts, compare the scanner, target network, and event time with the run log and approved window. RUN-FIN-030 is the prior-week run. Queue arrival is not the scan’s event time. Save the match you can support.",
      "scan-boundary":
        "In Guides, read the run log’s limits alongside the other open case. Decide how far this scan’s approval reaches; save a claim about that boundary.",
      "request-scope":
        "Open the finance request in Email. Carry the requested resource, read-only role, and end date together. A project deadline explains urgency, not permission to grant access.",
      "approval-boundary":
        "In Guides, compare the finance request and access approval guide. Who may authorize this role, and what stays pending until they do? Save the distinction before choosing where to send it.",
      "device-pattern":
        "Open Rivera’s sign-in and device records in Email. Compare the laptop and phone separately, including successful sign-ins and retries. This is a different person’s case from Patel’s unfamiliar login.",
    };
    const first =
      eventId === "handoff-1"
        ? "Read incoming assignment in Email, then pick a case to start. Morgan is your manager. Starting a case tells them what you will work on; it does not resolve the case."
        : eventId === "status-check-1"
          ? "Open your current case notes and choose what your manager needs to know. Keep what the records show separate from what still needs checking."
          : eventId === "shift-handoff-1"
            ? "Select what the next analyst needs from your recorded outcomes. Keep unanswered questions open and choose who should check next; do not replace your actual choices with a better-looking result."
            : ticket?.decisionReasoning
              ? eventId === "login-help-1" &&
                ticket.reasoning?.phase !== "follow-up"
                ? "Open the actual result in Email. Compare what was tested with what you requested, then save your interpretation. Laptop success alone does not test the phone app."
                : "Your response is recorded. Read what the recipient received and what still needs checking. You can correct your note without replacing the original decision."
              : question
                ? caseHint[question.id]
                : "In Tickets, review your saved claims and choose a next check and response. Save draft keeps the case open; sending the memo carries out your chosen response once.";
    return [
      first ??
        "Choose an open question and read its sources before saving a finding.",
      "Source rows support your claim; opening a record alone does not save one. You may save incomplete findings. Review happens afterward, so you can still send a response with gaps.",
    ];
  }
  const action = shiftWorkActions(view.availableActions).find(
    (a) =>
      a.eventId === eventId && !["ask_manager", "query_records"].includes(a.id),
  );
  const inspected = new Set([
    ...view.artifacts.filter((a) => a.observed).map((a) => a.id),
    ...(view.workplace.inspectedRecordIdsByEvent?.[eventId ?? ""] ?? []),
  ]);
  const hints: string[] = [];
  if (eventId === "suspicious-login-1") {
    const compared = view.workplace.comparisons?.some(
      (c) =>
        c.eventId === eventId &&
        ["login-session-timeline", "vpn-context-1"].every((id) =>
          c.artifactIds.includes(id),
        ),
    );
    hints.push(
      !["login-session-timeline", "vpn-context-1"].every((id) =>
        inspected.has(id),
      )
        ? "In Alerts, open the session timeline and VPN context under Case evidence. Match connection IDs: a VPN record for one session does not explain a different session from the same city."
        : !compared
          ? "Both route sources are open. In Alerts → Case evidence, use Record comparison to save the relationship you found. Reading both sources alone does not record that comparison."
          : "Your route comparison is recorded. In Guides, check the exact laptop label from the alert. Device inventory describes enrollment; it does not identify who used the device.",
    );
    hints.push(
      "For Record search in Alerts, use the account or exact device label first. Time filters use minutes since midnight: 07:30 = 450, 08:00 = 480. Open a result to inspect it; a search result alone is not an inspection.",
    );
  } else if (eventId === "routine-alert-1") {
    hints.push(
      inspected.has("scanner-run-log")
        ? "Compare scanner, target network, and recorded event time across the run log and approved window. RUN-FIN-030 is a prior-week run: similar names do not make it evidence for this event. Queue arrival can be later than the scan."
        : "In Alerts, open this scanner alert's run log and approved window. Find the scanner, target network, and event time in each before deciding whether they describe the same scan.",
    );
  } else if (eventId === "access-request-1") {
    hints.push(
      "Open the finance request and access approval guide. Compare the role being requested with who may authorize it. Project urgency is context; it does not expand someone's approval authority.",
    );
  } else if (eventId === "login-help-1") {
    hints.push(
      "Open Rivera's sign-in summary and device results. Compare the laptop and phone separately, including successful sign-ins and retries. Do not borrow Patel's unfamiliar-device finding for this person's case.",
    );
  } else if (eventId === "shift-handoff-1") {
    hints.push(
      "In Team chat, select the statements the next analyst needs, then choose the next owner/check. The preview shows your recorded outcomes: keep unresolved questions open instead of describing a good-path result you did not record.",
    );
  }
  if (action) hints.push(actionHint(action));
  else
    hints.push(
      view.availableActions.some((a) => a.id === "complete_shift")
        ? "Your shift can now be reviewed. Open Team chat and choose the finish-shift action when you are ready."
        : "This case has no remaining action. Use Current case to review another case, or follow Other work waiting; changing tools does not spend simulation time.",
    );
  hints.push(
    "Checkboxes only edit your selection. Use Clear selections to start over, then review and confirm the save/send. Reading a source is recorded separately; selecting a statement does not prove you inspected its source.",
  );
  return hints;
}
