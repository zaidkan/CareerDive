import type { ClientView, WorkSystemId } from "@sim/schemas";
import { shiftWorkActions, systemLabel } from "../systems.js";

export function CaseNextStep({
  view,
  eventId,
  systemId,
  onOpenSystem,
}: {
  view: ClientView;
  eventId: string;
  systemId: WorkSystemId;
  onOpenSystem?:
    | ((systemId: WorkSystemId, eventId: string) => void)
    | undefined;
}) {
  const next = shiftWorkActions(view.availableActions).find(
    (action) =>
      action.eventId === eventId &&
      !["ask_manager", "query_records"].includes(action.id),
  );
  return (
    <section aria-label="Selected case next step">
      <p>
        <strong>Selected case next step:</strong>{" "}
        {next
          ? next.label
          : "No further decision step available for this item. Check its recorded outcome and the queue objective for remaining work."}
      </p>
      {next ? <p>{next.description}</p> : null}
      {next && next.systemId !== systemId && onOpenSystem ? (
        <button
          type="button"
          onClick={() => {
            onOpenSystem(next.systemId, eventId);
          }}
        >
          Open {systemLabel(next.systemId)} for this case
        </button>
      ) : null}
    </section>
  );
}
