import type { WorldState } from "@sim/schemas";
import { conditionsMet } from "./conditions.js";
import { handoffCaseLines } from "./handoff-summary.js";
import { findingText } from "./case-findings.js";
import { sourceBundle } from "./reasoning-options.js";

/** Expected player-input failure; safe to show through the API. */
export class StatusSelectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StatusSelectionError";
  }
}

/** The authored status catalog, presented as one message rather than sequential gates. */
export function allStatusGroups(state: WorldState) {
  return (
    state.rules.tasks["morgan-midshift-update"]?.steps.map((step) => ({
      id: step.id,
      title: step.title,
      options: [
        ...step.options,
        ...(step.id === "status-next"
          ? [
              {
                id: "closure-review-needed",
                label:
                  "Closure is recorded; session ownership and missing activity still need independent review.",
                source: {
                  artifactId: "login-session-timeline",
                  quote:
                    "Limit: collection ends 07:45; no file/mail activity collected. A-1042 and login-context-1 summarize this same source, not independent corroboration.",
                },
              },
            ]
          : []),
      ].map((o) => ({
        id: o.id,
        label: o.label,
        sourceId: o.source?.artifactId,
        excerpt: o.source?.quote,
      })),
    })) ?? []
  );
}
export function statusGroups(state: WorldState) {
  const event = state.events.find((e) => e.id === "suspicious-login-1");
  const pendingReview =
    state.structuredTickets["ticket-suspicious-login-1"]?.status ===
      "pending_review" || event?.status === "escalated";
  const task = state.rules.tasks["morgan-midshift-update"];
  return allStatusGroups(state).map((g) => ({
    ...g,
    options: g.options.filter((o) => {
      if (g.id === "status-next") {
        if (o.id === "document-and-review") return event?.status === "active";
        if (o.id === "review-in-progress")
          return event?.status !== "active" && pendingReview;
        if (o.id === "closure-review-needed")
          return event?.status !== "active" && !pendingReview;
        return true;
      }
      const original = task?.steps
        .flatMap((s) => s.options)
        .find((value) => value.id === o.id);
      return conditionsMet(state, original?.when ?? []);
    }),
  }));
}
export function selectedStatus(state: WorldState, ids: string[]) {
  const groups = statusGroups(state);
  if (
    new Set(ids).size !== ids.length ||
    ids.some((id) => !groups.some((g) => g.options.some((o) => o.id === id))) ||
    groups.some((g) => g.options.filter((o) => ids.includes(o.id)).length > 1)
  )
    throw new StatusSelectionError(
      "Choose no more than one current claim in each status group.",
    );
  const options = groups.flatMap((g) =>
    g.options.filter((o) => ids.includes(o.id)),
  );
  const inspected = [
    ...state.observedArtifactIds,
    ...(state.workplace.inspectedRecordIds ?? []),
  ];
  for (const o of options) {
    if (!o.sourceId) continue;
    if (!sourceBundle(o.sourceId, inspected).length)
      throw new StatusSelectionError(
        `Open ${state.artifacts[o.sourceId]?.title ?? "the selected claim’s source"} before sending this status claim.`,
      );
    if (!state.artifacts[o.sourceId]?.body.includes(o.excerpt ?? ""))
      throw new Error("The authored status source excerpt is unavailable.");
  }
  return options;
}
export function caseMemoLines(
  state: Pick<WorldState, "events" | "structuredTickets">,
) {
  return handoffCaseLines(state.events, state.structuredTickets).map((c) => {
    const ticket = state.structuredTickets[`ticket-${c.eventId}`];
    const selected = ticket?.reasoning;
    return {
      ...c,
      revision: ticket?.revision,
      claims:
        selected?.caseFindings?.map((f) => findingText(c.eventId, f)) ?? [],
      unknowns: ticket?.uncertainty ?? "No uncertainty recorded.",
      nextCheck: ticket?.followUp ?? "No next check recorded.",
      sourceIds: [
        ...(ticket?.sourceArtifactIds ?? []),
        ...(ticket?.sourceRecordIds ?? []),
      ],
    };
  });
}
