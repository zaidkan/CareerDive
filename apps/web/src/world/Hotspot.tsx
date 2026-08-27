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
  target = false,
}: {
  def: HotspotDef;
  active: boolean;
  target?: boolean;
}) {
  const ref = useRef<Group>(null);
  const glow = useRef<Mesh>(null);
  useFrame((state) => {
    if (!active && !target) return;
    if (!ref.current) return;
    ref.current.rotation.y = state.clock.elapsedTime * (target ? 1.35 : 0.9);
    if (glow.current) {
      const pulse = 0.7 + Math.sin(state.clock.elapsedTime * (target ? 4.2 : 3)) * 0.3;
      glow.current.scale.setScalar(pulse);
    }
  });

  const color = target ? "#e8b84a" : active ? "#4fd0c8" : "#e8b84a";
  const emissive = target ? "#e8b84a" : active ? "#4fd0c8" : "#a87a28";

  return (
    <group position={def.position} ref={ref}>
      <mesh position={[0, target ? 1.35 : 1.15, 0]} ref={glow}>
        <octahedronGeometry args={[target ? 0.2 : 0.13, 0]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={target ? 2.1 : active ? 1.6 : 0.55}
          roughness={0.25}
          metalness={0.2}
          toneMapped={false}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <ringGeometry args={[target ? 0.58 : 0.48, target ? 0.78 : 0.62, 16]} />
        <meshBasicMaterial
          color={target || active ? "#e8b84a" : "#5c4634"}
          transparent
          opacity={target ? 0.95 : active ? 0.9 : 0.4}
        />
      </mesh>
      {active || target ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
          <ringGeometry args={[target ? 0.88 : 0.7, target ? 1.02 : 0.78, 16]} />
          <meshBasicMaterial color="#e8b84a" transparent opacity={target ? 0.55 : 0.35} />
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
