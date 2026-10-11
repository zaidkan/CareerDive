/**
 * Building shell and services — wall panels, glazing, the 04 feature wall,
 * HVAC, thermostat.
 */
import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { makePlasterTexture } from "../textures.js";
import { useAmbientMotion } from "./ambient.js";
import { UNIT_BOX } from "./sharedMaterials.js";

export type InstancedBox = {
  position: [number, number, number];
  size: [number, number, number];
  /** Per-box tint; boxes without one use the material colour. */
  color?: string;
};

/** Static boxes that share one material, drawn in a single call. */
export function InstancedBoxes({
  boxes,
  color = "#ffffff",
  roughness = 0.6,
  metalness = 0,
  emissive = "#000000",
  emissiveIntensity = 0,
  castShadow = false,
}: {
  boxes: InstancedBox[];
  color?: string;
  roughness?: number;
  metalness?: number;
  emissive?: string;
  emissiveIntensity?: number;
  castShadow?: boolean;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const target = mesh.current;
    if (!target) return;
    const matrix = new THREE.Matrix4();
    const tint = new THREE.Color();
    boxes.forEach(({ position, size, color: boxColor }, i) => {
      matrix.makeScale(size[0], size[1], size[2]);
      matrix.setPosition(position[0], position[1], position[2]);
      target.setMatrixAt(i, matrix);
      if (boxColor) target.setColorAt(i, tint.set(boxColor));
    });
    target.instanceMatrix.needsUpdate = true;
    if (target.instanceColor) target.instanceColor.needsUpdate = true;
    target.computeBoundingSphere();
  }, [boxes]);
  return (
    <instancedMesh
      ref={mesh}
      args={[UNIT_BOX, undefined, boxes.length]}
      castShadow={castShadow}
      receiveShadow
    >
      <meshStandardMaterial
        color={color}
        roughness={roughness}
        metalness={metalness}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
      />
    </instancedMesh>
  );
}

/** Floor-to-ceiling pane height shared by every frosted run. */
export const FROSTED_PANE_HEIGHT = 3.35;

let frostedTexture: THREE.CanvasTexture | undefined;

/**
 * One frosted pane: diffuse daylight high up, a darker blurred band low down,
 * and the manifestation dot line safety glazing carries at about 1m.
 */
function makeFrostedGlassTexture(): THREE.CanvasTexture {
  if (frostedTexture) return frostedTexture;
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("FrostedGlassWall requires a 2D canvas context");
  const glow = ctx.createLinearGradient(0, 0, 0, 512);
  glow.addColorStop(0, "#dde3e5");
  glow.addColorStop(0.3, "#f4f6f6");
  glow.addColorStop(0.5, "#e7ebec");
  glow.addColorStop(0.64, "#bcc6ca");
  glow.addColorStop(0.8, "#8b979d");
  glow.addColorStop(1, "#717d83");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 128, 512);
  for (let i = 0; i < 1400; i += 1) {
    const shade = Math.random() > 0.5 ? 255 : 90;
    ctx.fillStyle = `rgba(${String(shade)},${String(shade)},${String(shade)},0.045)`;
    ctx.fillRect(Math.random() * 128, Math.random() * 512, 2, 2);
  }
  const dotY = 512 * (1 - 1.02 / FROSTED_PANE_HEIGHT);
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  for (let x = 6.4; x < 128; x += 12.8) {
    ctx.beginPath();
    ctx.arc(x, dotY, 1.7, 0, Math.PI * 2);
    ctx.fill();
  }
  frostedTexture = new THREE.CanvasTexture(canvas);
  frostedTexture.colorSpace = THREE.SRGBColorSpace;
  frostedTexture.wrapS = THREE.RepeatWrapping;
  frostedTexture.anisotropy = 4;
  return frostedTexture;
}

/**
 * Frosted curtain wall with black mullions and head/floor tracks. Opaque:
 * the glass reads as diffused light but never reveals what sits behind it.
 * The pane faces local +Z; `position` is the run's centre at floor level.
 */
