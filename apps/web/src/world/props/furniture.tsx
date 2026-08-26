/**
 * Office furniture — desks, chairs, tables, partitions, cabinets, lockers.
 */
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { makeCubicleFabricTexture, makeWoodTexture } from "../textures.js";
import { MeshLabel } from "./signage.js";

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

export function MonitorArmDesk({
  position,
  rotationY = 0,
}: {
  position: [number, number, number];
  rotationY?: number;
}) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Desk against wall */}
      <mesh position={[0, 0.78, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.9, 0.06, 0.85]} />
        <meshStandardMaterial color="#2c241c" roughness={0.5} />
      </mesh>
      {(
        [
          [-0.8, 0.32],
          [0.8, 0.32],
          [-0.8, -0.28],
          [0.8, -0.28],
        ] as const
      ).map(([x, z], i) => (
        <mesh key={i} position={[x, 0.39, z]}>
          <boxGeometry args={[0.07, 0.78, 0.07]} />
          <meshStandardMaterial color="#16110e" />
        </mesh>
      ))}
      {/* Clamp + articulated arm into desk */}
      <mesh position={[0, 0.86, -0.28]}>
        <boxGeometry args={[0.14, 0.08, 0.18]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.5} />
      </mesh>
      <mesh position={[0, 1.15, -0.28]} rotation={[0.4, 0, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.55, 10]} />
        <meshStandardMaterial color="#4a4a4a" metalness={0.55} />
      </mesh>
      <mesh position={[0, 1.4, -0.05]} rotation={[1.1, 0, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.4, 10]} />
        <meshStandardMaterial color="#4a4a4a" metalness={0.55} />
      </mesh>
      {/* Dual screens on arm head */}
      {([-0.38, 0.38] as const).map((x, i) => (
        <group key={x} position={[x, 1.45, 0.12]}>
          <mesh castShadow>
            <boxGeometry args={[0.7, 0.45, 0.05]} />
            <meshStandardMaterial color="#0a0a0a" />
          </mesh>
          <mesh position={[0, 0, 0.03]}>
            <boxGeometry args={[0.62, 0.38, 0.02]} />
            <meshStandardMaterial
              color="#050a0c"
              emissive={i === 0 ? "#ff6b4a" : "#4fd0c8"}
              emissiveIntensity={0.55}
            />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.84, 0.15]}>
        <boxGeometry args={[0.45, 0.02, 0.16]} />
        <meshStandardMaterial color="#141414" />
      </mesh>
    </group>
  );
}

