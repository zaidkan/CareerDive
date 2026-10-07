import { useCallback, useEffect, useId, useRef, useState } from "react";

const CONTROLS: ReadonlyArray<{ keys: string; action: string }> = [
  { keys: "W A S D / arrows", action: "Move around the floor" },
  { keys: "Click + drag", action: "Look around" },
  { keys: "E", action: "Use the action shown in the Ready prompt" },
  { keys: "F / Esc", action: "Fullscreen on and off" },
];

export function ControlsHelp() {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  const close = useCallback(() => {
    setOpen(false);
    buttonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      close();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (
        panelRef.current?.contains(event.target as Node) ||
        buttonRef.current?.contains(event.target as Node)
      ) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, close]);

  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  return (
    <div className="controls-help">
      <button
        aria-controls={panelId}
        aria-expanded={open}
        aria-label={open ? "Hide controls" : "Show controls"}
        className="controls-help-toggle"
        onClick={() => {
          setOpen((v) => !v);
        }}
        ref={buttonRef}
        type="button"
      >
        ?
      </button>

      {open ? (
        <div
          aria-label="Controls"
          className="controls-help-panel"
          id={panelId}
          ref={panelRef}
          role="dialog"
          tabIndex={-1}
        >
          <p className="controls-help-heading">Controls</p>
          <dl className="controls-help-list">
            {CONTROLS.map(({ keys, action }) => (
              <div className="controls-help-row" key={keys}>
                <dt>{keys}</dt>
                <dd>{action}</dd>
              </div>
            ))}
          </dl>
          <button className="guidance-secondary" onClick={close} type="button">
            Close
          </button>
        </div>
      ) : null}
    </div>
  );
}
