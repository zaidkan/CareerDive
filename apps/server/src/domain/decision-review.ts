import {
  missingLoginComparisonSteps,
  resolveActionEffect,
  reviewReasoning,
  reviewHandoffSelections,
} from "@sim/core";
import type {
  ActionLogEntry,
  Debrief,
  SimulationActionId,
  StructuredTicket,
  WorldState,
} from "@sim/schemas";

type Decision = NonNullable<Debrief["decisionReview"]>["decisions"][number];
export type CompletedDecision = {
  sessionId: string;
  careerId: string;
  careerVersion: string;
  decisionId: string;
  choiceId: string;
  optionSetKey?: string;
};
export type CohortCount = {
  decisionId: string;
  choiceId: string;
  count: number;
  optionSetKey?: string;
};

export function optionSetKey(choices: readonly string[]): string {
  return JSON.stringify([...choices].sort());
}

const CASE = "suspicious-login-1";
const SCANNER = "routine-alert-1";
const ACCESS = "access-request-1";
const LOGIN = "login-help-1";
const HANDOFF = "shift-handoff-1";

export const REVIEW_CHOICES: Record<string, readonly string[]> = {
  suspicious_login: ["escalate_alert", "dismiss_alert"],
  scanner_interruption: ["handle", "snooze", "continue"],
  finance_access: ["route_access_request"],
  routine_login: ["resolve_login_help"],
  shift_handoff: ["submit_shift_handoff"],
};
const V2_CHOICES: Record<string, readonly string[]> = {
  ...REVIEW_CHOICES,
  suspicious_login: [
    "escalate-with-comparisons",
    "escalate-identifiers-only",
    "close-location-explained",
    "close-familiar-account",
  ],
  finance_access: [
    "route-to-owner",
    "route-with-interim",
    "self-approve",
    "route-to-director",
  ],
  shift_handoff: ["complete", "corrected", "thin"],
};

function authoredChoice(
  state: WorldState,
  eventId: string,
  choices: readonly string[],
) {
  const progress = Object.entries(state.taskProgress)
    .filter(([key]) => key.startsWith(`${eventId}:`))
    .map(([, value]) => value);
  const choice =
    progress
      .flatMap(({ outcomeIdsByStep, selectedOptionIdsByStep }) => [
        ...Object.values(outcomeIdsByStep),
        ...Object.values(selectedOptionIdsByStep).flat(),
      ])
      .find((id) => choices.includes(id)) ??
    Object.values(state.flags).find((value) => choices.includes(value));
  return choice ?? null;
}

function authoredSequence(
  log: ActionLogEntry[],
  eventId: string,
  choice: string | null,
) {
  if (!choice) return Infinity;
  const direct = log.find(
    ({ interaction }) =>
      interaction.type === "action" &&
      interaction.action.eventId === eventId &&
      interaction.action.decisionOptionId === choice,
  );
  if (direct) return direct.sequence;
  return (
    log.findLast(
      ({ interaction }) =>
        interaction.type === "task_attempt" &&
        interaction.attempt.eventId === eventId,
    )?.sequence ??
    log.find(
      ({ interaction }) =>
        interaction.type === "action" &&
        interaction.action.eventId === eventId &&
        interaction.action.id === "document_ticket",
    )?.sequence ??
    Infinity
  );
}

function firstAction(
  log: ActionLogEntry[],
  eventId: string,
  choices: readonly string[],
) {
  return log.find(
    ({ interaction }) =>
      interaction.type === "action" &&
      interaction.action.eventId === eventId &&
      choices.includes(interaction.action.id),
  );
}

function actionDecision(
  state: WorldState,
  log: ActionLogEntry[],
  eventId: string,
  actionId: SimulationActionId,
  taskId: string,
) {
  const direct = firstAction(log, eventId, [actionId]);
  if (direct) return { choice: actionId, sequence: direct.sequence };
  if (
    !state.events
      .find(({ id }) => id === eventId)
      ?.completedActionIds.includes(actionId) ||
    !state.taskProgress[`${eventId}:${taskId}`]?.completed
  )
    return { choice: null, sequence: Infinity };
  const attempts = log.filter(
    ({ interaction }) =>
      interaction.type === "task_attempt" &&
      interaction.attempt.eventId === eventId &&
      interaction.attempt.taskId === taskId,
  );
  return { choice: actionId, sequence: attempts.at(-1)?.sequence ?? Infinity };
}

function hasStep(
  state: WorldState,
  eventId: string,
  taskId: string,
  stepId: string,
  optionId: string,
) {
  return (
    state.taskProgress[`${eventId}:${taskId}`]?.selectedOptionIdsByStep[
      stepId
    ]?.includes(optionId) ?? false
  );
}

function evidenceBefore(
  state: WorldState,
  log: ActionLogEntry[],
  sequence: number,
  allowed: readonly string[],
) {
  const opened = new Set<string>();
  for (const entry of log) {
    if (entry.sequence >= sequence) break;
    const interaction = entry.interaction;
    if (interaction.type === "action") {
      const action = interaction.action;
      const event = state.events.find(({ id }) => id === action.eventId);
      if (event) {
        for (const id of resolveActionEffect(state, event, action.id)
          .observeArtifactIds)
          opened.add(id);
      }
    }
    if (interaction.type === "workplace_interaction") {
      if (interaction.interaction.type === "inspect_query_record")
        opened.add(interaction.interaction.recordId);
      if (interaction.interaction.type === "open_artifact")
        opened.add(interaction.interaction.artifactId);
      if (interaction.interaction.type === "open_alert_record") {
        const recordId = interaction.interaction.recordId;
        const artifact = Object.values(state.artifacts).find(
          ({ metadata }) => metadata.alertId === recordId,
        );
        if (artifact) opened.add(artifact.id);
      }
    }
  }
  return allowed.filter((id) => opened.has(id));
}

