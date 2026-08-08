/**
 * Shared stylized SOC props — composed primitives, night-ops palette.
 */

import { useMemo, type ReactNode } from "react";
import * as THREE from "three";
import {
  makeCarpetTexture,
  makeCubicleFabricTexture,
  makeFloorTileTexture,
  makeMonitorGlowTexture,
  makePostItTexture,
  makeWallTexture,
  makeWoodTexture,
} from "./textures.js";

export function CeilingFixture({
  position,
  lit = true,
}: {
  position: [number, number, number];
  lit?: boolean;
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
          emissiveIntensity={lit ? 1.4 : 0.35}
          roughness={0.35}
        />
      </mesh>
      {lit ? (
        <pointLight
          intensity={2.4}
          distance={11}
          decay={1.6}
          position={[0, -0.5, 0]}
          color="#ffe8b8"
        />
      ) : null}
    </group>
  );
}

export function DualMonitor({
  position,
  leftEmissive = "#4fd0c8",
  rightEmissive = "#e8b84a",
  leftScreen,
}: {
  position: [number, number, number];
  leftEmissive?: string;
  rightEmissive?: string;
  leftScreen?: ReactNode;
}) {
  const leftTex = useMemo(
    () => makeMonitorGlowTexture(leftEmissive),
    [leftEmissive],
  );
  const rightTex = useMemo(
    () => makeMonitorGlowTexture(rightEmissive),
    [rightEmissive],
  );
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
              map={i === 0 ? leftTex : rightTex}
              emissive={i === 0 ? leftEmissive : rightEmissive}
              emissiveIntensity={leftScreen && i === 0 ? 0.15 : 0.55}
              roughness={0.25}
            />
          </mesh>
          <mesh position={[0, 0.2, 0.055]}>
            <boxGeometry args={[0.55, 0.02, 0.01]} />
            <meshStandardMaterial
              color={i === 0 ? leftEmissive : rightEmissive}
              emissive={i === 0 ? leftEmissive : rightEmissive}
              emissiveIntensity={1.05}
            />
          </mesh>
          {i === 0 && leftScreen ? (
            <group position={[0, 0.42, 0.07]}>{leftScreen}</group>
          ) : null}
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
  const wood = useMemo(() => makeWoodTexture(color), [color]);
  const leg = 0.08;
  const hx = width / 2 - 0.12;
  const hz = depth / 2 - 0.12;
  return (
    <group position={position}>
      <mesh position={[0, 0.78, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, 0.06, depth]} />
        <meshStandardMaterial
          map={wood}
          color={color}
          roughness={0.52}
          metalness={0.08}
        />
      </mesh>
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

/** Small potted plant for desks / side tables */
export function PlantPot({
  position,
  scale = 1,
}: {
  position: [number, number, number];
  scale?: number;
}) {
  return (
    <group position={position} scale={scale}>
      <mesh castShadow>
        <cylinderGeometry args={[0.12, 0.1, 0.18, 12]} />
        <meshStandardMaterial color="#5c4634" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.11, 0.11, 0.04, 12]} />
        <meshStandardMaterial color="#2a2118" />
      </mesh>
      <mesh position={[0, 0.28, 0]}>
        <sphereGeometry args={[0.16, 10, 10]} />
        <meshStandardMaterial color="#2d5a3d" roughness={0.9} />
      </mesh>
      <mesh position={[0.07, 0.36, 0.04]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial color="#3a7a4a" />
      </mesh>
      <mesh position={[-0.06, 0.34, -0.05]}>
        <sphereGeometry args={[0.09, 8, 8]} />
        <meshStandardMaterial color="#245536" />
      </mesh>
    </group>
  );
}

/** Corner planter — sits against walls, not in walking aisles */
export function TallFloorPlant({
  position,
  scale = 1,
}: {
  position: [number, number, number];
  scale?: number;
}) {
  return (
    <group position={position} scale={scale}>
      <mesh castShadow receiveShadow position={[0, 0.28, 0]}>
        <cylinderGeometry args={[0.32, 0.28, 0.56, 16]} />
        <meshStandardMaterial color="#3a3228" roughness={0.7} metalness={0.08} />
      </mesh>
      <mesh position={[0, 0.58, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.05, 16]} />
        <meshStandardMaterial color="#1e1812" />
      </mesh>
      <mesh position={[0, 0.62, 0]}>
        <cylinderGeometry args={[0.26, 0.26, 0.04, 16]} />
        <meshStandardMaterial color="#2a1c12" />
      </mesh>
      {(
        [
          [0, 1.05, 0, 0.34],
          [0.18, 0.95, 0.08, 0.22],
          [-0.16, 0.98, -0.1, 0.24],
          [0.04, 1.28, -0.06, 0.2],
          [-0.1, 1.22, 0.12, 0.18],
          [0.12, 1.18, -0.14, 0.16],
        ] as const
      ).map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]} castShadow>
          <sphereGeometry args={[r, 12, 12]} />
          <meshStandardMaterial
            color={i % 2 === 0 ? "#245536" : "#2f6a40"}
            roughness={0.9}
          />
        </mesh>
      ))}
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
  const wall = useMemo(() => {
    const tex = makeWallTexture(color);
    tex.repeat.set(Math.max(1, size[0] / 4), Math.max(1, size[1] / 3));
    return tex;
  }, [color, size]);
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial map={wall} color={color} roughness={0.86} />
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
  const fabric = useMemo(() => makeCubicleFabricTexture(), []);
  const t = 0.08;
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, height / 2, -depth / 2]} castShadow>
        <boxGeometry args={[width, height, t]} />
        <meshStandardMaterial map={fabric} color="#3d342a" roughness={0.82} />
      </mesh>
      <mesh position={[-width / 2, height / 2, 0]} castShadow>
        <boxGeometry args={[t, height, depth]} />
        <meshStandardMaterial map={fabric} color="#3d342a" roughness={0.82} />
      </mesh>
      <mesh position={[width / 2, height / 2, 0]} castShadow>
        <boxGeometry args={[t, height, depth]} />
        <meshStandardMaterial map={fabric} color="#3d342a" roughness={0.82} />
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

