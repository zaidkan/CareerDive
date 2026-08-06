import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group, Mesh } from "three";
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
  const glow = useRef<Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.clock.elapsedTime * 0.9;
    if (glow.current) {
      const pulse = 0.7 + Math.sin(state.clock.elapsedTime * 3) * 0.3;
      glow.current.scale.setScalar(active ? pulse : 0.85);
    }
  });

  return (
    <group position={def.position} ref={ref}>
      <mesh position={[0, 1.15, 0]} ref={glow}>
        <octahedronGeometry args={[0.13, 0]} />
        <meshStandardMaterial
          color={active ? "#4fd0c8" : "#e8b84a"}
          emissive={active ? "#4fd0c8" : "#a87a28"}
          emissiveIntensity={active ? 1.6 : 0.55}
          roughness={0.25}
          metalness={0.2}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <ringGeometry args={[0.48, 0.62, 40]} />
        <meshBasicMaterial
          color={active ? "#4fd0c8" : "#5c4634"}
          transparent
          opacity={active ? 0.9 : 0.4}
        />
      </mesh>
      {active ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
          <ringGeometry args={[0.7, 0.78, 40]} />
          <meshBasicMaterial color="#4fd0c8" transparent opacity={0.35} />
        </mesh>
      ) : null}
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
