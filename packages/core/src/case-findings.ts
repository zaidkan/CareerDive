import type { CaseFinding, ReasoningSelection, WorldState } from "@sim/schemas";
import { sourceBundle } from "./reasoning-options.js";

export type FindingQuestion = {
  id: string;
  title: string;
  why: string;
  systemId: "alert_dashboard" | "knowledge_base" | "email" | "ticket_queue";
  rows: { id: string; sourceId: string; excerpt: string }[];
  rowGroups: { label: string; rowIds: string[]; multiple?: boolean }[];
  claims: { id: string; label: string }[];
};

/** Exact excerpts from the shipped records; no new facts or inference service. */
export const LOGIN_FINDING_QUESTIONS: FindingQuestion[] = [
  {
    id: "signal",
    title: "What sequence created S-0741?",
    why: "Reconstruct the signal for the reviewer. A sequence does not identify a person.",
    systemId: "alert_dashboard",
    rows: [
      {
        id: "failed-checks",
        sourceId: "login-session-timeline",
        excerpt:
          "07:38:02–07:40:51: six failed extra identity checks from 203.0.113.44; grouped by account/source, not person.",
      },
      {
        id: "session-created",
        sourceId: "login-session-timeline",
        excerpt:
          "07:41:09 · S-0741: password accepted; session created; extra-check result absent.",
      },
      {
        id: "portal-refresh",
        sourceId: "login-session-timeline",
        excerpt:
          "07:43 · S-0741 · account portal session refresh, not identity verification.",
      },
    ],
    rowGroups: [
      {
        label: "Rows to link into the sequence",
        rowIds: ["failed-checks", "session-created", "portal-refresh"],
        multiple: true,
      },
    ],
    claims: [
      {
        id: "failed-then-session",
        label:
          "Failed checks preceded session creation; the extra-check result is absent.",
      },
      {
        id: "refresh-verifies-user",
        label: "The portal refresh verifies who created the session.",
      },
      {
        id: "signal-insufficient",
        label: "I have not established the sequence from these rows.",
      },
    ],
  },
  {
    id: "route",
    title: "Does the known connection explain S-0741?",
    why: "Compare session identifiers and source addresses with the approved connection snapshot.",
    systemId: "alert_dashboard",
    rows: [
      {
        id: "s0731",
        sourceId: "login-session-timeline",
        excerpt:
          "07:31 · S-0731: corp-macbook-patel; V-218; 198.51.100.20; password and extra identity check succeeded.",
      },
      {
        id: "s0741",
        sourceId: "login-session-timeline",
        excerpt:
          "S-0741: source 203.0.113.44; VPN connection ID absent; device label unknown-laptop-17.",
      },
      {
        id: "v218",
        sourceId: "vpn-context-1",
        excerpt:
          "V-218 maps to exit 198.51.100.20; this office's only approved VPN exit in this snapshot.",
      },
      {
        id: "vpn-city",
        sourceId: "vpn-context-1",
        excerpt: "Exit hosting location: Montreal; assigned office: Toronto.",
      },
    ],
    rowGroups: [
      { label: "Earlier session row", rowIds: ["s0731", "s0741"] },
      { label: "Flagged session row", rowIds: ["s0741", "s0731"] },
      { label: "Connection reference row", rowIds: ["v218", "vpn-city"] },
    ],
    claims: [
      {
        id: "route-unmatched",
        label:
          "S-0731 matches V-218; S-0741 is unmatched in this organization VPN snapshot.",
      },
      {
        id: "route-matched",
        label: "The approved V-218 connection also explains S-0741.",
      },
      {
        id: "route-city",
        label:
          "The shared city explains both sessions as the same approved route.",
      },
      {
        id: "route-insufficient",
        label:
          "These selected rows are insufficient to establish the route relation.",
      },
    ],
  },
  {
    id: "device",
    title: "What is recorded for this exact device?",
    why: "This helps the reviewer decide what needs checking; it cannot name the user.",
    systemId: "knowledge_base",
    rows: [
      {
        id: "flagged-device",
        sourceId: "login-session-timeline",
        excerpt:
          "S-0741: source 203.0.113.44; VPN connection ID absent; device label unknown-laptop-17.",
      },
      {
        id: "unknown-inventory",
        sourceId: "device-inventory-1",
        excerpt: "unknown-laptop-17: no enrollment or MDM check-in record.",
      },
      {
        id: "managed-mac",
        sourceId: "device-inventory-1",
        excerpt:
          "corp-macbook-patel: active; last check-in 07:30; certificate matches S-0731.",
      },
      {
        id: "inventory-limit",
        sourceId: "device-inventory-1",
        excerpt:
          "Limit: registered work devices only, not all personally owned devices. A missing record does not identify the owner, user or accessed data. Preserve the exact identifier.",
      },
    ],
    rowGroups: [
      { label: "Device in the flagged session", rowIds: ["flagged-device"] },
      {
        label: "Inventory row to compare",
        rowIds: ["unknown-inventory", "managed-mac"],
      },
      {
        label: "Inventory scope to cite",
        rowIds: ["inventory-limit"],
        multiple: true,
      },
    ],
    claims: [
      {
        id: "device-unenrolled",
        label:
          "unknown-laptop-17 has no enrollment record; who used it remains unknown.",
      },
      {
        id: "device-enrolled",
        label:
          "The managed MacBook inventory match verifies the flagged laptop.",
      },
      {
        id: "device-attacker",
        label:
          "No enrollment record proves the laptop belonged to an attacker.",
      },
      {
        id: "device-insufficient",
        label: "I have not established this exact device's inventory status.",
      },
    ],
  },
  {
    id: "coverage",
    title: "What prevents a stronger conclusion?",
    why: "Keep not collected separate from observed absent. Repeated summaries are not independent sources.",
    systemId: "alert_dashboard",
    rows: [
      {
        id: "export-limit",
        sourceId: "login-session-timeline",
        excerpt:
          "Limit: collection ends 07:45; no file/mail activity collected. A-1042 and login-context-1 summarize this same source, not independent corroboration.",
      },
    ],
    rowGroups: [{ label: "Collection-limit row", rowIds: ["export-limit"] }],
    claims: [
      {
        id: "coverage-not-collected",
        label:
          "The export cannot establish file or mail access, before or after its cutoff.",
      },
      {
        id: "coverage-no-access",
        label:
          "Before 07:45 the export proves no files or messages were opened.",
      },
      {
        id: "coverage-insufficient",
        label: "I have not recorded the export's collection boundary.",
      },
    ],
  },
];

