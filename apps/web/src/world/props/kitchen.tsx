/**
 * Break-room appliances — fridge, coffee pot.
 */

export function Fridge({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.85, 1.7, 0.7]} />
        <meshStandardMaterial color="#c8c4bc" metalness={0.45} roughness={0.35} />
      </mesh>
      <mesh position={[0.38, 0.2, 0.36]}>
        <boxGeometry args={[0.04, 0.55, 0.04]} />
        <meshStandardMaterial color="#8a8680" metalness={0.6} />
      </mesh>
      <mesh position={[0, 0.35, 0.36]}>
        <boxGeometry args={[0.7, 0.02, 0.02]} />
        <meshStandardMaterial color="#9a9690" />
      </mesh>
      <mesh position={[0.28, 0.7, 0.36]}>
        <boxGeometry args={[0.12, 0.08, 0.03]} />
        <meshStandardMaterial
          color="#4fd0c8"
          emissive="#4fd0c8"
          emissiveIntensity={0.3}
        />
      </mesh>
    </group>
  );
}

export function CoffeePot({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow>
        <cylinderGeometry args={[0.14, 0.16, 0.28, 14]} />
        <meshStandardMaterial color="#1a130f" metalness={0.45} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.1, 0.12, 0.1, 12]} />
        <meshStandardMaterial color="#f3e6c8" roughness={0.35} />
      </mesh>
      <mesh position={[0.16, 0.05, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.08, 0.015, 8, 16, Math.PI]} />
        <meshStandardMaterial color="#2a2118" metalness={0.5} />
      </mesh>
      {/* Warmer hotplate glow, which reads the same as the point light it replaced */}
      <mesh position={[0, -0.145, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.02, 14]} />
        <meshStandardMaterial
          color="#8a3a20"
          emissive="#e8611a"
          emissiveIntensity={0.9}
          roughness={0.5}
        />
      </mesh>
    </group>
  );
}
