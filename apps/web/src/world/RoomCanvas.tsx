import { Canvas } from "@react-three/fiber";
import { Suspense, useMemo } from "react";
import type { AvailableAction, ClientView } from "@sim/schemas";
import { SocRoom } from "./rooms/SocRoom.js";
import type { HotspotId, RoomId, SpatialPhase } from "./worldTypes.js";

function pickDpr(seated: boolean): [number, number] {
  if (typeof window === "undefined") return [1, 1.25];
  const cores = navigator.hardwareConcurrency || 4;
  const mem =
    "deviceMemory" in navigator
      ? Number((navigator as Navigator & { deviceMemory?: number }).deviceMemory)
      : 4;
  const lowEnd = cores <= 4 || mem <= 4;
  if (seated) return [1, lowEnd ? 1 : 1.15];
  return [1, lowEnd ? 1.15 : 1.5];
}

export function RoomCanvas({
  roomId: _roomId = "soc",
  onNearbyChange,
  onInteract,
  enabled,
  seated = false,
  maximized = false,
  deskPhase,
  view,
  onAction,
  guided = false,
  onLoginSuccess,
  onStand,
  onMaximize,
  onMinimize,
}: {
  roomId?: RoomId;
  onNearbyChange: (id?: HotspotId, label?: string) => void;
  onInteract: (id: HotspotId) => void;
  enabled: boolean;
  seated?: boolean;
  maximized?: boolean;
  deskPhase?: Extract<SpatialPhase, "desk_login" | "seated_monitor" | "focus_desk">;
  view?: ClientView;
  onAction?: (action: AvailableAction, freeText?: string) => void;
  guided?: boolean;
  onLoginSuccess?: () => void;
  onStand?: () => void;
  onMaximize?: () => void;
  onMinimize?: () => void;
}) {
  const dpr = useMemo(() => pickDpr(seated), [seated]);
  const hideSystemCursor =
    seated && deskPhase !== undefined && deskPhase !== "desk_login";

  return (
    <div
      className={`room-canvas${hideSystemCursor ? " room-canvas-engaged" : ""}`}
    >
      <Canvas
        camera={{ fov: 62, position: [0, 1.6, 5], near: 0.08, far: 48 }}
        dpr={dpr}
        gl={{
          antialias: !seated,
          alpha: false,
          powerPreference: "high-performance",
          stencil: false,
          depth: true,
        }}
        shadows={!seated}
        performance={{ min: 0.5 }}
      >
        <Suspense fallback={null}>
          <SocRoom
            enabled={enabled}
            guided={guided}
            maximized={maximized}
            onInteract={onInteract}
            onNearbyChange={onNearbyChange}
            seated={seated}
            {...(deskPhase ? { deskPhase } : {})}
            {...(view ? { view } : {})}
            {...(onAction ? { onAction } : {})}
            {...(onLoginSuccess ? { onLoginSuccess } : {})}
            {...(onStand ? { onStand } : {})}
            {...(onMaximize ? { onMaximize } : {})}
            {...(onMinimize ? { onMinimize } : {})}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
