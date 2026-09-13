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
              <h4>Review trail · {event.title}</h4>
              <p>
                If you need more evidence, use the available checks and save the
                question still to answer. A saved note does not close the case
                or request a review.
              </p>
              <details open>
                <summary>Saved investigation note</summary>
                {note ? (
                  <pre className="artifact-body">{note}</pre>
                ) : (
                  <p>No investigation note saved for this case yet.</p>
                )}
              </details>
              <details>
                <summary>Earlier opened records ({opened.length})</summary>
                <p>
                  Opening a record does not verify every claim in it. Compare
                  the source with the wording in your note.
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
