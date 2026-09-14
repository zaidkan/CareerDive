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
              <h4>Your notes and records · {event.title}</h4>
              <p>
                If you need more evidence, use the available checks and save the
                question you still need to answer in Tickets. A saved note does not close the case
                or request a review.
              </p>
              {view.availableActions.some(
                (action) =>
                  action.eventId === event.id &&
                  action.id === "search_knowledge_base" &&
                  !action.taskId,
              ) ? (
                <p>
                  Need more evidence? In Guides, use Check response procedure to
                  review the available follow-up checks while leaving the case
                  open. Your saved comparison stays here to help with your
                  decision.
                </p>
              ) : null}
              <details open>
                <summary>Saved investigation note</summary>
                {note ? (
                  <pre className="artifact-body">{note}</pre>
                ) : (
                  <p>No investigation note saved for this case yet. In Tickets, write what you checked and what you need to check next, then save it.</p>
                )}
              </details>
              <details>
                <summary>Earlier opened records ({opened.length})</summary>
                <p>
                  Reading a record does not confirm every claim it contains.
                  Check that your note says what the record supports and leaves room for what is still unknown.
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
