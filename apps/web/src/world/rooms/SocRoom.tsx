import { ContactShadows } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Figure } from "../Figure.js";
import { Hotspot, nearestHotspot } from "../Hotspot.js";
import { NameTag } from "../NameTag.js";
import { PlayerController } from "../PlayerController.js";
import { DustMotes, VentPapers } from "../props/atmosphere.js";
import { CeilingAC, OfficeWindow, Thermostat, WallPanel } from "../props/building.js";
import {
  AccentPoster,
  FramedCertificate,
  TallFloorPlant,
  WallArt,
  WallClock,
} from "../props/decor.js";
import { CarpetRunner, FloorTileGrid } from "../props/floor.js";
import {
  CoatRack,
  MonitorArmDesk,
  OfficeChair,
  PersonalLockers,
  StorageCabinet,
  TrashBin,
} from "../props/furniture.js";
import { CeilingFixture } from "../props/lighting.js";
import { MeshLabel, WallCalendar, Whiteboard } from "../props/signage.js";
import { DocumentShredder, SecurityCamera, ServerRack } from "../props/tech.js";
import { Workstation } from "../Workstation.js";
import type { HotspotId } from "../worldTypes.js";
import { BREAK_NOOK, GlassBreakNook } from "./GlassBreakNook.js";
import {
  ALERT_POS,
  BASE_HOTSPOTS,
  BREAK_INTERIOR_HOTSPOTS,
  CHAIR_FACE_DESK,
  COL,
  HOT_DESK,
  INNER,
  MORGAN_DESK,
  PLAYER_DESK,
  PLAYER_SPAWN,
  ROOM,
  ROW,
  SAMIR_DESK,
  SEAT,
  socColliders,
} from "./socLayout.js";
import { DeskMonitorScreen } from "../deskOs/DeskMonitorScreen.js";
import type { AvailableAction, ClientView } from "@sim/schemas";
import type { SpatialPhase } from "../worldTypes.js";

/**
 * Parallel grid layout (enlarged room):
 * - Center aisle on X=0
 * - North desk row: You (east) + Morgan (west), mirrored
 * - Mid desk: empty desk on WEST only — far south of Morgan
 * - East corridor clear for break access
 *
 * Every coordinate lives in socLayout.ts so the reachability test can guard it.
 */

