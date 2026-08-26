/**
 * Devices and peripherals — monitors, input gear, racks, desk clutter,
 * cameras and shredders.
 */
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { makeMonitorGlowTexture } from "../textures.js";
import {
  CAMERA_LED_REST,
  DUAL_BAR_INTENSITY,
  DUAL_OS_SCREEN_INTENSITY,
  DUAL_SCREEN_INTENSITY,
  RACK_STATUS_LED_INTENSITY,
  rackLedOn,
  screenIntensity,
  screenMapOffsetX,
  screenMapOffsetY,
  useAmbientMotion,
} from "./ambient.js";
import { StickyNotes } from "./signage.js";

function applyScreenLife(
  mat: THREE.MeshStandardMaterial,
  elapsed: number,
  base: number,
  freq: number,
  burstAt: number,
  drift: boolean,
): void {
  mat.emissiveIntensity = screenIntensity(elapsed, base, freq, burstAt);
  if (!drift) return;
  const map = mat.map;
  if (!map) return;
  map.offset.y = screenMapOffsetY(elapsed);
  map.offset.x = screenMapOffsetX(elapsed);
}

function restScreen(mat: THREE.MeshStandardMaterial, base: number): void {
  mat.emissiveIntensity = base;
  const map = mat.map;
  if (!map) return;
  map.offset.set(0, 0);
}

export function DualMonitor({
  position,
  leftEmissive = "#4fd0c8",
  rightEmissive = "#e8b84a",
  leftScreen,
  animated = true,
}: {
  position: [number, number, number];
  leftEmissive?: string;
  rightEmissive?: string;
  leftScreen?: ReactNode;
  animated?: boolean;
}) {
  const live = useAmbientMotion(animated);
  const leftTex = useMemo(
    () => makeMonitorGlowTexture(leftEmissive).clone(),
    [leftEmissive],
  );
  const rightTex = useMemo(
    () => makeMonitorGlowTexture(rightEmissive).clone(),
    [rightEmissive],
  );
  const leftPane = useRef<THREE.MeshStandardMaterial>(null);
  const rightPane = useRef<THREE.MeshStandardMaterial>(null);
  const leftBar = useRef<THREE.MeshStandardMaterial>(null);
  const rightBar = useRef<THREE.MeshStandardMaterial>(null);
  const leftBase = leftScreen ? DUAL_OS_SCREEN_INTENSITY : DUAL_SCREEN_INTENSITY;
  const nextBurst = useRef(9.5);

  useFrame(({ clock }) => {
    const left = leftPane.current;
    const right = rightPane.current;
    const barL = leftBar.current;
    const barR = rightBar.current;
    if (!left || !right || !barL || !barR) return;
    if (!live) {
      restScreen(left, leftBase);
      restScreen(right, DUAL_SCREEN_INTENSITY);
      barL.emissiveIntensity = DUAL_BAR_INTENSITY;
      barR.emissiveIntensity = DUAL_BAR_INTENSITY;
      return;
    }
    const t = clock.elapsedTime;
    if (t > nextBurst.current + 0.26) {
      nextBurst.current = t + 13 + (t % 6);
    }
    const burst = nextBurst.current;
    applyScreenLife(left, t, leftBase, 0.48, burst, true);
    applyScreenLife(right, t, DUAL_SCREEN_INTENSITY, 0.37, burst + 3.4, true);
    barL.emissiveIntensity = screenIntensity(t, DUAL_BAR_INTENSITY, 0.22, burst);
    barR.emissiveIntensity = screenIntensity(t, DUAL_BAR_INTENSITY, 0.19, burst + 3.4);
  });

  return (
    <group position={position}>
      {([-0.42, 0.42] as const).map((x, i) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, 0.02, 0]}>
            <boxGeometry args={[0.22, 0.04, 0.18]} />
            <meshStandardMaterial color="#111" metalness={0.5} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.16, 0]}>
            <cylinderGeometry args={[0.03, 0.04, 0.28, 10]} />
            <meshStandardMaterial color="#1a1a1a" metalness={0.6} />
          </mesh>
          <mesh position={[0, 0.42, 0.02]} castShadow>
            <boxGeometry args={[0.78, 0.52, 0.06]} />
            <meshStandardMaterial color="#0a0a0a" roughness={0.35} />
          </mesh>
          <mesh position={[0, 0.42, 0.055]}>
            <boxGeometry args={[0.7, 0.44, 0.02]} />
            <meshStandardMaterial
              ref={i === 0 ? leftPane : rightPane}
              map={i === 0 ? leftTex : rightTex}
              emissive={i === 0 ? leftEmissive : rightEmissive}
              emissiveIntensity={leftScreen && i === 0 ? 0.15 : 0.55}
              roughness={0.25}
            />
          </mesh>
          <mesh position={[0, 0.2, 0.055]}>
            <boxGeometry args={[0.55, 0.02, 0.01]} />
            <meshStandardMaterial
              ref={i === 0 ? leftBar : rightBar}
              color={i === 0 ? leftEmissive : rightEmissive}
              emissive={i === 0 ? leftEmissive : rightEmissive}
              emissiveIntensity={1.05}
            />
          </mesh>
          {i === 0 && leftScreen ? (
            <group position={[0, 0.42, 0.07]}>{leftScreen}</group>
          ) : null}
        </group>
      ))}
    </group>
  );
}

