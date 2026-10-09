import { useEffect, useRef } from "react";
import {
  caseDispositionLabel,
  findingQuestions,
  findingText,
  reasoningFromFindings,
  type FindingQuestion,
} from "@sim/core";
import type {
  AvailableAction,
  CaseFinding,
  ClientView,
  ReasoningSelection,
  WorkSystemId,
} from "@sim/schemas";
import type { WorkplaceInteractionHandler } from "../../components/shared.js";
import type { MutationState } from "../../useMutationCoordinator.js";
import { useTabDraft } from "../../useTabDraft.js";
import { ConfirmAction } from "../../components/tools/ConfirmAction.js";

const EMPTY: ReasoningSelection = {
  version: "desk-options-v1",
  evidence: [],
  context: [],
  uncertainty: [],
  nextStep: [],
  caseFindings: [],
};

/** One case argument across destinations. Canonical saves are the board's truth. */
export function CaseWorkspace({
  view,
  eventId,
  systemId,
  onAction,
  onWorkplaceInteraction,
  onOpenSystem,
  mutationState,
  focusRequestId = 0,
}: {
  view: ClientView;
  eventId: string;
  systemId: WorkSystemId;
  onAction: (action: AvailableAction, freeText?: string) => void;
  onWorkplaceInteraction?: WorkplaceInteractionHandler;
  onOpenSystem: (systemId: WorkSystemId, eventId?: string) => void;
  mutationState: MutationState;
  focusRequestId?: number;
}) {
  const event = view.events.find((e) => e.id === eventId)!;
  const questions = findingQuestions(eventId);
  const ticket = view.structuredTickets?.[`ticket-${eventId}`];
  const reasoning = {
    ...(ticket?.reasoning ?? EMPTY),
    caseFindings: ticket?.reasoning?.caseFindings ?? [],
  };
  const actions = view.caseActions?.filter((a) => a.eventId === eventId) ?? [];
  const draftAction = actions.find((a) => a.id === "update_ticket_notes");
  const memoAction = actions.find((a) => a.id === "document_ticket");
  const pending = Boolean(mutationState.pendingKey);
  const [questionId, setQuestionId] = useTabDraft(
    `case-question:${view.sessionId}:${eventId}`,
    questions[0]!.id,
  );
  const question = questions.find((q) => q.id === questionId) ?? questions[0]!;
  const [nextStep, setNextStep] = useTabDraft<string[]>(
    `case-next:${view.sessionId}:${eventId}`,
    reasoning.nextStep,
  );
  const [decision, setDecision] = useTabDraft(
    `case-decision:${view.sessionId}:${eventId}`,
    ticket?.disposition ?? "",
  );
  const [context, setContext] = useTabDraft<string[]>(
    `case-context:${view.sessionId}:${eventId}`,
    reasoning.context,
  );
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (focusRequestId) heading.current?.focus({ preventScroll: true });
  }, [focusRequestId]);
  const selected = reasoningFromFindings(eventId, {
    ...reasoning,
    nextStep,
    context,
  });
  const groups = view.reasoningOptions?.[eventId] ?? [];
  const labels = (field: "uncertainty" | "nextStep" | "context") =>
    groups
      .find((g) => g.id === field)
      ?.options.filter((o) => selected[field].includes(o.id))
      .map((o) => o.label) ?? [];
  const payload = { ticketId: `ticket-${eventId}`, reasoning: selected };
  const openSource = async (id: string) => {
    if (onWorkplaceInteraction)
      await onWorkplaceInteraction({ type: "open_artifact", artifactId: id });
  };
  const choose = (id: string) => {
    setQuestionId(id);
    const target = questions.find((q) => q.id === id);
    if (target) onOpenSystem(target.systemId, eventId);
  };
  const receipt = ticket?.decisionReasoning;
  return (
    <section className="case-workspace" aria-label="Build a case">
      <header className="case-board" aria-label="Case argument">
        <h3 ref={heading} tabIndex={-1}>
          {event.title}
        </h3>
        <p>
          <strong>Question:</strong> Do the available records explain S-0741, or
          does it need senior review?
        </p>
        {view.artifacts.find((a) => a.id === "handoff-email")?.observed && (
          <small>
            Inherited assignment: S-0741 / owner unverified / device check
            unfinished. This is the previous analyst's handoff, not your
            finding.
          </small>
        )}
        <p className="case-board-status">
          {caseDispositionLabel(event, ticket)}
          {ticket ? ` · Memo revision ${ticket.revision}` : ""}
        </p>
        <details>
          <summary>Saved findings · your recorded claims</summary>
          {reasoning.caseFindings.length ? (
            <ul>
              {reasoning.caseFindings.map((f) => (
                <li key={f.questionId}>
                  <strong>{findingText(eventId, f)}</strong>
                  <small>
                    {questions
                      .find((q) => q.id === f.questionId)
                      ?.rows.filter((r) => f.rowIds.includes(r.id))
                      .map((r) => r.excerpt)
                      .join(" / ") || "No rows cited."}
                  </small>
                  <button type="button" onClick={() => choose(f.questionId)}>
                    Revisit {f.questionId}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p>No finding saved yet. Opening a record does not add a claim.</p>
          )}
        </details>
        <p>
          {reasoning.caseFindings.at(-1)
            ? `Last saved claim: ${findingText(eventId, reasoning.caseFindings.at(-1)!)}`
            : "Build a finding from rows in a source. You can investigate in any order."}
        </p>
        <label>
          Open question
          <select value={question.id} onChange={(e) => choose(e.target.value)}>
            {questions.map((q) => (
              <option key={q.id} value={q.id}>
                {q.title}
              </option>
            ))}
          </select>
        </label>
      </header>
      <div className="case-work-surface">
        {receipt ? (
          <section aria-label="Case response receipt">
            <h4>Response recorded</h4>
            <p>{event.resolution}</p>
            <p>
              Recipient:{" "}
              {ticket.disposition?.startsWith("escalate")
                ? "senior reviewer"
                : "case record; closure remains reviewable"}
              . Revision {ticket.revision}. Session ownership is not established
              by this operation.
            </p>
            <p>
              References actually attached:{" "}
              {[...(ticket.decisionSourceIds ?? [])]
                .map(
                  (id) => view.artifacts.find((a) => a.id === id)?.title ?? id,
                )
                .join(" · ") || "None"}
              .
            </p>
            <p>
              Requested next check:{" "}
              {groups
                .find((g) => g.id === "nextStep")
                ?.options.filter((o) => receipt.nextStep.includes(o.id))
                .map((o) => o.label)
                .join(" ") || "No next check recorded."}
            </p>
            <p>
              Receiving a memo does not certify its claims. Corrections below
              keep the original dispatch in history.
            </p>
          </section>
        ) : null}
        {systemId === "ticket_queue" ? (
          <section aria-label="Case memo">
            <h4>Memo from your saved findings</h4>
            <p>
              Give the recipient what you recorded, its sources, and the next
              check. Empty or weak findings can still be sent.
            </p>
            <ul>
              {reasoning.caseFindings.map((f) => (
                <li key={f.questionId}>{findingText(eventId, f)}</li>
              ))}
            </ul>
            {!reasoning.caseFindings.length && (
              <p>No findings recorded. This memo will carry that gap.</p>
            )}
            <p>
              Unknowns in your memo:{" "}
              {labels("uncertainty").join(" ") ||
                "No uncertainty boundary recorded."}
            </p>
            <fieldset disabled={pending}>
              <legend>Requested next check</legend>
              {groups
                .find((g) => g.id === "nextStep")
                ?.options.map((o) => (
                  <label key={o.id}>
                    <input
                      type="checkbox"
                      checked={nextStep.includes(o.id)}
                      onChange={() =>
                        setNextStep((ids) =>
                          ids.includes(o.id)
                            ? ids.filter((id) => id !== o.id)
                            : [...ids, o.id],
                        )
                      }
                    />
                    {o.label}
                  </label>
                ))}
            </fieldset>
            {!receipt && (
              <fieldset disabled={pending}>
                <legend>Judgment to dispatch</legend>
                {memoAction?.decisionOptions?.map((o) => (
                  <label key={o.id}>
                    <input
                      type="radio"
                      name={`memo-${eventId}`}
                      checked={decision === o.id}
                      onChange={() => setDecision(o.id)}
                    />
                    {o.label}
                  </label>
                ))}
              </fieldset>
            )}
            <p>
              Preview:{" "}
              {memoAction?.decisionOptions?.find((o) => o.id === decision)
                ?.label ?? "No proposed judgment."}{" "}
              {labels("nextStep").join(" ")}
            </p>
            <div className="case-operation-actions">
              <button
                type="button"
                disabled={pending || !draftAction}
                onClick={() =>
                  draftAction &&
                  onAction({ ...draftAction, ticketPayload: payload })
                }
              >
                {receipt
                  ? "Save memo correction"
                  : "Save draft — case stays open"}
              </button>
              {!receipt && (
                <ConfirmAction
                  label="Dispatch case memo"
                  pending={pending}
                  disabled={!memoAction || !decision}
                  resetKey={JSON.stringify([selected, decision])}
                  onConfirm={() =>
                    memoAction &&
                    onAction({
                      ...memoAction,
                      decisionOptionId: decision,
                      ticketPayload: {
                        ...payload,
                        dispatch: decision.startsWith("close-")
                          ? "dismiss_alert"
                          : "escalate_alert",
                      },
                    })
                  }
                >
                  <p>
                    {
                      memoAction?.decisionOptions?.find(
                        (o) => o.id === decision,
                      )?.label
                    }
                  </p>
                  <p>
                    Requested check:{" "}
                    {labels("nextStep").join(" ") || "None recorded."}
                  </p>
                  <p>
                    This sends the memo once; there is no second disposition to
                    select in Alerts.
                  </p>
                </ConfirmAction>
              )}
            </div>
            <p>
              A draft stays on your desk. Dispatch records the requested
              operation; support is evaluated in review.
            </p>
          </section>
        ) : systemId === "email" ? (
          <section aria-label="Optional reported context">
            <h4>Reported and administrative context</h4>
            <p>
              Use this to test an explanation. A travel register or employee
              report does not identify the session user.
            </p>
            {groups
              .find((g) => g.id === "context")
              ?.options.map((o) => {
                const source = view.artifacts.find(
                  (a) => a.id === o.sourceArtifactIds[0],
                );
                return (
                  <article key={o.id}>
                    <button
                      disabled={pending || !onWorkplaceInteraction}
                      type="button"
                      onClick={() => {
                        void openSource(source!.id);
                      }}
                    >
                      Open {source?.title}
                    </button>
                    {source?.observed && (
                      <>
                        <p className="case-source-body">{source.body}</p>
                        <label>
                          <input
                            type="checkbox"
                            checked={context.includes(o.id)}
                            onChange={() =>
                              setContext((ids) =>
                                ids.includes(o.id)
                                  ? ids.filter((id) => id !== o.id)
                                  : [...ids, o.id],
                              )
                            }
                          />
                          Include this reported context in the memo
                        </label>
                      </>
                    )}
                  </article>
                );
              })}
            <button
              type="button"
              onClick={() => onOpenSystem("ticket_queue", eventId)}
            >
              Review case memo
            </button>
          </section>
        ) : systemId === "team_chat" ? (
          <section aria-label="Case follow-up">
            <h4>Recipient responses</h4>
            {(view.teamMessages ?? [])
              .filter((m) => m.eventId === eventId)
              .map((m) => (
                <p key={m.id}>
                  <strong>{m.author}</strong> · {m.body}
                </p>
              ))}
            <p>
              The recipient can use your actual memo and ask for what is
              missing. Your saved findings stay on this case.
            </p>
            <button
              type="button"
              onClick={() => onOpenSystem("ticket_queue", eventId)}
            >
              Review case memo
            </button>
          </section>
        ) : (
          <FindingEditor
            key={`${view.sessionId}:${eventId}:${question.id}`}
            question={question}
            eventId={eventId}
            view={view}
            reasoning={reasoning}
            pending={pending}
            openSource={openSource}
            canOpen={Boolean(onWorkplaceInteraction)}
            onSave={(finding) => {
              if (!draftAction) return;
              const next = reasoningFromFindings(eventId, {
                ...reasoning,
                caseFindings: [
                  ...reasoning.caseFindings.filter(
                    (f) => f.questionId !== finding.questionId,
                  ),
                  finding,
                ],
              });
              onAction({
                ...draftAction,
                ticketPayload: {
                  ticketId: `ticket-${eventId}`,
                  reasoning: next,
                },
              });
            }}
          />
        )}
        {systemId !== "ticket_queue" && systemId !== "team_chat" && (
          <button
            type="button"
            className="case-memo-link"
            onClick={() => onOpenSystem("ticket_queue", eventId)}
          >
            Build judgment from saved findings
          </button>
        )}
        <details className="case-library">
          <summary>More case records and procedure</summary>
          <p>
            Optional context and deeper checks. Opening a record alone creates
            no finding.
          </p>
          {view.artifacts
            .filter((a) => a.eventIds.includes(eventId) && a.kind !== "ticket")
            .map((a) => (
              <article key={a.id}>
                <button
                  type="button"
                  disabled={pending || !onWorkplaceInteraction}
                  onClick={() => {
                    void openSource(a.id);
                  }}
                >
                  Open {a.title}
                </button>
                {a.observed && (
                  <details>
                    <summary>{a.title} · full source</summary>
                    <p className="case-source-body">{a.body}</p>
                  </details>
                )}
              </article>
            ))}
        </details>
      </div>
    </section>
  );
}

function FindingEditor({
  question,
  eventId,
  view,
  reasoning,
  pending,
  openSource,
  canOpen,
  onSave,
}: {
  question: FindingQuestion;
  eventId: string;
  view: ClientView;
  reasoning: ReasoningSelection;
  pending: boolean;
  openSource: (id: string) => Promise<void>;
  canOpen: boolean;
  onSave: (finding: CaseFinding) => void;
}) {
  const previous = reasoning.caseFindings?.find(
    (f) => f.questionId === question.id,
  );
  const key = `finding:${view.sessionId}:${eventId}:${question.id}`;
  const [rows, setRows] = useTabDraft<string[][]>(
    `${key}:rows`,
    previous?.rowSelections ??
      question.rowGroups.map(
        (g) => previous?.rowIds.filter((id) => g.rowIds.includes(id)) ?? [],
      ),
  );
  const [claim, setClaim] = useTabDraft(
    `${key}:claim`,
    previous?.claimId ?? "",
  );
  const selectedRows = [...new Set(rows.flat())];
  const sources = [...new Set(question.rows.map((r) => r.sourceId))];
  return (
    <form
      aria-label={`Construct finding: ${question.title}`}
      onSubmit={(e) => {
        e.preventDefault();
        if (claim)
          onSave({
            questionId: question.id,
            rowIds: selectedRows,
            rowSelections: rows,
            claimId: claim,
          });
      }}
    >
      <h4>{question.title}</h4>
      <p>{question.why}</p>
      <div className="case-source-actions">
        {sources.map((id) => (
          <button
            key={id}
            type="button"
            disabled={pending || !canOpen}
            onClick={() => {
              void openSource(id);
            }}
          >
            Open {view.artifacts.find((a) => a.id === id)?.title ?? id}
          </button>
        ))}
      </div>
      {question.rowGroups.map((group, index) => (
        <fieldset key={group.label} disabled={pending}>
          <legend>{group.label}</legend>
          {group.multiple ? (
            group.rowIds.map((id) => {
              const row = question.rows.find((r) => r.id === id)!;
              const ready = view.artifacts.some(
                (a) =>
                  a.id === row.sourceId &&
                  a.observed &&
                  a.body?.includes(row.excerpt),
              );
              return (
                <label key={id}>
                  <input
                    type="checkbox"
                    disabled={!ready}
                    checked={rows[index]?.includes(id) ?? false}
                    onChange={() =>
                      setRows((all) =>
                        all.map((values, i) =>
                          i === index
                            ? values.includes(id)
                              ? values.filter((r) => r !== id)
                              : [...values, id]
                            : values,
                        ),
                      )
                    }
                  />
                  {ready
                    ? row.excerpt
                    : `Open ${view.artifacts.find((a) => a.id === row.sourceId)?.title} to read this row.`}
                </label>
              );
            })
          ) : (
            <label>
              {group.label}
              <select
                value={rows[index]?.[0] ?? ""}
                onChange={(e) =>
                  setRows((all) =>
                    all.map((values, i) =>
                      i === index
                        ? e.target.value
                          ? [e.target.value]
                          : []
                        : values,
                    ),
                  )
                }
              >
                <option value="">Choose a source row, or leave uncited</option>
                {group.rowIds.map((id) => {
                  const row = question.rows.find((r) => r.id === id)!;
                  const ready = view.artifacts.some(
                    (a) =>
                      a.id === row.sourceId &&
                      a.observed &&
                      a.body?.includes(row.excerpt),
                  );
                  return (
                    <option key={id} value={id} disabled={!ready}>
                      {ready ? row.excerpt : `Open source to read ${id}`}
                    </option>
                  );
                })}
              </select>
            </label>
          )}
        </fieldset>
      ))}
      {sources.map((id) => {
        const source = view.artifacts.find((a) => a.id === id);
        return source?.observed ? (
          <details key={id}>
            <summary>Full record: {source.title}</summary>
            <p className="case-source-body">{source.body}</p>
          </details>
        ) : null;
      })}
      <fieldset disabled={pending}>
        <legend>Your claim about these rows</legend>
        {question.claims.map((c) => (
          <label key={c.id}>
            <input
              type="radio"
              name={`claim-${question.id}`}
              checked={claim === c.id}
              onChange={() => setClaim(c.id)}
            />
            {c.label}
          </label>
        ))}
      </fieldset>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setRows(question.rowGroups.map(() => []));
          setClaim("");
        }}
      >
        Clear finding selections
      </button>
      <p>
        Save what you claim, even if incomplete. A save does not certify the
        relation; the review checks support later.
      </p>
      <button
        className="action-primary"
        type="submit"
        disabled={pending || !claim}
      >
        Save finding
      </button>
      {previous && (
        <p role="status">
          Saved claim: {findingText(eventId, previous)}.{" "}
          {previous.rowIds.length
            ? "The selected rows travel with the memo."
            : "No source rows were cited."}{" "}
          Remaining decision: what response and next check does this support?
        </p>
      )}
    </form>
  );
}
