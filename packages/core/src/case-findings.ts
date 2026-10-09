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

export function findingQuestions(eventId: string): FindingQuestion[] {
  return eventId === "suspicious-login-1" ? LOGIN_FINDING_QUESTIONS : [];
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
  if (!selections.caseFindings) return selections;
  const rows = selections.caseFindings.flatMap(
    (f) =>
      findingQuestions(eventId)
        .find((q) => q.id === f.questionId)
        ?.rows.filter((r) => f.rowIds.includes(r.id)) ?? [],
  );
  const evidence =
    eventId === "suspicious-login-1"
      ? [
          ["login-session-timeline", "login-evidence-1"],
          ["vpn-context-1", "login-evidence-2"],
          ["device-inventory-1", "login-evidence-3"],
        ]
          .filter(([source]) => rows.some((r) => r.sourceId === source))
          .map(([, id]) => id ?? "")
      : selections.evidence;
  const uncertainty =
    eventId === "suspicious-login-1"
      ? selections.caseFindings.flatMap((f) =>
          f.claimId === "failed-then-session"
            ? ["login-uncertainty-2"]
            : f.claimId === "device-unenrolled"
              ? ["login-uncertainty-1"]
              : f.claimId === "coverage-not-collected"
                ? ["login-uncertainty-3"]
                : f.claimId === "coverage-no-access"
                  ? ["login-uncertainty-4"]
                  : [],
        )
      : selections.uncertainty;
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
  if (eventId !== "suspicious-login-1") return [];
  const expected = [
    ["signal", "failed-then-session", ["failed-checks", "session-created"]],
    ["route", "route-unmatched", ["s0731", "s0741", "v218"]],
    [
      "device",
      "device-unenrolled",
      ["flagged-device", "unknown-inventory", "inventory-limit"],
    ],
    ["coverage", "coverage-not-collected", ["export-limit"]],
  ] as const;
  return expected.flatMap(([id, claim, rows]) => {
    const finding = findings.find((f) => f.questionId === id);
    return !finding
      ? [
          `No source-backed finding saved for ${LOGIN_FINDING_QUESTIONS.find((q) => q.id === id)?.title ?? id}`,
        ]
      : finding.claimId !== claim ||
          rows.some((row) => !finding.rowIds.includes(row)) ||
          (id === "route" &&
            finding.rowSelections !== undefined &&
            ["s0731", "s0741", "v218"].some(
              (row, index) => finding.rowSelections?.[index]?.[0] !== row,
            ))
        ? [
            `Your saved claim needs more evidence: ${findingText(eventId, finding)}. Check its selected rows and scope.`,
          ]
        : [];
  });
}