export function KeyboardMouse({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.013, 0]} castShadow>
        <boxGeometry args={[0.52, 0.025, 0.18]} />
        <meshStandardMaterial color="#141414" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.027, 0]}>
        <boxGeometry args={[0.48, 0.01, 0.14]} />
        <meshStandardMaterial color="#1c1c1c" />
      </mesh>
      <mesh position={[0.38, 0.016, 0.06]} castShadow>
        <boxGeometry args={[0.07, 0.02, 0.11]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
    </group>
  );
}

const BAY_Y = [-0.55, -0.25, 0.05, 0.35, 0.65] as const;
const BAY_BASE = [0.35, 0.45, 0.55, 0.35, 0.45] as const;
const BAY_PULSE = [0.9, 1.35, 0.55, 1.1, 0.72] as const;

/** Extra status LEDs. phase = π/2 so every lamp is on at t=0. */
const RACK_LEDS = [
  { x: 0.22, y: 0.85, r: 0.025, color: "#7dba6a", on: RACK_STATUS_LED_INTENSITY, off: 0.12, speed: 1.15, thresh: 0.62 },
  { x: -0.22, y: -0.55, r: 0.016, color: "#7dba6a", on: 0.85, off: 0.08, speed: 2.4, thresh: 0.2 },
  { x: 0.18, y: -0.55, r: 0.016, color: "#e8b84a", on: 0.7, off: 0.06, speed: 3.1, thresh: 0.45 },
  { x: -0.22, y: -0.25, r: 0.016, color: "#7dba6a", on: 0.9, off: 0.1, speed: 0.85, thresh: 0.55 },
  { x: 0.18, y: -0.25, r: 0.016, color: "#c45c48", on: 0.75, off: 0.05, speed: 4.2, thresh: 0.7 },
  { x: -0.22, y: 0.05, r: 0.016, color: "#4fd0c8", on: 0.8, off: 0.08, speed: 1.9, thresh: 0.15 },
  { x: 0.18, y: 0.05, r: 0.016, color: "#7dba6a", on: 0.88, off: 0.1, speed: 2.8, thresh: 0.38 },
  { x: -0.22, y: 0.35, r: 0.016, color: "#e8b84a", on: 0.72, off: 0.07, speed: 1.4, thresh: 0.5 },
  { x: 0.18, y: 0.35, r: 0.016, color: "#7dba6a", on: 0.82, off: 0.09, speed: 3.6, thresh: 0.25 },
  { x: -0.22, y: 0.65, r: 0.016, color: "#7dba6a", on: 0.9, off: 0.08, speed: 0.7, thresh: 0.4 },
  { x: 0.18, y: 0.65, r: 0.016, color: "#4fd0c8", on: 0.78, off: 0.06, speed: 2.15, thresh: 0.33 },
] as const;

const LED_PHASE = Math.PI / 2;

