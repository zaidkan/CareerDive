/**
 * Light fixtures — ceiling panels and task lamps.
 */

export function CeilingFixture({
  position,
  lit = true,
  /** Emissive panel without a point light — extra brightness at no light cost. */
  light = true,
}: {
  position: [number, number, number];
  lit?: boolean;
  light?: boolean;
}) {
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[1.9, 0.06, 0.6]} />
        <meshStandardMaterial color="#3a3228" roughness={0.65} />
      </mesh>
      <mesh position={[0, -0.05, 0]}>
        <boxGeometry args={[1.7, 0.05, 0.42]} />
        <meshStandardMaterial
          color="#fff6dc"
          emissive="#ffe2a0"
          emissiveIntensity={lit ? 1.7 : 0.35}
          roughness={0.35}
        />
      </mesh>
      {lit && light ? (
        <pointLight
          intensity={2.6}
          distance={12}
          decay={1.6}
          position={[0, -0.5, 0]}
          color="#ffe8b8"
        />
      ) : null}
    </group>
  );
}

export function TaskLamp({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh>
        <cylinderGeometry args={[0.08, 0.1, 0.04, 12]} />
        <meshStandardMaterial color="#3a2c22" metalness={0.4} />
      </mesh>
      <mesh position={[0, 0.28, 0]} rotation={[0.3, 0, 0.2]}>
        <cylinderGeometry args={[0.02, 0.025, 0.55, 8]} />
        <meshStandardMaterial color="#5c4634" metalness={0.5} />
      </mesh>
      <mesh position={[0.08, 0.52, 0.12]}>
        <sphereGeometry args={[0.09, 14, 14]} />
        <meshStandardMaterial
          color="#fff1c8"
          emissive="#e8b84a"
          emissiveIntensity={1.1}
          roughness={0.3}
        />
      </mesh>
      <pointLight
        intensity={1.4}
        distance={4.5}
        decay={1.5}
        position={[0.1, 0.55, 0.15]}
        color="#ffe8b8"
      />
    </group>
  );
}
