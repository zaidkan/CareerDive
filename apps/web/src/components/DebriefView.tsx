import type { Debrief } from "@sim/schemas";

const LEGACY_LABELS: Array<[keyof Debrief["sections"], string]> = [
  ["whatHappened", "What happened"],
  ["whatYouDid", "What you did"],
  ["consequences", "Consequences"],
  ["earlyEvidence", "Early evidence"],
  ["yourExperience", "Your experience"],
  ["confidenceAndLimitations", "Confidence and limitations"],
  ["careerReality", "Career reality"],
  ["nextAction", "Next action"],
];

const describeHandoff = (ids: string[]) =>
  ids.map((id) => id.replaceAll("-", " ")).join(", ");

const DECISIONS: Record<
  string,
  {
    artifact: string;
    title: string;
    context: string;
    recordLine: string;
    reflection: string;
    choices: Record<string, string>;
    signals: Record<string, string>;
  }
> = {
  suspicious_login: {
    artifact: "ALERT / A-1042",
    title: "The unfamiliar sign-in",
    context:
      "Failed checks ended in a successful session from an unfamiliar device.",
    recordLine:
      "07:38–07:40 · six failed challenges · successful session S-0741",
    reflection:
      "If you had closed the alert, which independent record would you need to explain the unfamiliar session? If you closed it, what would justify reopening it?",
    choices: {
      escalate_alert: "Requested senior review",
      dismiss_alert: "Dismissed the alert",
      "escalate-with-comparisons": "Escalated with comparisons",
      "escalate-identifiers-only": "Escalated with identifiers only",
      "close-location-explained": "Closed using location explanation",
      "close-familiar-account": "Closed using familiar account history",
    },
    signals: {
      compared_records: "Compared flagged session with VPN catalogue",
      checked_device: "Checked the exact device inventory",
      documented_uncertainty: "Documented the collection gap",
      kept_review_boundary: "Kept the final determination with senior review",
    },
  },
  scanner_interruption: {
    artifact: "INTERRUPTION / A-1180",
    title: "The scanner interruption",
    context: "A lower-priority alert arrived while the login case was open.",
    recordLine: "RUN-FIN-031 · discovery connections · approved Monday window",
    reflection:
      "Would handling this alert immediately, snoozing it, or finishing the login check first change what the next analyst needed from your notes?",
    choices: {
      handle: "Handled it immediately",
      snooze: "Snoozed the interruption",
      continue: "Continued the current case",
    },
    signals: {
      made_priority_choice: "Made a timing choice",
      checked_run: "Checked the scanner run",
      checked_window: "Checked the approved window",
      documented_closure: "Documented the bounded closure",
    },
  },
  finance_access: {
    artifact: "REQUEST / FINANCE",
    title: "The urgent access request",
    context: "A deadline did not transfer approval authority to the analyst.",
    recordLine: "finance-reporting-prod · access pending owner decision",
    reflection:
      "What would happen if a project deadline were treated as access approval, and whose authority would that bypass?",
    choices: {
      route_access_request: "Routed to the finance data owner",
      "route-to-owner": "Routed to the finance data owner",
      "route-with-interim": "Routed with an interim report",
      "self-approve": "Approved access directly",
      "reject-as-attack": "Rejected as an attack",
    },
    signals: {
      reviewed_approval_owner: "Opened the approval guide",
      stayed_in_role: "Kept access pending owner approval",
      explained_boundary: "Recorded the authority boundary",
    },
  },
  routine_login: {
    artifact: "SUPPORT / LOGIN",
    title: "The routine sign-in problem",
    context:
      "A managed phone retried a saved password while the laptop still worked.",
    recordLine:
      "managed phone: five retries · managed laptop: successful sign-in",
    reflection:
      "Which new observation would make the saved-password explanation weaker and call for a security review?",
    choices: { resolve_login_help: "Troubleshot the saved password" },
    signals: {
      compared_devices: "Compared device-specific sign-ins",
      tested_ordinary_cause: "Tested an ordinary cause",
      kept_reassessment_open: "Left room to reassess if retries continued",
    },
  },
  shift_handoff: {
    artifact: "HANDOFF / NEXT SHIFT",
    title: "The next analyst's starting point",
    context:
      "A useful handoff separates completed checks from questions still under review.",
    recordLine: "completed checks / open question / next owner",
    reflection:
      "What would the next analyst have to repeat if the open question or reviewer owner were missing?",
    choices: {
      submit_shift_handoff: "Sent a continuity handoff",
      complete: "Complete handoff",
      corrected: "Corrected handoff",
      thin: "Thin handoff",
    },
    signals: {
      named_confirmed_work: "Named the checked work",
      kept_open_question: "Preserved the open question",
      named_next_owner: "Named the next owner and action",
    },
  },
};

