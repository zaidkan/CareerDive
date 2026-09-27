import type {
  ActionLogEntry,
  Debrief,
  SimulationActionId,
  WorldState,
} from "@sim/schemas";

type Decision = NonNullable<Debrief["decisionReview"]>["decisions"][number];
export type CompletedDecision = {
  sessionId: string;
  careerId: string;
  careerVersion: string;
  decisionId: string;
  choiceId: string;
};
export type CohortCount = {
  decisionId: string;
  choiceId: string;
  count: number;
};

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
    if (interaction.type === "workplace_interaction") {
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
    if (interaction.type === "action" && interaction.action.eventId) {
      const event = state.events.find(
        ({ id }) => id === interaction.action.eventId,
      );
      const effect =
        event &&
        state.rules.eventTemplates[event.templateId]?.actionEffects[
          interaction.action.id
        ];
      for (const artifactId of effect?.observeArtifactIds ?? [])
        opened.add(artifactId);
    }
  }
  return allowed.filter((id) => opened.has(id));
}

function decision(input: {
  id: string;
  choice: string | null;
  evidence: string[];
  signals: Array<[string, boolean]>;
  explanation: string;
  outcome: Decision["outcomeLabel"];
}): Decision {
  return {
    decisionId: input.id,
    userChoiceId: input.choice,
    availableChoiceIds: [...(REVIEW_CHOICES[input.id] ?? [])],
    evidenceUsedIds: input.evidence,
    rubricSignals: input.signals.map(([id, supported]) => ({ id, supported })),
    outcomeLabel: input.outcome,
    explanation: input.explanation,
    cohort: { status: "unavailable" },
  };
}

