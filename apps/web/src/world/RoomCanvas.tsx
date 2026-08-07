import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { BreakRoom } from "./rooms/BreakRoom.js";
import { SocRoom } from "./rooms/SocRoom.js";
import type { HotspotId, RoomId } from "./worldTypes.js";

export function RoomCanvas({
  roomId = "soc",
  onNearbyChange,
  onInteract,
  enabled,
}: {
  roomId?: RoomId;
  onNearbyChange: (id?: HotspotId, label?: string) => void;
  onInteract: (id: HotspotId) => void;
  enabled: boolean;
}) {
  return (
    <div className="room-canvas">
      <Canvas
        camera={{ fov: 62, position: [0, 1.6, 5], near: 0.08, far: 55 }}
        dpr={[1, 1.75]}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
        }}
        shadows
      >
        <Suspense fallback={null}>
          {roomId === "break_room" ? (
            <BreakRoom
              enabled={enabled}
              onInteract={onInteract}
              onNearbyChange={onNearbyChange}
            />
          ) : (
            <SocRoom
              enabled={enabled}
              onInteract={onInteract}
              onNearbyChange={onNearbyChange}
            />
          )}
        </Suspense>
      </Canvas>
    </div>
  );
}
