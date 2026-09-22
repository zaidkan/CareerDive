import { useState } from "react";
import type { AvailableAction, ClientView } from "@sim/schemas";
import type { MutationState } from "../../useMutationCoordinator.js";
import { ArtifactDetail } from "../artifacts.js";

/** Both renderers use only canonically observed messages and public guidance. */
export function TeamChatTool({
  view,
  onOpenArtifact,
  mutationState,
  actions = [],
  onAction,
}: {
  view: ClientView;
  onOpenArtifact?: ((id: string) => Promise<unknown>) | undefined;
  mutationState?: MutationState;
  actions?: AvailableAction[];
  onAction?: (action: AvailableAction, freeText?: string) => void;
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const chatActions = actions.filter(
    ({ id }) => id === "ask_manager" || id === "acknowledge_handoff",
  );
  const messages = view.artifacts.filter(
    ({ systemId }) => systemId === "team_chat",
  );
  const guidance = view.operationalMessages.filter((message) =>
    message.startsWith("Morgan "),
  );
  const reminders = messages.some(({ observed }) => observed)
    ? view.events.flatMap((event) => {
        const task = view.tasks.find(({ eventId }) => eventId === event.id);
        if (task)
          return [
            {
              eventId: event.id,
              title: event.title,
              text:
                task.kind === "build_summary"
                  ? "Keep verified observations, uncertainty, and the next step separate. Use the records beside your note to show what you checked, what remains unclear, and what should happen next."
                  : task.kind === "compare_records"
                    ? "Check where each record came from and when it was recorded. Describe what differs before explaining why; more than one explanation may fit."
                    : "Read the record before drawing a conclusion. Before switching work, save what you still need to check and the question it should answer.",
            },
          ];
        const decision = view.availableActions.some(
          ({ eventId, id }) =>
            eventId === event.id &&
            (id === "escalate_alert" || id === "dismiss_alert"),
        );
        return decision
          ? [
              {
                eventId: event.id,
                title: event.title,
                text: "Review your saved note before deciding. Asking a senior analyst to review the case does not confirm who signed in, and closing it needs a written reason supported by records. If evidence is missing, save the open question and ask Morgan which check to make next.",
              },
            ]
          : [];
      })
    : [];
  return (
    <>
      <article className="team-chat-thread" aria-label="Morgan message thread">
        {messages.map((artifact) => (
          <ArtifactDetail
            key={artifact.id}
            artifact={artifact}
            onOpenArtifact={onOpenArtifact}
            mutationState={mutationState}
          />
        ))}
      </article>
      {(view.teamMessages?.length ?? 0) > 0 ? (
        <ol aria-label="Team conversation">
          {view.teamMessages?.map((message) => (
            <li key={message.id}>
              <strong>
                {message.author === "morgan" ? "Morgan" : "You"} ·{" "}
                {view.events.find(({ id }) => id === message.eventId)?.title ??
                  message.eventId}
                :
              </strong>{" "}
              {message.body}
            </li>
          ))}
        </ol>
      ) : null}
      {chatActions.map((action) => {
        const key = `${action.id}:${action.eventId}`;
        const draft = drafts[key] ?? "";
        return (
          <form
            key={key}
            aria-label={`${action.label} for ${view.events.find(({ id }) => id === action.eventId)?.title ?? action.eventId}`}
            onSubmit={(event) => {
              event.preventDefault();
              if (draft.trim()) onAction?.(action, draft.trim());
            }}
          >
            <label>
              {action.id === "ask_manager"
                ? "Question for Morgan"
                : "Handoff to Morgan"}
              <textarea
                maxLength={2000}
                value={draft}
                onChange={(event) => {
                  setDrafts((current) => ({
                    ...current,
                    [key]: event.target.value,
                  }));
                }}
              />
            </label>
            <button
              type="submit"
              data-action-id={action.id}
              data-event-id={action.eventId}
              disabled={
                !draft.trim() || Boolean(mutationState?.pendingKey) || !onAction
              }
            >
              {action.label}
            </button>
          </form>
        );
      })}
      {reminders.length > 0 ? (
        <aside aria-label="Morgan procedure reminders">
          <h4>From Morgan’s procedure notes</h4>
          {reminders.map(({ eventId, title, text }) => (
            <p key={eventId}>
              <strong>{title}: </strong>
              {text}
            </p>
          ))}
        </aside>
      ) : null}
      {guidance.length > 0 ? (
        <aside className="manager-guidance" aria-label="Morgan guidance">
          <h4>Morgan’s guidance</h4>
          {guidance.map((message) => (
            <p key={message}>{message}</p>
          ))}
        </aside>
      ) : null}
    </>
  );
}