export function BreakTable({
  position,
  width = 1.85,
  depth = 0.95,
}: {
  position: [number, number, number];
  width?: number;
  depth?: number;
}) {
  const hx = width / 2 - 0.2;
  const hz = depth / 2 - 0.15;
  return (
    <group position={position}>
      <mesh position={[0, 0.78, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, 0.08, depth]} />
        <meshStandardMaterial color="#4a3a2c" roughness={0.55} />
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
  step = 1.6,
}: {
  rangeX?: number;
  rangeZ?: number;
  /** Larger step = fewer meshes (better on low-end GPUs). */
  step?: number;
}) {
  const tile = useMemo(() => makeFloorTileTexture(), []);
  const tiles: ReactNode[] = [];
  const size = step - 0.08;
  for (let x = -rangeX; x <= rangeX; x += step) {
    for (let z = -rangeZ; z <= rangeZ; z += step) {
      const dark =
        (Math.round(x / step) + Math.round(z / step)) % 2 === 0;
      tiles.push(
        <mesh
          key={`${x}:${z}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[x, 0.005, z]}
          receiveShadow
        >
          <planeGeometry args={[size, size]} />
          <meshStandardMaterial
            map={tile}
            color={dark ? "#2a221c" : "#363028"}
            roughness={0.92}
          />
        </mesh>,
      );
    }
  }
  return <group>{tiles}</group>;
}

export function CarpetRunner({
  position,
  size = [2.4, 4.5],
  rotationY = 0,
  color = "#5a3a2e",
}: {
  position: [number, number, number];
  size?: [number, number];
  rotationY?: number;
  color?: string;
}) {
  const carpet = useMemo(() => {
    const tex = makeCarpetTexture(color);
    tex.repeat.set(size[0] * 0.55, size[1] * 0.55);
    return tex;
  }, [color, size]);
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.014, 0]}>
        <planeGeometry args={size} />
        <meshStandardMaterial map={carpet} color={color} roughness={0.96} />
      </mesh>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.017, 0]}>
        <planeGeometry args={[size[0] * 0.86, size[1] * 0.9]} />
        <meshStandardMaterial color="#6b4a3a" roughness={0.94} />
      </mesh>
    </group>
  );
}

export function SideTable({
  position,
  rotationY = 0,
}: {
  position: [number, number, number];
  rotationY?: number;
}) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.7, 0.06, 0.55]} />
        <meshStandardMaterial color="#3a2c22" roughness={0.65} />
      </mesh>
      {(
        [
          [-0.28, 0.28],
          [0.28, 0.28],
          [-0.28, -0.2],
          [0.28, -0.2],
        ] as const
      ).map(([x, z], i) => (
        <mesh key={i} position={[x, 0.27, z]}>
          <cylinderGeometry args={[0.03, 0.03, 0.54, 8]} />
          <meshStandardMaterial color="#2a2118" />
        </mesh>
      ))}
    </group>
  );
}

export function WallCalendar({
  position,
  rotationY = 0,
}: {
  position: [number, number, number];
  rotationY?: number;
}) {
  const texture = useMemo(() => {
    const today = new Date();
    const day = today.getDate();
    const month = today.toLocaleString("en-US", { month: "long" });
    const year = today.getFullYear();
    const daysInMonth = new Date(year, today.getMonth() + 1, 0).getDate();
    const startWeekday = new Date(year, today.getMonth(), 1).getDay();

    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 640;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#f5efe0";
    ctx.fillRect(0, 0, 512, 640);
    ctx.fillStyle = "#c45c48";
    ctx.fillRect(0, 0, 512, 88);
    ctx.fillStyle = "#fff8f0";
    ctx.font = "bold 36px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${month} ${year}`, 256, 56);

    ctx.fillStyle = "#8a7664";
    ctx.font = "bold 18px system-ui, sans-serif";
    const dows = ["S", "M", "T", "W", "T", "F", "S"];
    dows.forEach((d, i) => {
      ctx.fillText(d, 48 + i * 60, 120);
    });

    ctx.font = "22px system-ui, sans-serif";
    let cell = startWeekday;
    for (let d = 1; d <= daysInMonth; d += 1) {
      const col = cell % 7;
      const row = Math.floor(cell / 7);
      const x = 48 + col * 60;
      const y = 160 + row * 52;
      if (d === day) {
        ctx.strokeStyle = "#c62828";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y - 6, 18, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "#c62828";
        ctx.font = "bold 22px system-ui, sans-serif";
      } else {
        ctx.fillStyle = "#3a2c22";
        ctx.font = "22px system-ui, sans-serif";
      }
      ctx.fillText(String(d), x, y);
      cell += 1;
    }

    // Hire note — flat, no perspective warp
    ctx.fillStyle = "#f3e6a8";
    ctx.fillRect(60, 520, 392, 90);
    ctx.strokeStyle = "#c4a060";
    ctx.lineWidth = 2;
    ctx.strokeRect(60, 520, 392, 90);
    ctx.fillStyle = "#5c3030";
    ctx.font = "bold 28px Georgia, serif";
    ctx.fillText("First day for new hires", 256, 575);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    tex.needsUpdate = true;
    return tex;
  }, []);

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh castShadow>
        <boxGeometry args={[0.95, 1.2, 0.04]} />
        <meshStandardMaterial color="#d8d0c0" roughness={0.55} />
      </mesh>
      <mesh position={[0, 0, 0.025]}>
        <planeGeometry args={[0.88, 1.12]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
    </group>
  );
}

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
      <pointLight intensity={0.35} distance={2} position={[0, 0.25, 0]} color="#ffe8b8" />
    </group>
  );
}

