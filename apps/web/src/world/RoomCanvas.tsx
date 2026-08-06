import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { SocRoom } from "./rooms/SocRoom.js";
import type { HotspotId } from "./worldTypes.js";

export function RoomCanvas({
  onNearbyChange,
  onInteract,
  enabled,
}: {
  onNearbyChange: (id?: HotspotId, label?: string) => void;
  onInteract: (id: HotspotId) => void;
  enabled: boolean;
}) {
  return (
    <div className="room-canvas">
      <Canvas
        camera={{ fov: 62, position: [0, 1.6, 4.5], near: 0.08, far: 50 }}
        dpr={[1, 1.75]}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
        }}
        shadows
      >
        <Suspense fallback={null}>
          <SocRoom
            enabled={enabled}
            onInteract={onInteract}
            onNearbyChange={onNearbyChange}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
