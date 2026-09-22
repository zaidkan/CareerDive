import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Mesh, MeshBasicMaterial, MeshStandardMaterial } from "three";
import { useAmbientMotion } from "./props/ambient.js";
import type { HotspotId } from "./worldTypes.js";

export type HotspotDef = {
  id: HotspotId;
  label: string;
  position: [number, number, number];
  radius: number;
};

/**
 * Enterprise interaction affordance.
 * Grounded floor ring + low marker puck + approach-only prompt label.
 * Blue = current journey objective, teal = in range, graphite = idle.
 * Cosmetic only — IDs, anchors and radii stay canonical in socLayout.ts.
 */
const OBJECTIVE_BLUE = "#6ea8fe";
const IN_RANGE_TEAL = "#2dd4bf";
const IDLE_GRAPHITE = "#5a6572";

export function Hotspot({
  def,
  active,
  target = false,
}: {
  def: HotspotDef;
  active: boolean;
  target?: boolean;
}) {
  const live = useAmbientMotion(true);
  const puck = useRef<Mesh>(null);
  const puckMat = useRef<MeshStandardMaterial>(null);
  const ringMat = useRef<MeshBasicMaterial>(null);

  const color = target ? OBJECTIVE_BLUE : active ? IN_RANGE_TEAL : IDLE_GRAPHITE;
  const restGlow = target ? 1.6 : active ? 1.1 : 0.35;

  useFrame(({ clock }) => {
    if (!live) {
      if (puckMat.current) puckMat.current.emissiveIntensity = restGlow;
      return;
    }
    if (!active && !target) {
      if (puckMat.current) puckMat.current.emissiveIntensity = restGlow;
      return;
    }
    const t = clock.elapsedTime;
    const rate = target ? 2.2 : 1.6;
    const swell = Math.sin(t * rate) * 0.06;
    puck.current?.scale.setScalar(1 + swell);
    if (puckMat.current) {
      puckMat.current.emissiveIntensity = restGlow + Math.sin(t * rate) * 0.25;
    }
    if (ringMat.current) {
      ringMat.current.opacity = (target ? 0.95 : 0.85) + Math.sin(t * rate) * 0.08;
    }
  });

  return (
    <group position={def.position}>
      {/* Soft ground fill marking the interaction zone. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.035, 0]}>
        <circleGeometry args={[0.45, 28]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={target ? 0.22 : active ? 0.18 : 0.08}
          depthWrite={false}
        />
      </mesh>
      {/* Crisp zone edge. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.045, 0]}>
        <ringGeometry args={[0.5, 0.58, 40]} />
        <meshBasicMaterial
          ref={ringMat}
          color={color}
          transparent
          opacity={target ? 0.95 : active ? 0.85 : 0.4}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {active || target ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
          <ringGeometry args={[0.66, 0.7, 40]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.35}
            depthWrite={false}
          />
        </mesh>
      ) : null}
      {/* Low marker puck — anchored to the floor, not a floating quest marker. */}
      <mesh position={[0, 0.13, 0]} ref={puck}>
        <octahedronGeometry args={[0.09, 0]} />
        <meshStandardMaterial
          ref={puckMat}
          color={color}
          emissive={color}
          emissiveIntensity={restGlow}
          roughness={0.3}
          metalness={0.1}
          toneMapped={false}
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
