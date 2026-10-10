import { coffeeControl, fridgeControl } from "../breakRoom.js";
import { ContactShadows } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ClientWorkplaceState } from "@sim/schemas";
import * as THREE from "three";
import { Figure } from "../Figure.js";
import { SocLighting } from "./SocLighting.js";
import { Hotspot, nearestHotspot } from "../Hotspot.js";
import { NameTag } from "../NameTag.js";
import { PlayerController } from "../PlayerController.js";
import { useWorldQuality } from "../effects/useAdaptiveQuality.js";
import { useAmbientMotion } from "../props/ambient.js";
import { AmbientClockDriver, useAmbient } from "../props/ambientClock.js";
import { DustMotes, VentPapers } from "../props/atmosphere.js";
import {
  CeilingAC,
  FeatureWall,
  FROSTED_PANE_HEIGHT,
  FrostedGlassWall,
  Thermostat,
  WallPanel,
} from "../props/building.js";
import {
  AccentPoster,
  FramedCertificate,
  HeroPlant,
  TallFloorPlant,
  WallArt,
  WallClock,
} from "../props/decor.js";
import { CarpetRunner, OakFloor } from "../props/floor.js";
import {
  CoatRack,
  Credenza,
  DESK_SURFACE_Y,
  MonitorArmDesk,
  OfficeChair,
  PersonalLockers,
  StorageCabinet,
  TrashBin,
} from "../props/furniture.js";
import { CeilingFixture, LinearPendants, SpotTrack } from "../props/lighting.js";
import {
  MeshLabel,
  StationPlate,
  WallCalendar,
  Whiteboard,
} from "../props/signage.js";
import { DocumentShredder, SecurityCamera, ServerRack } from "../props/tech.js";
import { DeskSurfaceDetails } from "../props/WorkplaceDetails.js";
import { makePlasterTexture } from "../textures.js";
import { Workstation } from "../Workstation.js";
import { Wayfinder } from "../Wayfinder.js";
import type { HotspotId } from "../worldTypes.js";
import { BREAK_NOOK, GlassBreakNook, insideBreakNook } from "./GlassBreakNook.js";
import {
  ALERT_POS,
  BACK_OFFICE_BINS,
  BASE_HOTSPOTS,
  BREAK_INTERIOR_HOTSPOTS,
  CHAIR_FACE_DESK,
  COAT_RACK,
  CREDENZA,
  ENTRY_BINS,
  ENTRY_PLANTER,
  FEATURE_WALL,
  FEATURE_WALL_SPOTS,
  GLASS_SUITE,
  HERO_PLANT,
  HOT_DESK,
  INNER,
  LOCKERS,
  MORGAN_DESK,
  PARTS_CABINETS,
  PENDANT_HANG_Y,
  PENDANT_RUNS,
  PLAYER_DESK,
  PLAYER_SEAT_CAM,
  PLAYER_SEAT_LOOK,
  PLAYER_SPAWN,
  ROOM,
  SAMIR_DESK,
  SEAT,
  SERVER_RACK_XS,
  SHREDDER,
  TEAM_DESK,
  hotspotAnchor,
  socColliders,
} from "./socLayout.js";

/**
 * Film layout, from the entry looking north:
 * - Left: frosted-glass suite meeting the 04 feature wall, credenza, plant
 * - Right half: two cubicle rows; You (front, east) with Morgan behind
 * - Back office behind the 04 wall: alert boards, racks, Samir, parts
 * - Break room in the south-east corner, beside the entry
 *
 * Every coordinate lives in socLayout.ts so the reachability test can guard it.
 */

/** Pale daylight haze behind the glazing; matches the fog so edges never band. */
const DAYLIGHT_HAZE = "#dfe5e8";
/** Perimeter walls overlap the 3.35m ceiling so the bright haze never shows at the seam. */
const WALL_H = 3.4;

/**
 * Alert boards with a faint cosmetic screen-breathing pass.
 * Severity colors stay (red/amber/teal carry meaning); only intensity
 * breathes, and it freezes under prefers-reduced-motion / LOW tier.
 */
