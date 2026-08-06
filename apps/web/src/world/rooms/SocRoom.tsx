import { useThree } from "@react-three/fiber";
import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { Hotspot, nearestHotspot, type HotspotDef } from "../Hotspot.js";
import {
  PlayerController,
  type Aabb,
} from "../PlayerController.js";
import type { HotspotId } from "../worldTypes.js";

const HOTSPOTS: HotspotDef[] = [
  {
    id: "desk_player",
    label: "Your desk",
    position: [2.2, 0, -2.8],
    radius: 1.35,
  },
  {
    id: "alert_wall",
    label: "Alert wall",
    position: [-3.6, 0, -3.2],
    radius: 1.4,
  },
  {
    id: "morgan_station",
    label: "Morgan's station",
    position: [-2.4, 0, 1.6],
    radius: 1.3,
  },
  {
    id: "coffee",
    label: "Coffee nook",
    position: [3.8, 0, 2.4],
    radius: 1.1,
  },
  {
    id: "door_exit",
    label: "Exit to floor map",
    position: [0, 0, 4.1],
    radius: 1.2,
  },
];

const COLLIDERS: Aabb[] = [
  { minX: 1.2, maxX: 3.4, minZ: -3.6, maxZ: -1.8 }, // player desk
  { minX: -4.6, maxX: -2.4, minZ: -4.0, maxZ: -2.4 }, // alert bank
  { minX: -3.4, maxX: -1.2, minZ: 0.7, maxZ: 2.5 }, // morgan desk
  { minX: 3.1, maxX: 4.6, minZ: 1.7, maxZ: 3.2 }, // coffee
];