const OUTCOMES = {
  supported: "Supported by the record",
  partially_supported: "Partly documented",
  needs_more_evidence: "Needs more evidence",
};
const PROFILE_STATES = {
  strong: "Strong",
  developing: "Developing",
  needs_more_evidence: "Needs more evidence",
};

export function DebriefView({
  debrief,
  sourceTitles = {},
}: {
  debrief: Debrief;
  sourceTitles?: Record<string, string>;
}) {
  const review = debrief.decisionReview;
  if (!review)
    return (
      <section className="debrief-shell" aria-labelledby="debrief-title">
        <h2 id="debrief-title">Shift debrief</h2>
        <p className="debrief-lede">
          A plain-language wrap of what showed up, what you did, and what that
          suggests about the work.
        </p>
        <div className="debrief-grid">
          {LEGACY_LABELS.map(([key, label]) => (
            <article key={key}>
              <h3>{label}</h3>
              <p>{debrief.sections[key]}</p>
            </article>
          ))}
        </div>
      </section>
    );

  return (
    <section
      className="debrief-shell decision-review"
      aria-labelledby="debrief-title"
    >
      <header className="decision-review-intro">
        <span className="decision-review-stamp">Shift complete · Verdaly</span>
        <h2 id="debrief-title">Your shift in review</h2>
        <p>
          Five moments from your Cybersecurity Analyst shift. This record shows
          what you chose, what the saved evidence supports, and where a
          different path was possible. It is a review of this shift, not a grade
          or career verdict.
        </p>
        <nav aria-label="Decisions in this review">
          <ol>
            {review.decisions.map((item, index) => (
              <li key={item.decisionId}>
                <a href={`#decision-${item.decisionId}`}>
                  {String(index + 1).padStart(2, "0")} ·{" "}
                  {DECISIONS[item.decisionId]?.title ?? item.decisionId}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      </header>
      <div className="decision-review-sequence">
        {review.decisions.map((item, index) => {
          const meta = DECISIONS[item.decisionId];
          if (!meta) return null;
          return (
            <article
              className="decision-review-item"
              id={`decision-${item.decisionId}`}
              key={item.decisionId}
              aria-labelledby={`decision-heading-${item.decisionId}`}
            >
              <div className="decision-review-artifact">
                <span>{meta.artifact}</span>
                <span>Decision {String(index + 1).padStart(2, "0")} / 05</span>
              </div>
              <div className="decision-review-body">
                <div className="decision-review-heading">
                  <h3 id={`decision-heading-${item.decisionId}`}>
                    {meta.title}
                  </h3>
                  <p>{meta.context}</p>
                  <p className="decision-review-recordline">
                    {item.decisionId === "finance_access" &&
                    item.userChoiceId === "self-approve"
                      ? "finance-reporting-prod · role approved directly"
                      : item.decisionId === "finance_access" &&
                          item.userChoiceId === "reject-as-attack"
                        ? "finance-reporting-prod · request rejected; business need unresolved"
                        : meta.recordLine}
                  </p>
                </div>
                <div className="decision-review-choice">
                  <span className="decision-review-label">Your decision</span>
                  <strong>
                    {item.userChoiceId
                      ? (meta.choices[item.userChoiceId] ?? item.userChoiceId)
                      : "No decision recorded"}
                  </strong>
                  <span
                    className={`decision-review-outcome decision-review-outcome-${item.outcomeLabel}`}
                  >
                    {OUTCOMES[item.outcomeLabel]}
                  </span>
                </div>
                <div className="decision-review-reasoning">
                  <h4>Reasoning review</h4>
                  <p>{item.explanation}</p>
                  <ul>
                    {item.rubricSignals.map(({ id, supported }) => (
                      <li
                        key={id}
                        className={supported ? "is-supported" : "is-open"}
                      >
                        <span aria-hidden="true">{supported ? "✓" : "○"}</span>
                        {supported ? "Recorded: " : "Not established: "}
                        {meta.signals[id] ?? id}
                      </li>
                    ))}
                  </ul>
                  <p className="decision-review-sources">
                    {item.evidenceUsedIds.length
                      ? `Records inspected ${item.decisionId === "scanner_interruption" ? "before closure" : "before this decision"}: ${item.evidenceUsedIds.map((id) => sourceTitles[id] ?? id).join(" · ")}`
                      : `No source opening recorded ${item.decisionId === "scanner_interruption" ? "before closure" : "before this decision"}.`}
                  </p>
                  {item.reasoningAnalysis?.callbackText.map(
                    (body, callbackIndex) => (
                      <p key={callbackIndex}>Later response: {body}</p>
                    ),
                  )}
                  {item.reasoningAnalysis?.correctionHistory.map(
                    (entry, correctionIndex) => (
                      <p key={correctionIndex}>
                        <strong>Initial handoff:</strong>{" "}
                        {describeHandoff(entry.initialOptionIds)}.
                        {entry.correctedOptionIds ? (
                          <>
                            {" "}
                            <strong>Later correction:</strong>{" "}
                            {describeHandoff(entry.correctedOptionIds)}.
                          </>
                        ) : (
                          " Still open."
                        )}
                      </p>
                    ),
                  )}
                  <details className="decision-review-other-path">
                    <summary>Consider another path</summary>
                    <p>{meta.reflection}</p>
                  </details>
                </div>
                {item.comparisonEligible && item.cohort.status === "ready" ? (
                  <div className="decision-review-community">
                    <h4>How other completed shifts handled this</h4>
                    <>
                      <ul>
                        {item.availableChoiceIds.map((choiceId) => {
                          const percentage =
                            item.cohort.status === "ready"
                              ? (item.cohort.percentages[choiceId] ?? 0)
                              : 0;
                          return (
                            <li key={choiceId}>
                              <span>{meta.choices[choiceId] ?? choiceId}</span>
                              <strong>{percentage}%</strong>
                              <span
                                className="decision-review-bar"
                                aria-hidden="true"
                              >
                                <span
                                  style={{ width: `${String(percentage)}%` }}
                                />
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                      <p>
                        Based on {item.cohort.sampleSize} completed shifts with
                        this decision on career version {review.careerVersion}.
                        Popularity does not decide quality.
                      </p>
                    </>
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
      <section
        className="decision-review-profile"
        aria-labelledby="profile-heading"
      >
        <h3 id="profile-heading">How you worked</h3>
        <p>
          Observable behavior from this particular shift. More situations could
          show a different pattern.
        </p>
        <dl>
          {review.profile.map((item) => (
            <div key={item.dimension}>
              <dt>{item.dimension}</dt>
              <dd>
                <strong>{PROFILE_STATES[item.state]}</strong>
                <span>{item.explanation}</span>
              </dd>
            </div>
          ))}
        </dl>
      </section>
      <section
        className="decision-review-reflect"
        aria-labelledby="reflect-heading"
      >
        <h3 id="reflect-heading">Reflect</h3>
        <p>Would you want to do work like this again?</p>
        <span>
          Your answer belongs in the separate career feedback step, where you
          can describe interest and realism in your own words.
        </span>
      </section>
      <details className="decision-review-record">
        <summary>Read the full shift record</summary>
        <dl>
          {LEGACY_LABELS.map(([key, label]) => (
            <div key={key}>
              <dt>{label}</dt>
              <dd>{debrief.sections[key]}</dd>
            </div>
          ))}
        </dl>
      </details>
    </section>
  );
}
