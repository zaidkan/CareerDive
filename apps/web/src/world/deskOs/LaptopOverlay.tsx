import type { AvailableAction, ClientView } from "@sim/schemas";
import { DeskOs } from "./DeskOs.js";

/** Real DOM laptop over the 3D canvas so clicks and typing match the pixels. */
export function LaptopOverlay({
  phase,
  view,
  onAction,
  guided = false,
  maximized = false,
  onLoginSuccess,
  onStand,
  onMaximize,
  onMinimize,
}: {
  phase: "desk_login" | "seated_monitor" | "focus_desk";
  view: ClientView;
  onAction: (action: AvailableAction, freeText?: string) => void;
  guided?: boolean;
  maximized?: boolean;
  onLoginSuccess: () => void;
  onStand: () => void;
  onMaximize: () => void;
  onMinimize: () => void;
}) {
  return (
    <div
      className={`desk-os-overlay${maximized ? " desk-os-overlay-max" : ""}`}
    >
      <div className={`desk-os-laptop${maximized ? " desk-os-laptop-max" : ""}`}>
        <DeskOs
          guided={guided}
          maximized={maximized}
          onAction={onAction}
          onLoginSuccess={onLoginSuccess}
          onMaximize={onMaximize}
          onMinimize={onMinimize}
          onStand={onStand}
          phase={phase}
          view={view}
        />
      </div>
    </div>
  );
}
