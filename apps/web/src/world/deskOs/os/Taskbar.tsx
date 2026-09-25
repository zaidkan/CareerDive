import { formatShiftClock } from "../../../systems.js";
import { appDefinition } from "./appCatalog.js";
import type { WindowApp } from "./windows.js";

/**
 * One taskbar entry per actual window record.
 */
export type TaskbarWindow = {
  key: string;
  app: WindowApp;
  label: string;
  active: boolean;
  minimized: boolean;
};

export function Taskbar({
  simClock,
  attention = false,
  osFullscreen,
  onLaunch,
  onOsFullscreen,
  onStand,
  windows,
  onSelectWindow,
}: {
  simClock: number;
  attention?: boolean;
  osFullscreen: boolean;
  onLaunch: (app: WindowApp) => void;
  onOsFullscreen: () => void;
  onStand: () => void;
  windows: ReadonlyArray<TaskbarWindow>;
  onSelectWindow: (key: string) => void;
}) {
  return (
    <div className="os-taskbar" role="toolbar" aria-label="Taskbar">
      <div className="os-taskbar-apps">
        <div className="os-taskbar-pinned" role="group" aria-label="Pinned apps">
          {(["browser", "files", "notes"] as const).map((app) => (
            <button
              aria-label={app === "browser" && attention ? "Browser, new work" : undefined}
              aria-pressed={windows.some((window) => window.app === app && window.active)}
              className="os-taskbar-btn os-taskbar-launcher"
              key={app}
              onClick={() => { onLaunch(app); }}
              type="button"
            >
              <span aria-hidden="true" className="os-taskbar-glyph">{appDefinition(app).glyph}</span>
              {appDefinition(app).label}
              {app === "browser" && attention ? <span aria-hidden="true" className="os-taskbar-attention" /> : null}
            </button>
          ))}
        </div>
        <div className="os-taskbar-windows" role="group" aria-label="Open windows">
          {windows.map((entry) => {
            const meta = appDefinition(entry.app);
            const stateLabel = entry.minimized
              ? `${entry.label}, minimized`
              : entry.active
                ? `${entry.label}, active`
                : `${entry.label}, background`;
            const needsAttention = attention && entry.app === "browser";
            return (
              <button
                aria-pressed={entry.active}
                className={`os-taskbar-btn${entry.active ? " os-taskbar-btn-active" : ""}`}
                data-minimized={entry.minimized}
                data-running="true"
                key={entry.key}
                aria-label={needsAttention ? `${stateLabel}, new work` : stateLabel}
                onClick={() => {
                  onSelectWindow(entry.key);
                }}
                type="button"
              >
                <span aria-hidden="true" className="os-taskbar-glyph">
                  {meta.glyph}
                </span>
                {entry.label}
                {needsAttention ? <span aria-hidden="true" className="os-taskbar-attention" /> : null}
              </button>
            );
          })}
        </div>
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