export function CoatRack({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.035, 0.045, 1.8, 10]} />
        <meshStandardMaterial color="#4a3a2c" metalness={0.3} />
      </mesh>
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.32, 0.32, 0.05, 16]} />
        <meshStandardMaterial color="#2a2118" />
      </mesh>
      {([-0.25, -0.08, 0.08, 0.25] as const).map((x, i) => (
        <mesh key={i} position={[x, 1.65, 0]} rotation={[0, 0, x * 0.9]}>
          <cylinderGeometry args={[0.015, 0.015, 0.32, 8]} />
          <meshStandardMaterial color="#5c4634" />
        </mesh>
      ))}
      {/* Jacket */}
      <mesh position={[-0.18, 1.25, 0.06]} rotation={[0.15, 0.25, 0.08]} castShadow>
        <boxGeometry args={[0.32, 0.55, 0.1]} />
        <meshStandardMaterial color="#2a3a48" roughness={0.85} />
      </mesh>
      {/* Second jacket */}
      <mesh position={[0.2, 1.2, 0.04]} rotation={[0.1, -0.2, -0.05]} castShadow>
        <boxGeometry args={[0.28, 0.5, 0.09]} />
        <meshStandardMaterial color="#5c3a2c" roughness={0.8} />
      </mesh>
      {/* Backpack on base */}
      <mesh position={[0.28, 0.35, 0.1]} castShadow>
        <boxGeometry args={[0.28, 0.4, 0.18]} />
        <meshStandardMaterial color="#3a5040" />
      </mesh>
      <mesh position={[0.28, 0.5, 0.2]}>
        <boxGeometry args={[0.22, 0.12, 0.04]} />
        <meshStandardMaterial color="#2a3a30" />
      </mesh>
      {/* Umbrella leaning */}
      <mesh position={[-0.3, 0.7, 0.15]} rotation={[0.35, 0, 0.2]} castShadow>
        <cylinderGeometry args={[0.02, 0.02, 1.1, 8]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[-0.38, 1.25, 0.32]} rotation={[0.35, 0, 0.2]}>
        <sphereGeometry args={[0.1, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#c45c48" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/**
 * Banked lockers: one carcass, 3 columns x 3 tiers of inset doors so the
 * seams, vents and handles read as separate compartments up close.
 */
export function PersonalLockers({
  position,
  rotationY = 0,
  columns = 3,
  tiers = 3,
}: {
  position: [number, number, number];
  rotationY?: number;
  columns?: number;
  tiers?: number;
}) {
  const bankW = 0.62 * columns;
  const bankH = 1.9;
  const bankD = 0.5;
  const doorW = 0.62 - 0.06;
  const doorH = bankH / tiers - 0.06;
  const faceZ = bankD / 2;

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Carcass and recessed dark face; doors sit proud of it */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[bankW, bankH, bankD]} />
        <meshStandardMaterial color="#39424b" metalness={0.25} roughness={0.55} />
      </mesh>
      {/* Proud of the carcass face, otherwise the two surfaces z-fight */}
      <mesh position={[0, 0, faceZ + 0.008]}>
        <boxGeometry args={[bankW - 0.04, bankH - 0.04, 0.02]} />
        <meshStandardMaterial color="#12181d" roughness={0.85} />
      </mesh>
      {/* Sloped top cap and kick plate */}
      <mesh position={[0, bankH / 2 + 0.03, 0]} castShadow>
        <boxGeometry args={[bankW + 0.04, 0.06, bankD + 0.03]} />
        <meshStandardMaterial color="#2e363e" metalness={0.3} roughness={0.5} />
      </mesh>
      <mesh position={[0, -bankH / 2 + 0.06, faceZ - 0.02]}>
        <boxGeometry args={[bankW, 0.12, 0.06]} />
        <meshStandardMaterial color="#252c33" metalness={0.2} roughness={0.6} />
      </mesh>

      {Array.from({ length: columns }, (_, col) =>
        Array.from({ length: tiers }, (_, tier) => {
          const x = (col - (columns - 1) / 2) * 0.62;
          const y = (tier - (tiers - 1) / 2) * (bankH / tiers);
          const unit = col * tiers + (tiers - tier);
          return (
            <group key={`${String(col)}-${String(tier)}`} position={[x, y, faceZ]}>
              <mesh castShadow>
                <boxGeometry args={[doorW, doorH, 0.035]} />
                <meshStandardMaterial
                  color={tier === 1 ? "#495563" : "#414c58"}
                  metalness={0.3}
                  roughness={0.5}
                />
              </mesh>
              {/* Border bevel */}
              <mesh position={[0, 0, 0.02]}>
                <boxGeometry args={[doorW - 0.07, doorH - 0.07, 0.008]} />
                <meshStandardMaterial color="#4e5a68" metalness={0.28} roughness={0.48} />
              </mesh>
              {/* Vent slots */}
              {([0.06, 0.02, -0.02] as const).map((dy) => (
                <mesh key={dy} position={[0, doorH / 2 - 0.09 - dy, 0.026]}>
                  <boxGeometry args={[doorW * 0.5, 0.012, 0.01]} />
                  <meshStandardMaterial color="#0e1317" />
                </mesh>
              ))}
              {/* Latch handle and number plate */}
              <mesh position={[doorW / 2 - 0.07, -0.02, 0.03]}>
                <boxGeometry args={[0.035, 0.11, 0.03]} />
                <meshStandardMaterial color="#c4a060" metalness={0.6} roughness={0.3} />
              </mesh>
              <mesh position={[-doorW / 2 + 0.1, -doorH / 2 + 0.09, 0.026]}>
                <boxGeometry args={[0.11, 0.055, 0.01]} />
                <meshStandardMaterial
                  color="#9fe8e0"
                  emissive="#4fd0c8"
                  emissiveIntensity={0.18}
                />
              </mesh>
              {unit === 4 ? (
                <mesh position={[0, -doorH / 2 + 0.02, 0.03]} rotation={[0, 0, 0.2]}>
                  <boxGeometry args={[0.08, 0.05, 0.02]} />
                  <meshStandardMaterial color="#e8b84a" />
                </mesh>
              ) : null}
            </group>
          );
        }),
      )}
    </group>
  );
}