function Desk({
  position,
  color = "#3a2c22",
}: {
  position: [number, number, number];
  color?: string;
}) {
  return (
    <group position={position}>
      <mesh position={[0, 0.75, 0]} castShadow>
        <boxGeometry args={[1.8, 0.08, 0.9]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      <mesh position={[-0.75, 0.38, 0.35]}>
        <boxGeometry args={[0.08, 0.75, 0.08]} />
        <meshStandardMaterial color="#241912" />
      </mesh>
      <mesh position={[0.75, 0.38, 0.35]}>
        <boxGeometry args={[0.08, 0.75, 0.08]} />
        <meshStandardMaterial color="#241912" />
      </mesh>
      <mesh position={[-0.75, 0.38, -0.35]}>
        <boxGeometry args={[0.08, 0.75, 0.08]} />
        <meshStandardMaterial color="#241912" />
      </mesh>
      <mesh position={[0.75, 0.38, -0.35]}>
        <boxGeometry args={[0.08, 0.75, 0.08]} />
        <meshStandardMaterial color="#241912" />
      </mesh>
      <mesh position={[-0.35, 1.05, -0.15]}>
        <boxGeometry args={[0.55, 0.4, 0.06]} />
        <meshStandardMaterial
          color="#0a1214"
          emissive="#4fd0c8"
          emissiveIntensity={0.55}
        />
      </mesh>
      <mesh position={[0.35, 1.05, -0.15]}>
        <boxGeometry args={[0.55, 0.4, 0.06]} />
        <meshStandardMaterial
          color="#0a1214"
          emissive="#e8b84a"
          emissiveIntensity={0.4}
        />
      </mesh>
      <mesh position={[0, 0.45, 0.7]}>
        <boxGeometry args={[0.45, 0.08, 0.45]} />
        <meshStandardMaterial color="#5c4634" />
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
  const [playerPos, setPlayerPos] = useState<[number, number, number]>([
    0, 1.6, 4.5,
  ]);
  const nearby = useMemo(
    () => nearestHotspot(playerPos, HOTSPOTS),
    [playerPos],
  );

  useEffect(() => {
    onNearbyChange(nearby?.id, nearby?.label);
  }, [nearby, onNearbyChange]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!enabled || event.code !== "KeyE" || !nearby) return;
      onInteract(nearby.id);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [enabled, nearby, onInteract]);

  return (
    <>
      <color attach="background" args={["#0a0706"]} />
      <fog attach="fog" args={["#0a0706", 8, 18]} />
      <ambientLight intensity={0.28} />
      <directionalLight
        castShadow
        intensity={0.85}
        position={[4, 8, 2]}
        color="#e8b84a"
      />
      <pointLight intensity={1.1} position={[2.2, 2.2, -2.4]} color="#4fd0c8" />
      <pointLight intensity={0.55} position={[-3.2, 2.4, -2.8]} color="#ff6b4a" />

      <mesh
        receiveShadow
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
      >
        <planeGeometry args={[12, 10]} />
        <meshStandardMaterial color="#1c1410" roughness={0.95} />
      </mesh>

      {/* Walls */}
      <mesh position={[0, 1.5, -5]}>
        <boxGeometry args={[12, 3, 0.2]} />
        <meshStandardMaterial color="#15100d" />
      </mesh>
      <mesh position={[-6, 1.5, 0]}>
        <boxGeometry args={[0.2, 3, 10]} />
        <meshStandardMaterial color="#15100d" />
      </mesh>
      <mesh position={[6, 1.5, 0]}>
        <boxGeometry args={[0.2, 3, 10]} />
        <meshStandardMaterial color="#15100d" />
      </mesh>
      <mesh position={[0, 1.5, 5]}>
        <boxGeometry args={[12, 3, 0.2]} />
        <meshStandardMaterial color="#120d0a" />
      </mesh>

      <Desk position={[2.2, 0, -2.8]} />
      <Desk position={[-2.4, 0, 1.6]} color="#2a1f18" />

      {/* Alert wall bank */}
      <group position={[-3.6, 0, -3.4]}>
        <mesh position={[0, 1.3, 0]}>
          <boxGeometry args={[2.4, 1.4, 0.12]} />
          <meshStandardMaterial
            color="#0b1012"
            emissive="#ff6b4a"
            emissiveIntensity={0.35}
          />
        </mesh>
        <mesh position={[0, 0.5, 0.2]}>
          <boxGeometry args={[2.5, 0.1, 0.5]} />
          <meshStandardMaterial color="#3a2c22" />
        </mesh>
      </group>

      {/* Coffee nook */}
      <group position={[3.8, 0, 2.4]}>
        <mesh position={[0, 0.45, 0]}>
          <cylinderGeometry args={[0.45, 0.5, 0.9, 16]} />
          <meshStandardMaterial color="#3a2c22" />
        </mesh>
        <mesh position={[0, 0.95, 0]}>
          <cylinderGeometry args={[0.12, 0.1, 0.18, 12]} />
          <meshStandardMaterial color="#f3e6c8" />
        </mesh>
      </group>

      {/* Door frame */}
      <mesh position={[0, 1.2, 4.85]}>
        <boxGeometry args={[1.4, 2.4, 0.15]} />
        <meshStandardMaterial color="#241912" />
      </mesh>
      <mesh position={[0, 1.2, 4.9]}>
        <boxGeometry args={[1.1, 2.1, 0.08]} />
        <meshStandardMaterial color="#4fd0c8" emissive="#4fd0c8" emissiveIntensity={0.15} />
      </mesh>

      {/* Morgan presence */}
      <mesh position={[-2.4, 1.1, 2.3]}>
        <capsuleGeometry args={[0.22, 0.7, 4, 8]} />
        <meshStandardMaterial color="#e8b84a" />
      </mesh>

      {HOTSPOTS.map((def) => (
        <Hotspot
          active={nearby?.id === def.id}
          def={def}
          key={def.id}
          playerPosition={playerPos}
        />
      ))}

      <PlayerController
        colliders={COLLIDERS}
        enabled={enabled}
        onPosition={setPlayerPos}
      />
      <FloorClick enabled={enabled} />
    </>
  );
}
