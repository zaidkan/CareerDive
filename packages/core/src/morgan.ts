import type { ClientView } from "@sim/schemas";

export function managerQuestionRelevant(question: string): boolean {
  return (
    [
      "What case context do we have?",
      "What remains uncertain?",
      "What should the next analyst know?",
    ].includes(question) ||
    !question ||
    /\b(login|alert|case|record|device|laptop|inventory|route|connection|phone|troubleshoot\w*|authoriz\w*|vpn|session|account|ticket|handoff|review|scanner|approval|access|evidence|check|priority|patel|rivera|finance|investigat\w*)\b/i.test(
      question,
    )
  );
}

export function managerQuestionIntent(question: string): string {
  const text = question.trim();
  if (!text || text === "What case context do we have?") return "context";
  if (text === "What remains uncertain?") return "uncertainty";
  if (text === "What should the next analyst know?") return "handoff";
  if (
    /help[- ]request|rivera|\bphone\b|\bretr(?:y|ies|ying)\b|troubleshoot/i.test(
      text,
    )
  )
    return "help";
  if (/scanner|run log|approved window/i.test(text)) return "scanner";
  if (/approval|authoriz|access|finance/i.test(text)) return "approval";
  if (/vpn|route|connection|session.*compar|compar.*session/i.test(text))
    return "route";
  if (/device|laptop|inventory|enrolled/i.test(text)) return "device";
  return "unknown";
}

export function managerQuestionWrongCase(
  eventId: string,
  question: string,
): boolean {
  return (
    (eventId !== "routine-alert-1" && /scanner|A-1180/i.test(question)) ||
    (eventId !== "suspicious-login-1" && /Patel|A-1042/i.test(question)) ||
    (eventId !== "login-help-1" && /Rivera/i.test(question)) ||
    (eventId !== "access-request-1" && /finance/i.test(question))
  );
}

/** Public case revisions only. Clock, energy, chat turns and unrelated work do not invalidate a recap. */
export function managerConsultationKey(
  view: ClientView,
  eventId: string,
  question: string,
): string {
  const event = view.events.find((e) => e.id === eventId);
  const sources = view.artifacts
    .filter(
      (a) =>
        a.eventIds.includes(eventId) &&
        view.workplace.inspectedArtifactIds?.includes(a.id),
    )
    .map((a) => a.id)
    .sort();
  const records = view.workplace.inspectedRecordIdsByEvent?.[eventId] ?? [];
  return JSON.stringify({
    eventId,
    relevant: managerQuestionRelevant(question),
    intent: managerQuestionWrongCase(eventId, question)
      ? `other-case:${question.trim().toLowerCase()}`
      : managerQuestionIntent(question),
    event: event && {
      status: event.status,
      resolution: event.resolution,
      actions: event.completedActionIds
        .filter((id) => id !== "ask_manager")
        .sort(),
      observed: [...event.observedArtifactIds].sort(),
      followUpRefs: event.followUpRefs,
    },
    sources,
    records: [...new Set(records)].sort(),
    comparisons: view.workplace.comparisons?.filter(
      (c) => c.eventId === eventId,
    ),
    ticket: view.structuredTickets?.[`ticket-${eventId}`],
    followUps: view.teamMessages
      ?.filter(
        (m) =>
          m.eventId === eventId &&
          (m.author === "employee" || m.author === "reviewer"),
      )
      .map((m) => m.id),
  });
}

export function managerRecap(
  view: ClientView,
  eventId: string,
  question: string,
): string | undefined {
  const key = managerConsultationKey(view, eventId, question);
  return view.teamMessages?.findLast(
    (m) =>
      m.author === "morgan" &&
      m.actionId === "ask_manager" &&
      m.consultationKey === key,
  )?.body;
}

