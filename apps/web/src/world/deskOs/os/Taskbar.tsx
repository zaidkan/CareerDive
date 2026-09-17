import { formatShiftClock } from "../../../systems.js";
import type { OsAppId } from "./browserState.js";

export function Taskbar({
  activeApp,
  simClock,
  osFullscreen,
  onSelect,
  onOsFullscreen,
  onStand,
}: {
  activeApp: OsAppId;
  simClock: number;
  osFullscreen: boolean;
  onSelect: (app: OsAppId) => void;
  onOsFullscreen: () => void;
  onStand: () => void;
}) {
  return (
    <div className="os-taskbar" role="toolbar" aria-label="Taskbar">
      <div className="os-taskbar-apps" role="group" aria-label="Open apps">
        <button
          aria-pressed={activeApp === "desktop"}
          className={`os-taskbar-btn${activeApp === "desktop" ? " os-taskbar-btn-active" : ""}`}
          onClick={() => {
            onSelect("desktop");
          }}
          type="button"
        >
          Desktop
        </button>
        {(
          [
            { id: "browser", label: "Browser" },
            { id: "files", label: "Files" },
            { id: "notes", label: "Notes" },
          ] as const
        ).map((app) => (
          <button
            aria-pressed={activeApp === app.id}
            className={`os-taskbar-btn${activeApp === app.id ? " os-taskbar-btn-active" : ""}`}
            key={app.id}
            onClick={() => {
              onSelect(app.id);
            }}
            type="button"
          >
            {app.label}
          </button>
        ))}
      </div>
      <span className="os-taskbar-clock">Shift {formatShiftClock(simClock)}</span>
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
