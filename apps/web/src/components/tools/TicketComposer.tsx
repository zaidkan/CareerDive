import { useTabDraft } from "../../useTabDraft.js";
import type {
  AvailableAction,
  ClientView,
  TicketUpdatePayload,
} from "@sim/schemas";
import {
  actionMutationKey,
  type MutationState,
} from "../../useMutationCoordinator.js";

export function TicketComposer({
  view,
  action,
  draftAction,
  onAction,
  mutationState,
}: {
  view: ClientView;
  action: AvailableAction;
  draftAction?: AvailableAction | undefined;
  onAction: (action: AvailableAction, freeText?: string) => void;
  mutationState: MutationState;
}) {
  const ticket = view.structuredTickets?.[`ticket-${action.eventId}`];
  const [verifiedEvidence, setVerifiedEvidence] = useTabDraft(
    `ticket:${view.sessionId}:${action.eventId}:verifiedEvidence`,
    ticket?.verifiedEvidence ?? "",
  );
  const [uncertainty, setUncertainty] = useTabDraft(
    `ticket:${view.sessionId}:${action.eventId}:uncertainty`,
    ticket?.uncertainty ?? "",
  );
  const [followUp, setFollowUp] = useTabDraft(
    `ticket:${view.sessionId}:${action.eventId}:followUp`,
    ticket?.followUp ?? "",
  );
  const [sourceArtifactIds, setSourceArtifactIds] = useTabDraft<string[]>(
    `ticket:${view.sessionId}:${action.eventId}:sourceArtifactIds`,
    ticket?.sourceArtifactIds ?? [],
  );
  const [decisionOptionId, setDecisionOptionId] = useTabDraft(
    `ticket:${view.sessionId}:${action.eventId}:decisionOptionId`,
    ticket?.disposition ?? "",
  );
  const sources = view.artifacts.filter(
    ({ id, eventIds }) =>
      view.workplace.inspectedArtifactIds?.includes(id) &&
      eventIds.includes(action.eventId),
  );
  const payload: TicketUpdatePayload = {
    ticketId: `ticket-${action.eventId}`,
    verifiedEvidence,
    uncertainty,
    followUp,
    sourceArtifactIds,
  };
  const canSubmit =
    verifiedEvidence.trim() &&
    uncertainty.trim() &&
    followUp.trim() &&
    sourceArtifactIds.length &&
    (!action.decisionOptions?.length || decisionOptionId);
  return (
    <form
      className="case-ticket-composer"
      aria-label={`Ticket for ${view.events.find(({ id }) => id === action.eventId)?.title ?? action.eventId}`}
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <h4>Case ticket</h4>
      <p>Findings, uncertainty, next step.</p>
      {action.eventId === "suspicious-login-1" ? (
        <p role="status">
          {view.workplace.comparisons?.some(
            (item) =>
              item.eventId === action.eventId &&
              ["login-session-timeline", "vpn-context-1"].every((id) =>
                item.artifactIds.includes(id),
              ),
          )
            ? "Required session timeline / VPN catalogue comparison saved. Attach these sources and the device inventory for a review request with comparisons."
            : "Required session timeline / VPN catalogue comparison not recorded. Use Record this comparison in Sources for this case before requesting review with comparisons. Attaching sources alone does not record it."}
        </p>
      ) : null}
      <label>
        Verified evidence
        <textarea
          aria-label="Verified evidence"
          placeholder="Records and identifiers supporting your decision"
          rows={3}
          maxLength={2000}
          value={verifiedEvidence}
          onChange={(event) => {
            setVerifiedEvidence(event.target.value);
          }}
        />
      </label>
      <label>
        Uncertainty
        <textarea
          aria-label="Uncertainty"
          placeholder="What the records still cannot establish"
          rows={3}
          maxLength={2000}
          value={uncertainty}
          onChange={(event) => {
            setUncertainty(event.target.value);
          }}
        />
      </label>
      <label>
        Next step
        <textarea
          aria-label="Next step"
          placeholder="Who should check what next"
          rows={2}
          maxLength={500}
          value={followUp}
          onChange={(event) => {
            setFollowUp(event.target.value);
          }}
        />
      </label>
      <fieldset>
        <legend>Attach opened sources</legend>
        {sources.length ? (
          sources.map((source) => (
            <label key={source.id}>
              <input
                type="checkbox"
                checked={sourceArtifactIds.includes(source.id)}
                onChange={(event) => {
                  setSourceArtifactIds((current) =>
                    event.target.checked
                      ? [...current, source.id]
                      : current.filter((id) => id !== source.id),
                  );
                }}
              />
              {source.title} ({source.id})
            </label>
          ))
        ) : (
          <p>No case sources opened yet.</p>
        )}
      </fieldset>
      {action.decisionOptions?.length ? (
        <fieldset>
          <legend>Ticket decision</legend>
          {action.decisionOptions.map(({ id, label }) => (
            <label key={id}>
              <input
                type="radio"
                name={`disposition-${action.eventId}`}
                value={id}
                checked={decisionOptionId === id}
                onChange={() => {
                  setDecisionOptionId(id);
                }}
              />
              <span>
                <strong>{label}</strong>
                <small>
                  {id.startsWith("escalate")
                    ? "Propose senior review. Send from Alerts after saving."
                    : "Propose closure. Close from Alerts after saving."}
                </small>
              </span>
            </label>
          ))}
        </fieldset>
      ) : null}
      {draftAction ? (
        <button
          type="button"
          data-action-id={draftAction.id}
          data-event-id={draftAction.eventId}
          disabled={
            Boolean(mutationState.pendingKey) || !sourceArtifactIds.length
          }
          onClick={() => {
            onAction({ ...draftAction, ticketPayload: payload });
          }}
        >
          Save draft
        </button>
      ) : null}
      <button
        type="button"
        data-action-id={action.id}
        data-event-id={action.eventId}
        disabled={Boolean(mutationState.pendingKey) || !canSubmit}
        onClick={() => {
          onAction({
            ...action,
            ticketPayload: payload,
            ...(decisionOptionId ? { decisionOptionId } : {}),
          });
        }}
      >
        {mutationState.pendingKey === actionMutationKey(action)
          ? "Saving ticket…"
          : "Save analysis and decision"}
      </button>
      {ticket ? (
        <p role="status">
          Saved ticket: {ticket.status.replaceAll("_", " ")}.{" "}
          {ticket.sourceArtifactIds?.length ?? 0} source(s) attached.
        </p>
      ) : null}
    </form>
  );
}
