import { findingQuestions, findingText, findingReviewGaps } from "@sim/core";
import type { Debrief, ReasoningSelection, WorldState } from "@sim/schemas";
type Example = NonNullable<
  NonNullable<
    Debrief["decisionReview"]
  >["decisions"][number]["practicalExample"]
>;
const LIMITS: Record<string, { support: string; nextCheck: string }> = {
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
      (r) => finding.rowIds.includes(r.id) && inspected.includes(r.sourceId),
    ) ?? question.rows.find((r) => inspected.includes(r.sourceId));
  if (!row) return undefined;
  const source = state.artifacts[row.sourceId];
  if (!source?.body.includes(row.excerpt)) return undefined;
  const limit = LIMITS[finding.questionId];
  return {
    claim: findingText(eventId, finding),
    sourceId: row.sourceId,
    sourceTitle: source.title,
    excerpt: row.excerpt,
    referenceStatus: finding.rowIds.includes(row.id) ? "cited" : "inspected",
    support: `${weak.includes(finding) ? "This recorded claim needs more evidence. " : "You recorded this distinction with its source. "}${limit?.support ?? question.why}`,
    nextCheck:
      limit?.nextCheck ??
      "Preserve the source's scope and ask the recipient to check the unresolved question.",
  };
}