/** Coiled patch leads, sitting on the drawer floor. */
function CableTrayContents() {
  const coils = [
    { x: -0.3, z: -0.06, color: "#3a6a8a" },
    { x: -0.02, z: 0.04, color: "#7dba6a" },
    { x: 0.27, z: -0.05, color: "#c45c48" },
  ] as const;
  return (
    <>
      {coils.map(({ x, z, color }) => (
        <group key={color} position={[x, 0.055, z]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
            <torusGeometry args={[0.1, 0.022, 8, 18]} />
            <meshStandardMaterial color={color} roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.03, 0]} rotation={[Math.PI / 2, 0, 0.5]}>
            <torusGeometry args={[0.075, 0.02, 8, 16]} />
            <meshStandardMaterial color={color} roughness={0.6} />
          </mesh>
        </group>
      ))}
      {/* Velcro-tied bundle at the back */}
      <mesh position={[0.06, 0.06, -0.19]} rotation={[0, 0.3, 0]} castShadow>
        <cylinderGeometry args={[0.045, 0.045, 0.3, 10]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.7} />
      </mesh>
    </>
  );
}

/** Dongles, bricks and a coiled power lead. */
function AdapterTrayContents() {
  const bricks = [
    { x: -0.3, color: "#e8e4dc" },
    { x: -0.13, color: "#2f2f33" },
    { x: 0.04, color: "#e8e4dc" },
  ] as const;
  return (
    <>
      {bricks.map(({ x, color }) => (
        <group key={x} position={[x, 0.05, -0.02]}>
          <mesh castShadow>
            <boxGeometry args={[0.13, 0.07, 0.16]} />
            <meshStandardMaterial color={color} roughness={0.45} />
          </mesh>
          <mesh position={[0, 0.045, 0.03]}>
            <boxGeometry args={[0.05, 0.02, 0.03]} />
            <meshStandardMaterial color="#8a8680" metalness={0.55} />
          </mesh>
        </group>
      ))}
      {/* USB-C / HDMI dongles in a parts bin */}
      <mesh position={[0.27, 0.045, -0.02]} castShadow>
        <boxGeometry args={[0.22, 0.06, 0.2]} />
        <meshStandardMaterial color="#3a4a44" roughness={0.6} />
      </mesh>
      {([-0.06, 0, 0.06] as const).map((dx) => (
        <mesh key={dx} position={[0.27 + dx, 0.085, -0.02]} castShadow>
          <boxGeometry args={[0.035, 0.02, 0.09]} />
          <meshStandardMaterial color="#c8c4bc" metalness={0.5} roughness={0.35} />
        </mesh>
      ))}
      <mesh position={[-0.12, 0.055, 0.16]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.08, 0.018, 8, 16]} />
        <meshStandardMaterial color="#1f1f22" roughness={0.65} />
      </mesh>
    </>
  );
}

const CABINET = { w: 1.1, h: 1.55, d: 0.55 } as const;

/**
 * Two-drawer parts cabinet. Interacting slides the upper drawer out on its
 * runners, carrying a tray whose contents match the drawer label.
 */
