import { ContactShadows } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Figure } from "../Figure.js";
import { Hotspot, nearestHotspot, type HotspotDef } from "../Hotspot.js";
import { NameTag } from "../NameTag.js";
import { PlayerController, type Aabb } from "../PlayerController.js";
import {
  CeilingFixture,
  CubicleWalls,
  DeskFrame,
  DualMonitor,
  FloorTileGrid,
  KeyboardMouse,
  OfficeChair,
  PlantPot,
  ServerRack,
  TaskLamp,
  WallPanel,
  Whiteboard,
} from "../props.js";
import type { HotspotId } from "../worldTypes.js";

const PLAYER_SPAWN: [number, number, number] = [0, 1.6, 5.2];

const HOTSPOTS: HotspotDef[] = [
  {
    id: "desk_player",
    label: "Your chair",
    position: [3.2, 0, -1.5],
    radius: 1.7,
  },
  {
    id: "alert_wall",
    label: "Alert wall",
    position: [-4.2, 0, -3.4],
    radius: 1.6,
  },
  {
    id: "morgan_station",
    label: "Morgan's station",
    position: [-3.2, 0, 1.4],
    radius: 1.5,
  },
  {
    id: "door_exit",
    label: "Exit to floor map",
    position: [0, 0, 5.0],
    radius: 1.4,
  },
];

const COLLIDERS: Aabb[] = [
  { minX: 2.1, maxX: 4.5, minZ: -4.2, maxZ: -2.35 }, // your desk
  { minX: -5.3, maxX: -2.8, minZ: -4.6, maxZ: -3.2 }, // alert bank
  { minX: -4.3, maxX: -1.9, minZ: 0.4, maxZ: 2.4 }, // morgan desk
];

function PlayerDesk() {
  return (
    <group position={[3.2, 0, -3.2]}>
      <CubicleWalls position={[0, 0, 0.15]} width={2.8} depth={2.4} />
      <DeskFrame position={[0, 0, -0.15]} color="#2e251c" width={2.1} />
      <DualMonitor position={[0, 0.82, -0.4]} />
      <KeyboardMouse position={[0, 0.84, 0.15]} />
      <TaskLamp position={[0.9, 0.84, -0.15]} />
      <PlantPot position={[-0.9, 0.84, 0.2]} />
      <pointLight intensity={1.1} distance={5} position={[-0.3, 1.4, 0]} color="#4fd0c8" />
    </group>
  );
}

function MorganDesk() {
  return (
    <group position={[-3.2, 0, 1.0]}>
      <CubicleWalls position={[0, 0, 0.2]} rotationY={Math.PI} width={2.6} depth={2.3} />
      <DeskFrame position={[0, 0, -0.1]} width={1.95} depth={0.95} color="#26201a" />
      <DualMonitor
        position={[0, 0.82, -0.3]}
        leftEmissive="#e8b84a"
        rightEmissive="#4fd0c8"
      />
      <KeyboardMouse position={[0, 0.84, 0.15]} />
    </group>
  );
}

function AlertWall() {
  return (
    <group position={[-4.2, 0, -4.0]}>
      <mesh position={[0, 0.52, 0.2]} castShadow receiveShadow>
        <boxGeometry args={[3.2, 0.1, 0.7]} />
        <meshStandardMaterial color="#2a2118" roughness={0.6} />
      </mesh>
      {([-1.05, 0, 1.05] as const).map((x, i) => (
        <group key={x} position={[x, 1.45, 0.05]}>
          <mesh castShadow>
            <boxGeometry args={[0.9, 1.2, 0.08]} />
            <meshStandardMaterial color="#0a0e12" metalness={0.2} />
          </mesh>
          <mesh position={[0, 0, 0.05]}>
            <boxGeometry args={[0.78, 1.05, 0.02]} />
            <meshStandardMaterial
              color="#05080a"
              emissive={i === 1 ? "#ff6b4a" : i === 0 ? "#e8b84a" : "#4fd0c8"}
              emissiveIntensity={0.6}
            />
          </mesh>
        </group>
      ))}
      <pointLight intensity={0.9} distance={6} position={[0, 1.6, 1]} color="#ff6b4a" />
    </group>
  );
}

function FloorClick({ enabled }: { enabled: boolean }) {
  const { camera, gl } = useThree();
  useEffect(() => {
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const hit = new THREE.Vector3();
    const onDblClick = (event: MouseEvent) => {
      if (!enabled) return;
      const rect = gl.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      if (raycaster.ray.intersectPlane(plane, hit)) {
        window.dispatchEvent(
          new CustomEvent("soc-walk-to", { detail: { x: hit.x, z: hit.z } }),
        );
      }
    };
    gl.domElement.addEventListener("dblclick", onDblClick);
    return () => gl.domElement.removeEventListener("dblclick", onDblClick);
  }, [camera, enabled, gl.domElement]);
  return null;
}

