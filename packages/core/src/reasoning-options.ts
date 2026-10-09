import type {
  ReasoningGroup,
  ReasoningSelection,
  WorldState,
} from "@sim/schemas";

type Option = {
  id: string;
  label: string;
  verdict: string;
  sourceArtifactIds: string[];
};
type CaseOptions = Record<
  "evidence" | "context" | "uncertainty" | "nextStep",
  Option[]
>;
const CATALOG: Record<string, CaseOptions> = {
  login: {
    evidence: [
      {
        id: "login-evidence-1",
        label: "Sign-in timeline · A-1042",
        verdict: "C",
        sourceArtifactIds: ["login-session-timeline"],
      },
      {
        id: "login-evidence-2",
        label: "Office VPN route catalogue",
        verdict: "C",
        sourceArtifactIds: ["vpn-context-1"],
      },
      {
        id: "login-evidence-3",
        label: "Device inventory · j.patel",
        verdict: "C",
        sourceArtifactIds: ["device-inventory-1"],
      },
    ],
    uncertainty: [
      {
        id: "login-uncertainty-1",
        label: "The records do not identify who used the unfamiliar laptop.",
        verdict: "C",
        sourceArtifactIds: [],
      },
      {
        id: "login-uncertainty-2",
        label:
          "The password worked, but this export does not show the extra identity-check result.",
        verdict: "C",
        sourceArtifactIds: [],
      },
      {
        id: "login-uncertainty-3",
        label:
          "This export cannot tell us which files or messages were opened.",
        verdict: "C",
        sourceArtifactIds: [],
      },
      {
        id: "login-uncertainty-4",
        label:
          "Only activity after 07:45 is unknown; the earlier period shows no files or messages were opened.",
        verdict: "close-wrong",
        sourceArtifactIds: [],
      },
    ],
    nextStep: [
      {
        id: "login-nextStep-1",
        label:
          "Send S-0741, its device and route comparisons, and the open question to senior review.",
        verdict: "C",
        sourceArtifactIds: [],
      },
      {
        id: "login-nextStep-2",
        label:
          "Ask the reviewer for the missing session activity before deciding whether containment is needed.",
        verdict: "C",
        sourceArtifactIds: [],
      },
      {
        id: "login-nextStep-3",
        label:
          "Verify the employee's account of events through the usual work contact route; keep review open.",
        verdict: "C",
        sourceArtifactIds: [],
      },
      {
        id: "login-nextStep-4",
        label:
          "Send S-0731 and its approved VPN match for review of the flagged sign-in.",
        verdict: "close-wrong",
        sourceArtifactIds: [],
      },
    ],
    context: [
      {
        id: "login-evidence-4",
        label: "Work-travel register · case reference",
        verdict: "C",
        sourceArtifactIds: ["travel-status-1"],
      },
      {
        id: "login-evidence-5",
        label: "Re: Was this login yours?",
        verdict: "C",
        sourceArtifactIds: ["employee-login-reply"],
      },
    ],
  },
  scanner: {
    evidence: [
      {
        id: "scanner-evidence-1",
        label: "Scanner connection alert · A-1180",
        verdict: "C",
        sourceArtifactIds: ["scanner-alert"],
      },
      {
        id: "scanner-evidence-2",
        label: "Scanner run log · A-1180 / RUN-FIN-031",
        verdict: "C",
        sourceArtifactIds: ["scanner-run-log"],
      },
      {
        id: "scanner-evidence-3",
        label: "Approved scanner window · SCAN-FIN-MON",
        verdict: "C",
        sourceArtifactIds: ["scanner-window"],
      },
      {
        id: "scanner-evidence-4",
        label: "Prior Monday run · RUN-FIN-030",
        verdict: "close-wrong",
        sourceArtifactIds: ["scanner-prior-run"],
      },
    ],
    uncertainty: [
      {
        id: "scanner-uncertainty-1",
        label:
          "This run records connections, not the results of a weakness check.",
        verdict: "C",
        sourceArtifactIds: [],
      },
      {
        id: "scanner-uncertainty-2",
        label:
          "This match does not explain a connection from a different source, network, or time.",
        verdict: "C",
        sourceArtifactIds: [],
      },
      {
        id: "scanner-uncertainty-3",
        label:
          "Because the run finished, no more scanner connections can occur during the approved window.",
        verdict: "close-wrong",
        sourceArtifactIds: [],
      },
      {
        id: "scanner-uncertainty-4",
        label:
          "Approval for this recorded scan is still missing because its notice arrived in a later shift.",
        verdict: "close-wrong",
        sourceArtifactIds: [],
      },
    ],
    nextStep: [
      {
        id: "scanner-nextStep-1",
        label:
          "Close A-1180 with the matched run and approved-window references.",
        verdict: "C",
        sourceArtifactIds: [],
      },
      {
        id: "scanner-nextStep-2",
        label:
          "Keep routine monitoring; check a later source, network, or time against its own records.",
        verdict: "C",
        sourceArtifactIds: [],
      },
      {
        id: "scanner-nextStep-3",
        label:
          "Close the other finance notices under the same schedule reference at the same time.",
        verdict: "close-wrong",
        sourceArtifactIds: [],
      },
      {
        id: "scanner-nextStep-4",
        label:
          "Keep A-1180 open until this shift's clock falls inside the Monday window.",
        verdict: "close-wrong",
        sourceArtifactIds: [],
      },
    ],
    context: [],
  },
  finance: {
    evidence: [
      {
        id: "finance-evidence-1",
        label: "Temporary finance reporting access · Sam Lee",
        verdict: "C",
        sourceArtifactIds: ["access-request-email"],
      },
      {
        id: "finance-evidence-2",
        label: "Finance reporting access approvals",
        verdict: "C",
        sourceArtifactIds: ["access-approval-guide"],
      },
      {
        id: "finance-evidence-3",
        label: "Approved scanner window · finance network",
        verdict: "close-wrong",
        sourceArtifactIds: ["scanner-window"],
      },
    ],
    uncertainty: [
      {
        id: "finance-uncertainty-1",
        label:
          "The finance data owner's decision on this temporary role is still missing.",
        verdict: "C",
        sourceArtifactIds: [],
      },
      {
        id: "finance-uncertainty-2",
        label:
          "Sam reports deadline approval; that does not establish approval for the data role.",
        verdict: "C",
        sourceArtifactIds: [],
      },
      {
        id: "finance-uncertainty-3",
        label:
          "The remaining approval is Director Chen's confirmation of the reporting role.",
        verdict: "close-wrong",
        sourceArtifactIds: [],
      },
      {
        id: "finance-uncertainty-4",
        label:
          "Once Sam confirms the role is read-only, no other approval remains.",
        verdict: "close-wrong",
        sourceArtifactIds: [],
      },
    ],
    nextStep: [
      {
        id: "finance-nextStep-1",
        label:
          "Send the requested role and 17:00 expiry to the finance data owner; keep access pending.",
        verdict: "C",
        sourceArtifactIds: [],
      },
      {
        id: "finance-nextStep-2",
        label:
          "Offer an interim report without granting a new role while the owner reviews the request.",
        verdict: "C",
        sourceArtifactIds: [],
      },
      {
        id: "finance-nextStep-3",
        label:
          "Ask the director who approved the deadline to approve the role as well.",
        verdict: "close-wrong",
        sourceArtifactIds: [],
      },
      {
        id: "finance-nextStep-4",
        label:
          "Give temporary read-only access until 17:00 while the owner reviews it.",
        verdict: "close-wrong",
        sourceArtifactIds: [],
      },
    ],
    context: [],
  },
  rivera: {
    evidence: [
      {
        id: "rivera-evidence-1",
        label: "Authentication summary · A. Rivera",
        verdict: "C",
        sourceArtifactIds: ["rivera-auth-summary"],
      },
      {
        id: "rivera-evidence-2",
        label: "Device inventory · A. Rivera",
        verdict: "C",
        sourceArtifactIds: ["rivera-device-inventory"],
      },
      {
        id: "rivera-evidence-4",
        label: "Ticket · Rivera login prompts",
        verdict: "close-wrong",
        sourceArtifactIds: ["ticket-login-help"],
      },
    ],
    uncertainty: [
      {
        id: "rivera-uncertainty-1",
        label:
          "The phone may still be using the old saved password; we have not tested the update yet.",
        verdict: "C",
        sourceArtifactIds: [],
      },
      {
        id: "rivera-uncertainty-2",
        label:
          "We do not yet know whether phone retries will stop after the saved password is updated.",
        verdict: "C",
        sourceArtifactIds: [],
      },
      {
        id: "rivera-uncertainty-3",
        label:
          "Enrolled device names do not identify who was holding either device.",
        verdict: "C",
        sourceArtifactIds: [],
      },
      {
        id: "rivera-uncertainty-4",
        label:
          "The new password worked on the laptop, so the phone's saved password is already current.",
        verdict: "close-wrong",
        sourceArtifactIds: [],
      },
    ],
    nextStep: [
      {
        id: "rivera-nextStep-1",
        label:
          "Ask Rivera to update the saved password in the phone app, then check for further retries.",
        verdict: "C",
        sourceArtifactIds: [],
      },
      {
        id: "rivera-nextStep-2",
        label:
          "Reopen review if retries continue, an unfamiliar device appears, or Rivera reports unrecognized activity.",
        verdict: "C",
        sourceArtifactIds: [],
      },
      {
        id: "rivera-nextStep-3",
        label:
          "Update the laptop's saved password first, then check whether the phone retries stop.",
        verdict: "close-wrong",
        sourceArtifactIds: [],
      },
      {
        id: "rivera-nextStep-4",
        label:
          "Reset the account password again before checking the phone's saved password.",
        verdict: "close-wrong",
        sourceArtifactIds: [],
      },
    ],
    context: [
      {
        id: "rivera-evidence-3",
        label: "Phone keeps asking for my password · A. Rivera",
        verdict: "C",
        sourceArtifactIds: ["rivera-login-email"],
      },
    ],
  },
};
CATALOG.riveraFollowup = {
  evidence: [
    {
      id: "rivera-followup-evidence-1",
      label: "Rivera result receipt · recorded phone check",
      verdict: "C",
      sourceArtifactIds: ["rivera-result-receipt"],
    },
  ],
  context: [],
  uncertainty: [
    {
      id: "rivera-followup-uncertainty-1",
      label: "This bounded result does not predict every later sign-in.",
      verdict: "C",
      sourceArtifactIds: [],
    },
    {
      id: "rivera-followup-uncertainty-2",
      label:
        "The laptop sign-in proves the phone's saved password was already current.",
      verdict: "close-wrong",
      sourceArtifactIds: [],
    },
  ],
  nextStep: [
    {
      id: "rivera-followup-nextStep-1",
      label:
        "Reopen review if retries continue, an unfamiliar device appears, or Rivera reports unrecognized activity.",
      verdict: "C",
      sourceArtifactIds: [],
    },
    {
      id: "rivera-followup-nextStep-2",
      label:
        "Treat the recorded check as proof that all later phone activity is expected.",
      verdict: "close-wrong",
      sourceArtifactIds: [],
    },
  ],
};
const CONFLICT_DETAILS: Record<string, string> = {
  "login-uncertainty-4":
    "The export has no file/mail fields before OR after 07:45. Its cutoff is not a record of no activity.",
  "login-nextStep-4":
    "S-0731 uses V-218; flagged S-0741 has a different source and no VPN connection ID. One session cannot substitute for the other.",
  "scanner-evidence-4":
    "RUN-FIN-030 is the prior week's run. A-1180 belongs to RUN-FIN-031 despite the shared scanner and schedule.",
  "scanner-uncertainty-3":
    "RUN-FIN-031's completion does not rule out another connection during the 10:00–12:00 approval window.",
  "scanner-uncertainty-4":
    "Approval is checked against recorded Monday 10:18 activity, not delivery to this later shift.",
  "scanner-nextStep-3":
    "A-1214 shares SCAN-FIN-MON but remains open for monitoring; A-1180's run match does not close another notice.",
  "scanner-nextStep-4":
    "The event occurred Monday 10:18 within the approved window. The current shift clock does not change that record.",
  "finance-evidence-3":
    "SCAN-FIN-MON approves discovery connections, not Sam's read-only reporting role.",
  "finance-uncertainty-3":
    "Sam reports Chen's deadline approval. Only the finance data owner may authorize the requested data role.",
  "finance-uncertainty-4":
    "Read-only scope and 17:00 expiry do not remove the finance data owner's approval requirement.",
  "finance-nextStep-3":
    "The deadline approver is not established as the finance data owner. Role approval must go to its actual owner.",
  "finance-nextStep-4":
    "Temporary access still requires owner authorization before any grant, even while review is pending.",
  "rivera-evidence-4":
    "The ticket is an instruction to document a result; it is not an authentication observation or completed-fix receipt.",
  "rivera-uncertainty-4":
    "The 08:42 laptop success does not update the phone's saved password; phone retries are a separate device result.",
  "rivera-nextStep-3":
    "The phone retries at 08:36–08:41; the laptop already succeeds at 08:42. Updating the working device leaves the affected app untested.",
  "rivera-nextStep-4":
    "Laptop sign-in succeeds after the reset. The supported first test is the phone app's stored password, not another account reset.",
  "rivera-followup-uncertainty-2":
    "A laptop result cannot establish the phone's saved credential. Use the actual phone-check receipt.",
  "rivera-followup-nextStep-2":
    "The recorded phone check is bounded. Later retries, unfamiliar devices or unrecognized activity require reassessment.",
};
const PROMPTS: Record<string, string> = {
  login:
    "Which records support the device and connection differences in S-0741?",
  scanner: "Which records connect A-1180 to this approved run?",
  finance: "Which records establish the requested role and who may approve it?",
  rivera:
    "Which records verify the phone/laptop results and managed-device match?",
};
const CASES: Record<string, string> = {
  "suspicious-login-1": "login",
  "routine-alert-1": "scanner",
  "access-request-1": "finance",
  "login-help-1": "rivera",
};
const EQUIVALENTS: Record<string, string[][]> = {
  "login-session-timeline": [["AUTH-0731-PATEL", "AUTH-0741-PATEL"]],
  "vpn-context-1": [["V-218"]],
  "device-inventory-1": [["unknown-laptop-17"]],
  "scanner-alert": [["A-1180"]],
  "scanner-run-log": [["RUN-FIN-031"]],
  "scanner-window": [["SCAN-FIN-MON"]],
  "scanner-prior-run": [["RUN-FIN-030"]],
  "rivera-auth-summary": [
    ["AUTH-0836-RIVERA-PHONE-RETRIES", "AUTH-0842-RIVERA-LAPTOP"],
  ],
  "rivera-device-inventory": [
    ["corp-phone-rivera", "corp-macbook-rivera"],
    ["AUTH-0836-RIVERA-PHONE-RETRIES", "AUTH-0842-RIVERA-LAPTOP"],
  ],
};
export function sourceBundle(
  sourceId: string,
  inspected: readonly string[],
): string[] {
  const opened = new Set(inspected);
  if (opened.has(sourceId)) return [sourceId];
  return (
    EQUIVALENTS[sourceId]?.find((bundle) =>
      bundle.every((id) => opened.has(id)),
    ) ?? []
  );
}
export function inspectedSourceBundle(
  state: WorldState,
  sourceId: string,
  inspected?: readonly string[],
): string[] {
  return sourceBundle(
    sourceId,
    inspected ?? [
      ...state.observedArtifactIds,
      ...(state.workplace.inspectedRecordIds ?? []),
    ],
  );
}
export function reasoningGroups(
  state: WorldState,
  eventId: string,
): ReasoningGroup[] {
  const key =
    eventId === "login-help-1" &&
    state.events.find((e) => e.id === eventId)?.status === "resolved"
      ? "riveraFollowup"
      : CASES[eventId];
  const definition = key && CATALOG[key];
  if (!definition || state.careerVersion !== "2.0.0") return [];
  return (Object.entries(definition) as [keyof CaseOptions, Option[]][]).map(
    ([id, options]) => ({
      id,
      prompt:
        id === "evidence"
          ? key === "riveraFollowup"
            ? "Which record documents the actual phone check?"
            : (PROMPTS[key] ?? "Which records support this finding?")
          : id === "context"
            ? "Optional reported or administrative context (no rating bonus)"
            : id === "uncertainty"
              ? "What is still unknown?"
              : "What is the next step?",
      options: options.map(({ id, label, sourceArtifactIds }) => ({
        id,
        label,
        sourceArtifactIds,
        inspectedSourceIds: sourceArtifactIds.flatMap((source) =>
          inspectedSourceBundle(state, source),
        ),
      })),
    }),
  );
}
/** Structural validation rejects forged references, never weak reasoning. */
export function validateReasoning(
  state: WorldState,
  eventId: string,
  selected: ReasoningSelection,
) {
  const key =
    eventId === "login-help-1" && selected.phase === "follow-up"
      ? "riveraFollowup"
      : CASES[eventId];
  const definition = key && CATALOG[key];
  if (!definition) throw new Error("This case has no assessed option set.");
  if (
    selected.phase === "follow-up" &&
    (eventId !== "login-help-1" ||
      state.events.find((e) => e.id === eventId)?.status !== "resolved")
  )
    throw new Error("Follow-up options require a recorded result.");
  const sourceIds: string[] = [];
  for (const field of [
    "evidence",
    "context",
    "uncertainty",
    "nextStep",
  ] as const) {
    if (new Set(selected[field]).size !== selected[field].length)
      throw new Error("Duplicate reasoning selection.");
    for (const id of selected[field]) {
      const option = definition[field].find((o) => o.id === id);
      if (!option) throw new Error("Unknown option for this field or case.");
      for (const source of option.sourceArtifactIds) {
        const bundle = inspectedSourceBundle(state, source);
        if (!bundle.length)
          throw new Error("Open the selected source before saving it.");
        sourceIds.push(...bundle);
      }
    }
  }
  const labels = (field: keyof CaseOptions) =>
    definition[field]
      .filter((o) => selected[field].includes(o.id))
      .map((o) => o.label)
      .join("\n");
  return {
    sourceArtifactIds: [
      ...new Set(sourceIds.filter((id) => state.artifacts[id])),
    ],
    sourceRecordIds: [
      ...new Set(sourceIds.filter((id) => !state.artifacts[id])),
    ],
    verifiedEvidence: labels("evidence"),
    uncertainty: labels("uncertainty"),
    followUp: labels("nextStep"),
  };
}
export type SupportVerdict =
  | "supported"
  | "partially_supported"
  | "needs_more_evidence";
