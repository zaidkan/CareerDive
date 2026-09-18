import type { ClientWorkplaceState } from "@sim/schemas";
import { formatShiftClock } from "../../../systems.js";
import { OS_APPS } from "./appCatalog.js";
import type { OsAppId } from "./browserState.js";

export function Taskbar({
  activeApp,
  simClock,
  osFullscreen,
  workplace,
  unreadNotifications = 0,
  onSelect,
  onOsFullscreen,
  onStand,
}: {
  activeApp: OsAppId;
  simClock: number;
  osFullscreen: boolean;
  workplace?: ClientWorkplaceState;
  unreadNotifications?: number;
  onSelect: (app: OsAppId) => void;
  onOsFullscreen: () => void;
  onStand: () => void;
}) {
  return (
    <div className="os-taskbar" role="toolbar" aria-label="Taskbar">
      <span className="os-taskbar-brand">
        <span aria-hidden="true" className="os-taskbar-brand-mark">
          V
        </span>
        <span className="os-taskbar-brand-text">
          <strong>Workstation OS</strong>
          <small>SOC-07</small>
        </span>
      </span>

      <div className="os-taskbar-apps" role="group" aria-label="Open apps">
        {OS_APPS.map((app) => {
          const active = activeApp === app.id;
          return (
            <button
              aria-pressed={active}
              className={`os-taskbar-btn${active ? " os-taskbar-btn-active" : ""}`}
              data-app={app.id}
              key={app.id}
              onClick={() => {
                onSelect(app.id);
              }}
              title={app.role}
              type="button"
            >
              <span aria-hidden="true" className="os-taskbar-glyph">
                {app.glyph}
              </span>
              <span className="os-taskbar-label">{app.label}</span>
              <span aria-hidden="true" className="os-taskbar-run" />
            </button>
          );
        })}
      </div>

      <div aria-label="System status" className="os-tray" role="group">
        {unreadNotifications > 0 ? (
          <span className="os-tray-item os-tray-alert">
            <span aria-hidden="true" className="os-tray-light" />
            {unreadNotifications} unread
          </span>
        ) : (
          <span className="os-tray-item">
            <span aria-hidden="true" className="os-tray-light os-tray-light-ok" />
            Queue clear
          </span>
        )}
        {workplace ? (
          <span className="os-tray-item os-tray-energy">
            Energy {workplace.energy.current}/{workplace.energy.max}
          </span>
        ) : null}
        <span className="os-tray-item os-tray-clock">
          Shift {formatShiftClock(simClock)}
        </span>
      </div>

      <div className="os-taskbar-actions">
        <button
          aria-pressed={osFullscreen}
          className="desk-os-ghost"
          onClick={onOsFullscreen}
          type="button"
        >
          Expand workstation
        </button>
        <button className="desk-os-ghost" onClick={onStand} type="button">
          Leave desk
        </button>
      </div>
    </div>
  );
}
