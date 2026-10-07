import type { ClientView, WorkplaceInteraction } from "@sim/schemas";
import { useTabDraft } from "../../useTabDraft.js";

export function CaseEvidence({
  view,
  eventId,
  onInspect,
  pending,
}: {
  view: ClientView;
  eventId: string;
  onInspect?:
    | ((interaction: WorkplaceInteraction) => Promise<unknown>)
    | undefined;
  pending: boolean;
}) {
  const sources = view.artifacts.filter((source) =>
    source.eventIds.includes(eventId),
  );
  const [selected, setSelected] = useTabDraft(
    `evidence:${view.sessionId}:${eventId}`,
    "",
  );
  const [comparison, setComparison] = useTabDraft<string[]>(
    `compare:${view.sessionId}:${eventId}`,
    [],
  );
  const inspected = view.workplace.inspectedArtifactIds ?? [];
  const source =
    sources.find(({ id }) => id === view.workplace.lastInspectedArtifactId) ??
    sources.find(({ id }) => id === selected) ??
    sources.findLast(({ id }) => inspected.includes(id));
  const recorded = view.workplace.comparisons?.some(
    ({ eventId: id, artifactIds }) =>
      id === eventId &&
      comparison.every((id) => artifactIds.includes(id)) &&
      comparison.length === 2,
  );
  const routePair = ["login-session-timeline", "vpn-context-1"];
  const routeRecorded = view.workplace.comparisons?.some(
    (item) =>
      item.eventId === eventId &&
      routePair.every((id) => item.artifactIds.includes(id)),
  );
  return (
    <section className="case-evidence" aria-label="Case evidence">
      {view.structuredTickets?.[`ticket-${eventId}`] ? (
        <details>
          <summary>Saved case ticket</summary>
          <pre className="artifact-body">{view.ticketNotes[eventId]}</pre>
          <p>
            Status: {view.structuredTickets[`ticket-${eventId}`]?.status}.
            Decision:{" "}
            {view.structuredTickets[`ticket-${eventId}`]?.disposition ??
              "Not yet submitted"}
            .
          </p>
        </details>
      ) : null}
      {eventId === "suspicious-login-1" ? (
        <section aria-label="Required route comparison">
          <h4>Record the session route comparison</h4>
          <p>
            Reading or attaching sources does not record a comparison. Open the
            session timeline (S-0741 and S-0731) and VPN catalogue NET-VPN-04,
            compare their routes, then record this pair before sending a review
            request with comparisons.
          </p>
          <p role="status">
            {routeRecorded
              ? "Required route comparison saved."
              : "Required route comparison not recorded."}
          </p>
          <button
            type="button"
            disabled={
              pending ||
              !onInspect ||
              routeRecorded ||
              !routePair.every((id) => inspected.includes(id))
            }
            onClick={() => {
              void onInspect?.({
                type: "compare_artifacts",
                eventId,
                artifactIds: routePair,
              }).catch(() => {});
            }}
          >
            {routeRecorded
              ? "Comparison recorded"
              : "Record this comparison: session timeline + VPN catalogue"}
          </button>
          {!routePair.every((id) => inspected.includes(id)) ? (
            <p>Open both named sources below to enable recording.</p>
          ) : null}
        </section>
      ) : null}
      <h4>Sources for this case</h4>
      <p className="source-count">
        {sources.filter(({ id }) => inspected.includes(id)).length} of{" "}
        {sources.length} inspected
      </p>
      <div className="case-source-links">
        {sources.slice(0, 4).map((item) => (
          <button
            type="button"
            key={item.id}
            aria-pressed={source?.id === item.id}
            disabled={pending || !onInspect}
            onClick={() => {
              setSelected(item.id);
              void onInspect?.({
                type: "open_artifact",
                artifactId: item.id,
              }).catch(() => {});
            }}
          >
            {item.title}
            <small>
              {view.structuredTickets?.[
                `ticket-${eventId}`
              ]?.sourceArtifactIds?.includes(item.id)
                ? "Attached to ticket"
                : inspected.includes(item.id)
                  ? "Inspected"
                  : "Inspect"}
            </small>
          </button>
        ))}
      </div>
      {sources.length > 4 ? (
        <details>
          <summary>Related sources and follow-up checks</summary>{" "}
          <div className="case-source-links">
            {sources.slice(4).map((item) => (
              <button
                type="button"
                key={item.id}
                aria-pressed={source?.id === item.id}
                disabled={pending || !onInspect}
                onClick={() => {
                  setSelected(item.id);
                  void onInspect?.({
                    type: "open_artifact",
                    artifactId: item.id,
                  }).catch(() => {});
                }}
              >
                {item.title}
                <small>
                  {view.structuredTickets?.[
                    `ticket-${eventId}`
                  ]?.sourceArtifactIds?.includes(item.id)
                    ? "Attached to ticket"
                    : inspected.includes(item.id)
                      ? "Inspected"
                      : "Inspect"}
                </small>
              </button>
            ))}
          </div>
        </details>
      ) : null}
      {source?.observed && source.body ? (
        <article aria-label={`Inspected source: ${source.title}`}>
          <h5>{source.title}</h5>
          <pre className="artifact-body">{source.body}</pre>
        </article>
      ) : null}
      {inspected.filter((id) => sources.some((item) => item.id === id))
        .length >= 2 ? (
        <details>
          <summary>Compare two opened sources</summary>
          <fieldset>
            <legend>Choose two inspected sources</legend>
            {sources
              .filter(({ id }) => inspected.includes(id))
              .map((item) => (
                <label key={item.id}>
                  <input
                    type="checkbox"
                    checked={comparison.includes(item.id)}
                    disabled={
                      !comparison.includes(item.id) && comparison.length === 2
                    }
                    onChange={() => {
                      setComparison((ids) =>
                        ids.includes(item.id)
                          ? ids.filter((id) => id !== item.id)
                          : [...ids, item.id],
                      );
                    }}
                  />
                  {item.title}
                </label>
              ))}
          </fieldset>
          <div className="case-comparison">
            {sources
              .filter(({ id }) => comparison.includes(id))
              .map((item) => (
                <article key={item.id}>
                  <h5>{item.title}</h5>
                  <pre className="artifact-body">{item.body}</pre>
                </article>
              ))}
          </div>
          <button
            type="button"
            disabled={
              pending || comparison.length !== 2 || !onInspect || recorded
            }
            onClick={() => {
              void onInspect?.({
                type: "compare_artifacts",
                eventId,
                artifactIds: comparison,
              }).catch(() => {});
            }}
          >
            {recorded ? "Comparison recorded" : "Record this comparison"}
          </button>
        </details>
      ) : null}
    </section>
  );
}
