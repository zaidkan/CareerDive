import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { useAmbientMotion } from "./props/ambient.js";

const OBJECTIVE_BLUE = "#6ea8fe";

/**
 * Calm "go here next" guidance: a flat ground marker at the player's feet
 * with a low arrowhead toward the journey target. Enterprise blue, no
 * arcade bob or emissive strobe; opacity breathes only when motion is
 * allowed (respects prefers-reduced-motion).
 */
export function Wayfinder({
  fromRef,
  to,
}: {
  fromRef: { current: [number, number, number] };
  to: [number, number, number];
}) {
  const group = useRef<THREE.Group>(null);
  const headMat = useRef<THREE.MeshBasicMaterial>(null);
  const live = useAmbientMotion(true);

  useFrame(({ clock }) => {
    const from = fromRef.current;
    const dx = to[0] - from[0];
    const dz = to[2] - from[2];
    const dist = Math.hypot(dx, dz);
    if (!group.current) return;
    if (dist < 0.55) {
      group.current.visible = false;
      return;
    }
    group.current.visible = true;
    group.current.position.set(from[0], 0.06, from[2]);
    group.current.rotation.y = Math.atan2(dx, dz);
    if (headMat.current) {
      headMat.current.opacity = live
        ? 0.8 + Math.sin(clock.elapsedTime * 2) * 0.12
        : 0.85;
    }
  });

  return (
    <group ref={group} visible={false}>
      {/* Anchor ring at the player's feet. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <ringGeometry args={[0.32, 0.38, 32]} />
        <meshBasicMaterial
          color={OBJECTIVE_BLUE}
          transparent
          opacity={0.5}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {/* Low stem toward the objective. */}
      <mesh position={[0, 0.015, 0.55]}>
        <boxGeometry args={[0.1, 0.012, 0.4]} />
        <meshBasicMaterial
          color={OBJECTIVE_BLUE}
          transparent
          opacity={0.35}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {/* Flat arrowhead — lies on the floor plane, no hover bob. */}
      <mesh position={[0, 0.02, 0.95]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.17, 0.4, 3]} />
        <meshBasicMaterial
          ref={headMat}
          color={OBJECTIVE_BLUE}
          transparent
          opacity={0.85}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
