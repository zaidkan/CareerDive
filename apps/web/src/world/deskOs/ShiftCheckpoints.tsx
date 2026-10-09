import type { ClientView } from "@sim/schemas";
import { formatShiftClock } from "../../systems.js";

export function ShiftCheckpoints({
  view,
  onOpenEmail,
}: {
  view: ClientView;
  onOpenEmail: () => void;
}) {
  const active = view.events.filter(
    ({ status }) => status === "active" || status === "escalated",
  );
  const handoffs = active.filter(({ systemId }) => systemId === "email");
  const guidanceAvailable = view.availableActions.some(
    ({ id }) => id === "ask_manager",
  );
  const breakAvailable =
    active.length > 0 &&
    (view.workplace.carriedSnackBites > 0 ||
      view.workplace.fridgeSnackBars > 0 ||
      view.workplace.coffeeServings > 0 ||
      view.workplace.coffeeStage !== "idle");
  return (
    <div className="desk-os-calendar">
      <p className="eyebrow">
        Current shift · {formatShiftClock(view.simClock)}
      </p>
      <h3>Current shift checkpoints</h3>
      <ul>
        {handoffs.map((event) => (
          <li key={event.id}>
            <strong>Open work</strong>
            <span>{event.title}</span>
          </li>
        ))}
        {guidanceAvailable ? (
          <li>
            <strong>As needed</strong>
            <span>
              Ask your manager · use Team chat for questions about your current
              case
            </span>
          </li>
        ) : null}
        {breakAvailable ? (
          <li>
            <strong>Optional</strong>
            <span>
              Break with Jules, your coworker · leave yourself a next step first
            </span>
          </li>
        ) : null}
      </ul>
      {handoffs.length === 0 && !guidanceAvailable && !breakAvailable ? (
        <p>No current work checkpoints.</p>
      ) : null}
      <p className="desk-os-hint">Current queue and team check-ins.</p>
      <button className="desk-os-primary" onClick={onOpenEmail} type="button">
        Open Email
      </button>
    </div>
  );
}
