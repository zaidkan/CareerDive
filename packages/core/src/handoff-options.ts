import { sourceBundle } from "./reasoning-options.js";
import type { ClientView, HandoffSelection, WorldState } from "@sim/schemas";
import { handoffCaseLines } from "./handoff-summary.js";

type Cases = ReturnType<typeof handoffCaseLines>;
export function handoffOptionsForCases(cases: Cases) {
  const login = cases.find((c) => c.eventId === "suspicious-login-1");
  const finance = cases.find((c) => c.eventId === "access-request-1");
  const scanner = cases.find((c) => c.eventId === "routine-alert-1");
  const rivera = cases.find((c) => c.eventId === "login-help-1" && c.memo);
  const options = [
    ...(rivera
      ? [
          {
            id: "carry-rivera",
            label: rivera.label.startsWith("bounded")
              ? "Rivera's phone check completed within its bounded result; reopen on new retries, unfamiliar devices or unrecognized activity."
              : "Rivera's phone-specific follow-up remains untested; carry the actual result and next check.",
            sourceArtifactIds: [
              ...new Set([
                "rivera-result-receipt",
                ...(rivera.memo?.sourceIds ?? []),
              ]),
            ],
          },
        ]
      : []),
    ...(login
      ? [
          {
            id: "carry-login",
            label: login.label.includes("unhandled")
              ? "S-0741 expired without a decision; session ownership and missing activity remain unverified."
              : login.label.includes("closed")
                ? "S-0741 was closed; who used it and what activity is missing remain unverified."
                : "S-0741 still needs senior review of who used it and what activity is missing.",
            sourceArtifactIds: [
              ...new Set([
                "login-session-timeline",
                ...(login.memo?.sourceIds ?? []),
              ]),
            ],
          },
        ]
      : []),
    ...(finance
      ? [
          {
            id: "carry-finance",
            label: finance.label.includes("unhandled")
              ? "Finance access expired unhandled; the business need and data-owner authorization remain unresolved."
              : finance.label.startsWith("approval")
                ? "Sam's role was approved without the data owner; authorization review remains open."
                : finance.label.includes("deadline approver")
                  ? "Finance access went to the deadline approver; the finance data owner still must authorize the role."
                  : finance.label.startsWith("rejected")
                    ? "Finance access was rejected; the business request remains unresolved."
                    : finance.label.startsWith("active")
                      ? "Finance access still needs a recorded decision from the finance data owner."
                      : finance.detail?.includes("interim")
                        ? "Finance access is still waiting for the data owner; the interim report granted no new role."
                        : "Finance access is still waiting for the data owner; no new role has been granted.",
            sourceArtifactIds: [
              ...new Set([
                "access-request-email",
                "access-approval-guide",
                ...(finance.memo?.sourceIds ?? []),
              ]),
            ],
          },
        ]
      : []),
    ...(scanner
      ? [
          {
            id: "carry-scanner",
            label: scanner.label.includes("unhandled")
              ? "A-1180 expired unhandled; its run and approval still need review."
              : scanner.label.startsWith("closed as expected")
                ? "A-1180 closed on its matched run; later activity needs its own check."
                : scanner.label.startsWith("closed")
                  ? "A-1180 closure is recorded; its run/window support still needs review."
                  : "A-1180 remains open; match its run and approval before deciding whether to close it.",
            sourceArtifactIds: [
              ...new Set([
                "scanner-run-log",
                "scanner-window",
                ...(scanner.memo?.sourceIds ?? []),
              ]),
            ],
          },
        ]
      : []),
    {
      id: "cross-session",
      label:
        "S-0731's approved VPN connection supplies the missing route confirmation for S-0741.",
      sourceArtifactIds: ["prior-session-1", "login-session-timeline"],
    },
    {
      id: "grant-before-owner",
      label:
        "Sam's role can begin while the owner reviews it because it expires at 17:00.",
      sourceArtifactIds: ["access-request-email", "access-approval-guide"],
    },
  ];
  return { stateKey: JSON.stringify(cases), options };
}
export function handoffOptions(
  state: Pick<WorldState, "events" | "structuredTickets">,
): NonNullable<ClientView["handoffOptions"]> {
  return handoffOptionsForCases(
    handoffCaseLines(state.events, state.structuredTickets),
  );
}
export function validateHandoffSelections(
  state: WorldState,
  selected: HandoffSelection,
) {
  const offered = handoffOptions(state);
  if (selected.stateKey !== offered.stateKey)
    throw new Error(
      "Case state changed; review the current handoff before sending.",
    );
  if (
    new Set(selected.optionIds).size !== selected.optionIds.length ||
    selected.optionIds.some((id) => !offered.options.some((o) => o.id === id))
  )
    throw new Error("Unknown handoff selection.");
  return offered.options.filter((o) => selected.optionIds.includes(o.id));
}
export function reviewHandoffSelections(
  selected: HandoffSelection,
  inspected: readonly string[] = [],
  followUp = "senior-review",
) {
  const cases = JSON.parse(selected.stateKey) as Cases;
  const offered = handoffOptionsForCases(cases);
  const selectedOptions = offered.options.filter((o) =>
    selected.optionIds.includes(o.id),
  );
  const gaps = offered.options
    .filter(
      (o) => o.id.startsWith("carry-") && !selected.optionIds.includes(o.id),
    )
    .map((o) => `Missing continuity: ${o.label}`);
  const missingSources = selectedOptions.filter(
    (o) =>
      o.id.startsWith("carry-") &&
      !o.sourceArtifactIds.every(
        (source) => sourceBundle(source, inspected).length,
      ),
  );
  gaps.push(
    ...missingSources.map(
      (o) => `Missing inspected continuity source: ${o.label}`,
    ),
  );
  if (
    followUp === "monitor" &&
    cases.some((c) => c.eventId === "suspicious-login-1")
  )
    gaps.push(
      "Name a reviewer or specific next check for unresolved S-0741; monitoring alone does not transfer that question.",
    );
  const contradiction = selected.optionIds.some(
    (id) =>
      !id.startsWith("carry-") || !offered.options.some((o) => o.id === id),
  );
  if (contradiction)
    gaps.push(
      "Selected continuity conflicts with the recorded session or approval boundary.",
    );
  return {
    verdict:
      contradiction ||
      !selected.optionIds.length ||
      missingSources.length ===
        selectedOptions.filter((o) => o.id.startsWith("carry-")).length
        ? ("needs_more_evidence" as const)
        : gaps.length
          ? ("partially_supported" as const)
          : ("supported" as const),
    gaps,
    selectedLabels: selectedOptions.map((o) => o.label),
  };
}

export function handoffReferences(
  selected: HandoffSelection,
  inspected: readonly string[],
): string[] {
  const cases = JSON.parse(selected.stateKey) as Cases;
  return [
    ...new Set(
      handoffOptionsForCases(cases)
        .options.filter((o) => selected.optionIds.includes(o.id))
        .flatMap((o) =>
          o.sourceArtifactIds.flatMap((id) => sourceBundle(id, inspected)),
        ),
    ),
  ];
}
