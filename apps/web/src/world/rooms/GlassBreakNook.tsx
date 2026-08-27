/**
 * Glass break corner — docked to east + north walls of the enlarged SOC.
 * Keep a clear west-facing door on the aisle path (x corridor free of desks).
 */
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { RefObject } from "react";
import * as THREE from "three";
import { Figure } from "../Figure.js";
import { NameTag } from "../NameTag.js";
import { DustMotes, VentPapers } from "../props/atmosphere.js";
import {
  EmployeeOfMonth,
  FramedCertificate,
  PlantPot,
  TallFloorPlant,
  WallArt,
} from "../props/decor.js";
import { BreakTable, OfficeChair } from "../props/furniture.js";
import { CoffeePot, Fridge, SnackBasket } from "../props/kitchen.js";
import { MeshLabel, StickyNotes } from "../props/signage.js";
import type { Aabb } from "../collision.js";

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

/**
 * NE corner. The glass sits far enough east to leave a walkable lane past the
 * player cubicle, and runs well south of the desk row so the lounge is not
 * cramped around the table.
 */
export const BREAK_NOOK = {
  cornerX: 6.9,
  cornerZ: -1.35,
  wallX: 10.75,
  wallZ: -7.2,
  doorZ: -5.2,
} as const;

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
    /** Lounge table */
    { minX: 7.6, maxX: 9.6, minZ: -4.6, maxZ: -3.4 },
    /** Fridge */
    { minX: 9.85, maxX: 10.75, minZ: -7.25, maxZ: -6.45 },
    /** Coffee counter along the north wall */
    { minX: 6.9, maxX: 9.4, minZ: -7.25, maxZ: -6.55 },
    /** Soft seating bench on the east wall */
    { minX: 10.0, maxX: 10.75, minZ: -4.35, maxZ: -2.35 },
    /** Corner planter by the glass */
    { minX: 6.97, maxX: 7.73, minZ: -2.42, maxZ: -1.68 },
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
  animated = true,
  lookAtRef,
  highlightJules = false,
}: {
  doorOpen: boolean;
  cheapGlass?: boolean;
  animated?: boolean;
  lookAtRef?: RefObject<[number, number, number]>;
  highlightJules?: boolean;
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

      {/* Lounge sits mid-room now that the glass reaches further south */}
      <BreakTable position={[8.6, 0, -4.0]} width={2.0} depth={1.15} />
      <OfficeChair position={[7.85, 0, -3.1]} rotationY={Math.PI} />
      <OfficeChair position={[9.35, 0, -3.1]} rotationY={Math.PI - 0.25} />
      <OfficeChair position={[7.85, 0, -4.9]} rotationY={0.2} />
      <OfficeChair position={[9.35, 0, -4.9]} rotationY={-0.2} />

      {/* Counter run flush against the north wall */}
      <mesh position={[8.15, 0.45, -6.92]} castShadow receiveShadow>
        <boxGeometry args={[2.3, 0.9, 0.6]} />
        <meshStandardMaterial color="#3a2c22" roughness={0.7} />
      </mesh>
      <mesh position={[8.15, 0.92, -6.92]} receiveShadow>
        <boxGeometry args={[2.4, 0.05, 0.66]} />
        <meshStandardMaterial color="#5a4a3a" roughness={0.5} />
      </mesh>
      <mesh position={[8.15, 0.5, -6.6]}>
        <boxGeometry args={[2.2, 0.7, 0.03]} />
        <meshStandardMaterial color="#463629" roughness={0.65} />
      </mesh>
      <CoffeePot position={[7.45, 1.09, -6.87]} />
      <SnackBasket position={[8.85, 0.945, -6.72]} />
      <VentPapers animated={animated} position={[8.4, 0.96, -6.68]} />
      {/* Mug shelf on the wall above the counter */}
      <mesh position={[8.15, 1.62, -7.11]} castShadow>
        <boxGeometry args={[2.0, 0.05, 0.28]} />
        <meshStandardMaterial color="#4a3a2c" roughness={0.6} />
      </mesh>
      {([-0.6, -0.25, 0.1, 0.45] as const).map((dx) => (
        <mesh key={dx} position={[8.15 + dx, 1.695, -7.11]} castShadow>
          <cylinderGeometry args={[0.05, 0.045, 0.1, 10]} />
          <meshStandardMaterial color={dx > 0 ? "#4a6a88" : "#8a5038"} roughness={0.5} />
        </mesh>
      ))}
      <MeshLabel text="COFFEE" position={[8.15, 2.05, -7.23]} width={0.45} height={0.11} />

      <Fridge position={[10.3, 0.85, -6.85]} />

      {/* Soft bench on the east wall uses the new depth */}
      <mesh position={[10.35, 0.22, -3.35]} castShadow receiveShadow>
        <boxGeometry args={[0.7, 0.44, 1.9]} />
        <meshStandardMaterial color="#3f5450" roughness={0.85} />
      </mesh>
      <mesh position={[10.6, 0.62, -3.35]} castShadow>
        <boxGeometry args={[0.2, 0.5, 1.9]} />
        <meshStandardMaterial color="#48605b" roughness={0.85} />
      </mesh>
      {([-0.55, 0.55] as const).map((dz) => (
        <mesh key={dz} position={[10.3, 0.5, -3.35 + dz]} castShadow>
          <boxGeometry args={[0.34, 0.14, 0.34]} />
          <meshStandardMaterial color="#e8b84a" roughness={0.8} />
        </mesh>
      ))}

      <StickyNotes position={[10.72, 1.75, -5.3]} rotationY={-Math.PI / 2} />
      <WallArt
        position={[10.72, 1.75, -2.5]}
        rotationY={-Math.PI / 2}
        variant={1}
        width={0.9}
        height={0.7}
      />
      {/* Desk plant on the break table — not a free floor shrub */}
      <PlantPot position={[8.6, 0.86, -4.0]} scale={0.95} />
      <TallFloorPlant position={[7.35, 0, -2.05]} scale={0.9} />

      <Figure
        activity="talking"
        animated={animated}
        {...(lookAtRef ? { lookAtRef } : {})}
        position={[7.6, 0, -6.05]}
        rotationY={0.5}
        primary="#6a7a5c"
        secondary="#2a3224"
        accent="#e8b84a"
        hair="#3a2818"
        seed={4}
      />
      <NameTag
        name="Jules"
        role="Coworker"
        position={[7.6, 2.2, -6.05]}
        target={highlightJules}
        visible={highlightJules}
      />

      {animated ? (
        <DustMotes
          animated={animated}
          count={28}
          depth={3.6}
          height={2.2}
          position={[8.2, 1.65, -4.5]}
          width={3.2}
        />
      ) : null}
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
  const line = JULES_LINES[index % JULES_LINES.length] ?? JULES_LINES[0];
  return { line, nextIndex: (index + 1) % JULES_LINES.length };
}
