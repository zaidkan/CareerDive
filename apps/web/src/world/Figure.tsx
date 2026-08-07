/**
 * Stylized workplace figure using box limbs (stable proportions).
 * Presentation only — never drives simulation evidence.
 */
function Limb({
  args,
  position,
  rotation = [0, 0, 0],
  color,
}: {
  args: [number, number, number];
  position: [number, number, number];
  rotation?: [number, number, number];
  color: string;
}) {
  return (
    <mesh position={position} rotation={rotation} castShadow>
      <boxGeometry args={args} />
      <meshStandardMaterial color={color} roughness={0.72} />
    </mesh>
  );
}

export function Figure({
  position = [0, 0, 0],
  rotationY = 0,
  primary = "#6d7f78",
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
  if (seated) {
    return (
      <group position={position} rotation={[0, rotationY, 0]}>
        {/* Chair-sit: thighs forward, calves down, torso upright */}
        <Limb args={[0.16, 0.14, 0.42]} position={[-0.12, 0.52, 0.12]} color={secondary} />
        <Limb args={[0.16, 0.14, 0.42]} position={[0.12, 0.52, 0.12]} color={secondary} />
        <Limb args={[0.14, 0.38, 0.14]} position={[-0.12, 0.28, 0.28]} color={secondary} />
        <Limb args={[0.14, 0.38, 0.14]} position={[0.12, 0.28, 0.28]} color={secondary} />
        <Limb args={[0.16, 0.08, 0.28]} position={[-0.12, 0.08, 0.3]} color="#1a130f" />
        <Limb args={[0.16, 0.08, 0.28]} position={[0.12, 0.08, 0.3]} color="#1a130f" />

        <Limb args={[0.42, 0.16, 0.28]} position={[0, 0.62, 0]} color={secondary} />
        <Limb args={[0.4, 0.52, 0.26]} position={[0, 1.0, 0]} color={primary} />

        {/* Arms resting forward */}
        <Limb
          args={[0.12, 0.36, 0.12]}
          position={[-0.3, 0.92, 0.18]}
          rotation={[0.9, 0, 0.15]}
          color={primary}
        />
        <Limb
          args={[0.12, 0.36, 0.12]}
          position={[0.3, 0.92, 0.18]}
          rotation={[0.9, 0, -0.15]}
          color={primary}
        />
        <mesh position={[-0.32, 0.78, 0.38]}>
          <sphereGeometry args={[0.07, 12, 12]} />
          <meshStandardMaterial color={skin} roughness={0.55} />
        </mesh>
        <mesh position={[0.32, 0.78, 0.38]}>
          <sphereGeometry args={[0.07, 12, 12]} />
          <meshStandardMaterial color={skin} roughness={0.55} />
        </mesh>

        <Head skin={skin} hair={hair} accent={accent} y={1.42} />
      </group>
    );
  }

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Standing: clear vertical limbs */}
      <Limb args={[0.15, 0.08, 0.28]} position={[-0.12, 0.06, 0.02]} color="#1a130f" />
      <Limb args={[0.15, 0.08, 0.28]} position={[0.12, 0.06, 0.02]} color="#1a130f" />

      <Limb args={[0.14, 0.48, 0.14]} position={[-0.12, 0.36, 0]} color={secondary} />
      <Limb args={[0.14, 0.48, 0.14]} position={[0.12, 0.36, 0]} color={secondary} />
      <Limb args={[0.14, 0.42, 0.14]} position={[-0.12, 0.78, 0]} color={secondary} />
      <Limb args={[0.14, 0.42, 0.14]} position={[0.12, 0.78, 0]} color={secondary} />

      <Limb args={[0.4, 0.16, 0.26]} position={[0, 1.02, 0]} color={secondary} />
      <Limb args={[0.4, 0.55, 0.26]} position={[0, 1.4, 0]} color={primary} />

      {/* Upper + lower arms */}
      <Limb
        args={[0.12, 0.34, 0.12]}
        position={[-0.3, 1.42, 0]}
        rotation={[0.12, 0, 0.35]}
        color={primary}
      />
      <Limb
        args={[0.12, 0.34, 0.12]}
        position={[0.3, 1.42, 0]}
        rotation={[0.12, 0, -0.35]}
        color={primary}
      />
      <Limb
        args={[0.11, 0.32, 0.11]}
        position={[-0.38, 1.12, 0.04]}
        rotation={[0.2, 0, 0.2]}
        color={primary}
      />
      <Limb
        args={[0.11, 0.32, 0.11]}
        position={[0.38, 1.12, 0.04]}
        rotation={[0.2, 0, -0.2]}
        color={primary}
      />

      <mesh position={[-0.42, 0.92, 0.06]}>
        <sphereGeometry args={[0.07, 12, 12]} />
        <meshStandardMaterial color={skin} roughness={0.55} />
      </mesh>
      <mesh position={[0.42, 0.92, 0.06]}>
        <sphereGeometry args={[0.07, 12, 12]} />
        <meshStandardMaterial color={skin} roughness={0.55} />
      </mesh>

      <Head skin={skin} hair={hair} accent={accent} y={1.82} />
    </group>
  );
}

function Head({
  skin,
  hair,
  accent,
  y,
}: {
  skin: string;
  hair: string;
  accent: string;
  y: number;
}) {
  return (
    <group position={[0, y, 0]}>
      <mesh position={[0, -0.12, 0]}>
        <cylinderGeometry args={[0.07, 0.08, 0.1, 12]} />
        <meshStandardMaterial color={skin} />
      </mesh>
      <mesh castShadow>
        <sphereGeometry args={[0.16, 20, 20]} />
        <meshStandardMaterial color={skin} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.08, -0.02]}>
        <sphereGeometry args={[0.14, 14, 14]} />
        <meshStandardMaterial color={hair} roughness={0.78} />
      </mesh>
      <mesh position={[-0.05, 0.02, 0.13]}>
        <sphereGeometry args={[0.022, 8, 8]} />
        <meshStandardMaterial color="#1a130f" />
      </mesh>
      <mesh position={[0.05, 0.02, 0.13]}>
        <sphereGeometry args={[0.022, 8, 8]} />
        <meshStandardMaterial color="#1a130f" />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.14, 0.016, 8, 20]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.35} />
      </mesh>
      <mesh position={[0.15, 0, 0]}>
        <sphereGeometry args={[0.05, 10, 10]} />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={0.4}
        />
      </mesh>
      <mesh position={[-0.15, 0, 0]}>
        <sphereGeometry args={[0.05, 10, 10]} />
        <meshStandardMaterial color="#333" />
      </mesh>
    </group>
  );
}