export function FrostedGlassWall({
  position,
  length,
  rotationY = 0,
  panel = 1.25,
}: {
  position: [number, number, number];
  length: number;
  rotationY?: number;
  panel?: number;
}) {
  const height = FROSTED_PANE_HEIGHT;
  const panels = Math.max(1, Math.round(length / panel));
  const map = useMemo(() => makeFrostedGlassTexture(), []);
  const geometry = useMemo(() => {
    const plane = new THREE.PlaneGeometry(length, height);
    const uv = plane.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i += 1) uv.setX(i, uv.getX(i) * panels);
    return plane;
  }, [height, length, panels]);
  const frame = useMemo<InstancedBox[]>(() => {
    const step = length / panels;
    const boxes: InstancedBox[] = Array.from({ length: panels + 1 }, (_, i) => ({
      position: [-length / 2 + i * step, height / 2, 0.025],
      size: [0.045, height, 0.05],
    }));
    boxes.push(
      { position: [0, height - 0.045, 0.035], size: [length, 0.09, 0.07] },
      { position: [0, 0.035, 0.035], size: [length, 0.07, 0.07] },
    );
    return boxes;
  }, [height, length, panels]);

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh geometry={geometry} position={[0, height / 2, 0]} receiveShadow>
        <meshStandardMaterial
          map={map}
          emissive="#ffffff"
          emissiveMap={map}
          emissiveIntensity={0.12}
          roughness={0.3}
        />
      </mesh>
      <InstancedBoxes boxes={frame} color="#1b1c1d" roughness={0.45} metalness={0.3} />
    </group>
  );
}

let featureSignTexture: THREE.CanvasTexture | undefined;
const SIGN_SIZE = { width: 2.25, height: 1.4 } as const;

