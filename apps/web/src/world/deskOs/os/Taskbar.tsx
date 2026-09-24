import { formatShiftClock } from "../../../systems.js";
import { appDefinition } from "./appCatalog.js";
import type { OsAppId } from "./browserState.js";

/**
 * Visual contract for one taskbar entry in the future multi-window system.
 * W1 owns the window list; the taskbar only renders state it is given.
 */
export type TaskbarWindow = {
  key: string;
  app: OsAppId;
  label: string;
  active: boolean;
  minimized: boolean;
};

export function Taskbar({
  activeApp,
  simClock,
  osFullscreen,
  onSelect,
  onOsFullscreen,
  onStand,
  windows,
  onSelectWindow,
}: {
  activeApp: OsAppId;
  simClock: number;
  osFullscreen: boolean;
  onSelect: (app: OsAppId) => void;
  onOsFullscreen: () => void;
  onStand: () => void;
  windows?: ReadonlyArray<TaskbarWindow>;
  onSelectWindow?: (key: string) => void;
}) {
  return (
    <div className="os-taskbar" role="toolbar" aria-label="Taskbar">
      <div className="os-taskbar-apps" role="group" aria-label="Open apps">
        {windows && onSelectWindow ? (
          windows.map((entry) => {
            const meta = appDefinition(entry.app);
            const stateLabel = entry.minimized
              ? `${entry.label}, minimized`
              : entry.active
                ? `${entry.label}, active`
                : entry.label;
            return (
              <button
                aria-pressed={entry.active}
                className={`os-taskbar-btn${entry.active ? " os-taskbar-btn-active" : ""}`}
                data-minimized={entry.minimized}
                data-running="true"
                key={entry.key}
                aria-label={stateLabel}
                onClick={() => {
                  onSelectWindow(entry.key);
                }}
                type="button"
              >
                <span aria-hidden="true" className="os-taskbar-glyph">
                  {meta.glyph}
                </span>
                {entry.label}
              </button>
            );
          })
        ) : (
          <>
            <button
              aria-pressed={activeApp === "desktop"}
              className={`os-taskbar-btn${activeApp === "desktop" ? " os-taskbar-btn-active" : ""}`}
              data-running="true"
              onClick={() => {
                onSelect("desktop");
              }}
              type="button"
            >
              <span aria-hidden="true" className="os-taskbar-glyph">
                {appDefinition("desktop").glyph}
              </span>
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
                data-running="true"
                key={app.id}
                onClick={() => {
                  onSelect(app.id);
                }}
                type="button"
              >
                <span aria-hidden="true" className="os-taskbar-glyph">
                  {appDefinition(app.id).glyph}
                </span>
                {app.label}
              </button>
            ))}
          </>
        )}
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