/** These are checks to make, never hidden findings or a disposition recommendation. */
export function managerIntentReply(
  view: ClientView,
  eventId: string,
  question: string,
): string | undefined {
  const requested = managerQuestionIntent(question);
  const supported =
    requested === "device" || requested === "route"
      ? eventId === "suspicious-login-1"
      : requested === "scanner"
        ? eventId === "routine-alert-1"
        : requested === "approval"
          ? eventId === "access-request-1"
          : requested === "help"
            ? eventId === "login-help-1"
            : true;
  const intent = supported ? requested : "unknown";
  const inspected = new Set(view.workplace.inspectedArtifactIds ?? []);
  switch (intent) {
    case "device":
      if (inspected.has("device-inventory-1"))
        return "You opened the inventory. It tells us whether that exact label is enrolled, not who used it. Keep the label and the ownership question in your note.";
      return "Check the exact laptop label from the alert in Guides. Inventory tells you whether it's enrolled — not who used it.";
    case "route":
      if (
        view.workplace.comparisons?.some(
          (c) =>
            c.eventId === eventId &&
            ["login-session-timeline", "vpn-context-1"].every((id) =>
              c.artifactIds.includes(id),
            ),
        )
      )
        return "You recorded the timeline and VPN comparison. Keep the connection IDs and the remaining session-ownership question with your case note.";
      return ["login-session-timeline", "vpn-context-1"].every((id) =>
        inspected.has(id),
      ) && eventId === "suspicious-login-1"
        ? "You opened the timeline and VPN record. Compare the connection IDs, not just the city. Which session actually links to the VPN record?"
        : "Open this case's session timeline and VPN record before comparing routes. A city estimate alone cannot establish a VPN connection.";
    case "approval":
      return eventId === "access-request-1"
        ? "A deadline isn't an access approval. Check the access guide for who can authorize this role, and keep the request separate from that authorization."
        : "Use the selected case's approval guide to check the authorized owner. If you mean the access request, select that case first.";
    case "scanner":
      if (
        view.workplace.comparisons?.some(
          (c) =>
            c.eventId === eventId &&
            ["scanner-run-log", "scanner-window"].every((id) =>
              c.artifactIds.includes(id),
            ),
        )
      )
        return "You recorded the run-log and approved-window comparison. Keep any mismatch in scanner, target network, or event time open in the note.";
      return "Match the scanner, target network, and event time against the run log and approved window. If they don't match, leave the mismatch open.";
    case "help":
      return eventId === "login-help-1"
        ? "Check Rivera's device-specific results and the troubleshooting guide. Keep the working device separate from the one retrying before choosing the next check."
        : "Select the login-help request if that's the work you mean. Its device-specific results and troubleshooting guide are the starting points.";
    case "unknown":
      return eventId === "routine-alert-1"
        ? "I can help with the scanner match, event time, or the missing reference for the case note. Which one do you mean?"
        : eventId === "access-request-1"
          ? "I can help with the approval owner, the supporting access guide, or what remains open for the handoff. Which one do you mean?"
          : eventId === "login-help-1"
            ? "I can help with the device-specific results, the troubleshooting next step, or the handoff question. Which one do you mean?"
            : eventId === "suspicious-login-1"
              ? "I can help with the device lookup, route/VPN comparison, or what remains uncertain. Which one do you mean?"
              : "I can help with the case context, remaining uncertainty, or what the next analyst needs. Which one do you mean?";
    default:
      return undefined;
  }
}

export function ticketSourceAcknowledgement(
  view: Pick<ClientView, "structuredTickets" | "artifacts" | "workplace">,
  eventId: string,
): string {
  const ticket = view.structuredTickets?.[`ticket-${eventId}`];
  const sources = ticket?.sourceArtifactIds ?? [];
  const comparison = view.workplace.comparisons?.find(
    (c) =>
      c.eventId === eventId &&
      c.artifactIds.every((id) => sources.includes(id)),
  );
  if (comparison)
    return `Your note links the recorded comparison of ${comparison.artifactIds.map((id) => view.artifacts.find((a) => a.id === id)?.title ?? id).join(" and ")}.`;
  const expected =
    eventId === "suspicious-login-1"
      ? ["login-session-timeline", "vpn-context-1"]
      : eventId === "routine-alert-1"
        ? ["scanner-run-log", "scanner-window"]
        : eventId === "access-request-1"
          ? ["access-approval-guide"]
          : eventId === "login-help-1"
            ? ["rivera-auth-summary", "login-troubleshooting-guide"]
            : [];
  const missing = expected.find((id) => !sources.includes(id));
  if (missing)
    return `The note still needs a reference to ${view.artifacts.find((a) => a.id === missing)?.title ?? missing.replaceAll("-", " ")}.`;
  if (eventId === "suspicious-login-1")
    return "The timeline and VPN references are attached; no comparison of them is recorded yet.";
  return sources.length
    ? `Your note names ${view.artifacts.find((a) => a.id === sources[0])?.title ?? sources[0] ?? "the checked source"}. Keep any unchecked match open.`
    : "The note still needs a checked source reference.";
}