function AlertWall({ animated = true }: { animated?: boolean }) {
  const live = useAmbientMotion(animated);
  const { ambientHz } = useWorldQuality();
  const screens = useRef<(THREE.MeshStandardMaterial | null)[]>([
    null,
    null,
    null,
  ]);

  useEffect(() => {
    if (live) return;
    for (const mat of screens.current) {
      if (mat) mat.emissiveIntensity = 0.65;
    }
  }, [live]);

  useAmbient(
    (t) => {
      for (let i = 0; i < screens.current.length; i += 1) {
        const mat = screens.current[i];
        if (!mat) continue;
        mat.emissiveIntensity = live
          ? 0.65 + Math.sin(t * (0.9 + i * 0.23) + i * 2.1) * 0.08
          : 0.65;
      }
    },
    ambientHz,
    live,
    [live],
  );

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
              ref={(node) => {
                screens.current[i] = node;
              }}
              color="#05080a"
              emissive={i === 1 ? "#ff6b4a" : i === 0 ? "#e8b84a" : "#4fd0c8"}
              emissiveIntensity={0.65}
            />
          </mesh>
        </group>
      ))}
      <MeshLabel
        text="ALERT WALL"
        position={[0, 2.5, -0.42]}
        width={0.8}
        height={0.13}
      />
    </group>
  );
}