/** 04 SECURITY OPERATIONS wayfinding, set in light caps on a clear ground. */
function makeFeatureSignTexture(): THREE.CanvasTexture {
  if (featureSignTexture) return featureSignTexture;
  const canvas = document.createElement("canvas");
  canvas.width = 1152;
  canvas.height = 720;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("FeatureWall requires a 2D canvas context");
  const font = (weight: number, px: number) =>
    `${String(weight)} ${String(px)}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
  ctx.fillStyle = "#3a3530";
  ctx.textBaseline = "alphabetic";
  ctx.font = font(300, 124);
  ctx.fillText("04", 20, 140);
  ctx.fillStyle = "rgba(58,53,48,0.55)";
  ctx.fillRect(26, 274, 1100, 2);
  ctx.fillStyle = "#3a3530";
  ctx.font = font(300, 80);
  ctx.fillText("SECURITY", 22, 370);
  ctx.fillText("OPERATIONS", 22, 468);
  ctx.font = font(400, 21);
  ctx.fillText("Risk   /   Response   /   Assurance", 26, 610);
  ctx.letterSpacing = "4px";
  ctx.fillText("WORKSPACE   →", 26, 690);
  featureSignTexture = new THREE.CanvasTexture(canvas);
  featureSignTexture.colorSpace = THREE.SRGBColorSpace;
  featureSignTexture.anisotropy = 8;
  return featureSignTexture;
}

/**
 * Free-standing cream partition with a honey-oak slat accent on its glass end
 * and the 04 signage on the face that greets the entry (+Z).
 */
export function FeatureWall({
  minX,
  maxX,
  z,
  depth,
  height,
  slatWidth,
  slatDepth,
}: {
  minX: number;
  maxX: number;
  z: number;
  depth: number;
  height: number;
  slatWidth: number;
  slatDepth: number;
}) {
  const faceZ = z + depth / 2;
  const sign = useMemo(() => makeFeatureSignTexture(), []);
  const slats = useMemo<InstancedBox[]>(() => {
    const pitch = 0.058;
    const width = 0.04;
    const count = Math.floor((slatWidth - 0.02) / pitch);
    const tones = ["#c58f5b", "#bd8653", "#cb9662", "#c08a56"] as const;
    return Array.from({ length: count }, (_, i) => ({
      position: [
        minX + 0.02 + width / 2 + i * pitch,
        height / 2,
        faceZ + slatDepth / 2,
      ],
      size: [width, height, slatDepth],
      color: tones[(i * 7) % tones.length] ?? tones[0],
    }));
  }, [faceZ, height, minX, slatDepth, slatWidth]);

  return (
    <group>
      <mesh position={[(minX + maxX) / 2, height / 2, z]} castShadow receiveShadow>
        <boxGeometry args={[maxX - minX, height, depth]} />
        {/* Faint self-light stands in for the spot track's wash on the face */}
        <meshStandardMaterial
          color="#e7e0d4"
          emissive="#f3ece0"
          emissiveIntensity={0.2}
          roughness={0.92}
        />
      </mesh>
      {/* Dark reveal reads as the shadow gap between slats */}
      <mesh position={[minX + slatWidth / 2, height / 2, faceZ + 0.002]}>
        <planeGeometry args={[slatWidth, height]} />
        <meshStandardMaterial color="#2b1f16" roughness={0.9} />
      </mesh>
      <InstancedBoxes boxes={slats} roughness={0.55} castShadow />
      <mesh
        position={[
          maxX - 0.15 - SIGN_SIZE.width / 2,
          1.0 + SIGN_SIZE.height / 2,
          faceZ + 0.003,
        ]}
      >
        <planeGeometry args={[SIGN_SIZE.width, SIGN_SIZE.height]} />
        <meshStandardMaterial map={sign} transparent depthWrite={false} roughness={0.9} />
      </mesh>
    </group>
  );
}

/** Painted plaster perimeter wall in the film's warm cream. */
export function WallPanel({
  position,
  size,
  color = "#e9e3d8",
}: {
  position: [number, number, number];
  size: [number, number, number];
  color?: string;
}) {
  const wall = useMemo(() => makePlasterTexture(color), [color]);
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial map={wall} roughness={0.92} />
    </mesh>
  );
}

/** Glazing frame rails, in the same charcoal as the frosted-suite mullions. */
const GLAZING_FRAME = { sill: 0.12, head: 3.25, top: 3.4, depth: 0.34, mullion: 0.08 } as const;

/**
 * Floor-to-ceiling exterior glazing: charcoal sill, head and mullions around a
 * faint blue-grey tint. The view is the real city geometry outside, so it
 * holds parallax from every spot; the glass stays a solid wall to collision.
 */
export function CityGlazing({
  from,
  to,
  at,
  axis,
  bay = 1.55,
}: {
  /** Run start and end along `axis`, at wall line `at` on the other axis. */
  from: number;
  to: number;
  at: number;
  axis: "x" | "z";
  bay?: number;
}) {
  const length = to - from;
  const mid = (from + to) / 2;
  const glassHeight = GLAZING_FRAME.head - GLAZING_FRAME.sill;
  const frame = useMemo<InstancedBox[]>(() => {
    const place = (s: number, y: number, along: number, height: number, across: number): InstancedBox =>
      axis === "x"
        ? { position: [s, y, at], size: [along, height, across] }
        : { position: [at, y, s], size: [across, height, along] };
    const bays = Math.max(1, Math.round(length / bay));
    return [
      place(mid, GLAZING_FRAME.sill / 2, length, GLAZING_FRAME.sill, GLAZING_FRAME.depth),
      place(
        mid,
        (GLAZING_FRAME.head + GLAZING_FRAME.top) / 2,
        length,
        GLAZING_FRAME.top - GLAZING_FRAME.head,
        GLAZING_FRAME.depth,
      ),
      ...Array.from({ length: bays + 1 }, (_, i) =>
        place(
          from + (length * i) / bays,
          GLAZING_FRAME.sill + glassHeight / 2,
          GLAZING_FRAME.mullion,
          glassHeight,
          GLAZING_FRAME.depth - 0.04,
        ),
      ),
    ];
  }, [at, axis, bay, from, glassHeight, length, mid]);
  return (
    <group>
      <InstancedBoxes boxes={frame} color="#1b1c1d" roughness={0.45} metalness={0.3} castShadow />
      <mesh
        position={axis === "x" ? [mid, GLAZING_FRAME.sill + glassHeight / 2, at] : [at, GLAZING_FRAME.sill + glassHeight / 2, mid]}
        rotation={[0, axis === "x" ? 0 : -Math.PI / 2, 0]}
      >
        <planeGeometry args={[length, glassHeight]} />
        <meshStandardMaterial
          color="#9fb3c2"
          transparent
          opacity={0.1}
          roughness={0.08}
          metalness={0.1}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

export function CeilingAC({
  position,
  rotationY = 0,
  animated = true,
}: {
  position: [number, number, number];
  rotationY?: number;
  animated?: boolean;
}) {
  const live = useAmbientMotion(animated);
  const fan = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (!fan.current) return;
    if (!live) {
      fan.current.rotation.y = 0;
      return;
    }
    fan.current.rotation.y += delta * 0.85;
  });

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Large cassette / inverter housing */}
      <mesh castShadow>
        <boxGeometry args={[3.4, 0.28, 1.35]} />
        <meshStandardMaterial color="#d6dcd9" metalness={0.12} roughness={0.58} />
      </mesh>
      {/* Recessed face */}
      <mesh position={[0, -0.16, 0]}>
        <boxGeometry args={[3.15, 0.06, 1.15]} />
        <meshStandardMaterial color="#c8c4bc" metalness={0.2} roughness={0.5} />
      </mesh>
      {/* Center intake grille */}
      <mesh position={[0, -0.2, 0]}>
        <boxGeometry args={[1.1, 0.04, 0.7]} />
        <meshStandardMaterial color="#455157" roughness={0.78} />
      </mesh>
      <group ref={fan} position={[0, -0.232, 0]}>
        <mesh>
          <cylinderGeometry args={[0.055, 0.055, 0.018, 12]} />
          <meshStandardMaterial color="#7a7870" metalness={0.35} roughness={0.5} />
        </mesh>
        {([0, 1, 2, 3] as const).map((i) => (
          <mesh key={i} rotation={[0, (Math.PI / 2) * i, 0.12]}>
            <mesh position={[0.2, 0, 0]}>
              <boxGeometry args={[0.34, 0.008, 0.08]} />
              <meshStandardMaterial color="#6a6860" roughness={0.55} />
            </mesh>
          </mesh>
        ))}
      </group>
      {([-0.35, -0.18, 0, 0.18, 0.35] as const).map((z) => (
        <mesh key={z} position={[0, -0.22, z]}>
          <boxGeometry args={[0.95, 0.015, 0.04]} />
          <meshStandardMaterial color="#6a6860" />
        </mesh>
      ))}
      {/* Side blowers */}
      {([-1.15, 1.15] as const).map((x) => (
        <group key={x} position={[x, -0.2, 0]}>
          <mesh>
            <boxGeometry args={[0.7, 0.05, 0.95]} />
            <meshStandardMaterial color="#b0aea6" />
          </mesh>
          {([-0.3, -0.1, 0.1, 0.3] as const).map((z) => (
            <mesh key={z} position={[0, -0.03, z]}>
              <boxGeometry args={[0.55, 0.02, 0.06]} />
              <meshStandardMaterial color="#9a9890" />
            </mesh>
          ))}
        </group>
      ))}
      {/* Brand plate */}
      <mesh position={[1.4, -0.05, 0.6]}>
        <boxGeometry args={[0.35, 0.08, 0.02]} />
        <meshStandardMaterial color="#4fd0c8" emissive="#4fd0c8" emissiveIntensity={0.2} />
      </mesh>
      {/* Mount brackets to ceiling */}
      {([-1.4, 1.4] as const).map((x) => (
        <mesh key={`b${String(x)}`} position={[x, 0.2, 0]}>
          <boxGeometry args={[0.12, 0.15, 0.12]} />
          <meshStandardMaterial color="#8a8680" metalness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

export function Thermostat({
  position,
  rotationY = 0,
}: {
  position: [number, number, number];
  rotationY?: number;
}) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh castShadow>
        <boxGeometry args={[0.28, 0.38, 0.06]} />
        <meshStandardMaterial color="#f0eeea" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.08, 0.035]}>
        <boxGeometry args={[0.18, 0.1, 0.01]} />
        <meshStandardMaterial color="#1a2228" />
      </mesh>
      {/* Blue cool arrow */}
      <mesh position={[-0.06, -0.08, 0.04]} rotation={[0, 0, 0.4]}>
        <coneGeometry args={[0.04, 0.1, 3]} />
        <meshStandardMaterial color="#6eb8e8" emissive="#6eb8e8" emissiveIntensity={0.25} />
      </mesh>
      {/* Red warm arrow */}
      <mesh position={[0.06, -0.08, 0.04]} rotation={[0, 0, Math.PI - 0.4]}>
        <coneGeometry args={[0.04, 0.1, 3]} />
        <meshStandardMaterial color="#e87868" emissive="#e87868" emissiveIntensity={0.25} />
      </mesh>
    </group>
  );
}
