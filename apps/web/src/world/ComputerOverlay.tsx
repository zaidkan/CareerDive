import type { AvailableAction, ClientView } from "@sim/schemas";
import { WorkSurface } from "../components/WorkSurface.js";
import { getShiftGuidance } from "../guidance.js";

export function ComputerOverlay({
  phase,
  view,
  onAction,
  guided,
  onFocusDesk,
  onStand,
}: {
  phase: "seated_monitor" | "focus_desk";
  view: ClientView;
  onAction: (action: AvailableAction, freeText?: string) => void;
  guided?: boolean;
  onFocusDesk: () => void;
  onStand: () => void;
}) {
  const guidance = getShiftGuidance(view);

  if (phase === "focus_desk") {
    return (
      <div className="focus-desk-layer">
        <div className="focus-desk-toolbar">
          <p>Working at your desk computer</p>
          <button onClick={onStand} type="button">
            Leave desk
          </button>
        </div>
        <WorkSurface
          {...(guided !== undefined ? { guided } : {})}
          onAction={onAction}
          view={view}
        />
      </div>
    );
  }

  return (
    <div className="monitor-panel" aria-labelledby="monitor-title">
      <div className="monitor-bezel">
        <p className="eyebrow">Workstation · live</p>
        <h2 id="monitor-title">{guidance?.headline ?? "Your shift console"}</h2>
        <p>
          {guidance?.detail ??
            "Focus the desk to read tickets, email, and alerts clearly."}
        </p>
        <div className="monitor-actions">
          <button className="start-shift" onClick={onFocusDesk} type="button">
            Focus desk
          </button>
          <button className="guidance-secondary" onClick={onStand} type="button">
            Stand up
          </button>
        </div>
      </div>
    </div>
  );
}
