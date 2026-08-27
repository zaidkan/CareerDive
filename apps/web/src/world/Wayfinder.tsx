import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

/** Ground chevron pointing from the player toward the current journey target. */
export function Wayfinder({
  fromRef,
  to,
}: {
  fromRef: { current: [number, number, number] };
  to: [number, number, number];
}) {
  const group = useRef<THREE.Group>(null);
  const bob = useRef<THREE.Group>(null);
  const glow = useRef<THREE.MeshStandardMaterial>(null);

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
    group.current.position.set(from[0], 0.08, from[2]);
    group.current.rotation.y = Math.atan2(dx, dz);
    if (glow.current) {
      glow.current.emissiveIntensity = 1.1 + Math.sin(clock.elapsedTime * 4) * 0.45;
    }
    if (bob.current) {
      bob.current.position.y = Math.sin(clock.elapsedTime * 3.2) * 0.025;
    }
  });

  return (
    <group ref={group} visible={false}>
      <group ref={bob} position={[0, 0, 0.85]}>
        <mesh position={[0, 0, 0.22]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.16, 0.34, 3]} />
          <meshStandardMaterial
            ref={glow}
            color="#e8b84a"
            emissive="#e8b84a"
            emissiveIntensity={1.2}
            toneMapped={false}
          />
        </mesh>
        <mesh position={[0, 0, -0.08]}>
          <boxGeometry args={[0.09, 0.04, 0.42]} />
          <meshStandardMaterial
            color="#f3e6c8"
            emissive="#c4a060"
            emissiveIntensity={0.55}
            toneMapped={false}
          />
        </mesh>
      </group>
    </group>
  );
}
