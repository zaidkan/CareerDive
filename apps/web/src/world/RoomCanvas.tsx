import { Canvas } from "@react-three/fiber";
import { lazy, memo, Suspense } from "react";
import type { ClientWorkplaceState } from "@sim/schemas";
import {
  useWorldQuality,
  WorldQualityProvider,
} from "./effects/useAdaptiveQuality.js";
import { SocRoom } from "./rooms/SocRoom.js";
import type { HotspotId } from "./worldTypes.js";

const SceneEffects = lazy(async () => {
  const mod = await import("./effects/SceneEffects.js");
  return { default: mod.SceneEffects };
});

/**
 * Seated = player is reading desk OS HTML. Bloom on that overlay smears text,
 * and the extra composer pass is wasted while shadows/DPR are already cut.
 * Off, not weaker: a live composer still costs a full-screen blit.
 */
function AdaptiveSceneEffects() {
  const { composer, grain } = useWorldQuality();
  if (!composer) return null;
  return (
    <Suspense fallback={null}>
      <SceneEffects grain={grain} />
    </Suspense>
  );
}

export const RoomCanvas = memo(function RoomCanvas({
  onNearbyChange,
  onInteract,
  enabled,
  seated = false,
  highlightHotspotId,
  workplace,
  onBreakRoomExit,
  onWalkBlocked,
  onRecover,
}: {
  onNearbyChange: (id?: HotspotId, label?: string) => void;
  onInteract: (id: HotspotId) => void;
  enabled: boolean;
  seated?: boolean;
  highlightHotspotId?: HotspotId;
  workplace: ClientWorkplaceState;
  onBreakRoomExit: () => void;
  onWalkBlocked?: () => void;
  onRecover?: (position: [number, number, number]) => void;
}) {
  return (
    <div className="room-canvas">
      <Canvas
        camera={{ fov: 62, position: [0, 1.6, 5], near: 0.08, far: 48 }}
        dpr={1}
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
        <WorldQualityProvider seated={seated}>
          <Suspense fallback={null}>
            <SocRoom
              enabled={enabled}
              onInteract={onInteract}
              onBreakRoomExit={onBreakRoomExit}
              onNearbyChange={onNearbyChange}
              seated={seated}
            workplace={workplace}
            {...(onWalkBlocked ? { onWalkBlocked } : {})}
            {...(onRecover ? { onRecover } : {})}
            {...(onWalkBlocked ? { onWalkBlocked } : {})}
            {...(onRecover ? { onRecover } : {})}
              {...(highlightHotspotId ? { highlightHotspotId } : {})}
            />
          </Suspense>
          <AdaptiveSceneEffects />
        </WorldQualityProvider>
      </Canvas>
    </div>
  );
});
