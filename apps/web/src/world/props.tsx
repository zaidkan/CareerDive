/**
 * Shared stylized SOC props — composed primitives, night-ops palette.
 */

import type { ReactNode } from "react";

export function CeilingFixture({
  position,
}: {
  position: [number, number, number];
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
          emissiveIntensity={1.4}
          roughness={0.35}
        />
      </mesh>
      <pointLight
        intensity={3.2}
        distance={12}
        decay={1.4}
        position={[0, -0.5, 0]}
        color="#ffe8b8"
      />
    </group>
  );
}

export function DualMonitor({
  position,
  leftEmissive = "#4fd0c8",
  rightEmissive = "#e8b84a",
}: {
  position: [number, number, number];
  leftEmissive?: string;
  rightEmissive?: string;
}) {
  return (
    <group position={position}>
      {([-0.42, 0.42] as const).map((x, i) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, 0.02, 0]}>
            <boxGeometry args={[0.22, 0.04, 0.18]} />
            <meshStandardMaterial color="#111" metalness={0.5} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.16, 0]}>
            <cylinderGeometry args={[0.03, 0.04, 0.28, 10]} />
            <meshStandardMaterial color="#1a1a1a" metalness={0.6} />
          </mesh>
          <mesh position={[0, 0.42, 0.02]} castShadow>
            <boxGeometry args={[0.78, 0.52, 0.06]} />
            <meshStandardMaterial color="#0a0a0a" roughness={0.35} />
          </mesh>
          <mesh position={[0, 0.42, 0.055]}>
            <boxGeometry args={[0.7, 0.44, 0.02]} />
            <meshStandardMaterial
              color="#050a0c"
              emissive={i === 0 ? leftEmissive : rightEmissive}
              emissiveIntensity={0.7}
              roughness={0.2}
            />
          </mesh>
          {/* Soft bezel glow strip */}
          <mesh position={[0, 0.2, 0.055]}>
            <boxGeometry args={[0.55, 0.02, 0.01]} />
            <meshStandardMaterial
              color={i === 0 ? leftEmissive : rightEmissive}
              emissive={i === 0 ? leftEmissive : rightEmissive}
              emissiveIntensity={1.2}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function DeskFrame({
  position,
  width = 2.05,
  depth = 1.05,
  color = "#2c241c",
}: {
  position: [number, number, number];
  width?: number;
  depth?: number;
  color?: string;
}) {
  const leg = 0.08;
  const hx = width / 2 - 0.12;
  const hz = depth / 2 - 0.12;
  return (
    <group position={position}>
      <mesh position={[0, 0.78, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, 0.06, depth]} />
        <meshStandardMaterial color={color} roughness={0.48} metalness={0.12} />
      </mesh>
      {/* Edge trim */}
      <mesh position={[0, 0.815, 0]}>
        <boxGeometry args={[width + 0.02, 0.015, depth + 0.02]} />
        <meshStandardMaterial color="#3a2c22" roughness={0.6} />
      </mesh>
      {(
        [
          [-hx, hz],
          [hx, hz],
          [-hx, -hz],
          [hx, -hz],
        ] as const
      ).map(([x, z], i) => (
        <mesh key={i} position={[x, 0.39, z]}>
          <boxGeometry args={[leg, 0.78, leg]} />
          <meshStandardMaterial color="#16110e" metalness={0.25} />
        </mesh>
      ))}
      {/* Modesty panel */}
      <mesh position={[0, 0.4, -depth / 2 + 0.05]}>
        <boxGeometry args={[width - 0.2, 0.55, 0.03]} />
        <meshStandardMaterial color="#1f1814" roughness={0.8} />
      </mesh>
    </group>
  );
}