export type ReasoningReview = {
  verdict: SupportVerdict;
  fields: Record<
    string,
    { verdict: SupportVerdict; gaps: string[]; selectedLabels: string[] }
  >;
  gaps: string[];
  selectedLabels: string[];
};

/** Weakest essential group wins; context and repeated sources earn no bonus. */
export function reviewReasoning(
  eventId: string,
  selected: ReasoningSelection,
  inspected: readonly string[],
): ReasoningReview {
  const key =
    eventId === "login-help-1" && selected.phase === "follow-up"
      ? "riveraFollowup"
      : CASES[eventId];
  const definition = key && CATALOG[key];
  if (!definition) throw new Error("Unknown assessed case.");
  const fields: ReasoningReview["fields"] = {};
  const groups: Record<string, number[][]> = {
    login: [[1], [3]],
    scanner: [[1]],
    finance: [[1, 2]],
    rivera: [[1], [2]],
    riveraFollowup: [[1]],
  };
  const next: Record<string, number[]> = {
    login: [1, 2],
    scanner: [1],
    finance: [1, 2],
    rivera: [1],
    riveraFollowup: [1],
  };
  for (const field of ["evidence", "uncertainty", "nextStep"] as const) {
    const ids = selected[field];
    const chosen = definition[field].filter((o) => ids.includes(o.id));
    const gaps: string[] = [];
    let contradiction = chosen.some((o) => o.verdict !== "C");
    if (ids.some((id) => !definition[field].some((o) => o.id === id)))
      contradiction = true;
    if (contradiction)
      gaps.push(
        ...chosen
          .filter((o) => o.verdict !== "C")
          .map(
            (o) =>
              `Selected claim conflicts with this finding: ${o.label} ${CONFLICT_DETAILS[o.id] ?? ""}`,
          ),
      );
    if (field === "evidence") {
      const essentials = definition.evidence.filter(
        (o) =>
          o.verdict === "C" &&
          (key !== "rivera" || o.id === "rivera-evidence-1"),
      );
      for (const o of essentials)
        if (
          !ids.includes(o.id) ||
          !o.sourceArtifactIds.every(
            (source) => sourceBundle(source, inspected).length,
          )
        )
          gaps.push(`Missing inspected support: ${o.label}`);
    } else {
      const required =
        field === "uncertainty" ? (groups[key] ?? []) : [next[key] ?? []];
      for (const alternatives of required)
        if (
          !alternatives.some((n) =>
            ids.includes(
              `${key === "riveraFollowup" ? "rivera-followup" : key}-${field}-${String(n)}`,
            ),
          )
        )
          gaps.push(
            field === "uncertainty"
              ? "Missing essential uncertainty boundary."
              : "Missing a compatible next step.",
          );
    }
    fields[field] = {
      selectedLabels: chosen.map((o) => o.label),
      verdict:
        contradiction ||
        !chosen.length ||
        (field === "evidence" &&
          !chosen.some(
            (o) =>
              o.verdict === "C" &&
              o.sourceArtifactIds.every(
                (source) => sourceBundle(source, inspected).length,
              ),
          ))
          ? "needs_more_evidence"
          : gaps.length
            ? "partially_supported"
            : "supported",
      gaps,
    };
  }
  const values = Object.values(fields);
  return {
    verdict: values.some((v) => v.verdict === "needs_more_evidence")
      ? "needs_more_evidence"
      : values.some((v) => v.verdict === "partially_supported")
        ? "partially_supported"
        : "supported",
    fields,
    gaps: values.flatMap((v) => v.gaps),
    selectedLabels: Object.entries(definition).flatMap(([field, options]) =>
      options
        .filter((o) => selected[field as keyof CaseOptions].includes(o.id))
        .map((o) => o.label),
    ),
  };
}
