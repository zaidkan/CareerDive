import { Canvas } from "@react-three/fiber";
import { lazy, Suspense, useMemo } from "react";
import type { AvailableAction, ClientView } from "@sim/schemas";
import {
  isLowEndDevice,
  readNavigator,
  useAdaptiveQuality,
} from "./effects/useAdaptiveQuality.js";
import { SocRoom } from "./rooms/SocRoom.js";
import type { HotspotId, SpatialPhase } from "./worldTypes.js";

const SceneEffects = lazy(async () => {
  const mod = await import("./effects/SceneEffects.js");
  return { default: mod.SceneEffects };
});

function pickDpr(seated: boolean): [number, number] {
  if (typeof window === "undefined") return [1, 1.25];
  const lowEnd = isLowEndDevice(readNavigator());
  if (seated) return [1, lowEnd ? 1 : 1.15];
  return [1, lowEnd ? 1.15 : 1.5];
}

/**
 * Seated = player is reading desk OS HTML. Bloom on that overlay smears text,
 * and the extra composer pass is wasted while shadows/DPR are already cut.
 * Off, not weaker: a live composer still costs a full-screen blit.
 */
function AdaptiveSceneEffects({ seated }: { seated: boolean }) {
  const { composer, grain } = useAdaptiveQuality(seated);
  if (!composer) return null;
  return (
    <Suspense fallback={null}>
      <SceneEffects grain={grain} />
    </Suspense>
  );
}

export function RoomCanvas({
  onNearbyChange,
  onInteract,
  enabled,
  seated = false,
  maximized = false,
  deskPhase,
  view,
  onAction,
  guided = false,
  highlightHotspotId,
  onLoginSuccess,
  onStand,
  onMaximize,
  onMinimize,
}: {
  onNearbyChange: (id?: HotspotId, label?: string) => void;
  onInteract: (id: HotspotId) => void;
  enabled: boolean;
  seated?: boolean;
  maximized?: boolean;
  highlightHotspotId?: HotspotId;
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
            {...(highlightHotspotId ? { highlightHotspotId } : {})}
            {...(deskPhase ? { deskPhase } : {})}
            {...(view ? { view } : {})}
            {...(onAction ? { onAction } : {})}
            {...(onLoginSuccess ? { onLoginSuccess } : {})}
            {...(onStand ? { onStand } : {})}
            {...(onMaximize ? { onMaximize } : {})}
            {...(onMinimize ? { onMinimize } : {})}
          />
        </Suspense>
        <AdaptiveSceneEffects seated={seated} />
      </Canvas>
    </div>
  );
}
