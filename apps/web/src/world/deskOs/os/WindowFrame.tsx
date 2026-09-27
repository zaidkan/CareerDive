import { useRef, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import { appDefinition } from "./appCatalog.js";
import type { OsAppId } from "./browserState.js";
import { OsIcon } from "./Icons.js";
import type { WindowBounds } from "./windows.js";

/**
 * Presentational window shell for the Desk OS multi-window visual system.
 *
 * Position and controls come from the pure window model. Pointer movement is
 * visual until release; only the final position enters session state.
 */
export function WindowFrame({
  app,
  title,
  subtitle,
  toolbar,
  active = false,
  maximized = false,
  id,
  bounds,
  z,
  onFocus,
  onMove,
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
  id?: string;
  bounds?: WindowBounds;
  z?: number;
  onFocus?: () => void;
  onMove?: (x: number, y: number) => void;
  onMinimize?: () => void;
  onToggleMaximize?: () => void;
  onClose?: () => void;
  children?: ReactNode;
}) {
  const meta = appDefinition(app);
  const frameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number; dx: number; dy: number } | null>(null);
  const stopDrag = (event: PointerEvent<HTMLElement>, commit: boolean) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (commit && bounds) onMove?.(bounds.x + drag.dx, bounds.y + drag.dy);
    if (frameRef.current) frameRef.current.style.transform = "";
    if (typeof event.currentTarget.releasePointerCapture === "function") {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };
  const style: CSSProperties | undefined = bounds ? {
    position: "absolute",
    left: maximized ? 0 : bounds.x,
    top: maximized ? 0 : bounds.y,
    width: maximized ? "100%" : bounds.w,
    height: maximized ? "100%" : bounds.h,
    zIndex: z,
  } : undefined;
  return (
    <div
      ref={frameRef}
      className={`os-window-frame${active ? " os-window-frame-active" : ""}${maximized ? " os-window-frame-maximized" : ""}`}
      data-active={active}
      data-app={app}
      data-maximized={maximized}
      data-window-id={id}
      style={style}
      onPointerDown={onFocus}
      onFocusCapture={onFocus}
    >
      <header
        className="os-window-bar"
        onPointerDown={(event) => {
          if (!bounds || !onMove || maximized || event.button !== 0 || (event.target as HTMLElement).closest("button")) return;
          dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, dx: 0, dy: 0 };
          if (typeof event.currentTarget.setPointerCapture === "function") {
            event.currentTarget.setPointerCapture(event.pointerId);
          }
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          if (!drag || drag.pointerId !== event.pointerId) return;
          drag.dx = event.clientX - drag.x;
          drag.dy = event.clientY - drag.y;
          if (frameRef.current) frameRef.current.style.transform = `translate(${String(drag.dx)}px, ${String(drag.dy)}px)`;
        }}
        onPointerUp={(event) => { stopDrag(event, true); }}
        onPointerCancel={(event) => { stopDrag(event, false); }}
      >
        <div className="os-window-bar-main">
          <OsIcon className="os-app-glyph" name={meta.icon} size={16} />
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
                <OsIcon name="win-minimize" size={14} />
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
                <OsIcon name={maximized ? "win-restore" : "win-maximize"} size={14} />
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
                <OsIcon name="win-close" size={14} />
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
