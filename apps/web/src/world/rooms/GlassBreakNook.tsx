/**
 * Glass break corner — docked to the east + south walls of the SOC, beside the
 * entry and out of the arrival shot. The door faces west onto the entry aisle.
 */
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { RefObject } from "react";
import type { CoffeeStage } from "@sim/schemas";
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
import {
  BreakTableSupplies,
  CoffeeCounterSupplies,
} from "../props/WorkplaceDetails.js";
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
 * SE corner. The north glass sits well south of the desk rows, leaving a
 * walkable lane in front of them, and the lounge keeps room around its table.
 */
export const BREAK_NOOK = {
  cornerX: 6.9,
  cornerZ: 1.35,
  wallX: 10.75,
  wallZ: 7.2,
  doorZ: 5.2,
} as const;

/** True for floor points inside the break-room glass, `margin` metres in. */
export function insideBreakNook(x: number, z: number, margin = 0): boolean {
  return (
    x > BREAK_NOOK.cornerX + margin &&
    z > BREAK_NOOK.cornerZ + margin &&
    z < BREAK_NOOK.wallZ
  );
}

export function breakNookColliders(doorOpen: boolean): Aabb[] {
  const { cornerX, cornerZ, wallX, wallZ, doorZ } = BREAK_NOOK;
  const halfDoor = 0.75;
  const walls: Aabb[] = [
    {
      minX: cornerX - 0.08,
      maxX: cornerX + 0.08,
      minZ: cornerZ,
      maxZ: doorZ - halfDoor,
    },
    {
      minX: cornerX - 0.08,
      maxX: cornerX + 0.08,
      minZ: doorZ + halfDoor,
      maxZ: wallZ,
    },
    {
      minX: cornerX,
      maxX: wallX,
      minZ: cornerZ - 0.08,
      maxZ: cornerZ + 0.08,
    },
    /** Lounge table */
    { minX: 7.6, maxX: 9.6, minZ: 3.4, maxZ: 4.6 },
    /** Fridge */
    { minX: 9.85, maxX: 10.75, minZ: 6.45, maxZ: 7.25 },
    /** Coffee counter along the south wall */
    { minX: 6.9, maxX: 9.4, minZ: 6.55, maxZ: 7.25 },
    /** Soft seating bench on the east wall */
    { minX: 10.0, maxX: 10.75, minZ: 2.35, maxZ: 4.35 },
    /** Corner planter by the glass */
    { minX: 6.97, maxX: 7.73, minZ: 1.68, maxZ: 2.42 },
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
  fridgeOpen,
  fridgeSnackBars,
  coffeeStage,
}: {
  doorOpen: boolean;
  cheapGlass?: boolean;
  animated?: boolean;
  lookAtRef?: RefObject<[number, number, number]>;
  highlightJules?: boolean;
  fridgeOpen: boolean;
  fridgeSnackBars: number;
  coffeeStage: CoffeeStage;
}) {
  const door = useRef<THREE.Group>(null);
  const angle = useRef(0);
  const { cornerX, cornerZ, wallX, wallZ, doorZ } = BREAK_NOOK;
  const halfDoor = 0.75;

  const westLen = wallZ - cornerZ;
  const northLen = wallX - cornerX;
  const westMidZ = (cornerZ + wallZ) / 2;
  const northMidX = (cornerX + wallX) / 2;

  useFrame((_, delta) => {
    if (!door.current) return;
    const target = doorOpen ? Math.PI / 2.05 : 0;
    angle.current = THREE.MathUtils.damp(angle.current, target, 6, delta);
    door.current.rotation.y = angle.current;
  });

  return (
    <group>
      <GlassPane
        cheap={cheapGlass}
        position={[cornerX, 1.4, (cornerZ + doorZ - halfDoor) / 2]}
        args={[0.05, 2.8, Math.max(0.25, doorZ - halfDoor - cornerZ)]}
      />
      <GlassPane
        cheap={cheapGlass}
        position={[cornerX, 1.4, (wallZ + doorZ + halfDoor) / 2]}
        args={[0.05, 2.8, Math.max(0.25, wallZ - (doorZ + halfDoor))]}
      />
      <GlassPane
        cheap={cheapGlass}
        position={[northMidX, 1.4, cornerZ]}
        args={[northLen, 2.8, 0.05]}
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
        <meshStandardMaterial color="#7a8a90" metalness={0.55} roughness={0.34} />
      </mesh>
      <mesh position={[northMidX, 2.82, cornerZ]}>
        <boxGeometry args={[northLen, 0.1, 0.12]} />
        <meshStandardMaterial color="#7a8a90" metalness={0.55} roughness={0.34} />
      </mesh>

      {/* Door jambs + sill */}
      <mesh position={[cornerX, 1.4, doorZ - halfDoor]}>
        <boxGeometry args={[0.12, 2.8, 0.1]} />
        <meshStandardMaterial
          color="#6a7a80"
          metalness={0.55}
          roughness={0.35}
        />
      </mesh>
      <mesh position={[cornerX, 1.4, doorZ + halfDoor]}>
        <boxGeometry args={[0.12, 2.8, 0.1]} />
        <meshStandardMaterial
          color="#6a7a80"
          metalness={0.55}
          roughness={0.35}
        />
      </mesh>
      <mesh position={[cornerX, 2.75, doorZ]}>
        <boxGeometry args={[0.14, 0.12, halfDoor * 2 + 0.12]} />
        <meshStandardMaterial
          color="#6a7a80"
          metalness={0.55}
          roughness={0.35}
        />
      </mesh>
      <mesh position={[cornerX - 0.02, 0.04, doorZ]} receiveShadow>
        <boxGeometry args={[0.35, 0.06, halfDoor * 2 + 0.2]} />
        <meshStandardMaterial color="#5a5048" roughness={0.75} />
      </mesh>

      {/* Hinged on the south jamb so the leaf swings out into the aisle */}
      <group ref={door} position={[cornerX, 0, doorZ + halfDoor]}>
        <GlassPane
          cheap={cheapGlass}
          position={[0, 1.35, -halfDoor]}
          args={[0.04, 2.55, halfDoor * 2 - 0.08]}
          opacity={0.34}
        />
        {/* Frame rails only — keep glass visible */}
        <mesh position={[0.01, 1.35, -0.06]}>
          <boxGeometry args={[0.06, 2.55, 0.08]} />
          <meshStandardMaterial
            color="#6a7a80"
            metalness={0.5}
            roughness={0.35}
          />
        </mesh>
        <mesh position={[0.01, 1.35, -(halfDoor * 2 - 0.06)]}>
          <boxGeometry args={[0.06, 2.55, 0.08]} />
          <meshStandardMaterial
            color="#6a7a80"
            metalness={0.5}
            roughness={0.35}
          />
        </mesh>
        <mesh position={[0.01, 2.58, -halfDoor]}>
          <boxGeometry args={[0.06, 0.08, halfDoor * 2]} />
          <meshStandardMaterial
            color="#6a7a80"
            metalness={0.5}
            roughness={0.35}
          />
        </mesh>
        <mesh position={[0.01, 0.14, -halfDoor]}>
          <boxGeometry args={[0.06, 0.08, halfDoor * 2]} />
          <meshStandardMaterial
            color="#6a7a80"
            metalness={0.5}
            roughness={0.35}
          />
        </mesh>
        <mesh position={[0.01, 1.35, -halfDoor]}>
          <boxGeometry args={[0.05, 0.06, halfDoor * 2]} />
          <meshStandardMaterial color="#7a8a90" metalness={0.45} />
        </mesh>
        <mesh position={[0.06, 1.35, -(halfDoor + 0.45)]}>
          <boxGeometry args={[0.05, 0.32, 0.04]} />
          <meshStandardMaterial
            color="#c4a060"
            metalness={0.6}
            roughness={0.3}
          />
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
        position={[cornerX - 0.052, 1.55, doorZ - 1.45]}
        rotationY={-Math.PI / 2}
      />
      <FramedCertificate
        position={[cornerX - 0.048, 1.55, doorZ + 1.35]}
        rotationY={-Math.PI / 2}
        title="TEAM AWARD"
        accent="#4fd0c8"
      />

      {/* Lounge sits mid-room, clear of the door swing and the counter */}
      <BreakTable position={[8.6, 0, 4.0]} width={2.0} depth={1.15} />
      <OfficeChair position={[7.85, 0, 3.1]} rotationY={0} />
      <OfficeChair position={[9.35, 0, 3.1]} rotationY={0.25} />
      <OfficeChair position={[7.85, 0, 4.9]} rotationY={Math.PI - 0.2} />
      <OfficeChair position={[9.35, 0, 4.9]} rotationY={Math.PI + 0.2} />
      <BreakTableSupplies position={[8.6, 0, 4.0]} />

      {/* Counter run flush against the south wall */}
      <mesh position={[8.15, 0.45, 6.92]} castShadow receiveShadow>
        <boxGeometry args={[2.3, 0.9, 0.6]} />
        <meshStandardMaterial color="#344d4e" roughness={0.78} />
      </mesh>
      <mesh position={[8.15, 0.92, 6.92]} receiveShadow>
        <boxGeometry args={[2.4, 0.05, 0.66]} />
        <meshStandardMaterial color="#c0b6a1" roughness={0.36} />
      </mesh>
      <mesh position={[8.15, 0.5, 6.6]}>
        <boxGeometry args={[2.2, 0.7, 0.03]} />
        <meshStandardMaterial color="#486465" roughness={0.62} />
      </mesh>
      {/* Counter fittings are authored facing +Z; turn them to face the room */}
      <group position={[8.15, 0, 6.92]} rotation={[0, Math.PI, 0]}>
        <CoffeeCounterSupplies position={[0, 0, 0]} />
      </group>
      <group position={[7.45, 1.09, 6.87]} rotation={[0, Math.PI, 0]}>
        <CoffeePot animated={animated} position={[0, 0, 0]} stage={coffeeStage} />
      </group>
      <SnackBasket position={[8.85, 0.945, 6.72]} />
      <VentPapers animated={animated} position={[8.4, 0.96, 6.68]} />
      {/* Mug shelf on the wall above the counter */}
      <mesh position={[8.15, 1.62, 7.11]} castShadow>
        <boxGeometry args={[2.0, 0.05, 0.28]} />
        <meshStandardMaterial color="#8b7055" roughness={0.48} />
      </mesh>
      {([-0.6, -0.25, 0.1, 0.45] as const).map((dx) => (
        <mesh key={dx} position={[8.15 + dx, 1.695, 7.11]} castShadow>
          <cylinderGeometry args={[0.05, 0.045, 0.1, 10]} />
          <meshStandardMaterial
            color={dx > 0 ? "#4a6a88" : "#8a5038"}
            roughness={0.5}
          />
        </mesh>
      ))}
      <MeshLabel
        text="COFFEE"
        position={[8.15, 2.05, 7.23]}
        rotationY={Math.PI}
        width={0.45}
        height={0.11}
      />

      <group position={[10.3, 0.85, 6.85]} rotation={[0, Math.PI, 0]}>
        <Fridge
          animated={animated}
          open={fridgeOpen}
          position={[0, 0, 0]}
          snackBars={fridgeSnackBars}
        />
      </group>

      {/* Soft bench on the east wall uses the new depth */}
      <mesh position={[10.35, 0.22, 3.35]} castShadow receiveShadow>
        <boxGeometry args={[0.7, 0.44, 1.9]} />
        <meshStandardMaterial color="#34494d" roughness={0.96} />
      </mesh>
      <mesh position={[10.6, 0.62, 3.35]} castShadow>
        <boxGeometry args={[0.2, 0.5, 1.9]} />
        <meshStandardMaterial color="#4a6566" roughness={0.94} />
      </mesh>
      {([-0.55, 0.55] as const).map((dz) => (
        <mesh key={dz} position={[10.3, 0.5, 3.35 + dz]} castShadow>
          <boxGeometry args={[0.34, 0.14, 0.34]} />
          <meshStandardMaterial color="#bb975d" roughness={0.96} />
        </mesh>
      ))}

      <StickyNotes position={[10.72, 1.75, 5.3]} rotationY={-Math.PI / 2} />
      <WallArt
        position={[10.72, 1.75, 2.5]}
        rotationY={-Math.PI / 2}
        variant={1}
        width={0.9}
        height={0.7}
      />
      {/* Desk plant on the break table — not a free floor shrub */}
      <PlantPot position={[8.6, 0.86, 4.0]} scale={0.95} />
      <TallFloorPlant position={[7.35, 0, 2.05]} scale={0.9} />

      <Figure
        activity="talking"
        animated={animated}
        {...(lookAtRef ? { lookAtRef } : {})}
        position={[7.6, 0, 6.05]}
        rotationY={Math.PI - 0.5}
        primary="#6a7a5c"
        secondary="#2a3224"
        accent="#e8b84a"
        hair="#3a2818"
        seed={4}
      />
      <NameTag
        name="Jules"
        role="Coworker"
        position={[7.6, 2.2, 6.05]}
        target={highlightJules}
        visible={highlightJules}
      />

      {animated ? (
        <DustMotes
          animated={animated}
          count={28}
          depth={3.6}
          height={2.2}
          position={[8.2, 1.65, 4.5]}
          width={3.2}
        />
      ) : null}
    </group>
  );
}