export function StorageCabinet({
  position,
  rotationY = 0,
  label,
  open = false,
}: {
  position: [number, number, number];
  rotationY?: number;
  label: string;
  open?: boolean;
}) {
  const drawer = useRef<THREE.Group>(null);
  const travel = useRef(0);
  const faceZ = CABINET.d / 2;

  useFrame((_, delta) => {
    if (!drawer.current) return;
    travel.current = THREE.MathUtils.damp(travel.current, open ? 0.4 : 0, 7, delta);
    drawer.current.position.z = faceZ - 0.02 + travel.current;
  });

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Carcass with a recessed opening for the drawer to sit in */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[CABINET.w, CABINET.h, CABINET.d]} />
        <meshStandardMaterial color="#3a342c" roughness={0.7} />
      </mesh>
      {/* Dark mouth just proud of the face, so pulling the drawer reveals a hole */}
      <mesh position={[0, -0.06, faceZ + 0.006]}>
        <boxGeometry args={[CABINET.w - 0.08, 0.5, 0.02]} />
        <meshStandardMaterial color="#14110d" roughness={0.9} />
      </mesh>
      {/* Plinth + top cap read as separate pieces of sheet metal */}
      <mesh position={[0, -CABINET.h / 2 + 0.05, 0.01]}>
        <boxGeometry args={[CABINET.w - 0.06, 0.1, CABINET.d - 0.04]} />
        <meshStandardMaterial color="#2a241c" roughness={0.75} />
      </mesh>
      <mesh position={[0, CABINET.h / 2 + 0.015, 0]}>
        <boxGeometry args={[CABINET.w + 0.05, 0.03, CABINET.d + 0.04]} />
        <meshStandardMaterial color="#2f2a22" metalness={0.25} roughness={0.6} />
      </mesh>

      {/* Fixed lower drawer front */}
      <mesh position={[0, -0.52, faceZ + 0.01]} castShadow>
        <boxGeometry args={[CABINET.w - 0.05, 0.42, 0.04]} />
        <meshStandardMaterial color="#443c33" roughness={0.65} />
      </mesh>
      <mesh position={[0, -0.52, faceZ + 0.045]}>
        <boxGeometry args={[0.3, 0.045, 0.03]} />
        <meshStandardMaterial color="#8a8680" metalness={0.55} roughness={0.35} />
      </mesh>

      {/* Label plate stays on the carcass, above both drawers */}
      <mesh position={[0, 0.58, faceZ + 0.012]}>
        <boxGeometry args={[0.72, 0.2, 0.025]} />
        <meshStandardMaterial color="#14241e" />
      </mesh>
      <MeshLabel text={label} position={[0, 0.58, faceZ + 0.03]} width={0.65} height={0.14} />

      {/* Sliding upper drawer: front, tray box, runners, contents */}
      <group ref={drawer} position={[0, -0.06, faceZ - 0.02]}>
        <mesh position={[0, 0, 0.13]} castShadow>
          <boxGeometry args={[CABINET.w - 0.05, 0.44, 0.04]} />
          <meshStandardMaterial color="#4a423a" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0, 0.165]}>
          <boxGeometry args={[0.3, 0.045, 0.03]} />
          <meshStandardMaterial color="#c4a060" metalness={0.6} roughness={0.3} />
        </mesh>
        {/* Tray: floor plus four low walls so items rest inside it */}
        <mesh position={[0, -0.19, -0.11]} receiveShadow>
          <boxGeometry args={[CABINET.w - 0.14, 0.03, 0.44]} />
          <meshStandardMaterial color="#5a5148" roughness={0.65} />
        </mesh>
        {([-1, 1] as const).map((side) => (
          <mesh key={side} position={[side * ((CABINET.w - 0.14) / 2), -0.11, -0.11]}>
            <boxGeometry args={[0.025, 0.16, 0.44]} />
            <meshStandardMaterial color="#4e463d" roughness={0.65} />
          </mesh>
        ))}
        <mesh position={[0, -0.11, -0.33]}>
          <boxGeometry args={[CABINET.w - 0.14, 0.16, 0.025]} />
          <meshStandardMaterial color="#4e463d" roughness={0.65} />
        </mesh>
        {/* Divider rail keeps the two halves of the drawer legible */}
        <mesh position={[0.16, -0.13, -0.11]}>
          <boxGeometry args={[0.02, 0.1, 0.42]} />
          <meshStandardMaterial color="#453e36" roughness={0.7} />
        </mesh>
        <group position={[0, -0.175, -0.11]}>
          {label === "ADAPTERS" ? <AdapterTrayContents /> : <CableTrayContents />}
        </group>
      </group>
    </group>
  );
}

export function TrashBin({
  position,
  recycling = false,
}: {
  position: [number, number, number];
  recycling?: boolean;
}) {
  const color = recycling ? "#3a6a48" : "#3a3a3a";
  return (
    <group position={position}>
      <mesh castShadow receiveShadow position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.2, 0.18, 0.7, 14]} />
        <meshStandardMaterial color={color} roughness={0.65} />
      </mesh>
      <mesh position={[0, 0.72, 0]}>
        <torusGeometry args={[0.2, 0.025, 8, 20]} />
        <meshStandardMaterial color={recycling ? "#4a8a58" : "#2a2a2a"} />
      </mesh>
      {recycling ? (
        <mesh position={[0, 0.4, 0.19]}>
          <boxGeometry args={[0.12, 0.12, 0.02]} />
          <meshStandardMaterial color="#7dba6a" emissive="#7dba6a" emissiveIntensity={0.2} />
        </mesh>
      ) : null}
    </group>
  );
}
