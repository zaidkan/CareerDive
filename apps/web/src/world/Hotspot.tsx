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
  active,
}: {
  def: HotspotDef;
  active: boolean;
}) {
  const ref = useRef<Group>(null);
  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.rotation.y += delta * 0.8;
  });

  return (
    <group position={def.position} ref={ref}>
      <mesh position={[0, 1.05, 0]}>
        <octahedronGeometry args={[0.14, 0]} />
        <meshStandardMaterial
          color={active ? "#4fd0c8" : "#e8b84a"}
          emissive={active ? "#4fd0c8" : "#a87a28"}
          emissiveIntensity={active ? 1.4 : 0.55}
          roughness={0.35}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[0.42, 0.58, 32]} />
        <meshBasicMaterial
          color={active ? "#4fd0c8" : "#5c4634"}
          transparent
          opacity={active ? 0.85 : 0.45}
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