export function SocRoom({
  onNearbyChange,
  onInteract,
  enabled,
}: {
  onNearbyChange: (id?: HotspotId, label?: string) => void;
  onInteract: (id: HotspotId) => void;
  enabled: boolean;
}) {
  const nearbyId = useRef<HotspotId | undefined>(undefined);
  const playerPos = useRef<[number, number, number]>([...PLAYER_SPAWN]);
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
      <color attach="background" args={["#1a1410"]} />
      <fog attach="fog" args={["#1a1410", 18, 34]} />
      <hemisphereLight args={["#ffe2b0", "#3a2c22", 1.1]} />
      <ambientLight intensity={0.55} />
      <directionalLight
        castShadow
        intensity={1.55}
        position={[5, 10, 5]}
        color="#fff0d0"
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.0002}
      />
      <pointLight intensity={1.1} distance={16} position={[0, 2.5, 0]} color="#ffe8b8" />

      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[20, 16]} />
        <meshStandardMaterial color="#2a221c" roughness={0.95} />
      </mesh>
      <FloorTileGrid rangeX={9} rangeZ={7} />
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0.8]}>
        <planeGeometry args={[2.6, 11]} />
        <meshStandardMaterial color="#3a2c22" roughness={1} />
      </mesh>

      <mesh position={[0, 3.35, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[20, 16]} />
        <meshStandardMaterial color="#241c16" />
      </mesh>
      <CeilingFixture position={[-4, 3.2, -2]} />
      <CeilingFixture position={[0, 3.2, 0.5]} />
      <CeilingFixture position={[4, 3.2, -1.5]} />
      <CeilingFixture position={[0, 3.2, 3.8]} />

      <WallPanel position={[0, 1.65, -6.5]} size={[20, 3.3, 0.3]} />
      <WallPanel position={[-9.5, 1.65, 0]} size={[0.3, 3.3, 16]} />
      <WallPanel position={[9.5, 1.65, 0]} size={[0.3, 3.3, 16]} />
      <WallPanel position={[0, 1.65, 6.5]} size={[20, 3.3, 0.3]} color="#26201a" />

      <mesh position={[0, 0.1, -6.3]}>
        <boxGeometry args={[19, 0.2, 0.08]} />
        <meshStandardMaterial color="#4a3a2c" />
      </mesh>
      <mesh position={[0, 2.7, -6.3]}>
        <boxGeometry args={[19, 0.05, 0.05]} />
        <meshStandardMaterial color="#e8b84a" emissive="#e8b84a" emissiveIntensity={0.55} />
      </mesh>

      <PlayerDesk />
      <OfficeChair position={[3.2, 0, -1.65]} />
      <NameTag name="You" role="Day-one analyst · this desk" position={[3.2, 2.15, -1.65]} star />

      <MorganDesk />
      <OfficeChair position={[-3.2, 0, 2.35]} rotationY={Math.PI} />
      <Figure
        position={[-3.2, 0, 2.3]}
        rotationY={Math.PI}
        primary="#7d9088"
        secondary="#2e3c36"
        accent="#4fd0c8"
        hair="#1a120c"
        seated
      />
      <NameTag
        name="Morgan"
        role="Manager · showing you the ropes"
        position={[-3.2, 2.0, 2.3]}
        star
      />

      <AlertWall />
      <ServerRack position={[-8.2, 0.9, -4.5]} />
      <ServerRack position={[-8.2, 0.9, -3.5]} />
      <Whiteboard position={[7.2, 1.8, -6.25]} />
      <PlantPot position={[8.0, 0, 4.8]} />
      <PlantPot position={[7.2, 0, 5.2]} />
      <PlantPot position={[-8.0, 0, 5.0]} />
      <PlantPot position={[5.5, 0, -5.5]} />

      <Figure
        position={[-5.0, 0, -1.8]}
        rotationY={0.7}
        primary="#6a7a88"
        secondary="#243038"
        accent="#ff6b4a"
        hair="#2a1c12"
      />
      <NameTag
        name="Samir"
        role="Coworker · alert queue"
        position={[-5.0, 2.05, -1.8]}
        star
      />

      <Figure
        position={[1.5, 0, 3.6]}
        rotationY={-0.9}
        primary="#8a7a68"
        secondary="#32281e"
        accent="#e8b84a"
        hair="#3a2818"
      />
      <NameTag name="Priya" role="Coworker · onboarding buddy" position={[1.5, 2.05, 3.6]} />

      {/* Exit */}
      <mesh position={[0, 1.35, 6.25]}>
        <boxGeometry args={[1.4, 2.5, 0.12]} />
        <meshStandardMaterial color="#0f1716" emissive="#4fd0c8" emissiveIntensity={0.2} />
      </mesh>

      <ContactShadows opacity={0.2} scale={20} blur={2.8} far={5} color="#1a1008" />

      {HOTSPOTS.map((def) => (
        <Hotspot active={activeHotspot === def.id} def={def} key={def.id} />
      ))}

      <PlayerController
        colliders={COLLIDERS}
        enabled={enabled}
        onPosition={handlePosition}
        spawn={PLAYER_SPAWN}
      />
      <FloorClick enabled={enabled} />
    </>
  );
}
