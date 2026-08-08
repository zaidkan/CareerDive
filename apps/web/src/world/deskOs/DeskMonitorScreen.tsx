import { Html } from "@react-three/drei";
import type { AvailableAction, ClientView } from "@sim/schemas";
import { DeskOs } from "./DeskOs.js";

/** Interactive workstation OS mounted on the primary monitor face. */
export function DeskMonitorScreen({
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
    <Html
      center
      distanceFactor={maximized ? 0.92 : 1.28}
      occlude={false}
      position={[0, 0, 0]}
      style={{
        pointerEvents: "auto",
        userSelect: "none",
        width: maximized ? "820px" : "640px",
        height: maximized ? "500px" : "390px",
        willChange: "transform",
      }}
      transform
      zIndexRange={[80, 0]}
    >
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
    </Html>
  );
}
