import { ContactShadows } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Figure } from "../Figure.js";
import { Hotspot, nearestHotspot, type HotspotDef } from "../Hotspot.js";
import { NameTag } from "../NameTag.js";
import { PlayerController, type Aabb } from "../PlayerController.js";
import {
  BreakTable,
  CeilingFixture,
  FloorTileGrid,
  OfficeChair,
  PlantPot,
  WallPanel,
} from "../props.js";
import type { HotspotId } from "../worldTypes.js";

const SPAWN: [number, number, number] = [0, 1.6, 4.5];

const HOTSPOTS: HotspotDef[] = [
  {
    id: "coffee",
    label: "Coffee station",
    position: [-3.2, 0, -2.4],
    radius: 1.4,
  },
  {
    id: "door_exit",
    label: "Exit to floor map",
    position: [0, 0, 4.2],
    radius: 1.4,
  },
];

const COLLIDERS: Aabb[] = [
  { minX: -1.2, maxX: 1.2, minZ: -0.7, maxZ: 0.7 }, // table
  { minX: -4.0, maxX: -2.2, minZ: -3.2, maxZ: -1.6 }, // coffee counter
];

function CoffeeStation() {
  return (
    <group position={[-3.2, 0, -2.4]}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[1.6, 1.0, 0.7]} />
        <meshStandardMaterial color="#3a2c22" roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.02, 0]}>
        <boxGeometry args={[1.65, 0.05, 0.75]} />
        <meshStandardMaterial color="#2a2118" />
      </mesh>
      <mesh position={[-0.35, 1.2, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.2, 0.35, 16]} />
        <meshStandardMaterial color="#1a130f" metalness={0.4} />
      </mesh>
      <mesh position={[-0.35, 1.42, 0]}>
        <cylinderGeometry args={[0.12, 0.14, 0.12, 14]} />
        <meshStandardMaterial color="#f3e6c8" />
      </mesh>
      <mesh position={[0.35, 1.15, 0.1]}>
        <cylinderGeometry args={[0.08, 0.07, 0.14, 12]} />
        <meshStandardMaterial color="#efe0bd" />
      </mesh>
      <mesh position={[0.55, 1.12, -0.1]}>
        <boxGeometry args={[0.25, 0.28, 0.18]} />
        <meshStandardMaterial color="#5c4634" />
      </mesh>
      <pointLight intensity={0.8} distance={4} position={[0, 1.6, 0.3]} color="#ffe8b8" />
    </group>
  );
}

function RoomSign() {
  return (
    <group position={[0, 2.4, -4.7]}>
      <mesh>
        <boxGeometry args={[2.4, 0.55, 0.08]} />
        <meshStandardMaterial color="#1a3028" />
      </mesh>
      <mesh position={[0, 0, 0.05]}>
        <boxGeometry args={[2.2, 0.4, 0.02]} />
        <meshStandardMaterial
          color="#0f2018"
          emissive="#4fd0c8"
          emissiveIntensity={0.35}
        />
      </mesh>
      <NameTag name="Break Room" role="Verdaly · Floor 12" position={[0, 0.05, 0.2]} />
    </group>
  );
}

export function BreakRoom({
  onNearbyChange,
  onInteract,
  enabled,
}: {
  onNearbyChange: (id?: HotspotId, label?: string) => void;
  onInteract: (id: HotspotId) => void;
  enabled: boolean;
}) {
  const nearbyId = useRef<HotspotId | undefined>(undefined);
  const playerPos = useRef<[number, number, number]>([...SPAWN]);
  const [activeHotspot, setActiveHotspot] = useState<HotspotId | undefined>();
  const { gl } = useThree();

  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.55;
  }, [gl]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!enabled || event.code !== "KeyE") return;
      const near = nearestHotspot(playerPos.current, HOTSPOTS);
      if (near) onInteract(near.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled, onInteract]);

  function handlePosition(next: [number, number, number]) {
    playerPos.current = next;
    const near = nearestHotspot(next, HOTSPOTS);
    if (near?.id !== nearbyId.current) {
      nearbyId.current = near?.id;
      setActiveHotspot(near?.id);
      onNearbyChange(near?.id, near?.label);
    }
  }

  return (
    <>
      <color attach="background" args={["#1a2018"]} />
      <fog attach="fog" args={["#1a2018", 14, 28]} />
      <hemisphereLight args={["#d8f0c8", "#2a3a28", 1.0]} />
      <ambientLight intensity={0.6} />
      <directionalLight
        castShadow
        intensity={1.4}
        position={[3, 8, 4]}
        color="#fff5d0"
      />

      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[14, 12]} />
        <meshStandardMaterial color="#2e3428" roughness={0.95} />
      </mesh>
      <FloorTileGrid rangeX={6} rangeZ={5} />

      <mesh position={[0, 3.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[14, 12]} />
        <meshStandardMaterial color="#243028" />
      </mesh>
      <CeilingFixture position={[-2, 3.1, 0]} />
      <CeilingFixture position={[2, 3.1, 0]} />

      <WallPanel position={[0, 1.55, -5]} size={[14, 3.1, 0.25]} color="#2a3228" />
      <WallPanel position={[-6.5, 1.55, 0]} size={[0.25, 3.1, 12]} color="#2a3228" />
      <WallPanel position={[6.5, 1.55, 0]} size={[0.25, 3.1, 12]} color="#2a3228" />
      <WallPanel position={[0, 1.55, 5]} size={[14, 3.1, 0.25]} color="#243028" />

      <RoomSign />
      <BreakTable position={[0, 0, 0]} />
      <OfficeChair position={[-0.7, 0, 1.1]} rotationY={Math.PI} />
      <OfficeChair position={[0.7, 0, 1.1]} rotationY={Math.PI} />
      <OfficeChair position={[-0.7, 0, -1.1]} />
      <OfficeChair position={[0.7, 0, -1.1]} />
      <CoffeeStation />
      <PlantPot position={[4.5, 0, -3.5]} />
      <PlantPot position={[5.2, 0, -3.2]} />
      <PlantPot position={[-5.0, 0, 3.5]} />
      <PlantPot position={[4.8, 0, 3.2]} />

      <Figure
        position={[1.4, 0, 1.3]}
        rotationY={-2.2}
        primary="#6a8a6e"
        secondary="#2a3a2c"
        accent="#7dba6a"
        hair="#2a1c12"
      />
      <NameTag
        name="Jules"
        role="Coworker · showing you around"
        position={[1.4, 2.05, 1.3]}
        star
      />

      {/* Door */}
      <mesh position={[0, 1.3, 4.9]}>
        <boxGeometry args={[1.3, 2.4, 0.1]} />
        <meshStandardMaterial
          color="#0f2018"
          emissive="#4fd0c8"
          emissiveIntensity={0.2}
        />
      </mesh>

      <ContactShadows opacity={0.2} scale={14} blur={2.5} far={5} color="#102010" />

      {HOTSPOTS.map((def) => (
        <Hotspot active={activeHotspot === def.id} def={def} key={def.id} />
      ))}

      <PlayerController
        colliders={COLLIDERS}
        enabled={enabled}
        onPosition={handlePosition}
        spawn={SPAWN}
      />
    </>
  );
}
