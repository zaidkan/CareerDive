import {
  sourceBundle,
  findingQuestions,
  findingText,
  findingReviewGaps,
} from "@sim/core";
import type { Debrief, ReasoningSelection, WorldState } from "@sim/schemas";
type Example = NonNullable<
  NonNullable<
    Debrief["decisionReview"]
  >["decisions"][number]["practicalExample"]
>;
const LIMITS: Record<string, { support: string; nextCheck: string }> = {
  "scan-match": {
    support:
      "A-1180 records Monday 10:18, vuln-scan-03 and finance VLAN. RUN-FIN-031 records that source/target during 10:05–10:32; SCAN-FIN-MON permits Monday discovery from 10:00–12:00. RUN-FIN-030 is the prior week. Delivery time cannot replace event time.",
    nextCheck:
      "Keep the exact run/window references; check any other source, target or time against its own records.",
  },
  "scan-boundary": {
    support:
      "The matched run collects discovery connections, not weakness-check findings. A-1214 is a separate open notice; closing A-1180 cannot close it or prove every system secure.",
    nextCheck:
      "Continue routine monitoring and assess later activity separately.",
  },
  "request-scope": {
    support:
      "Sam requests finance-reporting-prod, read-only, until 17:00. A project deadline is reported business context, not approval for this role.",
    nextCheck:
      "Send the exact resource, role and expiry to the finance data owner; an interim report must grant no new role.",
  },
  "approval-boundary": {
    support:
      "Only the finance data owner can authorize this role. Chen's deadline support and a short read-only expiry do not remove that requirement. Routing leaves approval pending.",
    nextCheck:
      "Keep access pending for the owner's recorded decision; preserve the interim-report response if requested.",
  },
  "device-pattern": {
    support:
      "The phone made saved-password retries while the laptop signed in with the updated password. Both are enrolled devices. This supports a phone-specific hypothesis, not a completed fix, identity finding or confirmed attack.",
    nextCheck:
      "Use the actual response to the requested device check; reopen on continued retries, an unfamiliar device or unrecognized activity.",
  },
  signal: {
    support:
      "The timeline records failed checks followed by a created session with no extra-check result. It does not identify a person; a portal refresh is not identity verification.",
    nextCheck:
      "Ask the reviewer to verify the session user through the usual work channel.",
  },
  route: {
    support:
      "S-0731 carries V-218 and 198.51.100.20. S-0741 instead carries 203.0.113.44 with no connection ID. A shared city cannot transfer one session's approved route to another.",
    nextCheck:
      "Send both session identifiers, addresses and the VPN snapshot to senior review; request the missing route evidence.",
  },
  device: {
    support:
      "The exact unknown-laptop-17 label has no enrollment record in this managed inventory. That cannot identify its owner or user; corp-macbook-patel is a different device.",
    nextCheck:
      "Have the reviewer check the exact device identifier and verify employee-reported context.",
  },
  coverage: {
    support:
      "The export collected no file/mail activity before OR after 07:45. Its cutoff is not evidence that no files or messages were opened.",
    nextCheck:
      "Request activity records; do not report an absence this source cannot establish.",
  },
};
/** Use initial saved claims and actual pre-decision source inspection, never latest corrections. */
export function caseExample(
  state: WorldState,
  eventId: string,
  selections: ReasoningSelection,
  inspected: readonly string[],
): Example | undefined {
  const findings = selections.caseFindings;
  if (!findings?.length) return undefined;
  const gaps = findingReviewGaps(eventId, findings);
  const weak = findings.filter((f) =>
    gaps.some((gap) => gap.includes(findingText(eventId, f))),
  );
  const finding =
    weak.find((f) => f.questionId === "coverage") ?? weak[0] ?? findings[0];
  if (!finding) return undefined;
  const question = findingQuestions(eventId).find(
    (q) => q.id === finding.questionId,
  );
  if (!question) return undefined;
  const row =
    question.rows.find(
      (r) =>
        finding.rowIds.includes(r.id) &&
        sourceBundle(r.sourceId, inspected).length > 0,
    ) ??
    question.rows.find((r) => sourceBundle(r.sourceId, inspected).length > 0);
  if (!row) return undefined;
  const source = state.artifacts[row.sourceId];
  if (!source?.body.includes(row.excerpt)) return undefined;
  const inspectedRecordId = sourceBundle(row.sourceId, inspected)[0];
  const equivalent =
    !inspected.includes(row.sourceId) && inspectedRecordId
      ? Object.values(state.rules.datasets)
          .flatMap((d) => d.records)
          .find((r) => r.id === inspectedRecordId)
      : undefined;
  const limit = LIMITS[finding.questionId];
  return {
    ...(eventId === "login-help-1"
      ? {
          response:
            state.artifacts["rivera-result-receipt"]?.body ??
            "No case response recorded.",
        }
      : eventId === "access-request-1"
        ? {
            response:
              state.events.find((e) => e.id === eventId)?.resolution ??
              "No routing response recorded.",
          }
        : {}),
    claim: findingText(eventId, finding),
    sourceId: equivalent?.id ?? row.sourceId,
    sourceTitle: equivalent
      ? `Inspected record · ${equivalent.id}`
      : source.title,
    excerpt: equivalent ? JSON.stringify(equivalent) : row.excerpt,
    referenceStatus: finding.rowIds.includes(row.id) ? "cited" : "inspected",
    support: `${weak.includes(finding) ? "This recorded claim needs more evidence. " : "You recorded this distinction with its source. "}${limit?.support ?? question.why}`,
    nextCheck:
      limit?.nextCheck ??
      "Preserve the source's scope and ask the recipient to check the unresolved question.",
  };
}