export function ServerRack({
  position,
  animated = true,
}: {
  position: [number, number, number];
  animated?: boolean;
}) {
  const live = useAmbientMotion(animated);
  const bays = useRef<(THREE.MeshStandardMaterial | null)[]>([null, null, null, null, null]);
  const leds = useRef<(THREE.MeshStandardMaterial | null)[]>(
    Array.from({ length: RACK_LEDS.length }, () => null),
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    for (let i = 0; i < BAY_Y.length; i += 1) {
      const mat = bays.current[i];
      const base = BAY_BASE[i];
      const pulse = BAY_PULSE[i];
      if (!mat || base === undefined || pulse === undefined) continue;
      mat.emissiveIntensity = live ? base + 0.05 * Math.sin(t * pulse) : base;
    }
    for (let i = 0; i < RACK_LEDS.length; i += 1) {
      const spec = RACK_LEDS[i];
      const mat = leds.current[i];
      if (!spec || !mat) continue;
      if (!live) {
        mat.emissiveIntensity = spec.on;
        continue;
      }
      mat.emissiveIntensity = rackLedOn(t, spec.speed, LED_PHASE, spec.thresh)
        ? spec.on
        : spec.off;
    }
  });

  return (
    <group position={position}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.7, 1.8, 0.55]} />
        <meshStandardMaterial color="#12161a" metalness={0.35} roughness={0.45} />
      </mesh>
      {BAY_Y.map((y, i) => (
        <mesh key={y} position={[0, y, 0.28]}>
          <boxGeometry args={[0.55, 0.12, 0.02]} />
          <meshStandardMaterial
            ref={(node) => {
              bays.current[i] = node;
            }}
            color="#0a0e12"
            emissive={i % 2 === 0 ? "#4fd0c8" : "#e8b84a"}
            emissiveIntensity={0.35 + (i % 3) * 0.1}
          />
        </mesh>
      ))}
      {RACK_LEDS.map((spec, i) => (
        <mesh key={`${spec.color}-${String(spec.y)}-${String(spec.x)}`} position={[spec.x, spec.y, 0.29]}>
          <sphereGeometry args={[spec.r, 8, 8]} />
          <meshStandardMaterial
            ref={(node) => {
              leds.current[i] = node;
            }}
            color={spec.color}
            emissive={spec.color}
            emissiveIntensity={spec.on}
          />
        </mesh>
      ))}
    </group>
  );
}