/** Rate traceable documentation, not the truth or writing quality of free text. */
function ticketGaps(
  state: WorldState,
  eventId: string,
  inspectedBefore: readonly string[],
  required: readonly string[],
  log: ActionLogEntry[],
  sequence: number,
  expectedDisposition?: string,
): string[] {
  let ticket:
    | Pick<
        StructuredTicket,
        | "ticketId"
        | "verifiedEvidence"
        | "uncertainty"
        | "followUp"
        | "disposition"
        | "sourceArtifactIds"
      >
    | undefined = Object.values(state.structuredTickets).find((item) =>
    item.linkedWorkItemIds.includes(eventId),
  );
  // Current journeys carry ticket payloads in the log. Reconstruct fields at the
  // decision; later edits must not improve an earlier decision's assessment.
  // Legacy journeys without payload logs retain their saved ticket snapshot.
  if (ticket) {
    const writes = log.flatMap((entry) =>
      entry.interaction.type === "action" &&
      entry.interaction.action.ticketPayload?.ticketId === ticket?.ticketId
        ? [{ sequence: entry.sequence, action: entry.interaction.action }]
        : [],
    );
    if (writes.length) {
      const ticketId = ticket.ticketId;
      ticket = { ticketId };
      for (const { sequence: savedAt, action } of writes) {
        if (savedAt > sequence) continue;
        const payload = action.ticketPayload;
        ticket = {
          ticketId,
          verifiedEvidence:
            payload?.verifiedEvidence ?? ticket.verifiedEvidence,
          uncertainty: payload?.uncertainty ?? ticket.uncertainty,
          followUp: payload?.followUp ?? ticket.followUp,
          sourceArtifactIds:
            payload?.sourceArtifactIds ?? ticket.sourceArtifactIds,
          disposition:
            action.decisionOptionId ??
            payload?.disposition ??
            ticket.disposition,
        };
      }
    }
  }
  const gaps = required
    .filter(
      (id) =>
        !inspectedBefore.includes(id) ||
        !ticket?.sourceArtifactIds?.includes(id),
    )
    .map((id) => `opened and attached ${state.artifacts[id]?.title ?? id}`);
  for (const field of ["verifiedEvidence", "uncertainty", "followUp"] as const)
    if (!ticket?.[field]?.trim())
      gaps.push(
        {
          verifiedEvidence: "Verified evidence",
          uncertainty: "Uncertainty",
          followUp: "Next step",
        }[field],
      );
  if (!ticket?.disposition?.trim()) gaps.push("a saved disposition");
  if (
    expectedDisposition &&
    ![
      expectedDisposition,
      ...(expectedDisposition === "expected-close"
        ? ["expected-close-with-monitoring"]
        : []),
    ].includes(ticket?.disposition ?? "")
  )
    gaps.push("an expected scanner closure disposition");
  return gaps;
}

function decision(input: {
  id: string;
  choice: string | null;
  evidence: string[];
  reasoningEvidence?: string[];
  signals: Array<[string, boolean]>;
  explanation: string;
  outcome: Decision["outcomeLabel"];
  choices?: readonly string[];
  callbackText?: string[];
  correctionHistory?: Array<{
    stepId: string;
    initialOptionIds: string[];
    correctedOptionIds?: string[] | undefined;
  }>;
}): Decision {
  const availableChoiceIds = [
    ...(input.choices ?? REVIEW_CHOICES[input.id] ?? []),
  ];
  const comparisonEligible = availableChoiceIds.length >= 2;
  return {
    decisionId: input.id,
    userChoiceId: input.choice,
    availableChoiceIds,
    comparisonEligible,
    evidenceUsedIds: input.evidence,
    rubricSignals: input.signals.map(([id, supported]) => ({ id, supported })),
    outcomeLabel: input.outcome,
    explanation: input.explanation,
    reasoningAnalysis: {
      decisionId: input.id,
      choice: input.choice,
      availableChoices: availableChoiceIds,
      evidenceUsedBeforeDecision: input.reasoningEvidence ?? input.evidence,
      whatSupportedIt: input.signals
        .filter(([, supported]) => supported)
        .map(([id]) => id),
      whatWeakenedIt: input.signals
        .filter(([, supported]) => !supported)
        .map(([id]) => id),
      callbackText: input.callbackText ?? [],
      correctionHistory: input.correctionHistory ?? [],
    },
    cohort: { status: "unavailable" },
  };
}

