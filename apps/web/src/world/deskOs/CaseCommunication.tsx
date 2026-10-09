import { useEffect, useRef } from "react";
import { TeamChatTool } from "../../components/tools/TeamChatTool.js";
import { caseDispositionLabel, findingText } from "@sim/core";
import type { AvailableAction, ClientView, WorkSystemId } from "@sim/schemas";
import { useTabDraft } from "../../useTabDraft.js";
import type { WorkplaceInteractionHandler } from "../../components/shared.js";
import { ConfirmAction } from "../../components/tools/ConfirmAction.js";
import { HandoffBuilder } from "../../components/tools/HandoffBuilder.js";

/** Reuse actual case work in one ownership/status/handoff message. */
export function CaseCommunication({
  view,
  eventId,
  systemId,
  pending,
  onAction,
  onOpenSystem,
  onWorkplaceInteraction,
  focusRequestId = 0,
}: {
  focusRequestId?: number;
  view: ClientView;
  eventId: string;
  systemId: WorkSystemId;
  pending: boolean;
  onAction: (action: AvailableAction) => void;
  onOpenSystem: (id: WorkSystemId, eventId?: string) => void;
  onWorkplaceInteraction?: WorkplaceInteractionHandler | undefined;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const consumedFocus = useRef(0);
  useEffect(() => {
    if (focusRequestId && consumedFocus.current !== focusRequestId) {
      consumedFocus.current = focusRequestId;
      heading.current?.focus({ preventScroll: true });
    }
  }, [focusRequestId, systemId]);
  const event = view.events.find((e) => e.id === eventId);
  const [owner, setOwner] = useTabDraft(`case-owner:${view.sessionId}`, "");
  const [status, setStatus] = useTabDraft<Record<string, string>>(
    `status-message:${view.sessionId}`,
    {},
  );
  const action = [...(view.caseActions ?? []), ...view.availableActions].find(
    (a) =>
      a.eventId === eventId &&
      a.id ===
        (eventId === "handoff-1"
          ? "acknowledge_handoff"
          : eventId === "status-check-1"
            ? "send_status_update"
            : "submit_shift_handoff"),
  );
  const open = async (artifactId: string) => {
    if (onWorkplaceInteraction)
      await onWorkplaceInteraction({ type: "open_artifact", artifactId });
  };
  const messages = (view.teamMessages ?? []).filter(
    (m) => m.eventId === eventId,
  );
  const statusIds = Object.values(status).filter((id) =>
    view.statusOptions?.some((g) => g.options.some((o) => o.id === id)),
  );
  return (
    <section className="case-workspace" aria-label="Case communication">
      <header className="case-board">
        <h3 ref={heading} tabIndex={-1}>
          {event?.title}
        </h3>
        <p>
          <strong>Question:</strong>{" "}
          {eventId === "handoff-1"
            ? "Which unfinished case will you take ownership of?"
            : eventId === "status-check-1"
              ? "What does Morgan need from the work you have actually recorded?"
              : "What must the next analyst inherit, and who owns the next check?"}
        </p>
        <p>{event?.resolution ?? "Message has not been sent."}</p>
      </header>
      <div className="case-work-surface">
        {eventId === "handoff-1" ? (
          <>
            <p>
              A-1042 created S-0741 after failed checks. Decide whether the
              available records explain the session or warrant senior review.
              Your memo must let the reviewer continue without repeating your
              checks.
            </p>
            <button
              type="button"
              disabled={pending || !onWorkplaceInteraction}
              onClick={() => {
                void open("handoff-email");
              }}
            >
              Read incoming assignment
            </button>
            {view.artifacts.find((a) => a.id === "handoff-email")?.observed && (
              <>
                <blockquote className="case-source-body">
                  {view.artifacts.find((a) => a.id === "handoff-email")?.body}
                </blockquote>
                <fieldset disabled={pending}>
                  <legend>Case to own first</legend>
                  {view.events
                    .filter((e) =>
                      ["suspicious-login-1", "routine-alert-1"].includes(e.id),
                    )
                    .map((e) => (
                      <label key={e.id}>
                        <input
                          type="radio"
                          name="assignment-owner"
                          checked={owner === e.id}
                          onChange={() => {
                            setOwner(e.id);
                          }}
                        />
                        {e.title}
                        {e.status === "pending"
                          ? " — expected later; login remains available now"
                          : ""}
                      </label>
                    ))}
                </fieldset>
                {action && (
                  <ConfirmAction
                    label="Take ownership and tell Morgan"
                    pending={pending}
                    disabled={!owner}
                    resetKey={owner}
                    onConfirm={() => {
                      onAction({
                        ...action,
                        ticketPayload: {
                          ticketId: "ticket-handoff-1",
                          ownershipCaseId: owner,
                        },
                      });
                    }}
                  >
                    <p>
                      Own {view.events.find((e) => e.id === owner)?.title}.
                      Inherited owner/device questions remain unverified; this
                      operation records responsibility.
                    </p>
                  </ConfirmAction>
                )}
              </>
            )}
            {event?.status === "resolved" && (
              <>
                <p>
                  Ownership recorded; Morgan's acknowledgement is attached to
                  the chosen case.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onOpenSystem(
                      "alert_dashboard",
                      owner || "suspicious-login-1",
                    );
                  }}
                >
                  Open the case I own
                </button>
              </>
            )}
          </>
        ) : eventId === "shift-handoff-1" && action ? (
          <HandoffBuilder
            view={view}
            action={action}
            onAction={onAction}
            pending={pending}
            onOpenArtifact={open}
          />
        ) : eventId === "status-check-1" ? (
          <>
            <details>
              <summary>Current case memos · reuse recorded work</summary>
              {view.events
                .filter(
                  (e) =>
                    !["pending"].includes(e.status) &&
                    [
                      "suspicious-login-1",
                      "routine-alert-1",
                      "access-request-1",
                      "login-help-1",
                    ].includes(e.id),
                )
                .map((e) => {
                  const ticket = view.structuredTickets?.[`ticket-${e.id}`];
                  return (
                    <article key={e.id}>
                      <h4>{e.title}</h4>
                      <p>{caseDispositionLabel(e, ticket)}</p>
                      <ul>
                        {ticket?.reasoning?.caseFindings?.map((f) => (
                          <li key={f.questionId}>{findingText(e.id, f)}</li>
                        ))}
                      </ul>
                      <p>
                        Recorded unknowns:{" "}
                        {ticket?.uncertainty || "None saved."}
                      </p>
                      <p>
                        Requested next check:{" "}
                        {ticket?.followUp || "None saved."}
                      </p>
                    </article>
                  );
                })}
            </details>
            <p>
              Choose what matters for Morgan. Empty or unsupported claims may be
              sent; the debrief evaluates them later.
            </p>
            {view.statusOptions?.map((g) => (
              <fieldset key={g.id} disabled={pending}>
                <legend>{g.title}</legend>
                {g.options.map((o) => (
                  <label key={o.id}>
                    <input
                      type="radio"
                      name={g.id}
                      checked={status[g.id] === o.id}
                      onChange={() => {
                        setStatus((prev) => ({ ...prev, [g.id]: o.id }));
                      }}
                    />
                    {o.label}
                  </label>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setStatus((prev) => ({ ...prev, [g.id]: "" }));
                  }}
                >
                  Leave this part out
                </button>
                {[
                  ...new Set(
                    g.options.flatMap((o) => (o.sourceId ? [o.sourceId] : [])),
                  ),
                ].map((id) => (
                  <article key={id}>
                    <button
                      type="button"
                      disabled={!onWorkplaceInteraction}
                      onClick={() => {
                        void open(id);
                      }}
                    >
                      Open {view.artifacts.find((a) => a.id === id)?.title}
                    </button>
                    {view.artifacts.find((a) => a.id === id)?.observed && (
                      <details>
                        <summary>Read source</summary>
                        <p className="case-source-body">
                          {view.artifacts.find((a) => a.id === id)?.body}
                        </p>
                      </details>
                    )}
                  </article>
                ))}
              </fieldset>
            ))}
            <section aria-label="Status message preview">
              <h4>Message to Morgan</h4>
              <p>
                {view.statusOptions
                  ?.flatMap((g) =>
                    g.options.filter((o) => statusIds.includes(o.id)),
                  )
                  .map((o) => o.label)
                  .join(" ") || "No claims selected."}
              </p>
              <p>
                The recorded case memos, pending recipients and next checks
                travel with this update.
              </p>
            </section>
            {action && (
              <ConfirmAction
                label={
                  event?.status === "resolved"
                    ? "Send status correction"
                    : "Send status to Morgan"
                }
                pending={pending}
                resetKey={JSON.stringify(statusIds)}
                onConfirm={() => {
                  onAction({
                    ...action,
                    ticketPayload: {
                      ticketId: "ticket-status-check-1",
                      statusOptionIds: statusIds,
                    },
                  });
                }}
              >
                <p>
                  Send these recorded claims and current case memos once.
                  Receipt confirms delivery, not their accuracy.
                </p>
              </ConfirmAction>
            )}
          </>
        ) : (
          <p>
            This communication is recorded; its recipients and open questions
            remain in the case history.
          </p>
        )}
        {systemId !== "team_chat" && messages.length > 0 && (
          <details open>
            <summary>Actual sent message and response</summary>
            {messages.map((m) => (
              <p className="case-source-body" key={m.id}>
                <strong>{m.author}</strong> · {m.body}
              </p>
            ))}
          </details>
        )}
        {systemId === "team_chat" && (
          <TeamChatTool
            view={view}
            eventId={eventId}
            onOpenArtifact={open}
            onAction={onAction}
            actions={view.availableActions.filter(
              (a) => a.eventId === eventId && a.id === "ask_manager",
            )}
          />
        )}
        {systemId !== "team_chat" && eventId !== "handoff-1" && (
          <button
            type="button"
            onClick={() => {
              onOpenSystem("team_chat", eventId);
            }}
          >
            Open Team chat for this message
          </button>
        )}
      </div>
    </section>
  );
}
