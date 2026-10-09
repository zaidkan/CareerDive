import { useTabDraft } from "../../useTabDraft.js";
import type {
  AvailableAction,
  ClientView,
  ReasoningSelection,
  TicketUpdatePayload,
} from "@sim/schemas";
import {
  actionMutationKey,
  type MutationState,
} from "../../useMutationCoordinator.js";
import { ReasoningFields } from "./ReasoningFields.js";

export function TicketComposer({
  view,
  action,
  draftAction,
  onAction,
  mutationState,
  onOpenArtifact,
}: {
  view: ClientView;
  action: AvailableAction;
  draftAction?: AvailableAction | undefined;
  onAction: (action: AvailableAction) => void;
  mutationState: MutationState;
  onOpenArtifact?: ((id: string) => Promise<unknown>) | undefined;
}) {
  const ticket = view.structuredTickets?.[`ticket-${action.eventId}`];
  const groups = view.reasoningOptions?.[action.eventId] ?? [];
  const phase = groups.some((g) =>
    g.options.some((o) => o.id.startsWith("rivera-followup-")),
  )
    ? "follow-up"
    : "initial";
  const [reasoning, setReasoning] = useTabDraft<ReasoningSelection>(
    `ticket:${view.sessionId}:${action.eventId}:selections-v1:${phase}`,
    ticket?.reasoning && (ticket.reasoning.phase ?? "initial") === phase
      ? ticket.reasoning
      : {
          version: "desk-options-v1",
          phase,
          evidence: [],
          context: [],
          uncertainty: [],
          nextStep: [],
        },
  );
  const [decisionOptionId, setDecisionOptionId] = useTabDraft(
    `ticket:${view.sessionId}:${action.eventId}:decisionOptionId`,
    ticket?.disposition ?? "",
  );
  const sourceIds = [
    ...new Set(
      groups.flatMap((group) =>
        group.options
          .filter((o) => reasoning[group.id].includes(o.id))
          .flatMap((o) => o.inspectedSourceIds),
      ),
    ),
  ];
  const payload: TicketUpdatePayload = {
    ticketId: `ticket-${action.eventId}`,
    reasoning,
    sourceArtifactIds: sourceIds.filter((id) =>
      view.artifacts.some((a) => a.id === id),
    ),
    sourceRecordIds: sourceIds.filter(
      (id) => !view.artifacts.some((a) => a.id === id),
    ),
  };
  const pending = Boolean(mutationState.pendingKey);
  const record = ["route_access_request", "resolve_login_help"].includes(
    action.id,
  );
  return (
    <form
      className="case-ticket-composer"
      aria-label={`Case note for ${view.events.find((e) => e.id === action.eventId)?.title ?? action.eventId}`}
      onSubmit={(e) => {
        e.preventDefault();
      }}
    >
      <h4>{record ? "Case response" : "Case ticket"}</h4>
      <p>
        {record
          ? "Select your findings, then record the action below."
          : "Save your note here. Send the request or closure from Alerts."}
      </p>
      <ReasoningFields
        groups={groups}
        selected={reasoning}
        onChange={setReasoning}
        onOpenArtifact={onOpenArtifact}
        pending={pending}
        sourceTitles={Object.fromEntries(
          view.artifacts.map((a) => [a.id, a.title]),
        )}
      />
      {action.decisionOptions?.length ? (
        <fieldset>
          <legend>{record ? "Case action" : "Ticket decision"}</legend>
          {action.decisionOptions.map(({ id, label }) => (
            <label key={id}>
              <input
                type="radio"
                disabled={pending}
                name={`disposition-${action.eventId}`}
                checked={decisionOptionId === id}
                onChange={() => {
                  setDecisionOptionId(id);
                }}
              />
              {label}
            </label>
          ))}
        </fieldset>
      ) : null}
      <p>
        No answers are preselected. Incomplete findings can be saved and
        reviewed honestly.
      </p>
      {draftAction && draftAction.id !== action.id ? (
        <button
          type="button"
          disabled={pending}
          data-action-id={draftAction.id}
          data-event-id={draftAction.eventId}
          onClick={() => {
            onAction({ ...draftAction, ticketPayload: payload });
          }}
        >
          Save draft
        </button>
      ) : null}
      <button
        type="button"
        className="action-primary"
        data-action-id={action.id}
        data-event-id={action.eventId}
        disabled={
          pending ||
          Boolean(action.decisionOptions?.length && !decisionOptionId)
        }
        onClick={() => {
          onAction({
            ...action,
            ticketPayload: payload,
            ...(action.decisionOptions?.length && decisionOptionId
              ? { decisionOptionId }
              : {}),
          });
        }}
      >
        {mutationState.pendingKey === actionMutationKey(action)
          ? "Saving…"
          : record
            ? "Record case decision"
            : action.id === "update_ticket_notes"
              ? ticket?.decisionReasoning
                ? "Save note correction"
                : "Save draft"
              : "Save analysis and decision"}
      </button>
      {ticket ? (
        <p role="status">
          Saved revision {ticket.revision ?? 0}:{" "}
          {ticket.status.replaceAll("_", " ")}.{" "}
          {(ticket.sourceArtifactIds?.length ?? 0) +
            (ticket.sourceRecordIds?.length ?? 0)}{" "}
          source(s) attached.
        </p>
      ) : null}
      {ticket && !ticket.reasoning ? (
        <details>
          <summary>Earlier note · limited-text-evaluation</summary>
          <p>{ticket.verifiedEvidence}</p>
          <p>{ticket.uncertainty}</p>
          <p>{ticket.followUp}</p>
        </details>
      ) : null}
    </form>
  );
}
