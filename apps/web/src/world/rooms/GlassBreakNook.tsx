/**
 * Glass break corner — docked to east + north walls of the enlarged SOC.
 * Keep a clear west-facing door on the aisle path (x corridor free of desks).
 */
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { Figure } from "../Figure.js";
import { NameTag } from "../NameTag.js";
import {
  BreakTable,
  CoffeePot,
  Fridge,
  OfficeChair,
  PlantPot,
  StickyNotes,
} from "../props.js";
import {
  EmployeeOfMonth,
  FramedCertificate,
  MeshLabel,
} from "../officeExtras.js";
import type { Aabb } from "../PlayerController.js";

function GlassPane({
  position,
  args,
  opacity = 0.2,
  cheap = false,
}: {
  position: [number, number, number];
  args: [number, number, number];
  opacity?: number;
  cheap?: boolean;
}) {
  if (cheap) {
    return (
      <mesh position={position}>
        <boxGeometry args={args} />
        <meshBasicMaterial
          color="#c8d8e0"
          transparent
          opacity={opacity * 0.7}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    );
  }
  return (
    <mesh position={position} castShadow>
      <boxGeometry args={args} />
      <meshPhysicalMaterial
        color="#e8f4f8"
        transparent
        opacity={opacity}
        roughness={0.05}
        metalness={0.02}
        transmission={0.55}
        thickness={0.08}
        ior={1.45}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/** NE corner — leave ~1.1m aisle east of player cubicle. */
export const BREAK_NOOK = {
  cornerX: 6.6,
  cornerZ: -3.2,
  wallX: 10.7,
  wallZ: -7.2,
  doorZ: -5.2,
} as const;

export const BREAK_NOOK_ORIGIN: [number, number, number] = [
  (BREAK_NOOK.cornerX + BREAK_NOOK.wallX) / 2,
  0,
  (BREAK_NOOK.cornerZ + BREAK_NOOK.wallZ) / 2,
];

export function breakNookColliders(doorOpen: boolean): Aabb[] {
  const { cornerX, cornerZ, wallX, wallZ, doorZ } = BREAK_NOOK;
  const halfDoor = 0.75;
  const walls: Aabb[] = [
    {
      minX: cornerX - 0.08,
      maxX: cornerX + 0.08,
      minZ: wallZ,
      maxZ: doorZ - halfDoor,
    },
    {
      minX: cornerX - 0.08,
      maxX: cornerX + 0.08,
      minZ: doorZ + halfDoor,
      maxZ: cornerZ,
    },
    {
      minX: cornerX,
      maxX: wallX,
      minZ: cornerZ - 0.08,
      maxZ: cornerZ + 0.08,
    },
    { minX: 7.4, maxX: 9.2, minZ: -5.2, maxZ: -4.0 },
    { minX: 8.8, maxX: 10.3, minZ: -7.0, maxZ: -5.9 },
    { minX: 6.8, maxX: 8.0, minZ: -7.0, maxZ: -6.0 },
  ];
  if (!doorOpen) {
    walls.push({
      minX: cornerX - 0.08,
      maxX: cornerX + 0.08,
      minZ: doorZ - halfDoor,
      maxZ: doorZ + halfDoor,
    });
  }
  return walls;
}

export function GlassBreakNook({
  doorOpen,
  cheapGlass = false,
}: {
  doorOpen: boolean;
  cheapGlass?: boolean;
}) {
  const door = useRef<THREE.Group>(null);
  const angle = useRef(0);
  const { cornerX, cornerZ, wallX, wallZ, doorZ } = BREAK_NOOK;
  const halfDoor = 0.75;

  const westLen = cornerZ - wallZ;
  const southLen = wallX - cornerX;
  const westMidZ = (cornerZ + wallZ) / 2;
  const southMidX = (cornerX + wallX) / 2;

  useFrame((_, delta) => {
    if (!door.current) return;
    const target = doorOpen ? -Math.PI / 2.05 : 0;
    angle.current = THREE.MathUtils.damp(angle.current, target, 6, delta);
    door.current.rotation.y = angle.current;
  });

  return (
    <group>
      <GlassPane
        cheap={cheapGlass}
        position={[cornerX, 1.4, (wallZ + doorZ - halfDoor) / 2]}
        args={[0.05, 2.8, Math.max(0.25, doorZ - halfDoor - wallZ)]}
      />
      <GlassPane
        cheap={cheapGlass}
        position={[cornerX, 1.4, (cornerZ + doorZ + halfDoor) / 2]}
        args={[0.05, 2.8, Math.max(0.25, cornerZ - (doorZ + halfDoor))]}
      />
      <GlassPane
        cheap={cheapGlass}
        position={[southMidX, 1.4, cornerZ]}
        args={[southLen, 2.8, 0.05]}
      />

      <mesh position={[cornerX, 1.4, wallZ]}>
        <boxGeometry args={[0.1, 2.8, 0.1]} />
        <meshStandardMaterial color="#7a8a90" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[cornerX, 1.4, cornerZ]}>
        <boxGeometry args={[0.1, 2.8, 0.1]} />
        <meshStandardMaterial color="#7a8a90" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[wallX, 1.4, cornerZ]}>
        <boxGeometry args={[0.1, 2.8, 0.1]} />
        <meshStandardMaterial color="#7a8a90" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[cornerX, 2.82, westMidZ]}>
        <boxGeometry args={[0.12, 0.1, westLen]} />
        <meshStandardMaterial color="#7a8a90" metalness={0.55} />
      </mesh>
      <mesh position={[southMidX, 2.82, cornerZ]}>
        <boxGeometry args={[southLen, 0.1, 0.12]} />
        <meshStandardMaterial color="#7a8a90" metalness={0.55} />
      </mesh>

      {/* Door jambs + sill */}
      <mesh position={[cornerX, 1.4, doorZ - halfDoor]}>
        <boxGeometry args={[0.12, 2.8, 0.1]} />
        <meshStandardMaterial color="#6a7a80" metalness={0.55} roughness={0.35} />
      </mesh>
      <mesh position={[cornerX, 1.4, doorZ + halfDoor]}>
        <boxGeometry args={[0.12, 2.8, 0.1]} />
        <meshStandardMaterial color="#6a7a80" metalness={0.55} roughness={0.35} />
      </mesh>
      <mesh position={[cornerX, 2.75, doorZ]}>
        <boxGeometry args={[0.14, 0.12, halfDoor * 2 + 0.12]} />
        <meshStandardMaterial color="#6a7a80" metalness={0.55} roughness={0.35} />
      </mesh>
      <mesh position={[cornerX - 0.02, 0.04, doorZ]} receiveShadow>
        <boxGeometry args={[0.35, 0.06, halfDoor * 2 + 0.2]} />
        <meshStandardMaterial color="#5a5048" roughness={0.75} />
      </mesh>

      <group ref={door} position={[cornerX, 0, doorZ - halfDoor]}>
        <GlassPane
          cheap={cheapGlass}
          position={[0, 1.35, halfDoor]}
          args={[0.04, 2.55, halfDoor * 2 - 0.08]}
          opacity={0.34}
        />
        {/* Frame rails only — keep glass visible */}
        <mesh position={[0.01, 1.35, 0.06]}>
          <boxGeometry args={[0.06, 2.55, 0.08]} />
          <meshStandardMaterial color="#6a7a80" metalness={0.5} roughness={0.35} />
        </mesh>
        <mesh position={[0.01, 1.35, halfDoor * 2 - 0.06]}>
          <boxGeometry args={[0.06, 2.55, 0.08]} />
          <meshStandardMaterial color="#6a7a80" metalness={0.5} roughness={0.35} />
        </mesh>
        <mesh position={[0.01, 2.58, halfDoor]}>
          <boxGeometry args={[0.06, 0.08, halfDoor * 2]} />
          <meshStandardMaterial color="#6a7a80" metalness={0.5} roughness={0.35} />
        </mesh>
        <mesh position={[0.01, 0.14, halfDoor]}>
          <boxGeometry args={[0.06, 0.08, halfDoor * 2]} />
          <meshStandardMaterial color="#6a7a80" metalness={0.5} roughness={0.35} />
        </mesh>
        <mesh position={[0.01, 1.35, halfDoor]}>
          <boxGeometry args={[0.05, 0.06, halfDoor * 2]} />
          <meshStandardMaterial color="#7a8a90" metalness={0.45} />
        </mesh>
        <mesh position={[0.06, 1.35, halfDoor + 0.45]}>
          <boxGeometry args={[0.05, 0.32, 0.04]} />
          <meshStandardMaterial color="#c4a060" metalness={0.6} roughness={0.3} />
        </mesh>
      </group>

      <mesh position={[cornerX - 0.05, 2.48, doorZ]}>
        <boxGeometry args={[0.06, 0.2, 0.62]} />
        <meshStandardMaterial color="#1a3028" />
      </mesh>
      <MeshLabel
        text="BREAK ROOM"
        position={[cornerX - 0.09, 2.48, doorZ]}
        rotationY={-Math.PI / 2}
        width={0.55}
        height={0.13}
      />

      {/* Plaques flush on outer west glass (local +Z faces aisle after -90° Y) */}
      <EmployeeOfMonth
        name="Priya"
        position={[cornerX - 0.052, 1.55, doorZ + 1.45]}
        rotationY={-Math.PI / 2}
      />
      <FramedCertificate
        position={[cornerX - 0.048, 1.55, doorZ - 1.35]}
        rotationY={-Math.PI / 2}
        title="TEAM AWARD"
        accent="#4fd0c8"
      />

      <BreakTable position={[8.4, 0, -4.8]} width={2.0} depth={1.0} />
      <OfficeChair position={[7.8, 0, -4.05]} rotationY={Math.PI} />
      <OfficeChair position={[9.0, 0, -5.5]} />
      <OfficeChair position={[7.7, 0, -5.5]} rotationY={0.4} />

      <mesh position={[7.2, 0.95, -6.5]} castShadow>
        <boxGeometry args={[1.1, 0.9, 0.5]} />
        <meshStandardMaterial color="#3a2c22" roughness={0.7} />
      </mesh>
      <CoffeePot position={[7.2, 1.42, -6.5]} />
      <MeshLabel text="COFFEE" position={[7.2, 1.72, -6.2]} width={0.38} height={0.1} />

      <Fridge position={[9.9, 0.85, -6.4]} />
      <StickyNotes position={[10.5, 1.55, -4.4]} rotationY={-Math.PI / 2} />
      <StickyNotes position={[10.5, 1.7, -5.5]} rotationY={-Math.PI / 2} />
      {/* Desk plant on the break table — not a free floor shrub */}
      <PlantPot position={[8.9, 0.86, -4.5]} scale={0.95} />

      <Figure
        position={[7.6, 0, -6.15]}
        rotationY={0.5}
        primary="#6a7a5c"
        secondary="#2a3224"
        accent="#e8b84a"
        hair="#3a2818"
      />
      <NameTag name="Jules" position={[7.6, 2.2, -6.15]} visible={!cheapGlass} />

      <pointLight intensity={0.9} distance={6} position={[8.4, 2.3, -5.2]} color="#ffe8b8" />
    </group>
  );
}

export const JULES_LINES = [
  "Oh — you want some too? I'll make you a cup. Cream's in the fridge.",
  "Hey, is it your first day? Have fun out there. I love this job.",
  "Welcome to the glass box. Best five minutes of any shift.",
  "Grab a seat if you need a breather. Desk will still be there.",
  "First day for new hires, right? You've got this. Enjoy the coffee.",
  "Oh hey! Pour yourself one — or I can. Day one's better caffeinated.",
] as const;

export function nextJulesLine(index: number): { line: string; nextIndex: number } {
  const line = JULES_LINES[index % JULES_LINES.length]!;
  return { line, nextIndex: (index + 1) % JULES_LINES.length };
}
