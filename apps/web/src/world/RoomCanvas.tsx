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
        camera={{ fov: 65, position: [0, 1.6, 4.5], near: 0.1, far: 40 }}
        dpr={[1, 1.75]}
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
