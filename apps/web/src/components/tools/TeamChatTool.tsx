import type { ClientView } from "@sim/schemas";
import type { MutationState } from "../../useMutationCoordinator.js";
import { ArtifactDetail } from "../artifacts.js";

/** Both renderers use only canonically observed messages and public guidance. */
export function TeamChatTool({
  view,
  onOpenArtifact,
  mutationState,
}: {
  view: ClientView;
  onOpenArtifact?: ((id: string) => Promise<unknown>) | undefined;
  mutationState?: MutationState;
}) {
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
                  ? "Keep verified observations, uncertainty, and the next step separate. Revisit the opened records beside your note; make it possible for a reviewer to trace each statement."
                  : task.kind === "compare_records"
                    ? "Compare each record with its own source and time. Describe the mismatch before explaining it, and leave room for an alternative explanation."
                    : "Read the source before making a claim. Keep unfinished checks visible and name the question you need answered before switching work.",
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
                text: "Review the saved note before acting. A request for senior review does not confirm who signed in, and a closure needs a documented basis. If evidence is still missing, preserve the open question and seek procedural guidance.",
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