function AlertWall() {
  return (
    <group position={ALERT_POS}>
      <mesh position={[0, 0.78, 0.15]} castShadow receiveShadow>
        <boxGeometry args={[3.6, 0.08, 0.85]} />
        <meshStandardMaterial color="#2a2118" roughness={0.55} />
      </mesh>
      {(
        [
          [-1.55, 0.4],
          [1.55, 0.4],
          [-1.55, -0.15],
          [1.55, -0.15],
        ] as const
      ).map(([x, z], i) => (
        <mesh key={i} position={[x, 0.39, z]} castShadow>
          <boxGeometry args={[0.1, 0.78, 0.1]} />
          <meshStandardMaterial color="#16110e" />
        </mesh>
      ))}
      <mesh position={[0, 0.35, -0.22]} castShadow>
        <boxGeometry args={[3.4, 0.7, 0.05]} />
        <meshStandardMaterial color="#1f1814" roughness={0.75} />
      </mesh>
      <mesh position={[0, 1.55, -0.55]} castShadow>
        <boxGeometry args={[3.5, 0.12, 0.08]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.4} />
      </mesh>
      {([-1.15, 0, 1.15] as const).map((x, i) => (
        <group key={x} position={[x, 1.65, -0.42]}>
          <mesh position={[0, -0.15, -0.08]}>
            <boxGeometry args={[0.12, 0.35, 0.1]} />
            <meshStandardMaterial color="#2a2a2a" metalness={0.45} />
          </mesh>
          <mesh castShadow>
            <boxGeometry args={[1.0, 0.72, 0.07]} />
            <meshStandardMaterial color="#0a0a0a" metalness={0.25} />
          </mesh>
          <mesh position={[0, 0, 0.04]}>
            <boxGeometry args={[0.9, 0.62, 0.02]} />
            <meshStandardMaterial
              color="#05080a"
              emissive={i === 1 ? "#ff6b4a" : i === 0 ? "#e8b84a" : "#4fd0c8"}
              emissiveIntensity={0.65}
            />
          </mesh>
        </group>
      ))}
      <pointLight intensity={0.85} distance={5} position={[0, 1.8, 0.6]} color="#ff6b4a" />
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
  seated = false,
  maximized = false,
  deskPhase,
  view,
  onAction,
  guided = false,
  highlightHotspotId,
  onLoginSuccess,
  onStand,
  onMaximize,
  onMinimize,
}: {
  onNearbyChange: (id?: HotspotId, label?: string) => void;
  onInteract: (id: HotspotId) => void;
  enabled: boolean;
  seated?: boolean;
  maximized?: boolean;
  highlightHotspotId?: HotspotId;
  deskPhase?: Extract<SpatialPhase, "desk_login" | "seated_monitor" | "focus_desk">;
  view?: ClientView;
  onAction?: (action: AvailableAction, freeText?: string) => void;
  guided?: boolean;
  onLoginSuccess?: () => void;
  onStand?: () => void;
  onMaximize?: () => void;
  onMinimize?: () => void;
}) {
  const nearbyId = useRef<HotspotId | undefined>(undefined);
  const playerPos = useRef<[number, number, number]>([...PLAYER_SPAWN]);
  const publishedLook = useRef<[number, number, number]>([...PLAYER_SPAWN]);
  const [lookAt, setLookAt] = useState<[number, number, number]>([
    ...PLAYER_SPAWN,
  ]);
  const [activeHotspot, setActiveHotspot] = useState<HotspotId | undefined>();
  const [doorOpen, setDoorOpen] = useState(false);
  const [openCabinet, setOpenCabinet] = useState<string | null>(null);
  const { gl } = useThree();

  const hotspots = useMemo(() => {
    const list = [...BASE_HOTSPOTS];
    if (doorOpen) list.push(...BREAK_INTERIOR_HOTSPOTS);
    return list.map((h) =>
      h.id === "break_door"
        ? {
            ...h,
            label: doorOpen ? "Close break door" : "Open break door",
          }
        : h,
    );
  }, [doorOpen]);

  const colliders = useMemo(() => socColliders(doorOpen), [doorOpen]);

  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.55;
  }, [gl]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!enabled || event.code !== "KeyE") return;
      const near = nearestHotspot(playerPos.current, hotspots);
      if (near) onInteract(near.id);
    };
    const onToggle = () => {
      setDoorOpen((v) => !v);
    };
    const onStorage = () => {
      setOpenCabinet((prev) => (prev ? null : "open"));
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("soc-break-door", onToggle);
    window.addEventListener("soc-storage", onStorage);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("soc-break-door", onToggle);
      window.removeEventListener("soc-storage", onStorage);
    };
  }, [enabled, hotspots, onInteract]);

  useEffect(() => {
    const near = nearestHotspot(playerPos.current, hotspots);
    nearbyId.current = near?.id;
    setActiveHotspot(near?.id);
    onNearbyChange(near?.id, near?.label);
  }, [doorOpen, hotspots, onNearbyChange]);

  function handlePosition(next: [number, number, number]) {
    playerPos.current = next;
    const near = nearestHotspot(next, hotspots);
    if (near?.id !== nearbyId.current) {
      nearbyId.current = near?.id;
      setActiveHotspot(near?.id);
      onNearbyChange(near?.id, near?.label);
    }
    const prev = publishedLook.current;
    if (
      Math.hypot(next[0] - prev[0], next[1] - prev[1], next[2] - prev[2]) >
      0.4
    ) {
      publishedLook.current = next;
      setLookAt(next);
    }
  }

  const floorW = ROOM.halfX * 2;
  const floorD = ROOM.halfZ * 2;

  return (
    <>
      <color attach="background" args={["#1a1410"]} />
      <fog attach="fog" args={["#1a1410", seated ? 14 : 20, seated ? 28 : 38]} />
      {/*
        Brightness comes mostly from hemisphere/ambient and emissive ceiling
        panels. Each extra point light costs per-fragment work on every
        material in the room, so the room runs on three broad fills instead of
        a light per fixture.
      */}
      <hemisphereLight args={["#ffeed4", "#4a3a2c", seated ? 1.15 : 1.85]} />
      <ambientLight intensity={seated ? 0.9 : 1.05} />
      <directionalLight
        castShadow={!seated}
        intensity={seated ? 1.15 : 1.75}
        position={[5, 10, 5]}
        color="#fff0d0"
        shadow-mapSize-width={512}
        shadow-mapSize-height={512}
        shadow-bias={-0.0002}
      />
      {!seated ? (
        <>
          <pointLight intensity={1.5} distance={20} position={[0, 2.5, 0]} color="#ffe8b8" />
          <pointLight intensity={1.0} distance={15} position={[-6.5, 2.4, 2.0]} color="#ffe4b0" />
          <pointLight intensity={0.45} distance={9} position={[-6, 2.2, -3]} color="#4fd0c8" />
        </>
      ) : (
        <pointLight intensity={0.85} distance={8} position={[COL.east, 2.1, ROW.north]} color="#ffe8b8" />
      )}

      <mesh receiveShadow={!seated} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[floorW, floorD]} />
        <meshStandardMaterial color="#2e261f" roughness={0.92} />
      </mesh>
      {!seated ? <FloorTileGrid rangeX={10} rangeZ={8} step={1.7} /> : null}

      {/* Parallel carpets: center aisle + matching desk pads */}
      <CarpetRunner position={[0, 0, 0.4]} size={[2.4, floorD - 3]} color="#4a3228" />
      <CarpetRunner
        position={[COL.east, 0, ROW.north + 0.35]}
        size={[2.8, 3.6]}
        color="#5a3a2e"
      />
      <CarpetRunner
        position={[COL.west, 0, ROW.north + 0.35]}
        size={[2.8, 3.6]}
        color="#5a3a2e"
      />
      <CarpetRunner
        position={[COL.west, 0, ROW.mid + 0.35]}
        size={[2.8, 3.6]}
        color="#5a3a2e"
      />
      <CarpetRunner
        position={[
          (BREAK_NOOK.cornerX + BREAK_NOOK.wallX) / 2,
          0,
          (BREAK_NOOK.cornerZ + BREAK_NOOK.wallZ) / 2,
        ]}
        size={[
          BREAK_NOOK.wallX - BREAK_NOOK.cornerX - 0.35,
          BREAK_NOOK.cornerZ - BREAK_NOOK.wallZ - 0.35,
        ]}
        color="#4a3a32"
      />

      <mesh position={[0, 3.35, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[floorW, floorD]} />
        <meshStandardMaterial color="#241c16" />
      </mesh>
      {/* Three fixtures carry real lights; the rest are emissive panels only */}
      <CeilingFixture lit={!seated} position={[-4, 3.2, -2]} />
      <CeilingFixture lit position={[0, 3.2, 0.5]} />
      <CeilingFixture lit={!seated} position={[COL.east, 3.2, -1.5]} />
      {!seated ? (
        <>
          <CeilingFixture light={false} position={[0, 3.2, 4]} />
          <CeilingFixture light={false} position={[8, 3.2, -5]} />
          <CeilingFixture light={false} position={[-8, 3.2, 2.5]} />
          <CeilingFixture light={false} position={[-8, 3.2, -4.5]} />
          <CeilingFixture light={false} position={[4.5, 3.2, 4.5]} />
          <CeilingFixture light={false} position={[-4, 3.2, 5.5]} />
          <CeilingFixture light={false} position={[8.5, 3.2, 1.5]} />
        </>
      ) : null}
      {!seated ? (
        <>
          <CeilingAC position={[0, 3.12, -0.5]} />
          <CeilingAC position={[-5, 3.12, 2.5]} rotationY={Math.PI / 2} />
        </>
      ) : null}

      <WallPanel position={[0, 1.65, -ROOM.halfZ]} size={[floorW, 3.3, 0.3]} />
      <WallPanel position={[-ROOM.halfX, 1.65, 0]} size={[0.3, 3.3, floorD]} />
      <WallPanel position={[ROOM.halfX, 1.65, 0]} size={[0.3, 3.3, floorD]} />
      {/* South wall split around exit doorway */}
      <WallPanel
        position={[-(floorW / 4 + 0.55), 1.65, ROOM.halfZ]}
        size={[floorW / 2 - 1.1, 3.3, 0.3]}
        color="#26201a"
      />
      <WallPanel
        position={[floorW / 4 + 0.55, 1.65, ROOM.halfZ]}
        size={[floorW / 2 - 1.1, 3.3, 0.3]}
        color="#26201a"
      />
      {/* Lintel over exit */}
      <mesh position={[0, 2.85, ROOM.halfZ]} castShadow>
        <boxGeometry args={[2.2, 0.9, 0.32]} />
        <meshStandardMaterial color="#26201a" roughness={0.85} />
      </mesh>

      <mesh position={[0, 0.1, -ROOM.halfZ + 0.2]}>
        <boxGeometry args={[floorW - 1, 0.2, 0.08]} />
        <meshStandardMaterial color="#4a3a2c" />
      </mesh>
      <mesh position={[0, 2.7, -ROOM.halfZ + 0.2]}>
        <boxGeometry args={[floorW - 1, 0.05, 0.05]} />
        <meshStandardMaterial color="#e8b84a" emissive="#e8b84a" emissiveIntensity={0.55} />
      </mesh>

      {!seated ? (
        <>
          <SecurityCamera position={[-ROOM.halfX + 1.1, 2.85, ROOM.halfZ - 1.5]} rotationY={Math.PI * 0.65} />
          <SecurityCamera position={[ROOM.halfX - 1.1, 2.85, ROOM.halfZ - 1.5]} rotationY={-Math.PI * 0.65} />
        </>
      ) : null}

      <WallClock position={[0, 2.55, -ROOM.halfZ + 0.3]} />
      {/* Clear of the whiteboard's west edge at x=2.4 */}
      <Thermostat position={[1.55, 1.55, -ROOM.halfZ + 0.25]} />

      {/* West wall: window sits north of Samir, clear of the parts cabinets */}
      <OfficeWindow
        position={[-ROOM.halfX + 0.16, 1.85, -2.3]}
        rotationY={Math.PI / 2}
        width={2.6}
        height={1.9}
      />
      {/* Flush to the wall face, and clear of the window casing on both sides */}
      <FramedCertificate
        position={[INNER.minX + 0.015, 1.8, -4.3]}
        rotationY={Math.PI / 2}
        title="SOC TIER-1"
      />
      <FramedCertificate
        position={[INNER.minX + 0.015, 1.8, 0]}
        rotationY={Math.PI / 2}
        title="SECURE OPS"
        accent="#4fd0c8"
      />
      {/* Art on the long east wall, south of the break glass */}
      <WallArt
        position={[INNER.maxX - 0.03, 1.85, 2.6]}
        rotationY={-Math.PI / 2}
        width={1.35}
        height={0.95}
      />
      {/* North wall, in the gap between the alert boards and the poster */}
      <WallArt
        position={[-1.4, 1.8, -ROOM.halfZ + 0.27]}
        variant={1}
        width={1.15}
        height={0.85}
      />

      {/* Mirrored desk row — same facing, clear east corridor to break */}
      <Workstation
        position={PLAYER_DESK}
        showLoginNote
        clutterVariant={0}
        {...(deskPhase &&
        view &&
        onAction &&
        onLoginSuccess &&
        onStand &&
        onMaximize &&
        onMinimize
          ? {
              monitorScreen: (
                <DeskMonitorScreen
                  guided={guided}
                  maximized={maximized}
                  onAction={onAction}
                  onLoginSuccess={onLoginSuccess}
                  onMaximize={onMaximize}
                  onMinimize={onMinimize}
                  onStand={onStand}
                  phase={deskPhase}
                  view={view}
                />
              ),
            }
          : {})}
      />
      <OfficeChair
        position={[PLAYER_DESK[0], 0, PLAYER_DESK[2] + SEAT]}
        rotationY={CHAIR_FACE_DESK}
      />
      <NameTag
        visible={!seated}
        name="You"
        role="Day one"
        position={[PLAYER_DESK[0], 2.3, PLAYER_DESK[2] + SEAT]}
        star
        target={highlightHotspotId === "desk_player"}
      />

      <Workstation
        position={MORGAN_DESK}
        deskColor="#26201a"
        leftEmissive="#e8b84a"
        rightEmissive="#4fd0c8"
        showLamp={false}
        clutterVariant={1}
      />
      <OfficeChair
        position={[MORGAN_DESK[0], 0, MORGAN_DESK[2] + SEAT]}
        rotationY={CHAIR_FACE_DESK}
      />
      <Figure
        activity="talking"
        animated={!seated}
        lookAt={lookAt}
        position={[MORGAN_DESK[0], 0, MORGAN_DESK[2] + SEAT - 0.05]}
        rotationY={CHAIR_FACE_DESK}
        primary="#7d9088"
        secondary="#2e3c36"
        accent="#4fd0c8"
        hair="#1a120c"
        seated
        seed={1}
      />
      <NameTag
        visible={!seated}
        name="Morgan"
        role="Manager"
        position={[MORGAN_DESK[0], 2.25, MORGAN_DESK[2] + SEAT - 0.05]}
        star
      />

      {/* Empty desk — west mid row, well south of Morgan */}
      <Workstation
        position={HOT_DESK}
        showLamp={false}
        deskColor="#2a221c"
        clutterVariant={2}
      />
      <OfficeChair
        position={[HOT_DESK[0], 0, HOT_DESK[2] + SEAT]}
        rotationY={CHAIR_FACE_DESK}
      />
      <VentPapers animated={!seated} position={[-3.85, 0.824, 3.55]} />

      {/* Priya stands across the aisle, well clear of the player cubicle */}
      <Figure
        activity="idle"
        animated={!seated}
        lookAt={lookAt}
        position={[-1.65, 0, 2.5]}
        rotationY={2.2}
        primary="#8a7a68"
        secondary="#32281e"
        accent="#e8b84a"
        hair="#241610"
        seed={2}
      />
      <NameTag
        visible={!seated}
        name="Priya"
        role="Coworker"
        position={[-1.65, 2.26, 2.5]}
      />

      {/* Samir on west wall — clear of storage */}
      <MonitorArmDesk position={SAMIR_DESK} rotationY={Math.PI / 2} />
      <OfficeChair
        position={[SAMIR_DESK[0] + 1.05, 0, SAMIR_DESK[2]]}
        rotationY={-Math.PI / 2}
      />
      <Figure
        activity="typing"
        animated={!seated}
        lookAt={lookAt}
        position={[SAMIR_DESK[0] + 1.0, 0, SAMIR_DESK[2]]}
        rotationY={-Math.PI / 2}
        primary="#6a7a88"
        secondary="#243038"
        accent="#ff6b4a"
        hair="#2a1c12"
        seated
        seed={3}
      />
      <NameTag
        visible={!seated}
        name="Samir"
        role="Tier 2"
        position={[SAMIR_DESK[0] + 1.0, 2.25, SAMIR_DESK[2]]}
      />

      <AlertWall />
      {/* Racks read front-on from the aisle, so they belong on the north wall */}
      <ServerRack position={[-9.8, 0.9, -6.92]} />
      <ServerRack position={[-9.0, 0.9, -6.92]} />
      <ServerRack position={[-8.2, 0.9, -6.92]} />
      <DustMotes
        animated={!seated}
        count={180}
        depth={12}
        position={[0, 1.55, 0.4]}
        width={16}
      />
      <DustMotes
        animated={!seated}
        count={50}
        depth={1.8}
        height={2.0}
        position={[-9.0, 1.35, -6.35]}
        width={2.4}
      />
      <Whiteboard position={[COL.east - 0.8, 1.8, -ROOM.halfZ + 0.25]} />
      <WallCalendar position={[COL.east + 1.0, 1.85, -ROOM.halfZ + 0.25]} />
      <AccentPoster position={[0, 1.7, -ROOM.halfZ + 0.25]} color="#2a4840" />

      {/* Only CABLES + ADAPTERS — south of Samir, flush to the west wall */}
      <StorageCabinet
        position={[-10.42, 0.78, 4.0]}
        label="CABLES"
        rotationY={Math.PI / 2}
        open={openCabinet !== null}
      />
      <StorageCabinet
        position={[-10.42, 0.78, 5.2]}
        label="ADAPTERS"
        rotationY={Math.PI / 2}
        open={openCabinet !== null}
      />
      <DocumentShredder position={[-10.45, 0, 3.0]} rotationY={Math.PI / 2} />
      {/* Shared bins live along the walls, never inside a cubicle footprint */}
      <TrashBin position={[-10.5, 0, 1.8]} />
      <TrashBin position={[-10.5, 0, 2.32]} recycling />

      {/* Entrance: coat/lockers east; planters tucked to south-wall corners */}
      <CoatRack position={[7.2, 0, ROW.south - 0.15]} />
      <PersonalLockers position={[8.8, 0.95, ROW.south - 0.15]} />
      <TrashBin position={[6.2, 0, ROW.south - 0.15]} />
      <TrashBin position={[5.8, 0, ROW.south - 0.15]} recycling />
      <TallFloorPlant position={[-3.6, 0, ROOM.halfZ - 0.85]} scale={0.95} />
      <TallFloorPlant position={[5.15, 0, ROOM.halfZ - 0.85]} scale={0.95} />

      <GlassBreakNook
        animated={!seated}
        cheapGlass={seated}
        doorOpen={doorOpen}
        lookAt={lookAt}
      />

      {/* Exit door — frame, leaf, and readable label */}
      <group position={[0, 0, ROOM.halfZ - 0.2]}>
        <mesh position={[-0.95, 1.25, 0]} castShadow>
          <boxGeometry args={[0.14, 2.5, 0.18]} />
          <meshStandardMaterial color="#3a2c22" roughness={0.65} />
        </mesh>
        <mesh position={[0.95, 1.25, 0]} castShadow>
          <boxGeometry args={[0.14, 2.5, 0.18]} />
          <meshStandardMaterial color="#3a2c22" roughness={0.65} />
        </mesh>
        <mesh position={[0, 2.55, 0]} castShadow>
          <boxGeometry args={[2.05, 0.14, 0.2]} />
          <meshStandardMaterial color="#3a2c22" roughness={0.65} />
        </mesh>
        <mesh position={[0, 1.25, 0.02]} castShadow>
          <boxGeometry args={[1.7, 2.4, 0.08]} />
          <meshStandardMaterial
            color="#0f1716"
            emissive="#4fd0c8"
            emissiveIntensity={0.18}
            roughness={0.45}
            metalness={0.2}
          />
        </mesh>
        <mesh position={[0.65, 1.25, 0.08]}>
          <boxGeometry args={[0.06, 0.28, 0.05]} />
          <meshStandardMaterial color="#c4a060" metalness={0.55} roughness={0.35} />
        </mesh>
        <mesh position={[0, 2.35, -0.06]}>
          <boxGeometry args={[0.7, 0.18, 0.04]} />
          <meshStandardMaterial color="#1a3028" />
        </mesh>
        <MeshLabel text="EXIT" position={[0, 2.35, -0.09]} width={0.55} height={0.12} />
        <mesh position={[0, 0.04, -0.15]} receiveShadow>
          <boxGeometry args={[2.0, 0.06, 0.45]} />
          <meshStandardMaterial color="#4a3a2c" roughness={0.8} />
        </mesh>
      </group>

      {!seated ? (
        <ContactShadows opacity={0.16} scale={24} blur={2.4} far={4.5} color="#1a1008" frames={1} />
      ) : null}

      {!seated
        ? hotspots.map((def) => (
            <Hotspot active={activeHotspot === def.id} def={def} key={def.id} />
          ))
        : null}

      <PlayerController
        colliders={colliders}
        enabled={enabled}
        maximized={maximized}
        onPosition={handlePosition}
        seatLookAt={
          maximized
            ? [PLAYER_DESK[0] - 0.42, 1.28, PLAYER_DESK[2] - 0.55]
            : [PLAYER_DESK[0] - 0.42, 1.22, PLAYER_DESK[2] - 0.35]
        }
        seatPosition={
          maximized
            ? [PLAYER_DESK[0] - 0.42, 1.32, PLAYER_DESK[2] + 0.55]
            : [PLAYER_DESK[0], 1.35, PLAYER_DESK[2] + SEAT - 0.1]
        }
        seated={seated}
        spawn={PLAYER_SPAWN}
      />
      <FloorClick enabled={enabled && !seated} />
    </>
  );
}