export function StickyNotes({
  position,
  rotationY = 0,
}: {
  position: [number, number, number];
  rotationY?: number;
}) {
  const notes = [
    { x: 0, y: 0, color: "#f3e6a8", rot: 0.05 },
    { x: 0.18, y: -0.12, color: "#f0c4c0", rot: -0.1 },
    { x: -0.14, y: -0.18, color: "#c8e0d0", rot: 0.12 },
  ] as const;
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {notes.map((n, i) => (
        <mesh key={i} position={[n.x, n.y, 0.01 * i]} rotation={[0, 0, n.rot]} castShadow>
          <boxGeometry args={[0.16, 0.16, 0.01]} />
          <meshStandardMaterial color={n.color} roughness={0.75} />
        </mesh>
      ))}
    </group>
  );
}

export function DeskClutter({
  position,
  variant = 0,
}: {
  position: [number, number, number];
  variant?: number;
}) {
  const v = variant % 3;
  return (
    <group position={position}>
      {/* Coffee mug */}
      <mesh position={[-0.42 + v * 0.05, 0.05, 0.12]} castShadow>
        <cylinderGeometry args={[0.045, 0.04, 0.09, 12]} />
        <meshStandardMaterial color={v === 0 ? "#4a6a88" : v === 1 ? "#8a5038" : "#2a4840"} />
      </mesh>
      <mesh position={[-0.42 + v * 0.05, 0.1, 0.12]}>
        <torusGeometry args={[0.048, 0.008, 8, 16]} />
        <meshStandardMaterial color="#3a3a3a" />
      </mesh>
      {/* Water bottle */}
      <mesh position={[0.55, 0.1, 0.08]} castShadow>
        <cylinderGeometry args={[0.035, 0.038, 0.2, 12]} />
        <meshStandardMaterial color="#a8d4e8" transparent opacity={0.55} roughness={0.2} />
      </mesh>
      <mesh position={[0.55, 0.22, 0.08]}>
        <cylinderGeometry args={[0.03, 0.032, 0.04, 10]} />
        <meshStandardMaterial color="#2a4840" />
      </mesh>
      {/* Desk phone */}
      <group position={[0.35, 0.02, -0.15]}>
        <mesh castShadow>
          <boxGeometry args={[0.22, 0.04, 0.16]} />
          <meshStandardMaterial color="#2a2a2a" roughness={0.5} />
        </mesh>
        <mesh position={[0.02, 0.05, 0]}>
          <boxGeometry args={[0.08, 0.04, 0.05]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
        <mesh position={[-0.06, 0.06, 0]} rotation={[0.2, 0, 0.1]}>
          <boxGeometry args={[0.06, 0.03, 0.14]} />
          <meshStandardMaterial color="#3a3a3a" />
        </mesh>
      </group>
      {/* Document tray */}
      <mesh position={[-0.55, 0.03, -0.2]} castShadow>
        <boxGeometry args={[0.28, 0.04, 0.22]} />
        <meshStandardMaterial color="#5c4634" />
      </mesh>
      <mesh position={[-0.55, 0.06, -0.2]} rotation={[-0.08, 0.05, 0]}>
        <boxGeometry args={[0.24, 0.01, 0.18]} />
        <meshStandardMaterial color="#efe6d4" />
      </mesh>
      <mesh position={[-0.55, 0.08, -0.22]} rotation={[-0.12, -0.04, 0]}>
        <boxGeometry args={[0.22, 0.01, 0.16]} />
        <meshStandardMaterial color="#e0d4bc" />
      </mesh>
      {/* Notebook + pen */}
      <mesh position={[0.15, 0.015, 0.18]} rotation={[0, 0.25, 0]} castShadow>
        <boxGeometry args={[0.18, 0.02, 0.24]} />
        <meshStandardMaterial color="#3a5a48" />
      </mesh>
      <mesh position={[0.28, 0.03, 0.12]} rotation={[0, 0.4, 0.05]}>
        <cylinderGeometry args={[0.008, 0.008, 0.14, 8]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      {/* Folder / binder stack */}
      <mesh position={[0.5, 0.04, -0.28]} rotation={[0, -0.15, 0]} castShadow>
        <boxGeometry args={[0.2, 0.06, 0.26]} />
        <meshStandardMaterial color="#c45c48" />
      </mesh>
      <mesh position={[0.52, 0.09, -0.26]} rotation={[0, 0.1, 0]}>
        <boxGeometry args={[0.18, 0.05, 0.24]} />
        <meshStandardMaterial color="#4a6a88" />
      </mesh>
      <StickyNotes position={[-0.7, 0.02, 0.05]} />
    </group>
  );
}

/** Desk post-it with workstation login — canvas texture (no HTML overlay). */
export function LoginPostIt({
  position,
  rotationY = 0,
}: {
  position: [number, number, number];
  rotationY?: number;
}) {
  const note = useMemo(
    () => makePostItTexture(["login", "day1.analyst", "FirstDay!"]),
    [],
  );
  return (
    <group position={position} rotation={[0, rotationY, 0.12]}>
      <mesh castShadow rotation={[-Math.PI / 2.35, 0.05, 0.12]}>
        <boxGeometry args={[0.24, 0.24, 0.01]} />
        <meshStandardMaterial map={note} roughness={0.8} />
      </mesh>
    </group>
  );
}

export function AccentPoster({
  position,
  rotationY = 0,
  color = "#2a4840",
}: {
  position: [number, number, number];
  rotationY?: number;
  color?: string;
}) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh castShadow>
        <boxGeometry args={[0.7, 0.95, 0.04]} />
        <meshStandardMaterial color="#2a2118" />
      </mesh>
      <mesh position={[0, 0, 0.025]}>
        <boxGeometry args={[0.58, 0.78, 0.01]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.15} />
      </mesh>
    </group>
  );
}