export function SocRoom({
  onNearbyChange,
  onInteract,
  enabled,
  seated = false,
  highlightHotspotId,
  workplace,
  onBreakRoomExit,
  onWalkBlocked,
  onRecover,
  onAcceptedDistance,
}: {
  onNearbyChange: (
    id?: HotspotId,
    label?: string,
    choices?: HotspotId[],
  ) => void;
  onInteract: (id: HotspotId) => void;
  enabled: boolean;
  seated?: boolean;
  highlightHotspotId?: HotspotId;
  workplace: ClientWorkplaceState;
  onBreakRoomExit: () => void;
  onWalkBlocked?: () => void;
  onRecover?: (position: [number, number, number]) => void;
  onAcceptedDistance?: (meters: number) => void;
}) {
  const nearbyId = useRef<HotspotId | undefined>(undefined);
  const playerPos = useRef<[number, number, number]>([...PLAYER_SPAWN]);
  const lookAtRef = useRef<[number, number, number]>([...PLAYER_SPAWN]);
  const insideBreakRoom = useRef(false);
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
        : h.id === "coffee"
          ? { ...h, label: coffeeControl(workplace).label }
          : h.id === "fridge"
            ? { ...h, label: fridgeControl(workplace).label }
            : h,
    );
  }, [doorOpen, workplace]);

  const colliders = useMemo(() => socColliders(doorOpen), [doorOpen]);

  // Neutral holds the cream/oak/sage palette; ACES skews bright creams orange.
  useEffect(() => {
    gl.toneMapping = THREE.NeutralToneMapping;
    gl.toneMappingExposure = 1.0;
  }, [gl]);
  const ceilingPlaster = useMemo(() => makePlasterTexture("#f4f2ed"), []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!enabled || event.code !== "KeyE" || event.repeat) return;
      if (
        event.target instanceof HTMLElement &&
        (event.target.isContentEditable ||
          /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName))
      )
        return;
      event.preventDefault();
      const near = nearestHotspot(
        playerPos.current,
        hotspots,
        nearbyId.current,
      );
      if (near) onInteract(near.id);
      else window.dispatchEvent(new Event("soc-interaction-miss"));
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
    const near = nearestHotspot(playerPos.current, hotspots, nearbyId.current);
    nearbyId.current = near?.id;
    setActiveHotspot(near?.id);
    onNearbyChange(near?.id, near?.label, nearbyChoices(playerPos.current));
  }, [doorOpen, hotspots, onNearbyChange]);

  function nearbyChoices(position: [number, number, number]): HotspotId[] {
    return hotspots
      .filter(
        (h) =>
          Math.hypot(
            position[0] - h.position[0],
            position[2] - h.position[2],
          ) <= h.radius,
      )
      .map((h) => h.id);
  }

  const choicesKey = useRef("");

  function handlePosition(next: [number, number, number]) {
    playerPos.current = next;
    const isInside = insideBreakNook(next[0], next[2]);
    if (insideBreakRoom.current && !isInside) onBreakRoomExit();
    insideBreakRoom.current = isInside;
    const near = nearestHotspot(next, hotspots, nearbyId.current);
    const choices = nearbyChoices(next);
    const key = choices.join(",");
    if (near?.id !== nearbyId.current || key !== choicesKey.current) {
      choicesKey.current = key;
      nearbyId.current = near?.id;
      setActiveHotspot(near?.id);
      onNearbyChange(near?.id, near?.label, choices);
    }
    lookAtRef.current = next;
  }

  const floorW = ROOM.halfX * 2;
  const floorD = ROOM.halfZ * 2;
  const quality = useWorldQuality();
  const wayfinderTo =
    !seated && highlightHotspotId
      ? hotspotAnchor(highlightHotspotId)
      : undefined;

  return (
    <>
      <color attach="background" args={[DAYLIGHT_HAZE]} />
      <fog
        attach="fog"
        args={[DAYLIGHT_HAZE, seated ? 14 : 20, seated ? 28 : 38]}
      />
      <AmbientClockDriver enabled={quality.ambientEnabled && !seated} />
      <SocLighting
        seated={seated}
        directionalShadows={quality.directionalShadows}
      />

      <OakFloor width={floorW} depth={floorD} receiveShadow={!seated} />
      <CarpetRunner
        position={[
          (BREAK_NOOK.cornerX + BREAK_NOOK.wallX) / 2,
          0,
          (BREAK_NOOK.cornerZ + BREAK_NOOK.wallZ) / 2,
        ]}
        size={[
          BREAK_NOOK.wallX - BREAK_NOOK.cornerX - 0.35,
          BREAK_NOOK.wallZ - BREAK_NOOK.cornerZ - 0.35,
        ]}
        color="#a3ab9c"
      />

      <mesh position={[0, 3.35, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[floorW, floorD]} />
        <meshStandardMaterial
          map={ceilingPlaster}
          emissive="#f1eee8"
          emissiveIntensity={0.42}
          roughness={0.95}
        />
      </mesh>
      {/* Open office: black linear pendants over the desks, spots on the 04 wall */}
      <LinearPendants runs={PENDANT_RUNS} ceilingY={3.35} hangY={PENDANT_HANG_Y} />
      <SpotTrack position={[FEATURE_WALL_SPOTS.x, 3.32, FEATURE_WALL_SPOTS.z]} />
      {/* Back office keeps its service panels — emissive only, no point lights */}
      <CeilingFixture light={false} lit={!seated} animated={!seated} position={[-4, 3.2, -2]} />
      {!seated ? (
        <>
          <CeilingFixture light={false} position={[-9.2, 3.2, -1.9]} />
          <CeilingFixture light={false} position={[-8, 3.2, -4.5]} />
        </>
      ) : null}
      {/* Services stay in the back office so the entry ceiling reads clean */}
      {!seated ? (
        <CeilingAC position={[-6.5, 3.12, -3.6]} rotationY={Math.PI / 2} />
      ) : null}

      <WallPanel position={[0, WALL_H / 2, -ROOM.halfZ]} size={[floorW, WALL_H, 0.3]} />
      <WallPanel position={[-ROOM.halfX, WALL_H / 2, 0]} size={[0.3, WALL_H, floorD]} />
      <WallPanel position={[ROOM.halfX, WALL_H / 2, 0]} size={[0.3, WALL_H, floorD]} />
      {/* South wall split around exit doorway */}
      <WallPanel
        position={[-(floorW / 4 + 0.55), WALL_H / 2, ROOM.halfZ]}
        size={[floorW / 2 - 1.1, WALL_H, 0.3]}
      />
      <WallPanel
        position={[floorW / 4 + 0.55, WALL_H / 2, ROOM.halfZ]}
        size={[floorW / 2 - 1.1, WALL_H, 0.3]}
      />
      {/* Lintel over exit */}
      <WallPanel
        position={[0, (2.4 + WALL_H) / 2, ROOM.halfZ]}
        size={[2.2, WALL_H - 2.4, 0.32]}
      />

      {!seated ? (
        <>
          <SecurityCamera
            position={[GLASS_SUITE.glassX + 0.6, 2.85, ROOM.halfZ - 1.1]}
            rotationY={Math.PI * 0.8}
          />
          <SecurityCamera
            position={[BREAK_NOOK.cornerX - 0.6, 2.85, ROOM.halfZ - 1.1]}
            rotationY={-Math.PI * 0.8}
          />
        </>
      ) : null}

      {/* Entry-left: frosted suite glass meets the 04 feature wall */}
      <FrostedGlassWall
        position={[
          GLASS_SUITE.glassX,
          0,
          (FEATURE_WALL.z + FEATURE_WALL.depth / 2 + GLASS_SUITE.maxZ) / 2,
        ]}
        length={GLASS_SUITE.maxZ - (FEATURE_WALL.z + FEATURE_WALL.depth / 2)}
        rotationY={Math.PI / 2}
      />
      {/* Suite's north wall, seen only from the back office */}
      <mesh
        position={[
          (INNER.minX + GLASS_SUITE.glassX) / 2,
          FROSTED_PANE_HEIGHT / 2,
          GLASS_SUITE.minZ + FEATURE_WALL.depth / 2,
        ]}
        receiveShadow
      >
        <boxGeometry
          args={[
            GLASS_SUITE.glassX - INNER.minX,
            FROSTED_PANE_HEIGHT,
            FEATURE_WALL.depth,
          ]}
        />
        <meshStandardMaterial color="#e2dbcf" roughness={0.92} />
      </mesh>
      <FeatureWall {...FEATURE_WALL} />
      <Credenza
        position={[CREDENZA.x, 0, CREDENZA.z]}
        width={CREDENZA.width}
        depth={CREDENZA.depth}
        height={CREDENZA.height}
      />
      <HeroPlant position={HERO_PLANT} />
      {/* Back-office perimeter glazing behind Samir */}
      <FrostedGlassWall
        position={[INNER.minX + 0.02, 0, (INNER.minZ + GLASS_SUITE.minZ) / 2]}
        length={GLASS_SUITE.minZ - INNER.minZ}
        rotationY={Math.PI / 2}
      />

      {/* Back office north wall, between the racks and the alert boards */}
      <WallClock position={[-7.1, 2.45, -ROOM.halfZ + 0.3]} />
      <Thermostat position={[-7.1, 1.5, -ROOM.halfZ + 0.25]} />
      <AccentPoster position={[-1.95, 1.7, -ROOM.halfZ + 0.25]} color="#2a4840" />
      {/* Suite wall, above the bins and beside the shredder */}
      <FramedCertificate
        position={[-10.05, 1.75, GLASS_SUITE.minZ - 0.015]}
        rotationY={Math.PI}
        title="SOC TIER-1"
      />
      <FramedCertificate
        position={[-9.45, 1.75, GLASS_SUITE.minZ - 0.015]}
        rotationY={Math.PI}
        title="SECURE OPS"
        accent="#4fd0c8"
      />
      <WallArt
        position={[-5.2, 1.8, GLASS_SUITE.minZ - 0.03]}
        rotationY={Math.PI}
        variant={1}
        width={1.15}
        height={0.85}
      />
      {/* Back of the 04 wall faces the back office */}
      <group
        position={[-2.6, 1.6, FEATURE_WALL.z - FEATURE_WALL.depth / 2 - 0.03]}
        rotation={[0, Math.PI, 0]}
      >
        <Whiteboard position={[0, 0, 0]} />
      </group>
      <WallCalendar
        position={[-1.15, 1.85, FEATURE_WALL.z - FEATURE_WALL.depth / 2 - 0.025]}
        rotationY={Math.PI}
      />
      {/* Entry wall, between the corner planter and the door */}
      <WallArt
        position={[-2.35, 1.85, INNER.maxZ - 0.03]}
        rotationY={Math.PI}
        width={1.35}
        height={0.95}
      />

      {/* Mirrored desk row — same facing, clear east corridor to break */}
      <Workstation
        position={PLAYER_DESK}
        showLoginNote
        clutterVariant={0}
        rightEmissive="#6ea8fe"
      />
      <DeskSurfaceDetails position={PLAYER_DESK} variant={0} />
      <StationPlate
        text="YOUR DESK"
        position={[PLAYER_DESK[0] - 0.15, DESK_SURFACE_Y, PLAYER_DESK[2] + 0.28]}
      />
      <OfficeChair
        position={[PLAYER_DESK[0], 0, PLAYER_DESK[2] + SEAT]}
        rotationY={CHAIR_FACE_DESK}
        occupied={seated}
        highlighted={!seated && (activeHotspot === "desk_player" || highlightHotspotId === "desk_player")}
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
        leftEmissive="#6ea8fe"
        rightEmissive="#4fd0c8"
        showLamp={false}
        clutterVariant={1}
      />
      <DeskSurfaceDetails position={MORGAN_DESK} variant={1} />
      <StationPlate
        text="MORGAN"
        position={[MORGAN_DESK[0] - 0.15, DESK_SURFACE_Y, MORGAN_DESK[2] + 0.28]}
      />
      <OfficeChair
        position={[MORGAN_DESK[0], 0, MORGAN_DESK[2] + SEAT]}
        rotationY={CHAIR_FACE_DESK}
      />
      <Figure
        activity="talking"
        animated={!seated}
        lookAtRef={lookAtRef}
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
        visible={!seated && (highlightHotspotId === "morgan_station" || activeHotspot === "morgan_station")}
        name="Morgan"
        role="Manager"
        position={[MORGAN_DESK[0], 2.25, MORGAN_DESK[2] + SEAT - 0.05]}
        target={highlightHotspotId === "morgan_station"}
      />

      {/* Empty desk beside yours, by the east glazing */}
      <Workstation
        position={HOT_DESK}
        showLamp={false}
        clutterVariant={2}
        rightEmissive="#6ea8fe"
      />
      <DeskSurfaceDetails position={HOT_DESK} variant={2} />
      <StationPlate
        text="HOT DESK"
        position={[HOT_DESK[0] - 0.15, DESK_SURFACE_Y, HOT_DESK[2] + 0.28]}
      />
      <OfficeChair
        position={[HOT_DESK[0], 0, HOT_DESK[2] + SEAT]}
        rotationY={CHAIR_FACE_DESK}
      />
      <VentPapers
        animated={!seated}
        position={[HOT_DESK[0] + 0.55, 0.824, HOT_DESK[2] + 0.15]}
      />

      {/* Unassigned desk completing the back row beside Morgan */}
      <Workstation
        position={TEAM_DESK}
        showLamp={false}
        clutterVariant={0}
        leftEmissive="#4fd0c8"
      />
      <OfficeChair
        position={[TEAM_DESK[0], 0, TEAM_DESK[2] + SEAT]}
        rotationY={CHAIR_FACE_DESK + 0.35}
      />

      {/* Priya by the east glazing, out of the entry shot */}
      <Figure
        activity="idle"
        animated={!seated}
        lookAtRef={lookAtRef}
        position={[9.3, 0, -1.0]}
        rotationY={-1.9}
        primary="#8a7a68"
        secondary="#32281e"
        accent="#6ea8fe"
        hair="#241610"
        seed={2}
      />

      {/* Samir on the back-office wall, behind the 04 wall */}
      <MonitorArmDesk position={SAMIR_DESK} rotationY={Math.PI / 2} />
      <OfficeChair
        position={[SAMIR_DESK[0] + 1.05, 0, SAMIR_DESK[2]]}
        rotationY={-Math.PI / 2}
      />
      <Figure
        activity="typing"
        animated={!seated}
        lookAtRef={lookAtRef}
        position={[SAMIR_DESK[0] + 1.0, 0, SAMIR_DESK[2]]}
        rotationY={-Math.PI / 2}
        primary="#6a7a88"
        secondary="#243038"
        accent="#ff6b4a"
        hair="#2a1c12"
        seated
        seed={3}
      />

      <AlertWall animated={!seated} />
      {/* Racks read front-on from the back office, on its north wall */}
      {SERVER_RACK_XS.map((x) => (
        <ServerRack key={x} position={[x, 0.9, -6.92]} />
      ))}
      {quality.dustMul > 0 ? (
        <>
          <DustMotes
            animated={!seated}
            count={Math.max(8, Math.round(72 * quality.dustMul))}
            depth={12}
            position={[0, 1.55, 0.4]}
            width={16}
          />
          <DustMotes
            animated={!seated}
            count={Math.max(6, Math.round(24 * quality.dustMul))}
            depth={1.8}
            height={2.0}
            position={[-9.0, 1.35, -6.35]}
            width={2.4}
          />
        </>
      ) : null}
      {/* CABLES + ADAPTERS back onto the suite wall and open into the office */}
      {(["CABLES", "ADAPTERS"] as const).map((label, i) => (
        <StorageCabinet
          key={label}
          position={[PARTS_CABINETS.xs[i] ?? PARTS_CABINETS.xs[0], 0.78, PARTS_CABINETS.z]}
          label={label}
          rotationY={Math.PI}
          open={openCabinet !== null}
        />
      ))}
      <MeshLabel
        text="PARTS"
        position={[
          (PARTS_CABINETS.xs[0] + PARTS_CABINETS.xs[1]) / 2,
          1.85,
          GLASS_SUITE.minZ - 0.012,
        ]}
        rotationY={Math.PI}
        width={0.45}
        height={0.11}
      />
      <DocumentShredder position={SHREDDER} rotationY={Math.PI} />
      {/* Shared bins live along the walls, never inside a cubicle footprint */}
      {BACK_OFFICE_BINS.map((bin, i) => (
        <TrashBin key={bin[0]} position={bin} recycling={i === 1} />
      ))}

      {/* Entry wall east of the door: coat rack, lockers, bins */}
      <CoatRack position={COAT_RACK} />
      <PersonalLockers position={LOCKERS} rotationY={Math.PI} />
      {ENTRY_BINS.map((bin, i) => (
        <TrashBin key={bin[0]} position={bin} recycling={i === 1} />
      ))}
      <TallFloorPlant position={ENTRY_PLANTER} scale={0.95} />

      <GlassBreakNook
        animated={!seated}
        cheapGlass={quality.cheapGlass}
        doorOpen={doorOpen}
        coffeeStage={workplace.coffeeStage}
        fridgeOpen={workplace.fridgeOpen}
        fridgeSnackBars={workplace.fridgeSnackBars}
        highlightJules={highlightHotspotId === "jules"}
        lookAtRef={lookAtRef}
      />

      {/* Exit door — charcoal frame, oak leaf, and readable label */}
      <group position={[0, 0, ROOM.halfZ - 0.2]}>
        <mesh position={[-0.95, 1.25, 0]} castShadow>
          <boxGeometry args={[0.14, 2.5, 0.18]} />
          <meshStandardMaterial color="#2a2b2c" roughness={0.55} />
        </mesh>
        <mesh position={[0.95, 1.25, 0]} castShadow>
          <boxGeometry args={[0.14, 2.5, 0.18]} />
          <meshStandardMaterial color="#2a2b2c" roughness={0.55} />
        </mesh>
        <mesh position={[0, 2.55, 0]} castShadow>
          <boxGeometry args={[2.05, 0.14, 0.2]} />
          <meshStandardMaterial color="#2a2b2c" roughness={0.55} />
        </mesh>
        <mesh position={[0, 1.25, 0.02]} castShadow>
          <boxGeometry args={[1.7, 2.4, 0.08]} />
          <meshStandardMaterial color="#c9a97f" roughness={0.55} />
        </mesh>
        <mesh position={[0.65, 1.25, 0.08]}>
          <boxGeometry args={[0.06, 0.28, 0.05]} />
          <meshStandardMaterial
            color="#c4a060"
            metalness={0.55}
            roughness={0.35}
          />
        </mesh>
        <mesh position={[0, 2.35, -0.06]}>
          <boxGeometry args={[0.7, 0.18, 0.04]} />
          <meshStandardMaterial color="#1a3028" />
        </mesh>
        <MeshLabel
          text="EXIT"
          position={[0, 2.35, -0.09]}
          rotationY={Math.PI}
          width={0.65}
          height={0.14}
        />
        <mesh position={[0, 0.04, -0.15]} receiveShadow>
          <boxGeometry args={[2.0, 0.06, 0.45]} />
          <meshStandardMaterial color="#3b3c3b" roughness={0.8} />
        </mesh>
      </group>

      {quality.contactShadows ? (
        <ContactShadows
          opacity={0.28}
          scale={24}
          blur={2.4}
          far={4.5}
          color="#3a2c20"
          frames={1}
        />
      ) : null}

      {!seated
        ? hotspots.map((def) => (
            <Hotspot
              interactionEnabled={enabled}
              active={activeHotspot === def.id}
              def={def}
              key={def.id}
              target={highlightHotspotId === def.id}
            />
          ))
        : null}

      {wayfinderTo ? <Wayfinder fromRef={playerPos} to={wayfinderTo} /> : null}

      <PlayerController
        colliders={colliders}
        enabled={enabled}
        onPosition={handlePosition}
        seatLookAt={PLAYER_SEAT_LOOK}
        seatPosition={PLAYER_SEAT_CAM}
        seated={seated}

        spawn={PLAYER_SPAWN}
        {...(onWalkBlocked ? { onWalkBlocked } : {})}
        onRecover={(position) => {
          handlePosition(position);
          onRecover?.(position);
        }}
        {...(onAcceptedDistance ? { onAcceptedDistance } : {})}
      />
    </>
  );
}
