import { useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Figure } from "../Figure.js";
import { Hotspot, nearestHotspot, type HotspotDef } from "../Hotspot.js";
import { PlayerController, type Aabb } from "../PlayerController.js";
import type { HotspotId } from "../worldTypes.js";

const PLAYER_SPAWN: [number, number, number] = [0, 1.6, 4.2];

/**
 * Layout (top-down, +Z toward entrance):
 *  - Door at south wall
 *  - Player desk against north-east, chair/sit zone SOUTH of desk (walkable)
 *  - Alert wall north-west
 *  - Morgan mid-west
 *  - Coffee south-east
 */
const HOTSPOTS: HotspotDef[] = [
  {
    id: "desk_player",
    label: "Your chair",
    // Sit zone in front of the desk — must stay outside desk collider
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

// Colliders cover furniture bodies only — leave clear aisles and the sit zone
const COLLIDERS: Aabb[] = [
  { minX: 1.45, maxX: 3.55, minZ: -3.85, maxZ: -2.15 }, // player desk top
  { minX: -4.9, maxX: -2.5, minZ: -4.2, maxZ: -3.0 }, // alert console
  { minX: -3.5, maxX: -1.3, minZ: 0.35, maxZ: 2.15 }, // morgan desk
  { minX: 3.35, maxX: 4.75, minZ: 2.0, maxZ: 3.35 }, // coffee table
];

function Workstation({
  position,
  dualGlow = true,
}: {
  position: [number, number, number];
  dualGlow?: boolean;
}) {
  return (
    <group position={position}>
      {/* Desktop */}
      <mesh position={[0, 0.78, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.0, 0.07, 1.0]} />
        <meshStandardMaterial color="#2a2118" roughness={0.55} metalness={0.08} />
      </mesh>
      {/* Legs */}
      {[
        [-0.85, 0.39, 0.4],
        [0.85, 0.39, 0.4],
        [-0.85, 0.39, -0.4],
        [0.85, 0.39, -0.4],
      ].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]}>
          <boxGeometry args={[0.07, 0.78, 0.07]} />
          <meshStandardMaterial color="#1a130f" />
        </mesh>
      ))}
      {/* Monitor stands */}
      <mesh position={[-0.4, 0.9, -0.28]}>
        <boxGeometry args={[0.18, 0.08, 0.18]} />
        <meshStandardMaterial color="#0d0d0d" />
      </mesh>
      <mesh position={[0.4, 0.9, -0.28]}>
        <boxGeometry args={[0.18, 0.08, 0.18]} />
        <meshStandardMaterial color="#0d0d0d" />
      </mesh>
      <mesh position={[-0.4, 1.05, -0.28]}>
        <boxGeometry args={[0.05, 0.22, 0.05]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      <mesh position={[0.4, 1.05, -0.28]}>
        <boxGeometry args={[0.05, 0.22, 0.05]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      {/* Screens */}
      <mesh position={[-0.4, 1.28, -0.28]} castShadow>
        <boxGeometry args={[0.72, 0.48, 0.05]} />
        <meshStandardMaterial
          color="#071018"
          emissive={dualGlow ? "#4fd0c8" : "#e8b84a"}
          emissiveIntensity={0.65}
          roughness={0.25}
        />
      </mesh>
      <mesh position={[0.4, 1.28, -0.28]} castShadow>
        <boxGeometry args={[0.72, 0.48, 0.05]} />
        <meshStandardMaterial
          color="#071018"
          emissive="#e8b84a"
          emissiveIntensity={0.45}
          roughness={0.25}
        />
      </mesh>
      {/* Keyboard + mouse */}
      <mesh position={[0, 0.84, 0.22]}>
        <boxGeometry args={[0.55, 0.03, 0.2]} />
        <meshStandardMaterial color="#121212" />
      </mesh>
      <mesh position={[0.42, 0.84, 0.28]}>
        <boxGeometry args={[0.08, 0.025, 0.12]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      {/* Task lamp */}
      <mesh position={[0.85, 1.15, -0.15]}>
        <cylinderGeometry args={[0.03, 0.04, 0.55, 8]} />
        <meshStandardMaterial color="#5c4634" metalness={0.4} />
      </mesh>
      <mesh position={[0.85, 1.42, 0]}>
        <sphereGeometry args={[0.08, 12, 12]} />
        <meshStandardMaterial
          color="#f3e6c8"
          emissive="#e8b84a"
          emissiveIntensity={0.9}
        />
      </mesh>
      <pointLight
        intensity={0.55}
        distance={4}
        position={[0.85, 1.45, 0.1]}
        color="#e8b84a"
      />
    </group>
  );
}

function OfficeChair({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.48, 0]} castShadow>
        <cylinderGeometry args={[0.28, 0.3, 0.08, 16]} />
        <meshStandardMaterial color="#241912" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.72, -0.12]} castShadow>
        <boxGeometry args={[0.42, 0.5, 0.08]} />
        <meshStandardMaterial color="#3a2c22" />
      </mesh>
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.4, 8]} />
        <meshStandardMaterial color="#1a130f" metalness={0.5} />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * 0.28, 0.06, Math.sin(a) * 0.28]}
          >
            <sphereGeometry args={[0.05, 10, 10]} />
            <meshStandardMaterial color="#111" metalness={0.6} />
          </mesh>
        );
      })}
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
      <color attach="background" args={["#070504"]} />
      <fog attach="fog" args={["#070504", 10, 22]} />
      <hemisphereLight args={["#4a3a2a", "#0a0706", 0.45]} />
      <directionalLight
        castShadow
        intensity={0.95}
        position={[5, 9, 3]}
        color="#f0d7a0"
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight intensity={0.7} position={[-3.5, 2.6, -3]} color="#ff7a55" />
      <pointLight intensity={0.5} position={[0, 2.8, 0]} color="#4fd0c8" />

      {/* Floor with slight tile feel */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[14, 12]} />
        <meshStandardMaterial color="#1a1410" roughness={0.92} />
      </mesh>
      {/* Carpet runner aisle */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0.4]}>
        <planeGeometry args={[2.2, 8.5]} />
        <meshStandardMaterial color="#241912" roughness={1} />
      </mesh>

      {/* Ceiling */}
      <mesh position={[0, 3.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[14, 12]} />
        <meshStandardMaterial color="#0e0b09" roughness={1} />
      </mesh>
      {/* Ceiling panels / lights */}
      {[-3, 0, 3].map((x) => (
        <group key={x} position={[x, 3.05, -1]}>
          <mesh>
            <boxGeometry args={[1.6, 0.06, 0.5]} />
            <meshStandardMaterial
              color="#f3e6c8"
              emissive="#e8b84a"
              emissiveIntensity={0.35}
            />
          </mesh>
        </group>
      ))}

      {/* Exterior walls */}
      <mesh position={[0, 1.6, -5.5]} castShadow>
        <boxGeometry args={[14, 3.2, 0.25]} />
        <meshStandardMaterial color="#14100d" />
      </mesh>
      <mesh position={[-7, 1.6, 0]} castShadow>
        <boxGeometry args={[0.25, 3.2, 12]} />
        <meshStandardMaterial color="#14100d" />
      </mesh>
      <mesh position={[7, 1.6, 0]} castShadow>
        <boxGeometry args={[0.25, 3.2, 12]} />
        <meshStandardMaterial color="#14100d" />
      </mesh>
      <mesh position={[0, 1.6, 5.5]} castShadow>
        <boxGeometry args={[14, 3.2, 0.25]} />
        <meshStandardMaterial color="#120e0b" />
      </mesh>

      {/* Baseboards */}
      <mesh position={[0, 0.08, -5.35]}>
        <boxGeometry args={[13.5, 0.16, 0.08]} />
        <meshStandardMaterial color="#3a2c22" />
      </mesh>

      {/* Low cubicle divider */}
      <mesh position={[0.2, 0.7, -1.8]} castShadow>
        <boxGeometry args={[0.08, 1.4, 3.2]} />
        <meshStandardMaterial color="#2a2118" roughness={0.8} />
      </mesh>
      <mesh position={[0.2, 1.35, -1.8]}>
        <boxGeometry args={[0.06, 0.12, 3.2]} />
        <meshStandardMaterial color="#4fd0c8" emissive="#4fd0c8" emissiveIntensity={0.2} />
      </mesh>

      {/* Player workstation + chair in sit zone */}
      <Workstation position={[2.4, 0, -2.9]} />
      <OfficeChair position={[2.4, 0, -1.55]} />

      {/* Morgan station */}
      <Workstation position={[-2.5, 0, 1.0]} dualGlow={false} />
      <OfficeChair position={[-2.5, 0, 2.2]} />
      <Figure
        position={[-2.5, 0, 2.15]}
        rotationY={Math.PI}
        primary="#8a9a8e"
        secondary="#2a322c"
        accent="#4fd0c8"
        seated
      />

      {/* Alert wall bank */}
      <group position={[-3.8, 0, -3.6]}>
        <mesh position={[0, 0.55, 0.15]} castShadow>
          <boxGeometry args={[2.8, 0.12, 0.55]} />
          <meshStandardMaterial color="#2a2118" />
        </mesh>
        {[-0.85, 0, 0.85].map((x) => (
          <mesh key={x} position={[x, 1.35, 0]} castShadow>
            <boxGeometry args={[0.75, 1.1, 0.08]} />
            <meshStandardMaterial
              color="#080e12"
              emissive="#ff6b4a"
              emissiveIntensity={0.4 + Math.abs(x) * 0.1}
            />
          </mesh>
        ))}
        <mesh position={[0, 2.05, 0]}>
          <boxGeometry args={[2.6, 0.12, 0.1]} />
          <meshStandardMaterial color="#1a130f" />
        </mesh>
      </group>

      {/* Coffee nook */}
      <group position={[4.0, 0, 2.6]}>
        <mesh position={[0, 0.48, 0]} castShadow>
          <cylinderGeometry args={[0.5, 0.55, 0.95, 20]} />
          <meshStandardMaterial color="#3a2c22" roughness={0.75} />
        </mesh>
        <mesh position={[0, 0.98, 0]}>
          <cylinderGeometry args={[0.52, 0.52, 0.04, 20]} />
          <meshStandardMaterial color="#2a2118" />
        </mesh>
        <mesh position={[0.15, 1.08, 0.1]}>
          <cylinderGeometry args={[0.09, 0.08, 0.16, 12]} />
          <meshStandardMaterial color="#f3e6c8" />
        </mesh>
        <mesh position={[-0.2, 1.12, -0.05]}>
          <boxGeometry args={[0.2, 0.28, 0.15]} />
          <meshStandardMaterial color="#5c4634" />
        </mesh>
      </group>

      {/* Side analyst (standing near alerts) */}
      <Figure
        position={[-4.2, 0, -1.6]}
        rotationY={0.4}
        primary="#6a7a88"
        secondary="#1e2428"
        accent="#ff6b4a"
      />

      {/* Door / exit */}
      <group position={[0, 0, 5.25]}>
        <mesh position={[0, 1.35, 0]}>
          <boxGeometry args={[1.6, 2.7, 0.12]} />
          <meshStandardMaterial color="#1a130f" />
        </mesh>
        <mesh position={[0, 1.35, 0.06]}>
          <boxGeometry args={[1.2, 2.3, 0.06]} />
          <meshStandardMaterial
            color="#0f1716"
            emissive="#4fd0c8"
            emissiveIntensity={0.18}
          />
        </mesh>
        <mesh position={[0.45, 1.3, 0.12]}>
          <sphereGeometry args={[0.05, 10, 10]} />
          <meshStandardMaterial color="#e8b84a" metalness={0.7} />
        </mesh>
      </group>

      {/* Wall accent strip */}
      <mesh position={[0, 2.4, -5.35]}>
        <boxGeometry args={[13.5, 0.06, 0.05]} />
        <meshStandardMaterial color="#e8b84a" emissive="#e8b84a" emissiveIntensity={0.25} />
      </mesh>

      {HOTSPOTS.map((def) => (
        <Hotspot
          active={activeHotspot === def.id}
          def={def}
          key={def.id}
        />
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
