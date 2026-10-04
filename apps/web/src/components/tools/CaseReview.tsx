import type { AvailableAction, ClientView } from "@sim/schemas";

/** Reuses public saved work; never infers a finding or an outcome. */
export function CaseReview({
  view,
  actions,
}: {
  view: ClientView;
  actions: AvailableAction[];
}) {
  const eventIds = new Set(
    actions
      .filter(
        ({ id }) =>
          id === "dismiss_alert" ||
          id === "escalate_alert" ||
          id === "document_ticket",
      )
      .map(({ eventId }) => eventId),
  );
  return (
    <>
      {view.events
        .filter(({ id }) => eventIds.has(id))
        .map((event) => {
          const opened = view.artifacts.filter(
            (artifact) =>
              artifact.observed && artifact.eventIds.includes(event.id),
          );
          const note = view.ticketNotes[event.id];
          return (
            <section
              key={event.id}
              aria-label="Case review before decision"
              className="work-task-sources"
            >
              <h4>Case record</h4>
              <details className="work-detail-help">
                <summary>Need another check?</summary>
                <p>
                  Keep unanswered questions in Tickets. Saving a note leaves the
                  case open.
                </p>
                {view.availableActions.some(
                  (action) =>
                    action.eventId === event.id &&
                    action.id === "search_knowledge_base" &&
                    !action.taskId,
                ) ? (
                  <p>
                    Guides → Check response procedure lists follow-up checks.
                  </p>
                ) : null}
              </details>
              <details>
                <summary>Saved investigation note</summary>
                {note ? (
                  <pre className="artifact-body">{note}</pre>
                ) : (
                  <p>
                    No saved ticket yet. Add findings and the next check in
                    Tickets.
                  </p>
                )}
              </details>
              <details>
                <summary>Earlier opened records ({opened.length})</summary>
                <p>
                  Separate observations from claims that still need
                  verification.
                </p>
                {opened.map((artifact) => (
                  <article key={artifact.id}>
                    <h5>{artifact.title}</h5>
                    <p>{artifact.summary}</p>
                    {artifact.body ? (
                      <pre className="artifact-body">{artifact.body}</pre>
                    ) : null}
                  </article>
                ))}
              </details>
            </section>
          );
        })}
    </>
  );
}
