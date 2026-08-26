import { Canvas } from "@react-three/fiber";
import { lazy, Suspense, useMemo } from "react";
import {
  isLowEndDevice,
  readNavigator,
  useAdaptiveQuality,
} from "./effects/useAdaptiveQuality.js";
import { SocRoom } from "./rooms/SocRoom.js";
import type { HotspotId } from "./worldTypes.js";

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
  highlightHotspotId,
}: {
  onNearbyChange: (id?: HotspotId, label?: string) => void;
  onInteract: (id: HotspotId) => void;
  enabled: boolean;
  seated?: boolean;
  highlightHotspotId?: HotspotId;
}) {
  const dpr = useMemo(() => pickDpr(seated), [seated]);

  return (
    <div className="room-canvas">
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
            onInteract={onInteract}
            onNearbyChange={onNearbyChange}
            seated={seated}
            {...(highlightHotspotId ? { highlightHotspotId } : {})}
          />
        </Suspense>
        <AdaptiveSceneEffects seated={seated} />
      </Canvas>
    </div>
  );
}
