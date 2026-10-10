/**
 * Light fixtures — linear pendants, spot track, ceiling panels and task lamps.
 */
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import {
  FIXTURE_LIT_INTENSITY,
  FIXTURE_UNLIT_INTENSITY,
  fixtureFlickerMul,
  isAutoFlickerFixture,
  useAmbientMotion,
} from "./ambient.js";
import { InstancedBoxes, type InstancedBox } from "./building.js";

export type PendantRun = { x: number; z: number; length: number };

const PENDANT = { height: 0.05, depth: 0.07, cableInset: 0.3, cablePitch: 3 } as const;

/**
 * Thin black linear pendants hung on fine cables with a bright diffuser strip
 * underneath. Every run shares three instanced draws and no lights.
 */
export function LinearPendants({
  runs,
  ceilingY,
  hangY,
}: {
  runs: readonly PendantRun[];
  ceilingY: number;
  hangY: number;
}) {
  const { housings, diffusers, cables } = useMemo(() => {
    const cableLength = ceilingY - hangY;
    return {
      housings: runs.map(
        (run): InstancedBox => ({
          position: [run.x, hangY, run.z],
          size: [run.length, PENDANT.height, PENDANT.depth],
        }),
      ),
      diffusers: runs.map(
        (run): InstancedBox => ({
          position: [run.x, hangY - PENDANT.height / 2 - 0.002, run.z],
          size: [run.length - 0.04, 0.004, PENDANT.depth - 0.025],
        }),
      ),
      cables: runs.flatMap((run) => {
        const span = run.length - PENDANT.cableInset * 2;
        const count = Math.max(2, Math.round(span / PENDANT.cablePitch) + 1);
        return Array.from(
          { length: count },
          (_, i): InstancedBox => ({
            position: [
              run.x - span / 2 + (span * i) / (count - 1),
              hangY + cableLength / 2,
              run.z,
            ],
            size: [0.006, cableLength, 0.006],
          }),
        );
      }),
    };
  }, [ceilingY, hangY, runs]);
  return (
    <>
      <InstancedBoxes boxes={housings} color="#161616" roughness={0.45} metalness={0.35} />
      <InstancedBoxes
        boxes={diffusers}
        color="#ffffff"
        roughness={0.3}
        emissive="#fff8ec"
        emissiveIntensity={2.4}
      />
      <InstancedBoxes boxes={cables} color="#1d1d1d" roughness={0.6} />
    </>
  );
}

/** Surface-mounted black track with a row of small LED spots. */
export function SpotTrack({
  position,
  spots = 6,
  pitch = 0.11,
}: {
  position: [number, number, number];
  spots?: number;
  pitch?: number;
}) {
  const length = spots * pitch + 0.06;
  const leds = useMemo(
    () =>
      Array.from(
        { length: spots },
        (_, i): InstancedBox => ({
          position: [(i - (spots - 1) / 2) * pitch, -0.032, 0],
          size: [0.045, 0.012, 0.045],
        }),
      ),
    [pitch, spots],
  );
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[length, 0.05, 0.09]} />
        <meshStandardMaterial color="#161616" roughness={0.45} metalness={0.35} />
      </mesh>
      <InstancedBoxes
        boxes={leds}
        color="#ffffff"
        emissive="#fff3dc"
        emissiveIntensity={2.6}
      />
    </group>
  );
}

export function CeilingFixture({
  position,
  lit = true,
  /** Emissive panel without a point light — extra brightness at no light cost. */
  light = true,
  animated = true,
  flicker,
}: {
  position: [number, number, number];
  lit?: boolean;
  light?: boolean;
  animated?: boolean;
  /** Rare fluorescent dip. Defaults on for the west-north emissive panel. */
  flicker?: boolean;
}) {
  const live = useAmbientMotion(animated);
  const panel = useRef<THREE.MeshStandardMaterial>(null);
  const nextBurst = useRef(18);
  const shouldFlicker = flicker ?? isAutoFlickerFixture(position);
  const rest = lit ? FIXTURE_LIT_INTENSITY : FIXTURE_UNLIT_INTENSITY;

  useFrame(({ clock }) => {
    const mat = panel.current;
    if (!mat) return;
    if (!live || !shouldFlicker) {
      mat.emissiveIntensity = rest;
      return;
    }
    const t = clock.elapsedTime;
    if (t > nextBurst.current + 0.38) {
      nextBurst.current = t + 16 + (t % 9);
    }
    mat.emissiveIntensity = rest * fixtureFlickerMul(t, nextBurst.current);
  });

  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[1.9, 0.06, 0.6]} />
        <meshStandardMaterial color="#566268" metalness={0.45} roughness={0.42} />
      </mesh>
      <mesh position={[0, -0.05, 0]}>
        <boxGeometry args={[1.7, 0.05, 0.42]} />
        <meshStandardMaterial
          ref={panel}
          color="#f5f3e9"
          emissive="#fff0ce"
          emissiveIntensity={lit ? 1.7 : 0.35}
          roughness={0.35}
        />
      </mesh>
      {lit && light ? (
        <pointLight
          intensity={2.6}
          distance={12}
          decay={1.6}
          position={[0, -0.5, 0]}
          color="#ffe8b8"
        />
      ) : null}
    </group>
  );
}

export function TaskLamp({
  position,
  light = false,
}: {
  position: [number, number, number];
  light?: boolean;
}) {
  return (
    <group position={position}>
      <mesh>
        <cylinderGeometry args={[0.08, 0.1, 0.04, 12]} />
        <meshStandardMaterial color="#303d43" metalness={0.5} roughness={0.38} />
      </mesh>
      <mesh position={[0, 0.28, 0]} rotation={[0.3, 0, 0.2]}>
        <cylinderGeometry args={[0.02, 0.025, 0.55, 8]} />
        <meshStandardMaterial color="#78878a" metalness={0.65} roughness={0.3} />
      </mesh>
      <mesh position={[0.08, 0.52, 0.12]}>
        <sphereGeometry args={[0.09, 14, 14]} />
        <meshStandardMaterial
          color="#fff1c8"
          emissive="#e8b84a"
          emissiveIntensity={1.1}
          roughness={0.3}
        />
      </mesh>
      {light ? (
        <pointLight
          intensity={1.4}
          distance={4.5}
          decay={1.5}
          position={[0.1, 0.55, 0.15]}
          color="#ffe8b8"
        />
      ) : null}
    </group>
  );
}
