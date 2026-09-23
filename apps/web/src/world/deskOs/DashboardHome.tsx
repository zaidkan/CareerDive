import type { ClientView } from "@sim/schemas";
import type { ShiftGuidance } from "../../guidance.js";
import { WORK_SYSTEMS, formatShiftClock, systemLabel } from "../../systems.js";
import { systemOpenCounts } from "../../workstation.js";
import type { DeskOsTab } from "./tabs.js";

export function DashboardHome({
  view,
  guidance,
  onOpenTab,
}: {
  view: ClientView;
  guidance: ShiftGuidance | null;
  onOpenTab: (tab: DeskOsTab) => void;
}) {
  const counts = systemOpenCounts(view);

  return (
    <div className="desk-os-home">
      <header className="desk-os-home-hero">
        <div className="desk-os-home-hero-copy">
          <p className="eyebrow">Shift console</p>
          <h2>Your workstation</h2>
          <p>
            {guidance?.detail ??
              "Open a tab below. Read what is there, then take one action at a time."}
          </p>
        </div>
        <time
          className="desk-os-clock"
          aria-label={`${String(view.simClock)} minutes in`}
        >
          <span>Shift time</span>
          <strong>{formatShiftClock(view.simClock)}</strong>
        </time>
      </header>

      {guidance ? (
        <div className="desk-os-guidance">
          <p className="eyebrow">
            Suggested
          </p>
          <h3>{guidance.headline}</h3>
          <button
            className="desk-os-primary"
            onClick={() => {
              onOpenTab(guidance.systemId);
            }}
            type="button"
          >
            Open {systemLabel(guidance.systemId)}
          </button>
        </div>
      ) : null}

      <div className="desk-os-tiles">
        {WORK_SYSTEMS.map((system) => {
          const count = counts[system.id];
          return (
            <button
              className="desk-os-tile"
              key={system.id}
              onClick={() => {
                onOpenTab(system.id);
              }}
              type="button"
            >
              <span className="desk-os-tile-icon" aria-hidden="true">
                {system.label.charAt(0)}
              </span>
              <strong>{system.label}</strong>
              <span className={count > 0 ? "desk-os-tile-count" : undefined}>
                {count > 0 ? `${String(count)} open` : system.hint}
              </span>
            </button>
          );
        })}
        <button
          className="desk-os-tile"
          onClick={() => {
            onOpenTab("calendar");
          }}
          type="button"
        >
          <span className="desk-os-tile-icon" aria-hidden="true">
            M
          </span>
          <strong>Meetings</strong>
          <span>Current shift checkpoints</span>
        </button>
      </div>
    </div>
  );
}

export function CalendarPanel({
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
        Calendar · current shift · {formatShiftClock(view.simClock)}
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
              Buddy check with Morgan · ask in Team chat about your current work
            </span>
          </li>
        ) : null}
        {breakAvailable ? (
          <li>
            <strong>Optional</strong>
            <span>
              Optional break with Jules · leave a next step in your notes first
            </span>
          </li>
        ) : null}
      </ul>
      {handoffs.length === 0 && !guidanceAvailable && !breakAvailable ? (
        <p>No current work checkpoints.</p>
      ) : null}
      <p className="desk-os-hint">
        These checkpoints reflect your visible queue and available guidance, not
        scheduled meetings. They do not gate progress or affect your work
        evidence.
      </p>
      <button className="desk-os-primary" onClick={onOpenEmail} type="button">
        Open Email
      </button>
    </div>
  );
}