export const SCANNER_FINDING_QUESTIONS: FindingQuestion[] = [
  {
    id: "scan-match",
    title: "Which run and approval match this recorded activity?",
    why: "Avoid unnecessary escalation with a traceable time, source and target match. Queue arrival is not event time.",
    systemId: "alert_dashboard",
    rows: [
      {
        id: "scan-time",
        sourceId: "scanner-alert",
        excerpt:
          "Recorded activity: most recent completed Monday window, 10:18 office local.",
      },
      {
        id: "scan-target",
        sourceId: "scanner-alert",
        excerpt: "Source: vuln-scan-03 · target: finance VLAN.",
      },
      {
        id: "run031",
        sourceId: "scanner-run-log",
        excerpt:
          "RUN-FIN-031 · scanner vuln-scan-03 · target finance VLAN · change reference SCAN-FIN-MON.",
      },
      {
        id: "run-time",
        sourceId: "scanner-run-log",
        excerpt: "Most recent completed Monday: 10:05–10:32 office local.",
      },
      {
        id: "run030",
        sourceId: "scanner-prior-run",
        excerpt: "RUN-FIN-030 · vuln-scan-03 · finance VLAN · SCAN-FIN-MON.",
      },
      {
        id: "approved-window",
        sourceId: "scanner-window",
        excerpt:
          "vuln-scan-03 is approved Mondays 10:00–12:00 for finance VLAN discovery.",
      },
    ],
    rowGroups: [
      {
        label: "Activity rows to align",
        rowIds: ["scan-time", "scan-target"],
        multiple: true,
      },
      { label: "Run identity to compare", rowIds: ["run031", "run030"] },
      { label: "Execution interval", rowIds: ["run-time"] },
      { label: "Approval interval and scope", rowIds: ["approved-window"] },
    ],
    claims: [
      {
        id: "scan-aligned",
        label:
          "A-1180's Monday 10:18, source and target align with RUN-FIN-031 and SCAN-FIN-MON.",
      },
      {
        id: "scan-prior",
        label:
          "RUN-FIN-030 verifies A-1180 because the scanner and schedule match.",
      },
      {
        id: "scan-arrival",
        label:
          "Approval is missing because delivery happened outside the recorded Monday window.",
      },
      {
        id: "scan-insufficient",
        label: "I have not established this activity's run and approval match.",
      },
    ],
  },
  {
    id: "scan-boundary",
    title: "Which activity can this match close?",
    why: "Bound the closure to this activity. A discovery connection is not a weakness-check finding.",
    systemId: "knowledge_base",
    rows: [
      {
        id: "run-limit",
        sourceId: "scanner-run-log",
        excerpt:
          "Limit: discovery connections only, not weakness-check findings or proof every finance system is secure. Other source/network/time needs its own check; shared alert references are not independent measurements.",
      },
      {
        id: "other-open",
        sourceId: "scanner-other-notice",
        excerpt:
          "State: open. This notice is not A-1180 or its matched RUN-FIN-031.",
      },
    ],
    rowGroups: [
      {
        label: "Scope and separate notice",
        rowIds: ["run-limit", "other-open"],
        multiple: true,
      },
    ],
    claims: [
      {
        id: "scan-bounded",
        label:
          "Only A-1180's matched discovery activity can close; A-1214 and later activity keep their own checks.",
      },
      {
        id: "scan-all-closed",
        label:
          "The completed run proves all finance systems secure and closes A-1214 too.",
      },
      {
        id: "scan-no-later",
        label:
          "Because this run finished, no later scanner connections can occur in the approval window.",
      },
    ],
  },
];
export const FINANCE_FINDING_QUESTIONS: FindingQuestion[] = [
  {
    id: "request-scope",
    title: "What exactly is Sam asking the recipient to authorize?",
    why: "Build a useful routing request from the actual resource, role and expiry.",
    systemId: "email",
    rows: [
      {
        id: "resource-expiry",
        sourceId: "access-request-email",
        excerpt: "Requested access: finance-reporting-prod, today until 17:00.",
      },
      {
        id: "read-only",
        sourceId: "access-request-email",
        excerpt:
          "I need the read-only reporting role to finish a board packet.",
      },
      {
        id: "deadline",
        sourceId: "access-request-email",
        excerpt: "Director Chen approved the project deadline in chat.",
      },
    ],
    rowGroups: [
      { label: "Resource and expiry", rowIds: ["resource-expiry"] },
      { label: "Requested role", rowIds: ["read-only"] },
      {
        label: "Reported business context",
        rowIds: ["deadline"],
        multiple: true,
      },
    ],
    claims: [
      {
        id: "scope-preserved",
        label:
          "Sam requests finance-reporting-prod, read-only, until 17:00; deadline support is reported context.",
      },
      {
        id: "scope-granted",
        label:
          "The deadline approval already grants the requested read-only role until 17:00.",
      },
      {
        id: "scope-unspecified",
        label: "I have not preserved the requested resource, role and expiry.",
      },
    ],
  },
  {
    id: "approval-boundary",
    title: "Whose decision is still missing?",
    why: "Keep the project moving without bypassing the person responsible for the data.",
    systemId: "knowledge_base",
    rows: [
      {
        id: "data-owner",
        sourceId: "access-approval-guide",
        excerpt: "Only the finance data owner can approve this role.",
      },
      {
        id: "keep-pending",
        sourceId: "access-approval-guide",
        excerpt: "Keep access pending until the owner records a decision.",
      },
      {
        id: "reported-deadline",
        sourceId: "access-request-email",
        excerpt:
          "Limit: Sam's reported deadline approval is not a recorded grant of the data role.",
      },
    ],
    rowGroups: [
      {
        label: "Authority and pending state",
        rowIds: ["data-owner", "keep-pending", "reported-deadline"],
        multiple: true,
      },
    ],
    claims: [
      {
        id: "owner-pending",
        label:
          "The finance data owner's decision is missing; Chen's deadline support grants no role.",
      },
      {
        id: "director-authorizes",
        label:
          "Only Chen's confirmation remains because the director owns the deadline.",
      },
      {
        id: "read-only-exempt",
        label:
          "Read-only scope and short expiry remove the need for owner authorization.",
      },
    ],
  },
];
export const RIVERA_FINDING_QUESTIONS: FindingQuestion[] = [
  {
    id: "device-pattern",
    title: "What differs between Rivera's phone and laptop?",
    why: "Compare device results before choosing a discriminating check; failed sign-ins alone do not establish an attack.",
    systemId: "alert_dashboard",
    rows: [
      {
        id: "phone-retries",
        sourceId: "rivera-auth-summary",
        excerpt:
          "08:36–08:41: corp-phone-rivera made five failed saved-password retries.",
      },
      {
        id: "laptop-success",
        sourceId: "rivera-auth-summary",
        excerpt:
          "08:42: corp-macbook-rivera completed a successful sign-in with the updated password.",
      },
      {
        id: "phone-enrolled",
        sourceId: "rivera-device-inventory",
        excerpt:
          "corp-phone-rivera — enrolled, active, assigned to a.rivera@example.com.",
      },
      {
        id: "laptop-enrolled",
        sourceId: "rivera-device-inventory",
        excerpt:
          "corp-macbook-rivera — enrolled, active, assigned to a.rivera@example.com.",
      },
      {
        id: "pattern-limit",
        sourceId: "rivera-auth-summary",
        excerpt:
          "Limit: these recorded device results do not identify a person, prove an attack or establish a completed phone-app fix.",
      },
    ],
    rowGroups: [
      {
        label: "Affected-device result",
        rowIds: ["phone-retries", "laptop-success"],
      },
      {
        label: "Other-device result",
        rowIds: ["laptop-success", "phone-retries"],
      },
      {
        label: "Exact inventory and limit",
        rowIds: ["phone-enrolled", "laptop-enrolled", "pattern-limit"],
        multiple: true,
      },
    ],
    claims: [
      {
        id: "phone-hypothesis",
        label:
          "An old saved phone password is a hypothesis; laptop success does not test the phone fix or identify either user.",
      },
      {
        id: "phone-already-fixed",
        label:
          "The successful laptop sign-in proves the phone's saved password is already current.",
      },
      {
        id: "phone-attacker",
        label: "The enrolled phone's failed retries identify an attacker.",
      },
    ],
  },
];

