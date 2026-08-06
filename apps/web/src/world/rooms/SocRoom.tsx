import { ContactShadows } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Figure } from "../Figure.js";
import { Hotspot, nearestHotspot, type HotspotDef } from "../Hotspot.js";
import { PlayerController, type Aabb } from "../PlayerController.js";
import {
  CeilingFixture,
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

const PLAYER_SPAWN: [number, number, number] = [0, 1.6, 4.2];

const HOTSPOTS: HotspotDef[] = [
  {
    id: "desk_player",
    label: "Your chair",
    position: [2.4, 0, -1.35],
    radius: 1.6,
  },
  {
    id: "alert_wall",
    label: "Alert wall",
    position: [-3.8, 0, -2.6],
    radius: 1.5,
  },
  {
    id: "morgan_station",
    label: "Morgan's station",
    position: [-2.6, 0, 1.2],
    radius: 1.45,
  },
  {
    id: "coffee",
    label: "Coffee nook",
    position: [4.0, 0, 2.6],
    radius: 1.25,
  },
  {
    id: "door_exit",
    label: "Exit to floor map",
    position: [0, 0, 4.0],
    radius: 1.35,
  },
];

const COLLIDERS: Aabb[] = [
  { minX: 1.45, maxX: 3.55, minZ: -3.85, maxZ: -2.15 },
  { minX: -4.9, maxX: -2.5, minZ: -4.2, maxZ: -3.0 },
  { minX: -3.5, maxX: -1.3, minZ: 0.35, maxZ: 2.15 },
  { minX: 3.35, maxX: 4.75, minZ: 2.0, maxZ: 3.35 },
];

function PlayerDesk() {
  return (
    <group position={[2.4, 0, -2.9]}>
      <DeskFrame position={[0, 0, 0]} color="#2e251c" />
      <DualMonitor position={[0, 0.82, -0.28]} />
      <KeyboardMouse position={[0, 0.84, 0.22]} />
      <TaskLamp position={[0.88, 0.84, -0.1]} />
      <PlantPot position={[-0.85, 0.84, 0.25]} />
      <mesh position={[0.55, 0.84, 0.3]}>
        <boxGeometry args={[0.18, 0.04, 0.24]} />
        <meshStandardMaterial color="#1a130f" roughness={0.6} />
      </mesh>
      <pointLight
        intensity={0.4}
        distance={3}
        position={[-0.4, 1.35, -0.1]}
        color="#4fd0c8"
      />
    </group>
  );
}

function MorganDesk() {
  return (
    <group position={[-2.5, 0, 1.0]}>
      <DeskFrame position={[0, 0, 0]} width={1.9} depth={0.95} color="#26201a" />
      <DualMonitor
        position={[0, 0.82, -0.25]}
        leftEmissive="#e8b84a"
        rightEmissive="#4fd0c8"
      />
      <KeyboardMouse position={[0, 0.84, 0.2]} />
      <mesh position={[-0.7, 0.9, 0.15]}>
        <cylinderGeometry args={[0.06, 0.05, 0.14, 12]} />
        <meshStandardMaterial color="#f3e6c8" />
      </mesh>
    </group>
  );
}

function AlertWall() {
  return (
    <group position={[-3.8, 0, -3.65]}>
      <mesh position={[0, 0.52, 0.2]} castShadow receiveShadow>
        <boxGeometry args={[3.0, 0.1, 0.65]} />
        <meshStandardMaterial color="#2a2118" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.2, 0.2]}>
        <boxGeometry args={[2.9, 0.5, 0.5]} />
        <meshStandardMaterial color="#1a1512" />
      </mesh>
      {([-1.0, 0, 1.0] as const).map((x, i) => (
        <group key={x} position={[x, 1.4, 0.05]}>
          <mesh castShadow>
            <boxGeometry args={[0.85, 1.15, 0.08]} />
            <meshStandardMaterial color="#0a0e12" metalness={0.2} />
          </mesh>
          <mesh position={[0, 0, 0.05]}>
            <boxGeometry args={[0.75, 1.0, 0.02]} />
            <meshStandardMaterial
              color="#05080a"
              emissive={i === 1 ? "#ff6b4a" : i === 0 ? "#e8b84a" : "#4fd0c8"}
              emissiveIntensity={0.55}
              roughness={0.25}
            />
          </mesh>
          {/* Fake chart bars */}
          {[-0.2, 0, 0.2].map((bx, bi) => (
            <mesh key={bx} position={[bx, -0.25 + bi * 0.08, 0.07]}>
              <boxGeometry args={[0.1, 0.15 + bi * 0.12, 0.01]} />
              <meshStandardMaterial
                color="#4fd0c8"
                emissive="#4fd0c8"
                emissiveIntensity={0.6}
              />
            </mesh>
          ))}
        </group>
      ))}
      <mesh position={[0, 2.15, 0]}>
        <boxGeometry args={[2.95, 0.1, 0.12]} />
        <meshStandardMaterial color="#15100d" />
      </mesh>
      <mesh position={[0, 2.28, 0.02]}>
        <boxGeometry args={[1.2, 0.08, 0.04]} />
        <meshStandardMaterial
          color="#ff6b4a"
          emissive="#ff6b4a"
          emissiveIntensity={0.5}
        />
      </mesh>
      <pointLight intensity={0.7} distance={5} position={[0, 1.6, 0.8]} color="#ff6b4a" />
    </group>
  );
}

