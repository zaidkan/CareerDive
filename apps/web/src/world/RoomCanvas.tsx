import { Canvas, useFrame } from "@react-three/fiber";
import { lazy, memo, Suspense, useEffect, useRef, useState } from "react";
import { graphicsAvailable } from "../experience/diagnostics.js";
import type { ClientWorkplaceState } from "@sim/schemas";
import {
  useWorldQuality,
  WorldQualityProvider,
} from "./effects/useAdaptiveQuality.js";
import { SocRoom } from "./rooms/SocRoom.js";
import { PLAYER_SPAWN } from "./rooms/socLayout.js";
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

/** Inside the scene's Suspense boundary: report after a complete scene frame,
 * not just renderer creation or the download of the WebGL module. */
function SceneReady({ onReady }: { onReady: () => void }) {
  const frame = useRef<number | undefined>(undefined);
  const reported = useRef(false);
  useFrame(() => {
    if (reported.current) return;
    reported.current = true;
    if (typeof performance !== "undefined") {
      performance.mark("careerdive:scene-ready");
      try {
        performance.measure(
          "careerdive:room-load",
          "careerdive:room-entry",
          "careerdive:scene-ready",
        );
      } catch {
        // The room may be restored without a same-page entry mark.
      }
    }
    frame.current = requestAnimationFrame(onReady);
  });
  useEffect(
    () => () => {
      if (frame.current !== undefined) cancelAnimationFrame(frame.current);
    },
    [],
  );
  return null;
}

export const RoomCanvas = memo(function RoomCanvas({
  onNearbyChange,
  onInteract,
  enabled,
  active = true,
  seated = false,
  highlightHotspotId,
  workplace,
  onBreakRoomExit,
  onWalkBlocked,
  onRecover,
  onAcceptedDistance,
  onReady,
}: {
  onNearbyChange: (
    id?: HotspotId,
    label?: string,
    choices?: HotspotId[],
  ) => void;
  onInteract: (id: HotspotId) => void;
  enabled: boolean;
  active?: boolean;
  seated?: boolean;
  highlightHotspotId?: HotspotId;
  workplace: ClientWorkplaceState;
  onBreakRoomExit: () => void;
  onWalkBlocked?: () => void;
  onRecover?: (position: [number, number, number]) => void;
  onAcceptedDistance?: (meters: number) => void;
  onReady?: () => void;
}) {
  // R3F initializes its renderer asynchronously; fail here so recovery can catch it.
  const [canRender] = useState(() => graphicsAvailable("webgl2"));
  if (!canRender) throw new Error("Workplace graphics unavailable");
  return (
    <div className="room-canvas" data-interaction-id="movement_exertion">
      <Canvas
        // Far reaches the city and sky dome outside the glazing.
        camera={{ fov: 62, position: PLAYER_SPAWN, near: 0.08, far: 1200 }}
        dpr={1}
        // Preserve the scene on map return without running invisible frames.
        // Seated remains on demand; walking keeps the interactive frame loop.
        frameloop={!active ? "never" : seated ? "demand" : "always"}
        gl={{
          antialias: !seated,
          alpha: false,
          powerPreference: "high-performance",
          stencil: false,
          depth: true,
        }}
        shadows={seated ? false : "percentage"}
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
              {...(onAcceptedDistance ? { onAcceptedDistance } : {})}
              {...(highlightHotspotId ? { highlightHotspotId } : {})}
            />
            {onReady ? <SceneReady onReady={onReady} /> : null}
          </Suspense>
          <AdaptiveSceneEffects />
          <PerfDiagnostics />
        </WorldQualityProvider>
      </Canvas>
    </div>
  );
});