export function findingQuestions(eventId: string): FindingQuestion[] {
  return (
    (
      {
        "suspicious-login-1": LOGIN_FINDING_QUESTIONS,
        "routine-alert-1": SCANNER_FINDING_QUESTIONS,
        "access-request-1": FINANCE_FINDING_QUESTIONS,
        "login-help-1": RIVERA_FINDING_QUESTIONS,
      } as Record<string, FindingQuestion[]>
    )[eventId] ?? []
  );
}

export function findingText(eventId: string, finding: CaseFinding): string {
  const question = findingQuestions(eventId).find(
    (q) => q.id === finding.questionId,
  );
  return (
    question?.claims.find((c) => c.id === finding.claimId)?.label ??
    "Unrecognized saved claim"
  );
}

/** Project selected rows into the existing catalog; opening a source alone adds nothing. */
export function reasoningFromFindings(
  eventId: string,
  selections: ReasoningSelection,
): ReasoningSelection {
  if (!selections.caseFindings || selections.phase === "follow-up")
    return selections;
  const rows = selections.caseFindings.flatMap(
    (f) =>
      findingQuestions(eventId)
        .find((q) => q.id === f.questionId)
        ?.rows.filter((r) => f.rowIds.includes(r.id)) ?? [],
  );
  const prefix = (
    {
      "suspicious-login-1": "login",
      "routine-alert-1": "scanner",
      "access-request-1": "finance",
      "login-help-1": "rivera",
    } as Record<string, string>
  )[eventId];
  const sourceOptions: Record<string, string[][]> = {
    login: [
      ["login-session-timeline", "1"],
      ["vpn-context-1", "2"],
      ["device-inventory-1", "3"],
    ],
    scanner: [
      ["scanner-alert", "1"],
      ["scanner-run-log", "2"],
      ["scanner-window", "3"],
      ["scanner-prior-run", "4"],
    ],
    finance: [
      ["access-request-email", "1"],
      ["access-approval-guide", "2"],
    ],
    rivera: [
      ["rivera-auth-summary", "1"],
      ["rivera-device-inventory", "2"],
    ],
  };
  const evidence = (sourceOptions[prefix ?? ""] ?? [])
    .filter(([source]) => rows.some((r) => r.sourceId === source))
    .map(([, id]) => `${prefix ?? ""}-evidence-${id ?? ""}`);
  const mapped: Record<string, string[]> = {
    "failed-then-session": ["login-uncertainty-2"],
    "device-unenrolled": ["login-uncertainty-1"],
    "coverage-not-collected": ["login-uncertainty-3"],
    "coverage-no-access": ["login-uncertainty-4"],
    "scan-bounded": ["scanner-uncertainty-1", "scanner-uncertainty-2"],
    "scan-no-later": ["scanner-uncertainty-3"],
    "scan-arrival": ["scanner-uncertainty-4"],
    "owner-pending": ["finance-uncertainty-1", "finance-uncertainty-2"],
    "director-authorizes": ["finance-uncertainty-3"],
    "read-only-exempt": ["finance-uncertainty-4"],
    "scope-granted": ["finance-uncertainty-4"],
    "phone-hypothesis": [
      "rivera-uncertainty-1",
      "rivera-uncertainty-2",
      "rivera-uncertainty-3",
    ],
    "phone-already-fixed": ["rivera-uncertainty-4"],
  };
  const uncertainty = [
    ...new Set(selections.caseFindings.flatMap((f) => mapped[f.claimId] ?? [])),
  ];
  return { ...selections, evidence, uncertainty };
}