export function buildDecisionReview(
  state: WorldState,
  log: ActionLogEntry[],
): NonNullable<Debrief["decisionReview"]> {
  const caseAction = firstAction(
    log,
    CASE,
    REVIEW_CHOICES.suspicious_login ?? [],
  );
  const caseChoice =
    caseAction?.interaction.type === "action"
      ? caseAction.interaction.action.id
      : null;
  const caseEvidence = evidenceBefore(
    state,
    log,
    caseAction?.sequence ?? Infinity,
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
    ],
  );
  const caseDocumented =
    (state.taskProgress[`${CASE}:login-ticket-summary`]?.completed &&
      hasStep(
        state,
        CASE,
        "login-ticket-summary",
        "summary-collection-limits",
        "collection-coverage-limit",
      )) ||
    Object.values(state.structuredTickets).some(
      (ticket) =>
        ticket.linkedWorkItemIds.includes(CASE) && Boolean(ticket.uncertainty),
    );
  const routeCompared =
    caseEvidence.includes("login-session-timeline") &&
    caseEvidence.includes("vpn-context-1");
  const caseSupported =
    caseChoice === "escalate_alert" &&
    caseEvidence.includes("device-inventory-1") &&
    routeCompared &&
    caseDocumented;

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
  const scannerDocumented =
    (state.taskProgress[`${SCANNER}:scanner-ticket-summary`]?.completed &&
      hasStep(
        state,
        SCANNER,
        "scanner-ticket-summary",
        "scanner-decision",
        "expected-close",
      )) ||
    Object.values(state.structuredTickets).some(
      (ticket) =>
        ticket.linkedWorkItemIds.includes(SCANNER) &&
        Boolean(ticket.disposition),
    );

  const accessDecision = actionDecision(
    state,
    log,
    ACCESS,
    "route_access_request",
    "access-authority-check",
  );
  const accessChoice = accessDecision.choice;
  const accessEvidence = evidenceBefore(state, log, accessDecision.sequence, [
    "access-request-email",
    "access-approval-guide",
  ]);
  const accessBoundary =
    hasStep(
      state,
      ACCESS,
      "access-authority-check",
      "identify-approval-boundary",
      "route-to-owner",
    ) || accessEvidence.includes("access-approval-guide");

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
      "login-help-next-step",
      "update-saved-password",
    );

  const handoffDecision = actionDecision(
    state,
    log,
    HANDOFF,
    "submit_shift_handoff",
    "end-shift-continuity",
  );
  const handoffChoice = handoffDecision.choice;
  const handoffEvidence = evidenceBefore(state, log, handoffDecision.sequence, [
    "ticket-suspicious-login",
    "scanner-run-log",
    "shift-handoff-prompt",
  ]);
  const handoffFact = hasStep(
    state,
    HANDOFF,
    "end-shift-continuity",
    "handoff-checked",
    "login-records-checked",
  );
  const handoffUncertainty = hasStep(
    state,
    HANDOFF,
    "end-shift-continuity",
    "handoff-open-question",
    "reviewer-question",
  );
  const handoffOwner = hasStep(
    state,
    HANDOFF,
    "end-shift-continuity",
    "handoff-next-owner",
    "next-analyst-review",
  );

  const decisions = [
    decision({
      id: "suspicious_login",
      choice: caseChoice,
      evidence: caseEvidence,
      signals: [
        ["compared_records", routeCompared],
        ["checked_device", caseEvidence.includes("device-inventory-1")],
        ["documented_uncertainty", caseDocumented],
        ["kept_review_boundary", caseChoice === "escalate_alert"],
      ],
      outcome: caseSupported
        ? "supported"
        : caseChoice
          ? "partially_supported"
          : "needs_more_evidence",
      explanation:
        caseChoice === "dismiss_alert"
          ? "You closed the alert while the session owner and route explanation remained unverified. Any completed checks still help a later review."
          : caseSupported
            ? "Your escalation carried traceable records and a clear collection limit into senior review. It did not claim identity or access was proven."
            : caseChoice
              ? "You requested review, but the saved record does not show every comparison or uncertainty note needed for a traceable handoff."
              : "No final A-1042 decision was recorded in this shift.",
    }),
    decision({
      id: "scanner_interruption",
      choice: scannerChoice,
      evidence: scannerEvidence,
      signals: [
        ["made_priority_choice", scannerChoice !== null],
        ["checked_run", scannerEvidence.includes("scanner-run-log")],
        ["checked_window", scannerEvidence.includes("scanner-window")],
        ["documented_closure", scannerClosed && scannerDocumented],
      ],
      outcome:
        scannerChoice && scannerClosed && scannerDocumented
          ? "supported"
          : scannerChoice
            ? "partially_supported"
            : "needs_more_evidence",
      explanation: scannerChoice
        ? `You chose to ${scannerChoice === "handle" ? "switch to the scanner alert" : scannerChoice === "snooze" ? "snooze the interruption" : "continue the current case"}. That timing choice can be defensible; what matters is whether you later checked the run and documented the bounded closure.`
        : "No scanner interruption response was recorded. The alert work itself can still be reviewed.",
    }),
    decision({
      id: "finance_access",
      choice: accessChoice,
      evidence: accessEvidence,
      signals: [
        [
          "reviewed_approval_owner",
          accessEvidence.includes("access-approval-guide"),
        ],
        ["stayed_in_role", accessChoice !== null],
        ["explained_boundary", accessBoundary],
      ],
      outcome:
        accessChoice && accessBoundary
          ? "supported"
          : accessChoice
            ? "partially_supported"
            : "needs_more_evidence",
      explanation: accessChoice
        ? "You routed the request to the finance data owner and kept access pending. Urgency did not become approval authority."
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
      outcome:
        loginChoice && loginReasoned
          ? "supported"
          : loginChoice
            ? "partially_supported"
            : "needs_more_evidence",
      explanation: loginChoice
        ? "You treated the phone retries as a device-specific support problem and kept monitoring as the check on that explanation."
        : "No bounded login-support resolution was recorded.",
    }),
    decision({
      id: "shift_handoff",
      choice: handoffChoice,
      evidence: handoffEvidence,
      signals: [
        ["named_confirmed_work", handoffFact],
        ["kept_open_question", handoffUncertainty],
        ["named_next_owner", handoffOwner],
      ],
      outcome:
        handoffChoice && handoffFact && handoffUncertainty && handoffOwner
          ? "supported"
          : handoffChoice
            ? "partially_supported"
            : "needs_more_evidence",
      explanation: handoffChoice
        ? "Your handoff pointed the next analyst to checked work, an unresolved reviewer question, and a next owner."
        : "No end-of-shift handoff was recorded; the next analyst has no confirmed continuation point from this shift.",
    }),
  ];
  const profile = [
    [
      "Evidence review",
      caseEvidence.includes("device-inventory-1") &&
        scannerEvidence.includes("scanner-run-log"),
      caseEvidence.length > 0 || scannerEvidence.length > 0,
      "Records opened and compared during this shift.",
    ],
    [
      "Handling uncertainty",
      caseDocumented && handoffUncertainty,
      caseDocumented || handoffUncertainty,
      "Unresolved identity and coverage limits kept visible.",
    ],
    [
      "Prioritization",
      scannerChoice !== null && scannerClosed,
      scannerChoice !== null,
      "Interruption choice followed by later scanner work.",
    ],
    [
      "Documentation",
      caseDocumented && scannerDocumented,
      caseDocumented || scannerDocumented,
      "Case and routine closure left traceable notes.",
    ],
    [
      "Role boundaries",
      accessChoice !== null && accessBoundary,
      accessChoice !== null,
      "Access approval stayed with its owner.",
    ],
    [
      "Handoff clarity",
      handoffFact && handoffUncertainty && handoffOwner,
      handoffChoice !== null,
      "Next analyst received facts, open question, and owner.",
    ],
  ].map(([dimension, strong, developing, explanation]) => ({
    dimension: String(dimension),
    state: strong
      ? ("strong" as const)
      : developing
        ? ("developing" as const)
        : ("needs_more_evidence" as const),
    explanation: String(explanation),
  }));
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
  if (!careerVersion || !state.completedActionIds.includes("complete_shift"))
    return [];
  return buildDecisionReview(state, log).decisions.flatMap(
    ({ decisionId, userChoiceId }) =>
      userChoiceId
        ? [
            {
              sessionId: state.sessionId,
              careerId,
              careerVersion,
              decisionId,
              choiceId: userChoiceId,
            },
          ]
        : [],
  );
}

export function cohortForDecision(
  id: string,
  rows: CohortCount[],
): Decision["cohort"] {
  const choices = REVIEW_CHOICES[id] ?? [];
  const counts = Object.fromEntries(
    choices.map((choice) => [
      choice,
      rows.find((row) => row.decisionId === id && row.choiceId === choice)
        ?.count ?? 0,
    ]),
  );
  const sampleSize = Object.values(counts).reduce(
    (total, count) => total + count,
    0,
  );
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
