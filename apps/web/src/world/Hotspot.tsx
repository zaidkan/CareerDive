import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";
import type { HotspotId } from "./worldTypes.js";

export type HotspotDef = {
  id: HotspotId;
  label: string;
  position: [number, number, number];
  radius: number;
};

export function Hotspot({
  def,
  playerPosition,
  active,
}: {
  def: HotspotDef;
  playerPosition: [number, number, number];
  active: boolean;
}) {
  const ref = useRef<Group>(null);
  useFrame(() => {
    if (!ref.current) return;
    ref.current.rotation.y += 0.01;
  });

  const dx = playerPosition[0] - def.position[0];
  const dz = playerPosition[2] - def.position[2];
  const near = Math.hypot(dx, dz) <= def.radius;

  return (
    <group position={def.position} ref={ref}>
      <mesh position={[0, 1.2, 0]}>
        <sphereGeometry args={[0.12, 12, 12]} />
        <meshStandardMaterial
          color={active || near ? "#4fd0c8" : "#e8b84a"}
          emissive={active || near ? "#4fd0c8" : "#a87a28"}
          emissiveIntensity={active || near ? 1.2 : 0.45}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.35, 0.48, 24]} />
        <meshBasicMaterial
          color={near ? "#4fd0c8" : "#5c4634"}
          transparent
          opacity={0.7}
        />
      </mesh>
    </group>
  );
}

export function nearestHotspot(
  player: [number, number, number],
  hotspots: HotspotDef[],
): HotspotDef | undefined {
  let best: HotspotDef | undefined;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const hotspot of hotspots) {
    const dist = Math.hypot(
      player[0] - hotspot.position[0],
      player[2] - hotspot.position[2],
    );
    if (dist <= hotspot.radius && dist < bestDist) {
      best = hotspot;
      bestDist = dist;
    }
  }
  return best;
}