export function validateCaseFindings(
  state: WorldState,
  eventId: string,
  findings: CaseFinding[],
) {
  if (new Set(findings.map((f) => f.questionId)).size !== findings.length)
    throw new Error("Duplicate saved question.");
  const inspected = [
    ...state.observedArtifactIds,
    ...(state.workplace.inspectedRecordIds ?? []),
  ];
  for (const finding of findings) {
    const question = findingQuestions(eventId).find(
      (q) => q.id === finding.questionId,
    );
    if (!question || !question.claims.some((c) => c.id === finding.claimId))
      throw new Error("Unknown authored finding.");
    if (
      finding.rowSelections &&
      (finding.rowSelections.length !== question.rowGroups.length ||
        finding.rowSelections.some(
          (ids, i) =>
            new Set(ids).size !== ids.length ||
            (!question.rowGroups[i]?.multiple && ids.length > 1) ||
            ids.some((id) => !question.rowGroups[i]?.rowIds.includes(id)),
        ) ||
        [...new Set(finding.rowSelections.flat())].sort().join() !==
          [...finding.rowIds].sort().join())
    )
      throw new Error("Finding row roles do not match the source selection.");
    if (new Set(finding.rowIds).size !== finding.rowIds.length)
      throw new Error("Duplicate source row.");
    for (const id of finding.rowIds) {
      const row = question.rows.find((r) => r.id === id);
      if (
        !row ||
        !state.artifacts[row.sourceId]?.body.includes(row.excerpt) ||
        !sourceBundle(row.sourceId, inspected).length
      )
        throw new Error("A finding must cite an inspected, exact source row.");
    }
  }
}

