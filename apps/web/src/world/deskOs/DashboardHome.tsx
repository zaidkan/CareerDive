import type { ClientView } from "@sim/schemas";
import type { ShiftGuidance } from "../../guidance.js";
import { WORK_SYSTEMS, formatShiftClock, systemLabel } from "../../systems.js";
import { systemOpenCounts } from "../../workstation.js";
import type { DeskOsTab } from "./tabs.js";

export function DashboardHome({
  view,
  guidance,
  guided,
  onOpenTab,
}: {
  view: ClientView;
  guidance: ShiftGuidance | null;
  guided?: boolean;
  onOpenTab: (tab: DeskOsTab) => void;
}) {
  const counts = systemOpenCounts(view);

  return (
    <div className="desk-os-home">
      <header className="desk-os-home-hero">
        <div>
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
            {guided ? "Practice · next step" : "Suggested"}
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
              <strong>{system.label}</strong>
              <span>{count > 0 ? `${String(count)} open` : system.hint}</span>
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
          <strong>Meetings</strong>
          <span>Standups &amp; links</span>
        </button>
      </div>
    </div>
  );
}

export function CalendarPanel({ onOpenEmail }: { onOpenEmail: () => void }) {
  return (
    <div className="desk-os-calendar">
      <p className="eyebrow">Calendar · today</p>
      <h3>Day-one standups</h3>
      <ul>
        <li>
          <strong>09:15</strong>
          <span>New-hire SOC walkthrough</span>
        </li>
        <li>
          <strong>11:00</strong>
          <span>Alert triage buddy check with Priya</span>
        </li>
        <li>
          <strong>14:30</strong>
          <span>Optional: coffee with Jules in the glass break corner</span>
        </li>
      </ul>
      <p className="desk-os-hint">Current shift events only. This calendar does not affect your work evidence.</p>
      <button className="desk-os-primary" onClick={onOpenEmail} type="button">
        Open Email
      </button>
    </div>
  );
}
