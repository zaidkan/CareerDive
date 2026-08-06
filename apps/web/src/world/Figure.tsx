/**
 * Stylized indie workplace figure — layered silhouette with clothing cues.
 * Presentation only; never drives simulation evidence.
 */
export function Figure({
  position = [0, 0, 0],
  rotationY = 0,
  primary = "#8a9a8e",
  secondary = "#2a322c",
  accent = "#4fd0c8",
  skin = "#d4b896",
  hair = "#2a1c12",
  seated = false,
}: {
  position?: [number, number, number];
  rotationY?: number;
  primary?: string;
  secondary?: string;
  accent?: string;
  skin?: string;
  hair?: string;
  seated?: boolean;
}) {
  const hipY = seated ? 0.52 : 0.55;
  const torsoY = seated ? 1.0 : 1.12;
  const headY = seated ? 1.58 : 1.78;
  const legBend = seated ? 0.55 : 0;
  const legZ = seated ? 0.18 : 0;

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Shoes */}
      <mesh position={[-0.12, 0.06, legZ * 0.5]} castShadow>
        <boxGeometry args={[0.14, 0.08, 0.26]} />
        <meshStandardMaterial color="#1a130f" roughness={0.7} />
      </mesh>
      <mesh position={[0.12, 0.06, legZ * 0.5]} castShadow>
        <boxGeometry args={[0.14, 0.08, 0.26]} />
        <meshStandardMaterial color="#1a130f" roughness={0.7} />
      </mesh>

      {/* Legs */}
      <mesh
        position={[-0.12, hipY * 0.55, legZ * 0.4]}
        rotation={[legBend, 0, 0]}
        castShadow
      >
        <capsuleGeometry args={[0.085, seated ? 0.32 : 0.58, 6, 10]} />
        <meshStandardMaterial color={secondary} roughness={0.8} />
      </mesh>
      <mesh
        position={[0.12, hipY * 0.55, legZ * 0.4]}
        rotation={[legBend, 0, 0]}
        castShadow
      >
        <capsuleGeometry args={[0.085, seated ? 0.32 : 0.58, 6, 10]} />
        <meshStandardMaterial color={secondary} roughness={0.8} />
      </mesh>

      {/* Hips / belt */}
      <mesh position={[0, hipY, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.22, 0.18, 12]} />
        <meshStandardMaterial color={secondary} roughness={0.75} />
      </mesh>
      <mesh position={[0, hipY + 0.08, 0.18]}>
        <boxGeometry args={[0.12, 0.04, 0.04]} />
        <meshStandardMaterial color={accent} metalness={0.5} />
      </mesh>

      {/* Torso / hoodie */}
      <mesh position={[0, torsoY, 0]} castShadow>
        <capsuleGeometry args={[0.22, 0.42, 6, 12]} />
        <meshStandardMaterial color={primary} roughness={0.65} />
      </mesh>
      {/* Collar */}
      <mesh position={[0, torsoY + 0.28, 0.05]}>
        <torusGeometry args={[0.14, 0.035, 8, 16]} />
        <meshStandardMaterial color={primary} roughness={0.7} />
      </mesh>

      {/* Arms */}
      <mesh
        position={[-0.34, torsoY + 0.02, 0.02]}
        rotation={[seated ? 0.8 : 0.15, 0, 0.45]}
        castShadow
      >
        <capsuleGeometry args={[0.07, 0.42, 5, 10]} />
        <meshStandardMaterial color={primary} roughness={0.65} />
      </mesh>
      <mesh
        position={[0.34, torsoY + 0.02, 0.02]}
        rotation={[seated ? 0.8 : 0.15, 0, -0.45]}
        castShadow
      >
        <capsuleGeometry args={[0.07, 0.42, 5, 10]} />
        <meshStandardMaterial color={primary} roughness={0.65} />
      </mesh>
      {/* Hands */}
      <mesh
        position={[
          -0.42,
          torsoY - (seated ? 0.05 : 0.28),
          seated ? 0.28 : 0.05,
        ]}
      >
        <sphereGeometry args={[0.07, 10, 10]} />
        <meshStandardMaterial color={skin} roughness={0.55} />
      </mesh>
      <mesh
        position={[
          0.42,
          torsoY - (seated ? 0.05 : 0.28),
          seated ? 0.28 : 0.05,
        ]}
      >
        <sphereGeometry args={[0.07, 10, 10]} />
        <meshStandardMaterial color={skin} roughness={0.55} />
      </mesh>

      {/* Neck + head */}
      <mesh position={[0, headY - 0.18, 0]}>
        <cylinderGeometry args={[0.07, 0.08, 0.12, 10]} />
        <meshStandardMaterial color={skin} />
      </mesh>
      <mesh position={[0, headY, 0]} castShadow>
        <sphereGeometry args={[0.165, 20, 20]} />
        <meshStandardMaterial color={skin} roughness={0.5} />
      </mesh>

      {/* Hair volume */}
      <mesh position={[0, headY + 0.08, -0.02]}>
        <sphereGeometry args={[0.15, 14, 14]} />
        <meshStandardMaterial color={hair} roughness={0.75} />
      </mesh>
      <mesh position={[0, headY + 0.02, -0.1]}>
        <sphereGeometry args={[0.12, 12, 12]} />
        <meshStandardMaterial color={hair} roughness={0.8} />
      </mesh>

      {/* Soft face cue (eyes) */}
      <mesh position={[-0.05, headY + 0.02, 0.14]}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshStandardMaterial color="#1a130f" />
      </mesh>
      <mesh position={[0.05, headY + 0.02, 0.14]}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshStandardMaterial color="#1a130f" />
      </mesh>

      {/* Headset */}
      <mesh position={[0, headY + 0.02, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.15, 0.018, 8, 20]} />
        <meshStandardMaterial color="#222" metalness={0.4} />
      </mesh>
      <mesh position={[0.16, headY, 0]}>
        <sphereGeometry args={[0.055, 10, 10]} />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={0.45}
        />
      </mesh>
      <mesh position={[-0.16, headY, 0]}>
        <sphereGeometry args={[0.055, 10, 10]} />
        <meshStandardMaterial color="#333" metalness={0.3} />
      </mesh>
      {/* Mic boom */}
      <mesh position={[0.1, headY - 0.06, 0.1]} rotation={[0.4, 0.6, 0]}>
        <cylinderGeometry args={[0.01, 0.01, 0.18, 6]} />
        <meshStandardMaterial color="#444" />
      </mesh>
    </group>
  );
}
