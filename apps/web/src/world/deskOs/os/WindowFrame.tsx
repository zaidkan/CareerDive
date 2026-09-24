import type { ReactNode } from "react";
import { appDefinition } from "./appCatalog.js";
import type { OsAppId } from "./browserState.js";

/**
 * Presentational window shell for the Desk OS multi-window visual system.
 *
 * No positioning, focus, z-order, drag, minimize, or close logic lives here —
 * the upcoming W1 window manager owns all behavior and passes it in through
 * the optional control handlers. Controls render ONLY when their handler is
 * provided, so the frame never shows buttons that do nothing.
 */
export function WindowFrame({
  app,
  title,
  subtitle,
  toolbar,
  active = false,
  maximized = false,
  onMinimize,
  onToggleMaximize,
  onClose,
  children,
}: {
  app: OsAppId;
  title: string;
  subtitle?: string;
  toolbar?: ReactNode;
  active?: boolean;
  maximized?: boolean;
  onMinimize?: () => void;
  onToggleMaximize?: () => void;
  onClose?: () => void;
  children?: ReactNode;
}) {
  const meta = appDefinition(app);
  return (
    <div
      className={`os-window-frame${active ? " os-window-frame-active" : ""}${maximized ? " os-window-frame-maximized" : ""}`}
      data-active={active}
      data-app={app}
      data-maximized={maximized}
    >
      <header className="os-window-bar">
        <div className="os-window-bar-main">
          <span aria-hidden="true" className="os-app-glyph">
            {meta.glyph}
          </span>
          <span className="os-window-identity">
            <strong>{title}</strong>
            {subtitle ? <small>{subtitle}</small> : null}
          </span>
          <span className="os-window-controls">
            {onMinimize ? (
              <button
                aria-label={`Minimize ${title}`}
                className="os-window-control"
                onClick={onMinimize}
                title={`Minimize ${title}`}
                type="button"
              >
                <span aria-hidden="true">–</span>
              </button>
            ) : null}
            {onToggleMaximize ? (
              <button
                aria-label={maximized ? `Restore ${title}` : `Maximize ${title}`}
                aria-pressed={maximized}
                className="os-window-control"
                onClick={onToggleMaximize}
                title={maximized ? `Restore ${title}` : `Maximize ${title}`}
                type="button"
              >
                <span aria-hidden="true">{maximized ? "❐" : "▢"}</span>
              </button>
            ) : null}
            {onClose ? (
              <button
                aria-label={`Close ${title}`}
                className="os-window-control os-window-control-close"
                onClick={onClose}
                title={`Close ${title}`}
                type="button"
              >
                <span aria-hidden="true">✕</span>
              </button>
            ) : null}
          </span>
        </div>
        {toolbar ? <div className="os-window-toolbar">{toolbar}</div> : null}
      </header>
      <div className="os-window-body">{children}</div>
    </div>
  );
}