export function buildDecisionReview(
  state: WorldState,
  log: ActionLogEntry[],
): NonNullable<Debrief["decisionReview"]> {
  // One logged memo transaction contains the same two canonical operations as
  // the legacy save-then-send flow. Both retain its provenance sequence.
  log = log.flatMap((entry) => {
    if (
      entry.interaction.type !== "action" ||
      !entry.interaction.action.ticketPayload?.dispatch
    )
      return [entry];
    const action = entry.interaction.action;
    const dispatch = action.ticketPayload?.dispatch;
    if (!dispatch) return [entry];
    return [
      entry,
      {
        ...entry,
        interaction: {
          type: "action" as const,
          action: {
            id: dispatch,
            actorId: action.actorId,
            eventId: action.eventId,
          },
        },
      },
    ];
  });
  const v2 = state.careerVersion === "2.0.0";
  const choicesFor = (id: string) =>
    v2
      ? id === "finance_access"
        ? (state.rules.tasks["access-authority-check"]?.steps
            .at(-1)
            ?.options.map((o) => o.id) ??
          V2_CHOICES[id] ??
          [])
        : (V2_CHOICES[id] ?? [])
      : (REVIEW_CHOICES[id] ?? []);
  const callbacksFor = (eventId: string) =>
    state.pendingCallbacks
      .filter((callback) => callback.eventId === eventId && callback.applied)
      .map(({ body }) => body);
  const caseAction = firstAction(
    log,
    CASE,
    REVIEW_CHOICES.suspicious_login ?? [],
  );
  const caseChoice = v2
    ? authoredChoice(state, CASE, choicesFor("suspicious_login"))
    : caseAction?.interaction.type === "action"
      ? caseAction.interaction.action.id
      : null;
  const caseEvidence = evidenceBefore(
    state,
    log,
    v2
      ? authoredSequence(log, CASE, caseChoice)
      : (caseAction?.sequence ?? Infinity),
    [
      "suspicious-login-alert",
      "login-context-1",
      "account-history-1",
      "device-inventory-1",
      "employee-login-reply",
      "prior-session-1",
      "vpn-context-1",
      "login-session-timeline",
      "travel-status-1",
      ...state.queryHistory
        .filter(({ actorEventId }) => actorEventId === CASE)
        .flatMap(({ resultIds }) => resultIds),
    ],
  );
  const caseGaps = ticketGaps(
    state,
    CASE,
    caseEvidence,
    ["login-session-timeline", "vpn-context-1", "device-inventory-1"],
    log,
    v2
      ? authoredSequence(log, CASE, caseChoice)
      : (caseAction?.sequence ?? Infinity),
  );
  const authoredCaseDocumented = Boolean(
    state.taskProgress[`${CASE}:login-ticket-summary`]?.completed &&
    hasStep(
      state,
      CASE,
      "login-ticket-summary",
      "summary-collection-limits",
      "collection-coverage-limit",
    ),
  );
  const caseDocumented =
    ["login-session-timeline", "vpn-context-1", "device-inventory-1"].every(
      (id) => caseEvidence.includes(id),
    ) &&
    (authoredCaseDocumented ||
      Object.values(state.structuredTickets).some(
        (ticket) =>
          ticket.linkedWorkItemIds.includes(CASE) && caseGaps.length === 0,
      ));
  const routeCompared =
    caseEvidence.includes("login-session-timeline") &&
    caseEvidence.includes("vpn-context-1") &&
    (!v2 ||
      log.some(
        ({ sequence, interaction }) =>
          sequence < authoredSequence(log, CASE, caseChoice) &&
          interaction.type === "workplace_interaction" &&
          interaction.interaction.type === "compare_artifacts" &&
          interaction.interaction.eventId === CASE &&
          ["login-session-timeline", "vpn-context-1"].every(
            (id) =>
              interaction.interaction.type === "compare_artifacts" &&
              interaction.interaction.artifactIds.includes(id),
          ),
      ));
  const caseSupported =
    (caseChoice === "escalate_alert" ||
      caseChoice === "escalate-with-comparisons") &&
    caseEvidence.includes("device-inventory-1") &&
    routeCompared &&
    caseDocumented;
  const caseHasEvidence = caseEvidence.length > 0;

  const scannerResponse = log.find(
    ({ interaction }) =>
      interaction.type === "notification_response" &&
      interaction.response.notificationId === "routine-scanner-arrived",
  );
  const scannerChoice =
    scannerResponse?.interaction.type === "notification_response"
      ? scannerResponse.interaction.response.response
      : null;
  const scannerClosure = firstAction(log, SCANNER, ["dismiss_alert"]);
  const scannerClosed = Boolean(scannerClosure);
  const scannerEvidence = evidenceBefore(
    state,
    log,
    scannerClosure?.sequence ?? Infinity,
    ["scanner-alert", "scanner-run-log", "scanner-window"],
  );
  const scannerGaps = ticketGaps(
    state,
    SCANNER,
    scannerEvidence,
    ["scanner-run-log", "scanner-window"],
    log,
    scannerClosure?.sequence ?? Infinity,
    "expected-close",
  );
  const scannerDocumented =
    ["scanner-run-log", "scanner-window"].every((id) =>
      scannerEvidence.includes(id),
    ) &&
    ((state.taskProgress[`${SCANNER}:scanner-ticket-summary`]?.completed &&
      hasStep(
        state,
        SCANNER,
        "scanner-ticket-summary",
        "scanner-decision",
        "expected-close",
      )) ||
      hasStep(
        state,
        SCANNER,
        "scanner-ticket-summary",
        "scanner-decision",
        "expected-close-with-monitoring",
      ) ||
      Object.values(state.structuredTickets).some(
        (ticket) =>
          ticket.linkedWorkItemIds.includes(SCANNER) &&
          scannerGaps.length === 0,
      ));
  const scannerChecked =
    scannerEvidence.includes("scanner-run-log") &&
    scannerEvidence.includes("scanner-window");

  const accessDecision = actionDecision(
    state,
    log,
    ACCESS,
    "route_access_request",
    "access-authority-check",
  );
  const accessChoice = v2
    ? authoredChoice(state, ACCESS, choicesFor("finance_access"))
    : accessDecision.choice;
  const accessEvidence = evidenceBefore(
    state,
    log,
    v2 ? authoredSequence(log, ACCESS, accessChoice) : accessDecision.sequence,
    ["access-request-email", "access-approval-guide"],
  );
  const accessBoundary =
    (v2
      ? ["route-to-owner", "route-with-interim"].includes(accessChoice ?? "")
      : hasStep(
          state,
          ACCESS,
          "access-authority-check",
          "identify-approval-boundary",
          "route-to-owner",
        )) ||
    (!v2 && accessEvidence.includes("access-approval-guide"));
  const accessSupported =
    accessChoice !== null &&
    accessBoundary &&
    accessEvidence.includes("access-approval-guide");

  const loginDecision = actionDecision(
    state,
    log,
    LOGIN,
    "resolve_login_help",
    "employee-login-troubleshooting",
  );
  const loginChoice = loginDecision.choice;
  const loginEvidence = evidenceBefore(state, log, loginDecision.sequence, [
    "rivera-login-email",
    "rivera-auth-summary",
    "rivera-device-inventory",
    "login-troubleshooting-guide",
  ]);
  const loginReasoned =
    hasStep(
      state,
      LOGIN,
      "employee-login-troubleshooting",
      "login-help-evidence",
      "phone-retries",
    ) &&
    hasStep(
      state,
      LOGIN,
      "employee-login-troubleshooting",
      "login-help-evidence",
      "laptop-success",
    ) &&
    hasStep(
      state,
      LOGIN,
      "employee-login-troubleshooting",
      "login-help-next-step",
      "update-saved-password",
    );
  const loginSupported =
    loginChoice !== null &&
    loginReasoned &&
    loginEvidence.includes("rivera-auth-summary");

  const handoffDecision = actionDecision(
    state,
    log,
    HANDOFF,
    "submit_shift_handoff",
    "end-shift-continuity",
  );
  const handoffChoice = v2
    ? authoredChoice(state, HANDOFF, choicesFor("shift_handoff"))
    : handoffDecision.choice;
  const handoffEvidence = evidenceBefore(
    state,
    log,
    v2
      ? authoredSequence(log, HANDOFF, handoffChoice)
      : handoffDecision.sequence,
    ["ticket-suspicious-login", "scanner-run-log", "shift-handoff-prompt"],
  );
  const savedHandoff = firstAction(log, HANDOFF, ["submit_shift_handoff"]);
  const handoffPayload =
    savedHandoff?.interaction.type === "action"
      ? savedHandoff.interaction.action.handoffPayload
      : undefined;
  const handoffInspectedBefore = evidenceBefore(
    state,
    log,
    savedHandoff?.sequence ?? Infinity,
    Object.keys(state.artifacts),
  );
  const handoffFact = handoffPayload
    ? ["login-session-timeline", "vpn-context-1", "device-inventory-1"].every(
        (id) => handoffPayload.sourceArtifactIds.includes(id),
      ) &&
      handoffPayload.sourceArtifactIds.every(
        (id) =>
          state.workplace.inspectedArtifactIds?.includes(id) &&
          handoffInspectedBefore.includes(id),
      )
    : hasStep(
        state,
        HANDOFF,
        "end-shift-continuity",
        "handoff-checked",
        "login-records-checked",
      ) &&
      hasStep(
        state,
        HANDOFF,
        "end-shift-continuity",
        "handoff-checked",
        "scanner-checked",
      );
  const handoffUncertainty = handoffPayload
    ? authoredCaseDocumented ||
      ticketGaps(
        state,
        CASE,
        handoffInspectedBefore,
        ["login-session-timeline", "vpn-context-1", "device-inventory-1"],
        log,
        savedHandoff?.sequence ?? Infinity,
      ).length === 0
    : hasStep(
        state,
        HANDOFF,
        "end-shift-continuity",
        "handoff-open-question",
        "reviewer-question",
      );
  const handoffOwner = handoffPayload
    ? Boolean(handoffPayload.followUp)
    : hasStep(
        state,
        HANDOFF,
        "end-shift-continuity",
        "handoff-next-owner",
        "next-analyst-review",
      );
  const handoffGaps = handoffPayload
    ? [
        ...["login-session-timeline", "vpn-context-1", "device-inventory-1"]
          .filter(
            (id) =>
              !handoffPayload.sourceArtifactIds.includes(id) ||
              !state.workplace.inspectedArtifactIds?.includes(id) ||
              !handoffInspectedBefore.includes(id),
          )
          .map(
            (id) => `opened and attached ${state.artifacts[id]?.title ?? id}`,
          ),
        ...(!handoffUncertainty
          ? ["a source-backed case uncertainty note"]
          : []),
        ...(!handoffOwner ? ["a next owner/check"] : []),
      ]
    : [];
  const handoffSupported =
    handoffChoice !== null &&
    handoffFact &&
    handoffUncertainty &&
    handoffOwner &&
    (handoffPayload ? true : caseHasEvidence && scannerChecked);

  const decisions = [
    decision({
      id: "suspicious_login",
      choice: caseChoice,
      choices: choicesFor("suspicious_login"),
      callbackText: callbacksFor(CASE),
      evidence: caseEvidence,
      signals: [
        ["compared_records", routeCompared],
        ["checked_device", caseEvidence.includes("device-inventory-1")],
        ["documented_uncertainty", caseDocumented],
        [
          "kept_review_boundary",
          caseChoice === "escalate_alert" ||
            caseChoice?.startsWith("escalate-") === true,
        ],
      ],
      outcome: caseSupported
        ? "supported"
        : caseChoice && caseHasEvidence
          ? "partially_supported"
          : "needs_more_evidence",
      explanation:
        v2 && caseChoice
          ? ({
              "escalate-with-comparisons":
                caseSupported &&
                [
                  "login-session-timeline",
                  "vpn-context-1",
                  "device-inventory-1",
                ].every((id) =>
                  state.structuredTickets[
                    `ticket-${CASE}`
                  ]?.sourceArtifactIds?.includes(id),
                )
                  ? "Your review request included opened route and device sources, a recorded comparison, and a saved uncertainty note."
                  : `You chose to request review with comparisons. Missing saved steps: ${missingLoginComparisonSteps(state, CASE).join(" ")}${!caseDocumented ? " Save findings, uncertainty, and a next step in the case ticket." : ""} The reviewer must recover these checks; an absent record does not establish a misconception.`,
              "escalate-identifiers-only":
                "You sent the identifiers for senior review. The reviewer must reconstruct the comparisons from saved records.",
              "close-location-explained":
                "You closed using the location explanation. The saved route mismatch and session-owner question remain available for later review.",
              "close-familiar-account":
                "You closed using familiar account history. The flagged session's owner remains unverified in the record.",
            }[caseChoice] ?? "The final disposition was recorded.")
          : caseChoice === "dismiss_alert"
            ? caseHasEvidence
              ? "You closed the alert while the session owner and route explanation remained unverified. The recorded checks can support later review."
              : "You closed the alert without a recorded source inspection to explain the unfamiliar session."
            : caseSupported
              ? "Your escalation carried traceable records and a clear collection limit into senior review. It did not claim identity or access was proven."
              : caseChoice && caseHasEvidence
                ? "You requested review, but the saved record does not show every comparison or uncertainty note needed for a traceable handoff."
                : caseChoice
                  ? "You requested review without a recorded source inspection before that decision."
                  : "No final A-1042 decision was recorded in this shift.",
    }),
    decision({
      id: "scanner_interruption",
      choice: scannerChoice,
      evidence: scannerEvidence,
      reasoningEvidence: evidenceBefore(
        state,
        log,
        scannerResponse?.sequence ?? Infinity,
        ["scanner-alert", "scanner-run-log", "scanner-window"],
      ),
      signals: [
        ["made_priority_choice", scannerChoice !== null],
        ["checked_run", scannerEvidence.includes("scanner-run-log")],
        ["checked_window", scannerEvidence.includes("scanner-window")],
        ["documented_closure", scannerClosed && scannerDocumented],
      ],
      outcome:
        scannerChoice && scannerClosed && scannerDocumented && scannerChecked
          ? "supported"
          : scannerChoice && (scannerEvidence.length > 0 || scannerDocumented)
            ? "partially_supported"
            : "needs_more_evidence",
      explanation: scannerChoice
        ? `You chose to ${scannerChoice === "handle" ? "switch to the scanner alert" : scannerChoice === "snooze" ? "snooze the interruption" : "continue the current case"}. That timing choice can be defensible. ${scannerChecked && scannerClosed && scannerDocumented ? "Your later run and window checks support the documented closure." : "The saved record does not show every run, window, and closure check needed to support it."}`
        : "No scanner interruption response was recorded. The alert work itself can still be reviewed.",
    }),
    decision({
      id: "finance_access",
      choice: accessChoice,
      choices: choicesFor("finance_access"),
      callbackText: callbacksFor(ACCESS),
      evidence: accessEvidence,
      signals: [
        [
          "reviewed_approval_owner",
          accessEvidence.includes("access-approval-guide"),
        ],
        [
          "stayed_in_role",
          accessChoice === "route_access_request" ||
            accessChoice === "route-to-owner" ||
            accessChoice === "route-with-interim",
        ],
        ["explained_boundary", accessBoundary],
      ],
      outcome: accessSupported
        ? "supported"
        : accessChoice && accessBoundary
          ? "partially_supported"
          : "needs_more_evidence",
      explanation:
        v2 && accessChoice
          ? ({
              "route-to-owner":
                "You routed the request to the finance data owner and kept access pending.",
              "route-with-interim":
                "You routed the request to the owner and offered an interim report without granting the requested role.",
              "self-approve":
                "You approved the role directly. The record shows the finance data owner's authorization was not obtained.",
              "route-to-director":
                "You sent the role request to the deadline approver. Finance data-owner authorization remains pending; no role has been granted.",
              "reject-as-attack":
                "You rejected the request as an attack. The urgency alone does not establish malicious intent, and the business request remains unresolved.",
            }[accessChoice] ?? "The access decision was recorded.")
          : accessChoice
            ? accessSupported
              ? "You checked the approval guide, routed the request to the finance data owner, and kept access pending."
              : "You routed the request, but the saved record does not show both an approval-guide check and a clear authority boundary."
            : "No approval-routing action was recorded. Project urgency alone cannot authorize access.",
    }),
    decision({
      id: "routine_login",
      choice: loginChoice,
      evidence: loginEvidence,
      signals: [
        ["compared_devices", loginEvidence.includes("rivera-auth-summary")],
        ["tested_ordinary_cause", loginReasoned],
        ["kept_reassessment_open", loginReasoned],
      ],
      outcome: loginSupported
        ? "supported"
        : loginChoice && (loginEvidence.length > 0 || loginReasoned)
          ? "partially_supported"
          : "needs_more_evidence",
      explanation: loginChoice
        ? loginSupported
          ? "You compared the phone retries with a working laptop, chose a bounded saved-password check, and kept monitoring open."
          : "You completed login support, but the saved record does not show every device comparison and bounded next step behind that conclusion."
        : "No bounded login-support resolution was recorded.",
    }),
    decision({
      id: "shift_handoff",
      choice: handoffChoice,
      choices: choicesFor("shift_handoff"),
      callbackText: callbacksFor(HANDOFF),
      correctionHistory:
        state.taskProgress[`${HANDOFF}:end-shift-continuity`]
          ?.correctionHistory ?? [],
      evidence: handoffPayload
        ? handoffPayload.sourceArtifactIds.filter((id) =>
            handoffInspectedBefore.includes(id),
          )
        : handoffEvidence,
      signals: [
        ["named_confirmed_work", handoffFact],
        ["kept_open_question", handoffUncertainty],
        ["named_next_owner", handoffOwner],
      ],
      outcome: handoffSupported
        ? "supported"
        : handoffChoice && (handoffFact || handoffUncertainty || handoffOwner)
          ? "partially_supported"
          : "needs_more_evidence",
      explanation:
        v2 && handoffChoice
          ? handoffPayload
            ? handoffSupported
              ? "Your structured handoff carries the opened timeline, VPN and device sources, a source-backed uncertainty note, and the next check. Free-text meaning is not evaluated."
              : `Your handoff is missing: ${handoffGaps.join("; ")}. Selected references and generated case states alone do not establish a complete handoff.`
            : `You sent a ${handoffChoice} handoff. The saved record keeps initial omissions and later corrections in order.`
          : handoffChoice
            ? handoffSupported
              ? "Your handoff named checked work, an unresolved reviewer question, and the next owner with supporting records."
              : "You sent a handoff, but the saved record does not support every checked fact, open question, and next owner it needs."
            : "No end-of-shift handoff was recorded; the next analyst has no confirmed continuation point from this shift.",
    }),
  ];
  // Assess the exact selections saved at the first consequential decision.
  // Later corrections are separate revisions and never upgrade that decision.
  const caseIds: Record<string, string> = {
    suspicious_login: CASE,
    scanner_interruption: SCANNER,
    finance_access: ACCESS,
    routine_login: LOGIN,
    shift_handoff: HANDOFF,
  };
  const commitActions: Record<string, string[]> = {
    [CASE]: ["escalate_alert", "dismiss_alert"],
    [SCANNER]: ["dismiss_alert"],
    [ACCESS]: ["route_access_request"],
    [LOGIN]: ["resolve_login_help"],
    [HANDOFF]: ["submit_shift_handoff"],
  };
  const allSources = [
    ...Object.keys(state.artifacts),
    ...Object.values(state.rules.datasets).flatMap((dataset) =>
      dataset.records.map((record) => record.id),
    ),
  ];
  for (const reviewed of decisions) {
    const eventId = caseIds[reviewed.decisionId];
    if (!eventId) continue;
    const committed = firstAction(log, eventId, commitActions[eventId] ?? []);
    const before = committed?.sequence ?? Infinity;
    const writes = log.filter(
      (entry) =>
        entry.sequence <= before &&
        entry.interaction.type === "action" &&
        entry.interaction.action.eventId === eventId &&
        entry.interaction.action.ticketPayload,
    );
    const saved = writes.at(-1);
    const action =
      saved?.interaction.type === "action"
        ? saved.interaction.action
        : undefined;
    const dispositionAction = [...writes]
      .reverse()
      .find(
        (entry) =>
          entry.interaction.type === "action" &&
          entry.interaction.action.id !== "update_ticket_notes" &&
          entry.interaction.action.decisionOptionId,
      );
    const disposition =
      dispositionAction?.interaction.type === "action"
        ? dispositionAction.interaction.action.decisionOptionId
        : undefined;
    const selections = action?.ticketPayload?.reasoning;
    const sourcesAtSave = evidenceBefore(
      state,
      log,
      saved?.sequence ?? -1,
      allSources,
    );
    const handoff =
      committed?.interaction.type === "action"
        ? committed.interaction.action.handoffPayload?.selections
        : undefined;
    if (selections || handoff) {
      reviewed.evaluationMode = "structured-selections";
      if (eventId === SCANNER && !reviewed.userChoiceId && disposition) {
        reviewed.userChoiceId = disposition;
        reviewed.availableChoiceIds =
          state.rules.tasks["scanner-ticket-summary"]?.steps
            .at(-1)
            ?.outcomes.map((o) => o.id) ?? [];
        reviewed.comparisonEligible = reviewed.availableChoiceIds.length >= 2;
        if (reviewed.reasoningAnalysis) {
          reviewed.reasoningAnalysis.choice = reviewed.userChoiceId;
          reviewed.reasoningAnalysis.availableChoices =
            reviewed.availableChoiceIds;
        }
      }
      const reasoningAssessment = selections
        ? reviewReasoning(eventId, selections, sourcesAtSave)
        : undefined;
      const assessed =
        reasoningAssessment ??
        (handoff
          ? reviewHandoffSelections(
              handoff,
              evidenceBefore(state, log, before, allSources),
              committed?.interaction.type === "action"
                ? committed.interaction.action.handoffPayload?.followUp
                : undefined,
            )
          : undefined);
      if (!assessed) continue;
      const boundary =
        Boolean(committed) &&
        (eventId === CASE
          ? committed?.interaction.type === "action" &&
            committed.interaction.action.id === "escalate_alert" &&
            [
              "escalate-with-comparisons",
              "escalate-identifiers-only",
              "escalate_alert",
            ].includes(reviewed.userChoiceId ?? "")
          : eventId === ACCESS
            ? [
                "route-to-owner",
                "route-with-interim",
                "route_access_request",
              ].includes(
                committed?.interaction.type === "action"
                  ? (committed.interaction.action.decisionOptionId ??
                      reviewed.userChoiceId ??
                      "")
                  : "",
              )
            : eventId === LOGIN
              ? (committed?.interaction.type === "action"
                  ? (committed.interaction.action.decisionOptionId ??
                    "update-saved-password")
                  : "") === "update-saved-password"
              : eventId === SCANNER
                ? ["expected-close", "expected-close-with-monitoring"].includes(
                    disposition ?? "",
                  )
                : true);
      reviewed.outcomeLabel = boundary
        ? assessed.verdict
        : "needs_more_evidence";
      if (!committed) {
        reviewed.userChoiceId = null;
        if (reviewed.reasoningAnalysis)
          reviewed.reasoningAnalysis.choice = null;
      }
      const gaps = [
        ...assessed.gaps,
        ...(!committed
          ? ["No consequential case decision was recorded."]
          : !boundary
            ? [
                "The recorded action does not preserve this case's session, device or authority boundary.",
              ]
            : []),
      ];
      reviewed.explanation = `Recorded action: ${committed?.interaction.type === "action" ? (committed.interaction.action.decisionOptionId ?? committed.interaction.action.id) : "none"}. Saved selections: ${assessed.selectedLabels.join("; ") || "none"}. ${gaps.length ? gaps.join(" ") : "Essential evidence, uncertainty and next-step groups are supported."}`;
      reviewed.fieldReviews = reasoningAssessment
        ? Object.entries(reasoningAssessment.fields).map(([field, value]) => ({
            field,
            outcomeLabel: value.verdict,
            selectedLabels: value.selectedLabels,
            gaps: value.gaps,
          }))
        : [
            {
              field: "What carries forward",
              outcomeLabel: assessed.verdict,
              selectedLabels: assessed.selectedLabels,
              gaps: assessed.gaps,
            },
          ];
      reviewed.rubricSignals = reviewed.fieldReviews.map((field) => ({
        id: field.field,
        supported: field.outcomeLabel === "supported",
      }));
      if (reviewed.reasoningAnalysis) {
        reviewed.reasoningAnalysis.whatSupportedIt = reviewed.fieldReviews
          .filter((field) => field.outcomeLabel === "supported")
          .map((field) => field.field);
        reviewed.reasoningAnalysis.whatWeakenedIt = gaps;
        reviewed.reasoningAnalysis.evidenceUsedBeforeDecision = sourcesAtSave;
      }
      reviewed.evidenceUsedIds = sourcesAtSave;
      if (reviewed.reasoningAnalysis) {
        const initialIds = selections
          ? [
              ...selections.evidence,
              ...selections.context,
              ...selections.uncertainty,
              ...selections.nextStep,
            ]
          : (handoff?.optionIds ?? []);
        const corrections = log.filter(
          (entry) =>
            entry.sequence > before &&
            entry.interaction.type === "action" &&
            entry.interaction.action.eventId === eventId &&
            (entry.interaction.action.ticketPayload?.reasoning ||
              entry.interaction.action.handoffPayload?.selections),
        );
        reviewed.reasoningAnalysis.correctionHistory.push(
          ...corrections.map((entry) => {
            const correction =
              entry.interaction.type === "action"
                ? entry.interaction.action.ticketPayload?.reasoning
                : undefined;
            return {
              stepId: `revision-${String(entry.sequence)}`,
              initialOptionIds: initialIds,
              correctedOptionIds: correction
                ? [
                    ...correction.evidence,
                    ...correction.context,
                    ...correction.uncertainty,
                    ...correction.nextStep,
                  ]
                : entry.interaction.type === "action"
                  ? (entry.interaction.action.handoffPayload?.selections
                      ?.optionIds ?? [])
                  : [],
            };
          }),
        );
      }
    } else {
      reviewed.evaluationMode = "limited-text-evaluation";
      if (reviewed.outcomeLabel === "supported")
        reviewed.outcomeLabel = "partially_supported";
      // A legacy text box only proves a note exists, not what its words mean.
      const textClaims = new Set([
        "documented_uncertainty",
        "documented_closure",
        "kept_open_question",
      ]);
      reviewed.rubricSignals = reviewed.rubricSignals.filter(
        (signal) => !textClaims.has(signal.id),
      );
      if (reviewed.reasoningAnalysis) {
        reviewed.reasoningAnalysis.whatSupportedIt =
          reviewed.reasoningAnalysis.whatSupportedIt.filter(
            (id) => !textClaims.has(id),
          );
        reviewed.reasoningAnalysis.whatWeakenedIt =
          reviewed.reasoningAnalysis.whatWeakenedIt.filter(
            (id) => !textClaims.has(id),
          );
      }
      const legacyGaps =
        eventId === CASE
          ? [
              ...caseGaps,
              ...(!routeCompared
                ? [
                    "Record the session timeline (S-0741 / S-0731) + VPN catalogue NET-VPN-04 comparison, or select both records together in the saved case note.",
                  ]
                : []),
            ]
          : eventId === SCANNER
            ? scannerGaps
            : eventId === HANDOFF
              ? handoffGaps.map((gap) =>
                  gap.replace(
                    "a source-backed case uncertainty note",
                    "a complete legacy case note (text meaning not evaluated)",
                  ),
                )
              : [];
      reviewed.explanation = `Recorded action: ${committed?.interaction.type === "action" ? committed.interaction.action.id : "none"}. Limited-text-evaluation: this saved shift has no versioned selections. Inspected records and recorded actions can be traced; the meaning of free text is not evaluated.${legacyGaps.length ? ` Missing legacy fields/references: ${legacyGaps.join("; ")}.` : ""}`;
    }
  }
  const profile: NonNullable<Debrief["decisionReview"]>["profile"] = [
    "Evidence review",
    "Handling uncertainty",
    "Follow-through",
    "Documentation",
    "Role boundaries",
    "Handoff clarity",
  ].map((dimension) => ({
    dimension,
    state: "needs_more_evidence",
    explanation: "",
  }));
  const verdictRank = {
    supported: 2,
    partially_supported: 1,
    needs_more_evidence: 0,
  };
  for (const item of profile) {
    const relevant =
      item.dimension === "Role boundaries"
        ? decisions.filter((d) => d.decisionId === "finance_access")
        : item.dimension === "Handoff clarity"
          ? decisions.filter((d) => d.decisionId === "shift_handoff")
          : item.dimension === "Follow-through"
            ? decisions.filter((d) => d.decisionId === "scanner_interruption")
            : decisions.filter((d) =>
                [
                  "suspicious_login",
                  "scanner_interruption",
                  "routine_login",
                ].includes(d.decisionId),
              );
    const weakest = Math.min(
      ...relevant.map((d) => verdictRank[d.outcomeLabel]),
    );
    item.state =
      weakest === 2
        ? "supported"
        : weakest === 1
          ? "partially_supported"
          : "needs_more_evidence";
    item.explanation =
      item.dimension === "Follow-through"
        ? "Records interruption response and later scanner follow-through, not general prioritization ability."
        : `Evidence coverage of the saved selections; limited text and later corrections do not establish the original reasoning.${item.dimension === "Documentation" ? ` Gaps: ${relevant.flatMap((d) => d.fieldReviews?.flatMap((f) => f.gaps) ?? (d.decisionId === "suspicious_login" ? caseGaps : d.decisionId === "scanner_interruption" ? scannerGaps : [])).join("; ") || "No structured field gaps recorded."}` : ""}`;
  }
  return {
    careerVersion: state.careerVersion ?? "unknown",
    decisions,
    profile,
  };
}