/** Evaluation occurs at review, not while constructing or saving the comparison. */
export function findingReviewGaps(
  eventId: string,
  findings: CaseFinding[],
): string[] {
  const expected =
    (
      {
        "suspicious-login-1": [
          [
            "signal",
            "failed-then-session",
            ["failed-checks", "session-created"],
          ],
          ["route", "route-unmatched", ["s0731", "s0741", "v218"]],
          [
            "device",
            "device-unenrolled",
            ["flagged-device", "unknown-inventory", "inventory-limit"],
          ],
          ["coverage", "coverage-not-collected", ["export-limit"]],
        ],
        "routine-alert-1": [
          [
            "scan-match",
            "scan-aligned",
            [
              "scan-time",
              "scan-target",
              "run031",
              "run-time",
              "approved-window",
            ],
          ],
          ["scan-boundary", "scan-bounded", ["run-limit", "other-open"]],
        ],
        "access-request-1": [
          [
            "request-scope",
            "scope-preserved",
            ["resource-expiry", "read-only"],
          ],
          [
            "approval-boundary",
            "owner-pending",
            ["data-owner", "keep-pending", "reported-deadline"],
          ],
        ],
        "login-help-1": [
          [
            "device-pattern",
            "phone-hypothesis",
            [
              "phone-retries",
              "laptop-success",
              "phone-enrolled",
              "laptop-enrolled",
              "pattern-limit",
            ],
          ],
        ],
      } as Record<string, [string, string, string[]][]>
    )[eventId] ?? [];
  return expected.flatMap(([id, claim, rows]) => {
    const finding = findings.find((f) => f.questionId === id);
    return !finding
      ? [
          `No source-backed finding saved for ${findingQuestions(eventId).find((q) => q.id === id)?.title ?? id}`,
        ]
      : finding.claimId !== claim ||
          rows.some((row) => !finding.rowIds.includes(row)) ||
          ((id === "route" || id === "device-pattern") &&
            (id === "route"
              ? ["s0731", "s0741", "v218"]
              : ["phone-retries", "laptop-success"]
            ).some((row, index) => finding.rowSelections?.[index]?.[0] !== row))
        ? [
            `Your saved claim needs more evidence: ${findingText(eventId, finding)}. Check its selected rows and scope.`,
          ]
        : [];
  });
}