export function DeskClutter({
  position,
  variant = 0,
}: {
  position: [number, number, number];
  variant?: number;
}) {
  const v = variant % 3;
  const mugX = -0.48 + v * 0.04;
  return (
    <group position={position}>
      {/* Origin is the desk surface. Every mesh Y is half its height. */}
      <mesh position={[mugX, 0.045, -0.02]} castShadow>
        <cylinderGeometry args={[0.045, 0.04, 0.09, 12]} />
        <meshStandardMaterial
          color={v === 0 ? "#4a6a88" : v === 1 ? "#8a5038" : "#2a4840"}
        />
      </mesh>
      <mesh position={[mugX + 0.05, 0.05, -0.02]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.028, 0.007, 8, 16]} />
        <meshStandardMaterial color="#3a3a3a" />
      </mesh>
      <mesh position={[0.58, 0.1, -0.08]} castShadow>
        <cylinderGeometry args={[0.035, 0.038, 0.2, 12]} />
        <meshStandardMaterial
          color="#a8d4e8"
          transparent
          opacity={0.55}
          roughness={0.2}
        />
      </mesh>
      <mesh position={[0.58, 0.21, -0.08]}>
        <cylinderGeometry args={[0.03, 0.032, 0.04, 10]} />
        <meshStandardMaterial color="#2a4840" />
      </mesh>
      <group position={[0.32, 0, -0.18]}>
        <mesh position={[0, 0.02, 0]} castShadow>
          <boxGeometry args={[0.22, 0.04, 0.16]} />
          <meshStandardMaterial color="#2a2a2a" roughness={0.5} />
        </mesh>
        <mesh position={[0.02, 0.05, 0]}>
          <boxGeometry args={[0.08, 0.04, 0.05]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
        <mesh position={[-0.05, 0.055, 0.02]} rotation={[0.35, 0, 0.08]}>
          <boxGeometry args={[0.055, 0.025, 0.12]} />
          <meshStandardMaterial color="#3a3a3a" />
        </mesh>
      </group>
      <mesh position={[-0.52, 0.02, -0.22]} castShadow>
        <boxGeometry args={[0.28, 0.04, 0.22]} />
        <meshStandardMaterial color="#5c4634" />
      </mesh>
      <mesh position={[-0.52, 0.048, -0.21]} rotation={[-0.04, 0.05, 0]}>
        <boxGeometry args={[0.24, 0.01, 0.18]} />
        <meshStandardMaterial color="#efe6d4" />
      </mesh>
      <mesh position={[-0.51, 0.062, -0.22]} rotation={[-0.06, -0.04, 0]}>
        <boxGeometry args={[0.22, 0.01, 0.16]} />
        <meshStandardMaterial color="#e0d4bc" />
      </mesh>
      <mesh position={[0.06, 0.012, 0.02]} rotation={[0, 0.2, 0]} castShadow>
        <boxGeometry args={[0.18, 0.02, 0.24]} />
        <meshStandardMaterial color="#3a5a48" />
      </mesh>
      <mesh position={[0.16, 0.008, 0.04]} rotation={[0, 0.35, Math.PI / 2]}>
        <cylinderGeometry args={[0.007, 0.007, 0.14, 8]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[0.52, 0.03, -0.22]} rotation={[0, -0.12, 0]} castShadow>
        <boxGeometry args={[0.2, 0.06, 0.26]} />
        <meshStandardMaterial color="#c45c48" />
      </mesh>
      <mesh position={[0.54, 0.075, -0.2]} rotation={[0, 0.08, 0]}>
        <boxGeometry args={[0.18, 0.05, 0.24]} />
        <meshStandardMaterial color="#4a6a88" />
      </mesh>
      <StickyNotes flat position={[-0.22, 0, 0.08]} />
    </group>
  );
}

export function SecurityCamera({
  position,
  rotationY = 0,
  animated = true,
}: {
  position: [number, number, number];
  rotationY?: number;
  animated?: boolean;
}) {
  const live = useAmbientMotion(animated);
  const led = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (!led.current) return;
    if (!live) {
      led.current.emissiveIntensity = CAMERA_LED_REST;
      return;
    }
    const blink = Math.sin(clock.elapsedTime * 6) > 0.35 ? 1.4 : 0.15;
    led.current.emissiveIntensity = blink;
  });
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 0.08, 0]} castShadow>
        <boxGeometry args={[0.22, 0.12, 0.28]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.4} roughness={0.45} />
      </mesh>
      <mesh position={[0, 0, 0.18]} rotation={[0.35, 0, 0]}>
        <cylinderGeometry args={[0.07, 0.08, 0.16, 12]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.5} />
      </mesh>
      <mesh position={[0.09, 0.1, 0.05]}>
        <sphereGeometry args={[0.025, 10, 10]} />
        <meshStandardMaterial
          ref={led}
          color="#ff2a2a"
          emissive="#ff2a2a"
          emissiveIntensity={1}
        />
      </mesh>
      <mesh position={[0, 0.18, -0.05]}>
        <cylinderGeometry args={[0.02, 0.02, 0.2, 8]} />
        <meshStandardMaterial color="#444" />
      </mesh>
    </group>
  );
}

export function DocumentShredder({
  position,
  rotationY = 0,
}: {
  position: [number, number, number];
  rotationY?: number;
}) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh castShadow receiveShadow position={[0, 0.45, 0]}>
        <boxGeometry args={[0.55, 0.9, 0.4]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.35} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.92, 0.05]}>
        <boxGeometry args={[0.42, 0.04, 0.12]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[0, 0.7, 0.21]}>
        <boxGeometry args={[0.35, 0.08, 0.02]} />
        <meshStandardMaterial color="#c45c48" />
      </mesh>
      <mesh position={[0.18, 0.55, 0.21]}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshStandardMaterial color="#4fd0c8" emissive="#4fd0c8" emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}