export function OfficeChair({
  position,
  rotationY = 0,
}: {
  position: [number, number, number];
  rotationY?: number;
}) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.32, 0.07, 20]} />
        <meshStandardMaterial color="#1e1712" roughness={0.65} />
      </mesh>
      <mesh position={[0, 0.78, -0.14]} castShadow>
        <boxGeometry args={[0.46, 0.58, 0.09]} />
        <meshStandardMaterial color="#3d3126" roughness={0.7} />
      </mesh>
      {/* Lumbar accent */}
      <mesh position={[0, 0.62, -0.1]}>
        <boxGeometry args={[0.38, 0.12, 0.04]} />
        <meshStandardMaterial color="#4fd0c8" emissive="#4fd0c8" emissiveIntensity={0.15} />
      </mesh>
      <mesh position={[0, 0.28, 0]}>
        <cylinderGeometry args={[0.035, 0.04, 0.42, 10]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.7} roughness={0.3} />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2;
        return (
          <group key={i} rotation={[0, a, 0]}>
            <mesh position={[0.3, 0.08, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.025, 0.025, 0.28, 8]} />
              <meshStandardMaterial color="#333" metalness={0.6} />
            </mesh>
            <mesh position={[0.42, 0.06, 0]}>
              <sphereGeometry args={[0.055, 12, 12]} />
              <meshStandardMaterial color="#0d0d0d" metalness={0.5} />
            </mesh>
          </group>
        );
      })}
      {/* Armrests */}
      <mesh position={[-0.28, 0.62, 0.02]}>
        <boxGeometry args={[0.05, 0.08, 0.28]} />
        <meshStandardMaterial color="#2a2118" />
      </mesh>
      <mesh position={[0.28, 0.62, 0.02]}>
        <boxGeometry args={[0.05, 0.08, 0.28]} />
        <meshStandardMaterial color="#2a2118" />
      </mesh>
    </group>
  );
}

export function KeyboardMouse({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow>
        <boxGeometry args={[0.52, 0.025, 0.18]} />
        <meshStandardMaterial color="#141414" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[0.48, 0.01, 0.14]} />
        <meshStandardMaterial color="#1c1c1c" />
      </mesh>
      <mesh position={[0.4, 0.01, 0.08]} castShadow>
        <boxGeometry args={[0.07, 0.02, 0.11]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
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

export function PlantPot({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow>
        <cylinderGeometry args={[0.14, 0.12, 0.22, 12]} />
        <meshStandardMaterial color="#3a2c22" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.14, 0]}>
        <sphereGeometry args={[0.18, 10, 10]} />
        <meshStandardMaterial color="#2d5a3d" roughness={0.9} />
      </mesh>
      <mesh position={[0.08, 0.22, 0.04]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial color="#3a7a4a" />
      </mesh>
      <mesh position={[-0.06, 0.2, -0.05]}>
        <sphereGeometry args={[0.09, 8, 8]} />
        <meshStandardMaterial color="#245536" />
      </mesh>
    </group>
  );
}

export function ServerRack({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.7, 1.8, 0.55]} />
        <meshStandardMaterial color="#12161a" metalness={0.35} roughness={0.45} />
      </mesh>
      {[-0.55, -0.25, 0.05, 0.35, 0.65].map((y, i) => (
        <mesh key={y} position={[0, y, 0.28]}>
          <boxGeometry args={[0.55, 0.12, 0.02]} />
          <meshStandardMaterial
            color="#0a0e12"
            emissive={i % 2 === 0 ? "#4fd0c8" : "#e8b84a"}
            emissiveIntensity={0.35 + (i % 3) * 0.1}
          />
        </mesh>
      ))}
      <mesh position={[0.22, 0.85, 0.29]}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshStandardMaterial color="#7dba6a" emissive="#7dba6a" emissiveIntensity={0.8} />
      </mesh>
    </group>
  );
}

export function WallPanel({
  position,
  size,
  color = "#2a221c",
}: {
  position: [number, number, number];
  size: [number, number, number];
  color?: string;
}) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.82} />
    </mesh>
  );
}

