import { Canvas } from "@react-three/fiber";
import { lazy, memo, Suspense, useState } from "react";
import { graphicsAvailable } from "../experience/diagnostics.js";
import type { ClientWorkplaceState } from "@sim/schemas";
import {
  useWorldQuality,
  WorldQualityProvider,
} from "./effects/useAdaptiveQuality.js";
import { SocRoom } from "./rooms/SocRoom.js";
import type { HotspotId } from "./worldTypes.js";

const PerfOverlay = lazy(async () => {
  const mod = await import("./effects/perfDiagnostics.js");
  return { default: mod.PerfOverlay };
});

const SceneEffects = lazy(async () => {
  const mod = await import("./effects/SceneEffects.js");
  return { default: mod.SceneEffects };
});

const PERF_ENABLED =
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("perf") === "1";

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

function PerfDiagnostics() {
  const quality = useWorldQuality();
  if (!PERF_ENABLED) return null;
  return (
    <Suspense fallback={null}>
      <PerfOverlay quality={quality} />
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
  mouseSensitivity,
  onBreakRoomExit,
  onWalkBlocked,
  onRecover,
  onAcceptedDistance,
}: {
  onNearbyChange: (
    id?: HotspotId,
    label?: string,
    choices?: HotspotId[],
  ) => void;
  onInteract: (id: HotspotId) => void;
  enabled: boolean;
  seated?: boolean;
  highlightHotspotId?: HotspotId;
  workplace: ClientWorkplaceState;
  mouseSensitivity: number;
  onBreakRoomExit: () => void;
  onWalkBlocked?: () => void;
  onRecover?: (position: [number, number, number]) => void;
  onAcceptedDistance?: (meters: number) => void;
}) {
  // R3F initializes its renderer asynchronously; fail here so recovery can catch it.
  const [canRender] = useState(() => graphicsAvailable("webgl2"));
  if (!canRender) throw new Error("Workplace graphics unavailable");
  return (
    <div className="room-canvas" data-interaction-id="movement_exertion">
      <Canvas
        camera={{ fov: 62, position: [0, 1.6, 5], near: 0.08, far: 48 }}
        dpr={1}
        // Seated is Desk OS HTML over a static pose — render on demand instead
        // of an always-on loop; walk keeps the interactive frameloop.
        frameloop={seated ? "demand" : "always"}
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
              mouseSensitivity={mouseSensitivity}
              {...(onWalkBlocked ? { onWalkBlocked } : {})}
              {...(onRecover ? { onRecover } : {})}
              {...(onAcceptedDistance ? { onAcceptedDistance } : {})}
              {...(highlightHotspotId ? { highlightHotspotId } : {})}
            />
          </Suspense>
          <AdaptiveSceneEffects />
          <PerfDiagnostics />
        </WorldQualityProvider>
      </Canvas>
    </div>
  );
});