function CoffeeNook() {
  return (
    <group position={[4.0, 0, 2.6]}>
      <mesh position={[0, 0.48, 0]} castShadow>
        <cylinderGeometry args={[0.52, 0.58, 0.96, 24]} />
        <meshStandardMaterial color="#3a2c22" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.98, 0]}>
        <cylinderGeometry args={[0.54, 0.54, 0.04, 24]} />
        <meshStandardMaterial color="#2a2118" metalness={0.15} />
      </mesh>
      <mesh position={[0.18, 1.1, 0.12]}>
        <cylinderGeometry args={[0.09, 0.08, 0.16, 14]} />
        <meshStandardMaterial color="#f3e6c8" roughness={0.45} />
      </mesh>
      <mesh position={[0.18, 1.2, 0.12]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.07, 0.015, 8, 14, Math.PI]} />
        <meshStandardMaterial color="#f3e6c8" />
      </mesh>
      <mesh position={[-0.2, 1.18, -0.08]} castShadow>
        <boxGeometry args={[0.22, 0.32, 0.16]} />
        <meshStandardMaterial color="#5c4634" roughness={0.8} />
      </mesh>
      <mesh position={[-0.2, 1.36, -0.08]}>
        <boxGeometry args={[0.18, 0.04, 0.12]} />
        <meshStandardMaterial color="#e8b84a" emissive="#e8b84a" emissiveIntensity={0.2} />
      </mesh>
      <PlantPot position={[0.55, 1.0, -0.35]} />
      <pointLight intensity={0.35} distance={3} position={[0, 1.5, 0.3]} color="#f0d7a0" />
    </group>
  );
}

