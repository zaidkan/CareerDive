/**
 * Stylized low-poly workplace figure (indie / Orwell-adjacent presence).
 * Presentation only — never drives simulation evidence.
 */
export function Figure({
  position = [0, 0, 0],
  rotationY = 0,
  primary = "#c9b8a0",
  secondary = "#3a2c22",
  accent = "#e8b84a",
  seated = false,
}: {
  position?: [number, number, number];
  rotationY?: number;
  primary?: string;
  secondary?: string;
  accent?: string;
  seated?: boolean;
}) {
  const legY = seated ? 0.42 : 0.45;
  const torsoY = seated ? 0.95 : 1.05;
  const headY = seated ? 1.55 : 1.72;

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Legs */}
      <mesh position={[-0.12, legY, seated ? 0.12 : 0]} castShadow>
        <capsuleGeometry args={[0.09, seated ? 0.28 : 0.55, 4, 8]} />
        <meshStandardMaterial color={secondary} roughness={0.85} />
      </mesh>
      <mesh position={[0.12, legY, seated ? 0.12 : 0]} castShadow>
        <capsuleGeometry args={[0.09, seated ? 0.28 : 0.55, 4, 8]} />
        <meshStandardMaterial color={secondary} roughness={0.85} />
      </mesh>
      {/* Torso */}
      <mesh position={[0, torsoY, 0]} castShadow>
        <capsuleGeometry args={[0.2, 0.45, 4, 10]} />
        <meshStandardMaterial color={primary} roughness={0.7} />
      </mesh>
      {/* Shoulders / arms */}
      <mesh position={[-0.32, torsoY + 0.05, 0]} rotation={[0, 0, 0.35]} castShadow>
        <capsuleGeometry args={[0.07, 0.38, 4, 8]} />
        <meshStandardMaterial color={primary} roughness={0.7} />
      </mesh>
      <mesh position={[0.32, torsoY + 0.05, 0]} rotation={[0, 0, -0.35]} castShadow>
        <capsuleGeometry args={[0.07, 0.38, 4, 8]} />
        <meshStandardMaterial color={primary} roughness={0.7} />
      </mesh>
      {/* Head */}
      <mesh position={[0, headY, 0]} castShadow>
        <sphereGeometry args={[0.16, 16, 16]} />
        <meshStandardMaterial color="#d4b896" roughness={0.55} />
      </mesh>
      {/* Hair / headset cue */}
      <mesh position={[0, headY + 0.08, -0.02]}>
        <sphereGeometry args={[0.14, 12, 12]} />
        <meshStandardMaterial color={accent} roughness={0.6} />
      </mesh>
      <mesh position={[0.14, headY, 0]}>
        <torusGeometry args={[0.08, 0.02, 8, 12]} />
        <meshStandardMaterial color="#4fd0c8" emissive="#4fd0c8" emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}
