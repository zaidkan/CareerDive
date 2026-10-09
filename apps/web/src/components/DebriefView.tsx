import type { Debrief } from "@sim/schemas";

const LEGACY_LABELS: Array<[keyof Debrief["sections"], string]> = [
  ["whatHappened", "What happened"],
  ["whatYouDid", "What you did"],
  ["consequences", "Consequences"],
  ["earlyEvidence", "Early evidence"],
  ["yourExperience", "Your experience"],
  ["confidenceAndLimitations", "Confidence and limitations"],
  ["careerReality", "Career reality"],
  ["nextAction", "Ideas for later"],
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
      "expected-close": "Close the matched run",
      "expected-close-with-monitoring":
        "Close matched run; keep routine monitoring",
      "close-low-priority": "Close without a matched run",
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
      "route-to-director":
        "Sent to deadline approver; role authorization pending",
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

const FIELD_LABELS: Record<string, string> = {
  evidence: "References recorded",
  uncertainty: "Limits recorded",
  nextStep: "Requested next check",
  findings: "Source-backed findings",
  context: "Reported context",
};
const OUTCOMES = {
  supported: "Supported",
  partially_supported: "Partly documented",
  needs_more_evidence: "Needs more evidence",
};
const PROFILE_STATES = {
  strong: "Supported",
  supported: "Supported",
  developing: "Partly documented",
  partially_supported: "Partly documented",
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
          Your decisions, inspected records, and open questions. A record of
          this shift.
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
      {review.statusReview && (
        <section
          className="decision-practical-example"
          aria-label="Status communication review"
        >
          <h3>What Morgan received</h3>
          <p>{review.statusReview.message}</p>
          <p>
            <strong>{OUTCOMES[review.statusReview.outcomeLabel]}</strong> · this
            assesses the initial message, not delivery success.
          </p>
          {review.statusReview.excerpt && (
            <figure>
              <blockquote>{review.statusReview.excerpt}</blockquote>
              <figcaption>{review.statusReview.sourceTitle}</figcaption>
            </figure>
          )}
          {review.statusReview.gaps.map((gap) => (
            <p key={gap}>{gap}</p>
          ))}
          <p>
            <strong>Useful next check:</strong> {review.statusReview.nextCheck}
          </p>
          {review.statusReview.corrections.length > 0 && (
            <details>
              <summary>Later status corrections</summary>
              {review.statusReview.corrections.map((text, i) => (
                <p key={i}>{text}</p>
              ))}
            </details>
          )}
        </section>
      )}
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
                          item.userChoiceId === "route-to-director"
                        ? "Deadline approver contacted; data-owner authorization still pending."
                        : item.userChoiceId === "reject-as-attack"
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
                {item.practicalExample && (
                  <section
                    className="decision-practical-example"
                    aria-label="Your claim and its record"
                  >
                    <h4>What your work shows</h4>
                    {item.practicalExample.response && (
                      <p>
                        <strong>
                          Actual case response (authored simulation):
                        </strong>{" "}
                        {item.practicalExample.response}
                      </p>
                    )}
                    <p>
                      <strong>Your recorded claim:</strong>{" "}
                      {item.practicalExample.claim}
                    </p>
                    <figure>
                      <blockquote>{item.practicalExample.excerpt}</blockquote>
                      <figcaption>
                        {item.practicalExample.sourceTitle} ·{" "}
                        {item.practicalExample.referenceStatus === "cited"
                          ? "row cited in your finding"
                          : "inspected record; row was not cited in your finding"}
                      </figcaption>
                    </figure>
                    <p>
                      <strong>Support and limit:</strong>{" "}
                      {item.practicalExample.support}
                    </p>
                    <p>
                      <strong>Useful next check:</strong>{" "}
                      {item.practicalExample.nextCheck}
                    </p>
                  </section>
                )}
                {item.followUpReview && (
                  <section
                    className="decision-practical-example"
                    aria-label="Later result interpretation"
                  >
                    <h4>How you interpreted the response</h4>
                    <p>
                      {OUTCOMES[item.followUpReview.outcomeLabel]} · separate
                      from your original check decision.
                    </p>
                    <blockquote>{item.followUpReview.excerpt}</blockquote>
                    <ul>
                      {item.followUpReview.selectedLabels.map((label) => (
                        <li key={label}>{label}</li>
                      ))}
                    </ul>
                    {item.followUpReview.gaps.map((gap) => (
                      <p key={gap}>{gap}</p>
                    ))}
                    <p>
                      <strong>Useful next check:</strong>{" "}
                      {item.followUpReview.nextCheck}
                    </p>
                  </section>
                )}
                <details className="decision-review-reasoning">
                  <summary>Evidence and reasoning</summary>
                  <p>{item.explanation}</p>
                  {item.evaluationMode === "limited-text-evaluation" ? (
                    <p>
                      Limited-text-evaluation · saved text meaning was not
                      assessed.
                    </p>
                  ) : null}
                  {item.fieldReviews?.map((field) => (
                    <details key={field.field}>
                      <summary>
                        {FIELD_LABELS[field.field] ?? field.field}:{" "}
                        {OUTCOMES[field.outcomeLabel]}
                      </summary>
                      <ul>
                        {field.selectedLabels.map((label) => (
                          <li key={label}>{label}</li>
                        ))}
                      </ul>
                      {field.gaps.map((gap) => (
                        <p key={gap}>{gap}</p>
                      ))}
                    </details>
                  ))}
                  <ul>
                    {item.rubricSignals.map(({ id, supported }) => (
                      <li
                        key={id}
                        className={supported ? "is-supported" : "is-open"}
                      >
                        <span aria-hidden="true">{supported ? "✓" : "○"}</span>
                        {supported ? "Recorded: " : "Not established: "}
                        {meta.signals[id] ?? FIELD_LABELS[id] ?? id}
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
                        <strong>Initial record:</strong>{" "}
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
                </details>
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
          Think privately about the investigation, decisions, and handoff. This
          prompt does not collect or save a response.
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