function ExitDoor() {
  return (
    <group position={[0, 0, 5.28]}>
      <WallPanel position={[-1.4, 1.5, 0]} size={[1.4, 3.0, 0.2]} color="#14100d" />
      <WallPanel position={[1.4, 1.5, 0]} size={[1.4, 3.0, 0.2]} color="#14100d" />
      <mesh position={[0, 2.7, 0]}>
        <boxGeometry args={[1.5, 0.25, 0.22]} />
        <meshStandardMaterial color="#1a130f" />
      </mesh>
      <mesh position={[0, 1.35, 0.02]} castShadow>
        <boxGeometry args={[1.25, 2.45, 0.1]} />
        <meshStandardMaterial color="#0f1413" metalness={0.15} roughness={0.55} />
      </mesh>
      <mesh position={[0, 1.35, 0.08]}>
        <boxGeometry args={[1.05, 2.2, 0.04]} />
        <meshStandardMaterial
          color="#0a1210"
          emissive="#4fd0c8"
          emissiveIntensity={0.22}
        />
      </mesh>
      <mesh position={[0.42, 1.3, 0.14]}>
        <sphereGeometry args={[0.055, 12, 12]} />
        <meshStandardMaterial color="#e8b84a" metalness={0.8} roughness={0.25} />
      </mesh>
      <mesh position={[0, 2.55, 0.12]}>
        <boxGeometry args={[0.7, 0.08, 0.04]} />
        <meshStandardMaterial
          color="#4fd0c8"
          emissive="#4fd0c8"
          emissiveIntensity={0.6}
        />
      </mesh>
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
          new CustomEvent("soc-walk-to", {
            detail: { x: hit.x, z: hit.z },
          }),
        );
      }
    };
    gl.domElement.addEventListener("dblclick", onDblClick);
    return () => {
      gl.domElement.removeEventListener("dblclick", onDblClick);
    };
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
    gl.toneMappingExposure = 1.05;
  }, [gl]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!enabled || event.code !== "KeyE") return;
      const near = nearestHotspot(playerPos.current, HOTSPOTS);
      if (near) onInteract(near.id);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [enabled, onInteract]);

  function handlePosition(next: [number, number, number]) {
    playerPos.current = next;
    const near = nearestHotspot(next, HOTSPOTS);
    const nextId = near?.id;
    if (nextId !== nearbyId.current) {
      nearbyId.current = nextId;
      setActiveHotspot(nextId);
      onNearbyChange(near?.id, near?.label);
    }
  }

  return (
    <>
      <color attach="background" args={["#060403"]} />
      <fog attach="fog" args={["#060403", 11, 24]} />
      <hemisphereLight args={["#5a4a38", "#0a0604", 0.55]} />
      <directionalLight
        castShadow
        intensity={1.05}
        position={[6, 10, 4]}
        color="#f2d9a8"
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={28}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      <ambientLight intensity={0.12} />

      {/* Structural shell */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[16, 14]} />
        <meshStandardMaterial color="#14100d" roughness={1} />
      </mesh>
      <FloorTileGrid />
      {/* Aisle carpet */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0.3]}>
        <planeGeometry args={[2.4, 9.2]} />
        <meshStandardMaterial color="#221810" roughness={1} />
      </mesh>

      <mesh position={[0, 3.25, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[16, 14]} />
        <meshStandardMaterial color="#0c0907" roughness={1} />
      </mesh>
      <CeilingFixture position={[-3.2, 3.15, -1.5]} />
      <CeilingFixture position={[0, 3.15, 0.5]} />
      <CeilingFixture position={[3.2, 3.15, -1.2]} />

      <WallPanel position={[0, 1.6, -5.6]} size={[16, 3.25, 0.28]} />
      <WallPanel position={[-7.5, 1.6, 0]} size={[0.28, 3.25, 14]} />
      <WallPanel position={[7.5, 1.6, 0]} size={[0.28, 3.25, 14]} />
      <WallPanel position={[0, 1.6, 5.6]} size={[16, 3.25, 0.28]} color="#120e0b" />

      {/* Baseboard + crown */}
      <mesh position={[0, 0.1, -5.45]}>
        <boxGeometry args={[15.5, 0.2, 0.08]} />
        <meshStandardMaterial color="#3a2c22" />
      </mesh>
      <mesh position={[0, 2.55, -5.45]}>
        <boxGeometry args={[15.5, 0.05, 0.05]} />
        <meshStandardMaterial
          color="#e8b84a"
          emissive="#e8b84a"
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Cubicle spine */}
      <mesh position={[0.15, 0.75, -1.6]} castShadow>
        <boxGeometry args={[0.1, 1.5, 3.6]} />
        <meshStandardMaterial color="#2a2118" roughness={0.75} />
      </mesh>
      <mesh position={[0.15, 1.52, -1.6]}>
        <boxGeometry args={[0.08, 0.1, 3.6]} />
        <meshStandardMaterial
          color="#4fd0c8"
          emissive="#4fd0c8"
          emissiveIntensity={0.25}
        />
      </mesh>
      <mesh position={[0.15, 0.75, 1.4]} castShadow>
        <boxGeometry args={[0.1, 1.5, 2.2]} />
        <meshStandardMaterial color="#2a2118" roughness={0.75} />
      </mesh>

      <PlayerDesk />
      <OfficeChair position={[2.4, 0, -1.55]} />
      <MorganDesk />
      <OfficeChair position={[-2.5, 0, 2.15]} rotationY={Math.PI} />
      <AlertWall />
      <CoffeeNook />
      <ExitDoor />
      <ServerRack position={[-6.4, 0.9, -3.8]} />
      <ServerRack position={[-6.4, 0.9, -2.9]} />
      <Whiteboard position={[5.5, 1.7, -5.35]} />
      <PlantPot position={[6.2, 0, 4.2]} />
      <PlantPot position={[-6.3, 0, 4.0]} />

      <Figure
        position={[-2.5, 0, 2.1]}
        rotationY={Math.PI}
        primary="#6d7f78"
        secondary="#24302c"
        accent="#4fd0c8"
        hair="#1a120c"
        seated
      />
      <Figure
        position={[-4.4, 0, -1.5]}
        rotationY={0.55}
        primary="#5a6a78"
        secondary="#1c242c"
        accent="#ff6b4a"
        hair="#2a1c12"
      />
      <Figure
        position={[1.2, 0, 3.2]}
        rotationY={-0.8}
        primary="#7a6a5c"
        secondary="#2a221c"
        accent="#e8b84a"
        hair="#3a2818"
      />

      <ContactShadows
        opacity={0.45}
        scale={18}
        blur={2.4}
        far={6}
        resolution={512}
        color="#000000"
      />

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