export function completedDecisions(
  state: WorldState,
  log: ActionLogEntry[],
  careerId: string,
): CompletedDecision[] {
  const careerVersion = state.careerVersion;
  const sessionKind: string = state.sessionKind;
  if (
    !careerVersion ||
    sessionKind !== "assessed" ||
    !state.completedActionIds.includes("complete_shift")
  )
    return [];
  return buildDecisionReview(state, log).decisions.flatMap(
    ({ decisionId, userChoiceId, availableChoiceIds }) =>
      userChoiceId
        ? [
            {
              sessionId: state.sessionId,
              careerId,
              careerVersion,
              decisionId,
              choiceId: userChoiceId,
              ...(careerVersion === "2.0.0"
                ? { optionSetKey: optionSetKey(availableChoiceIds) }
                : {}),
            },
          ]
        : [],
  );
}

export function cohortForDecision(
  id: string,
  rows: CohortCount[],
  choices: readonly string[] = REVIEW_CHOICES[id] ?? [],
): Decision["cohort"] {
  if (choices.length < 2) return { status: "unavailable" };
  const key = optionSetKey(choices);
  const legacyKey = optionSetKey(REVIEW_CHOICES[id] ?? []);
  const counts = Object.fromEntries(
    choices.map((choice) => [
      choice,
      rows.find(
        (row) =>
          row.decisionId === id &&
          row.choiceId === choice &&
          (row.optionSetKey === key ||
            (!row.optionSetKey && key === legacyKey)),
      )?.count ?? 0,
    ]),
  );
  const sampleSize = Object.values(counts).reduce(
    (total, count) => total + count,
    0,
  );
  if (
    !Number.isSafeInteger(sampleSize) ||
    Object.values(counts).some(
      (count) => !Number.isSafeInteger(count) || count < 0,
    )
  )
    return { status: "unavailable" };
  if (sampleSize < 30) return { status: "insufficient" };
  const fractions = choices.map((choice) => ({
    choice,
    exact: (100 * (counts[choice] ?? 0)) / sampleSize,
  }));
  const percentages = Object.fromEntries(
    fractions.map(({ choice, exact }) => [choice, Math.floor(exact)]),
  );
  let remaining =
    100 - Object.values(percentages).reduce((total, value) => total + value, 0);
  for (const { choice } of [...fractions].sort(
    (a, b) => (b.exact % 1) - (a.exact % 1),
  )) {
    if (remaining-- <= 0) break;
    percentages[choice] = (percentages[choice] ?? 0) + 1;
  }
  return { status: "ready", sampleSize, counts, percentages };
}
