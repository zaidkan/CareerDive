import { RecordQueryTool } from "../../components/tools/RecordQueryTool.js";
import { TeamChatTool } from "../../components/tools/TeamChatTool.js";
import { useEffect, useRef } from "react";
import {
  sourceBundle,
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
  const event = view.events.find((e) => e.id === eventId);
  const questions = findingQuestions(eventId);
  const ticket = view.structuredTickets?.[`ticket-${eventId}`];
  const reasoning = {
    ...(ticket?.reasoning ?? EMPTY),
    caseFindings: ticket?.reasoning?.caseFindings ?? [],
  };
  const actions = view.caseActions?.filter((a) => a.eventId === eventId) ?? [];
  const draftAction = actions.find((a) => a.id === "update_ticket_notes");
  const memoAction = actions.find((a) =>
    ["document_ticket", "route_access_request", "resolve_login_help"].includes(
      a.id,
    ),
  );
  const finance = eventId === "access-request-1";
  const rivera = eventId === "login-help-1";
  const [interim, setInterim] = useTabDraft(
    `case-interim:${view.sessionId}`,
    false,
  );
  const pending = Boolean(mutationState.pendingKey);
  const [questionId, setQuestionId] = useTabDraft(
    `case-question:${view.sessionId}:${eventId}`,
    questions[0]?.id ?? "",
  );
  const question = questions.find((q) => q.id === questionId) ?? questions[0];
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
  const board = useRef<HTMLElement>(null);
  useEffect(() => {
    const element = board.current;
    const panel = element?.closest<HTMLElement>(".workspace-panel");
    if (!element || !panel || typeof ResizeObserver === "undefined") return;
    const measure = () => {
      panel.style.setProperty(
        "--case-board-height",
        `${String(element.offsetHeight + 8)}px`,
      );
    };
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    measure();
    return () => {
      observer.disconnect();
      panel.style.removeProperty("--case-board-height");
    };
  }, []);
  useEffect(() => {
    if (focusRequestId) heading.current?.focus({ preventScroll: true });
  }, [focusRequestId]);
  const selected = reasoningFromFindings(eventId, {
    ...reasoning,
    nextStep: finance
      ? decision === "route-with-interim"
        ? ["finance-nextStep-1", "finance-nextStep-2"]
        : decision === "route-to-owner"
          ? ["finance-nextStep-1", ...(interim ? ["finance-nextStep-2"] : [])]
          : decision === "route-to-director"
            ? ["finance-nextStep-3"]
            : decision === "self-approve"
              ? ["finance-nextStep-4"]
              : []
      : rivera
        ? [
            ...(decision === "update-saved-password"
              ? ["rivera-nextStep-1"]
              : decision === "name-attacker"
                ? ["rivera-nextStep-3"]
                : decision === "grant-access"
                  ? ["rivera-nextStep-4"]
                  : []),
            ...nextStep.filter((id) => id === "rivera-nextStep-2"),
          ]
        : nextStep,
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
  const latest = reasoning.caseFindings.at(-1);
  if (!event || !question)
    return <p>The selected case is unavailable. Choose a current case.</p>;
  return (
    <section className="case-workspace" aria-label="Build a case">
      <header ref={board} className="case-board" aria-label="Case argument">
        <h3 ref={heading} tabIndex={-1}>
          {event.title}
        </h3>
        <p className="case-board-status">
          {caseDispositionLabel(event, ticket)}
          {ticket ? ` · Memo revision ${String(ticket.revision ?? 0)}` : ""}
        </p>
        <details>
          <summary>Saved findings · your recorded claims</summary>
          <p>
            <strong>Question:</strong>{" "}
            {finance
              ? "What request should reach which approver, while the project keeps moving?"
              : rivera
                ? "Which device-specific check tests Rivera's sign-in problem, and what does its result establish?"
                : eventId === "routine-alert-1"
                  ? "Does this exact activity match this run and approval, and what remains outside the match?"
                  : "Do the available records explain S-0741, or does it need senior review?"}
          </p>
          {eventId === "suspicious-login-1" &&
            view.artifacts.find((a) => a.id === "handoff-email")?.observed && (
              <small>
                Inherited assignment: S-0741 / owner unverified / device check
                unfinished. This is the previous analyst's handoff, not your
                finding.
              </small>
            )}

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
                  <button
                    type="button"
                    onClick={() => {
                      choose(f.questionId);
                    }}
                  >
                    Revisit {f.questionId}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p>No finding saved yet. Opening a record does not add a claim.</p>
          )}
          <p>
            {latest
              ? `Last saved claim: ${findingText(eventId, latest)}`
              : "Build a finding from rows in a source. You can investigate in any order."}
          </p>
        </details>
        {latest && (
          <p className="case-last-finding">
            Recorded: {findingText(eventId, latest)}
          </p>
        )}
        <label>
          Open question
          <select
            value={question.id}
            onChange={(e) => {
              choose(e.target.value);
            }}
          >
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
              {finance
                ? ticket.disposition === "route-to-director"
                  ? "deadline approver; finance data-owner authorization still pending"
                  : ticket.disposition === "self-approve"
                    ? "case record; unauthorized approval remains reviewable"
                    : "finance data owner"
                : rivera
                  ? "Rivera and the troubleshooting record"
                  : ticket.disposition?.startsWith("escalate")
                    ? "senior reviewer"
                    : "case record; closure remains reviewable"}
              . Dispatch revision {ticket.decisionRevision ?? ticket.revision};
              current memo revision {ticket.revision}. An operation does not
              establish identity, approval, or general safety.
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
        {rivera &&
        receipt &&
        (systemId === "email" || systemId === "ticket_queue") ? (
          <RiveraResult
            view={view}
            ticket={ticket}
            draftAction={draftAction}
            pending={pending}
            openSource={openSource}
            onAction={onAction}
          />
        ) : systemId === "ticket_queue" ||
          (finance && systemId === "team_chat") ? (
          <section aria-label="Case memo">
            <h4>
              {finance
                ? "Routing packet from your saved scope"
                : rivera
                  ? "Choose a discriminating check"
                  : "Memo from your saved findings"}
            </h4>
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
            {labels("context").length > 0 && (
              <p>
                Reported context in this memo: {labels("context").join(" ")}
              </p>
            )}
            {!finance && (
              <fieldset disabled={pending}>
                <legend>Requested next check</legend>
                {groups
                  .find((g) => g.id === "nextStep")
                  ?.options.filter(
                    (o) => !rivera || o.id === "rivera-nextStep-2",
                  )
                  .map((o) => (
                    <label key={o.id}>
                      <input
                        type="checkbox"
                        checked={nextStep.includes(o.id)}
                        onChange={() => {
                          setNextStep((ids) =>
                            ids.includes(o.id)
                              ? ids.filter((id) => id !== o.id)
                              : [...ids, o.id],
                          );
                        }}
                      />
                      {o.label}
                    </label>
                  ))}
              </fieldset>
            )}
            {finance && !receipt && (
              <label>
                <input
                  type="checkbox"
                  disabled={pending || decision !== "route-to-owner"}
                  checked={interim}
                  onChange={() => {
                    setInterim((v) => !v);
                  }}
                />
                Include an interim report request without granting a new role
              </label>
            )}
            {!receipt && (
              <fieldset disabled={pending}>
                <legend>
                  {finance
                    ? "Recipient and response"
                    : rivera
                      ? "Check to request"
                      : "Judgment to dispatch"}
                </legend>
                {memoAction?.decisionOptions
                  ?.filter((o) => !finance || o.id !== "route-with-interim")
                  .map((o) => (
                    <label key={o.id}>
                      <input
                        type="radio"
                        name={`memo-${eventId}`}
                        checked={decision === o.id}
                        onChange={() => {
                          setDecision(o.id);
                          if (finance && o.id !== "route-to-owner")
                            setInterim(false);
                        }}
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
                onClick={() => {
                  if (draftAction)
                    onAction({ ...draftAction, ticketPayload: payload });
                }}
              >
                {receipt
                  ? "Save memo correction"
                  : "Save draft — case stays open"}
              </button>
              {!receipt && (
                <ConfirmAction
                  label={
                    finance
                      ? "Send routing request"
                      : rivera
                        ? "Request check and receive result"
                        : "Dispatch case memo"
                  }
                  pending={pending}
                  disabled={!memoAction || !decision}
                  resetKey={JSON.stringify([selected, decision])}
                  onConfirm={() => {
                    if (memoAction)
                      onAction({
                        ...memoAction,
                        decisionOptionId:
                          finance && decision === "route-to-owner" && interim
                            ? "route-with-interim"
                            : decision,
                        ticketPayload: {
                          ...payload,
                          ...(memoAction.id === "document_ticket"
                            ? {
                                dispatch:
                                  eventId === "routine-alert-1" ||
                                  decision.startsWith("close-")
                                    ? ("dismiss_alert" as const)
                                    : ("escalate_alert" as const),
                              }
                            : {}),
                        },
                      });
                  }}
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
        ) : systemId === "email" && !finance ? (
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
                        if (source) void openSource(source.id);
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
                            onChange={() => {
                              setContext((ids) =>
                                ids.includes(o.id)
                                  ? ids.filter((id) => id !== o.id)
                                  : [...ids, o.id],
                              );
                            }}
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
              onClick={() => {
                onOpenSystem("ticket_queue", eventId);
              }}
            >
              Review case memo
            </button>
          </section>
        ) : systemId === "team_chat" ? (
          <section aria-label="Case follow-up">
            <h4>Recipient responses</h4>
            <TeamChatTool
              view={view}
              eventId={eventId}
              onOpenArtifact={openSource}
              onAction={onAction}
              mutationState={mutationState}
              actions={actions.filter((a) => a.id === "ask_manager")}
            />
            <p>
              The recipient can use your actual memo and ask for what is
              missing. Your saved findings stay on this case.
            </p>
            <button
              type="button"
              onClick={() => {
                onOpenSystem("ticket_queue", eventId);
              }}
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
                ...(rivera && receipt
                  ? {
                      phase: "initial" as const,
                      nextStep: receipt.nextStep,
                      context: receipt.context,
                    }
                  : {}),
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
            onClick={() => {
              onOpenSystem("ticket_queue", eventId);
            }}
          >
            {finance
              ? "Build routing request from saved scope"
              : rivera
                ? "Choose the device check"
                : "Build judgment from saved findings"}
          </button>
        )}
        {finance && systemId === "team_chat" && (
          <details>
            <summary>Discuss this request with Morgan</summary>
            <TeamChatTool
              view={view}
              eventId={eventId}
              onOpenArtifact={openSource}
              onAction={onAction}
              mutationState={mutationState}
              actions={actions.filter((a) => a.id === "ask_manager")}
            />
          </details>
        )}
        {actions.find((a) => a.id === "query_records") && (
          <details>
            <summary>Search deeper records (optional)</summary>
            <RecordQueryTool
              view={view}
              queryAction={actions.find((a) => a.id === "query_records")}
              onQueryRecords={(action, queryPayload) => {
                onAction({ ...action, queryPayload });
              }}
              onInspectRecord={onWorkplaceInteraction}
              mutationState={mutationState}
            />
          </details>
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
              const row = question.rows.find((r) => r.id === id);
              if (!row) return null;
              const ready =
                sourceBundle(row.sourceId, [
                  ...view.artifacts.filter((a) => a.observed).map((a) => a.id),
                  ...(view.workplace.inspectedRecordIds ?? []),
                ]).length > 0;
              return (
                <label key={id}>
                  <input
                    type="checkbox"
                    disabled={!ready}
                    checked={rows[index]?.includes(id) ?? false}
                    onChange={() => {
                      setRows((all) =>
                        all.map((values, i) =>
                          i === index
                            ? values.includes(id)
                              ? values.filter((r) => r !== id)
                              : [...values, id]
                            : values,
                        ),
                      );
                    }}
                  />
                  {ready
                    ? row.excerpt
                    : `Open ${view.artifacts.find((a) => a.id === row.sourceId)?.title ?? row.sourceId} to read this row.`}
                </label>
              );
            })
          ) : (
            <label>
              {group.label}
              <select
                value={rows[index]?.[0] ?? ""}
                onChange={(e) => {
                  setRows((all) =>
                    all.map((values, i) =>
                      i === index
                        ? e.target.value
                          ? [e.target.value]
                          : []
                        : values,
                    ),
                  );
                }}
              >
                <option value="">Choose a source row, or leave uncited</option>
                {group.rowIds.map((id) => {
                  const row = question.rows.find((r) => r.id === id);
                  if (!row) return null;
                  const ready =
                    sourceBundle(row.sourceId, [
                      ...view.artifacts
                        .filter((a) => a.observed)
                        .map((a) => a.id),
                      ...(view.workplace.inspectedRecordIds ?? []),
                    ]).length > 0;
                  return (
                    <option key={id} value={id} disabled={!ready}>
                      {ready ? row.excerpt : `Open source to read ${id}`}
                    </option>
                  );
                })}
              </select>
            </label>
          )}
          {!group.multiple && rows[index]?.[0] && (
            <blockquote className="case-row-excerpt">
              {
                question.rows.find((row) => row.id === rows[index]?.[0])
                  ?.excerpt
              }
            </blockquote>
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
              onChange={() => {
                setClaim(c.id);
              }}
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

/** The test result is authored state; interpreting it is a separate saved claim. */
function RiveraResult({
  view,
  ticket,
  draftAction,
  pending,
  openSource,
  onAction,
}: {
  view: ClientView;
  ticket: NonNullable<ClientView["structuredTickets"]>[string];
  draftAction?: AvailableAction | undefined;
  pending: boolean;
  openSource: (id: string) => Promise<void>;
  onAction: (action: AvailableAction) => void;
}) {
  const receipt = view.artifacts.find((a) => a.id === "rivera-result-receipt");
  const [claim, setClaim] = useTabDraft(
    `rivera-result:${view.sessionId}:claim`,
    "",
  );
  const [reopen, setReopen] = useTabDraft(
    `rivera-result:${view.sessionId}:reopen`,
    false,
  );
  const stored =
    ticket.reasoning?.phase === "follow-up" ? ticket.reasoning : undefined;
  return (
    <section aria-label="Interpret Rivera's result">
      <h4>What did the requested check establish?</h4>
      <p>
        The six-minute exchange contains the employee response and a bounded
        retry check. A laptop/reset branch keeps the phone test unresolved.
      </p>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          void openSource("rivera-result-receipt");
        }}
      >
        Read the actual result receipt
      </button>
      {receipt?.observed && (
        <blockquote className="case-source-body">{receipt.body}</blockquote>
      )}
      <fieldset disabled={pending}>
        <legend>Interpret the actual result</legend>
        <label>
          <input
            type="radio"
            name="rivera-result"
            checked={claim === "bounded"}
            onChange={() => {
              setClaim("bounded");
            }}
          />
          Carry the receipt's actual result, including any untested phone check;
          this does not predict every later sign-in.
        </label>
        <label>
          <input
            type="radio"
            name="rivera-result"
            checked={claim === "borrow-laptop"}
            onChange={() => {
              setClaim("borrow-laptop");
            }}
          />
          The 08:42 laptop success completes the phone-app check.
        </label>
      </fieldset>
      <label>
        <input
          type="checkbox"
          disabled={pending}
          checked={reopen}
          onChange={() => {
            setReopen((v) => !v);
          }}
        />
        Reopen on continued retries, an unfamiliar device, or unrecognized
        activity; complete any untested phone check.
      </label>
      <button
        type="button"
        disabled={pending || !draftAction || !claim || !receipt?.observed}
        onClick={() => {
          if (!draftAction) return;
          onAction({
            ...draftAction,
            ticketPayload: {
              ticketId: ticket.ticketId,
              reasoning: {
                version: "desk-options-v1",
                phase: "follow-up",
                caseFindings: ticket.decisionReasoning?.caseFindings ?? [],
                evidence: [
                  "rivera-followup-evidence-1",
                  ...(view.artifacts.some(
                    (a) => a.id === "rivera-auth-summary" && a.observed,
                  )
                    ? ["rivera-followup-evidence-2"]
                    : []),
                ],
                context: [],
                uncertainty: [
                  claim === "bounded"
                    ? "rivera-followup-uncertainty-1"
                    : "rivera-followup-uncertainty-2",
                  ...(claim === "bounded"
                    ? ["rivera-followup-uncertainty-3"]
                    : []),
                ],
                nextStep: [
                  ...(claim === "borrow-laptop"
                    ? ["rivera-followup-nextStep-2"]
                    : []),
                  ...(reopen ? ["rivera-followup-nextStep-1"] : []),
                ],
              },
            },
          });
        }}
      >
        Save result interpretation
      </button>
      {stored && (
        <p role="status">
          Result interpretation saved:{" "}
          {stored.uncertainty.includes("rivera-followup-uncertainty-2")
            ? "Laptop success was claimed as a completed phone check."
            : "The actual receipt and its bounded limit are carried forward."}{" "}
          Original request remains in the decision history; saved claims are
          evaluated later.
        </p>
      )}
    </section>
  );
}