export function Whiteboard({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow>
        <boxGeometry args={[1.6, 1.0, 0.06]} />
        <meshStandardMaterial color="#e8dcc4" roughness={0.55} />
      </mesh>
      <mesh position={[0, 0, 0.035]}>
        <boxGeometry args={[1.45, 0.85, 0.01]} />
        <meshStandardMaterial color="#f5efe0" roughness={0.4} />
      </mesh>
      {/* Marker tray */}
      <mesh position={[0, -0.55, 0.08]}>
        <boxGeometry args={[1.5, 0.06, 0.12]} />
        <meshStandardMaterial color="#3a2c22" />
      </mesh>
    </group>
  );
}

export function CubicleWalls({
  position,
  rotationY = 0,
  width = 2.6,
  depth = 2.2,
  height = 1.35,
}: {
  position: [number, number, number];
  rotationY?: number;
  width?: number;
  depth?: number;
  height?: number;
}) {
  const t = 0.08;
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Back panel */}
      <mesh position={[0, height / 2, -depth / 2]} castShadow>
        <boxGeometry args={[width, height, t]} />
        <meshStandardMaterial color="#3d342a" roughness={0.78} />
      </mesh>
      {/* Left wing */}
      <mesh position={[-width / 2, height / 2, 0]} castShadow>
        <boxGeometry args={[t, height, depth]} />
        <meshStandardMaterial color="#3d342a" roughness={0.78} />
      </mesh>
      {/* Right wing */}
      <mesh position={[width / 2, height / 2, 0]} castShadow>
        <boxGeometry args={[t, height, depth]} />
        <meshStandardMaterial color="#3d342a" roughness={0.78} />
      </mesh>
      {/* Top rail */}
      <mesh position={[0, height + 0.03, -depth / 2]}>
        <boxGeometry args={[width + 0.05, 0.06, 0.1]} />
        <meshStandardMaterial
          color="#4fd0c8"
          emissive="#4fd0c8"
          emissiveIntensity={0.25}
        />
      </mesh>
      <mesh position={[-width / 2, height + 0.03, 0]}>
        <boxGeometry args={[0.1, 0.06, depth]} />
        <meshStandardMaterial
          color="#4fd0c8"
          emissive="#4fd0c8"
          emissiveIntensity={0.2}
        />
      </mesh>
      <mesh position={[width / 2, height + 0.03, 0]}>
        <boxGeometry args={[0.1, 0.06, depth]} />
        <meshStandardMaterial
          color="#4fd0c8"
          emissive="#4fd0c8"
          emissiveIntensity={0.2}
        />
      </mesh>
    </group>
  );
}

export function BreakTable({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.78, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.2, 0.08, 1.1]} />
        <meshStandardMaterial color="#4a3a2c" roughness={0.55} />
      </mesh>
      {(
        [
          [-0.9, 0.4],
          [0.9, 0.4],
          [-0.9, -0.4],
          [0.9, -0.4],
        ] as const
      ).map(([x, z], i) => (
        <mesh key={i} position={[x, 0.39, z]}>
          <cylinderGeometry args={[0.05, 0.05, 0.78, 10]} />
          <meshStandardMaterial color="#2a2118" />
        </mesh>
      ))}
    </group>
  );
}

export function FloorTileGrid({
  rangeX = 8,
  rangeZ = 7,
}: {
  rangeX?: number;
  rangeZ?: number;
}) {
  const tiles: ReactNode[] = [];
  for (let x = -rangeX; x <= rangeX; x += 1.2) {
    for (let z = -rangeZ; z <= rangeZ; z += 1.2) {
      const dark = (Math.round(x / 1.2) + Math.round(z / 1.2)) % 2 === 0;
      tiles.push(
        <mesh
          key={`${x}:${z}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[x, 0.005, z]}
          receiveShadow
        >
          <planeGeometry args={[1.15, 1.15]} />
          <meshStandardMaterial
            color={dark ? "#2a221c" : "#322820"}
            roughness={0.9}
          />
        </mesh>,
      );
    }
  }
  return <group>{tiles}</group>;
}
