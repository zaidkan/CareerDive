/**
 * Placeable atmospheric dressing — dust motes and papers that catch HVAC flow.
 */
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { makeSoftParticleTexture } from "../textures.js";
import { clampParticleCount, useAmbientMotion } from "./ambient.js";

function fillSeeded(
  count: number,
  hx: number,
  hy: number,
  hz: number,
): { positions: Float32Array; speeds: Float32Array } {
  const positions = new Float32Array(count * 3);
  const speeds = new Float32Array(count);
  let seed = (count * 1103515245 + 12345) >>> 0;
  const rand = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < count; i += 1) {
    const ix = i * 3;
    positions[ix] = (rand() * 2 - 1) * hx;
    positions[ix + 1] = rand() * hy;
    positions[ix + 2] = (rand() * 2 - 1) * hz;
    speeds[i] = 0.012 + rand() * 0.028;
  }
  return { positions, speeds };
}

/**
 * Sparse drifting specks in a volume. Cap is a few hundred; one Points draw.
 *
 * Suggested placements (world space):
 * - `[0, 1.55, 0.4]` aisle volume, count 180, width 16, depth 12
 * - `[8.2, 1.65, -4.5]` break-nook shaft, count 70, width 3.2, depth 3.6
 * - `[-9.0, 1.35, -6.4]` server-rack glow, count 50, width 2.4, depth 1.8
 */
export function DustMotes({
  position,
  count = 160,
  width = 14,
  height = 2.5,
  depth = 12,
  animated = true,
}: {
  position: [number, number, number];
  count?: number;
  width?: number;
  height?: number;
  depth?: number;
  animated?: boolean;
}) {
  const live = useAmbientMotion(animated);
  const n = clampParticleCount(count);
  const sprite = useMemo(() => makeSoftParticleTexture(), []);
  const attrRef = useRef<THREE.BufferAttribute | null>(null);
  const speedsRef = useRef<Float32Array | null>(null);

  const geometry = useMemo(() => {
    const { positions, speeds } = fillSeeded(n, width * 0.5, height, depth * 0.5);
    const geom = new THREE.BufferGeometry();
    const attr = new THREE.BufferAttribute(positions, 3);
    attr.setUsage(THREE.DynamicDrawUsage);
    geom.setAttribute("position", attr);
    geom.computeBoundingSphere();
    attrRef.current = attr;
    speedsRef.current = speeds;
    return geom;
  }, [n, width, height, depth]);

  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  useFrame(({ clock }, delta) => {
    if (!live) return;
    const attr = attrRef.current;
    const speeds = speedsRef.current;
    if (!attr || !speeds) return;
    const arr = attr.array;
    if (!(arr instanceof Float32Array)) return;
    const t = clock.elapsedTime;
    const hx = width * 0.5;
    const hz = depth * 0.5;
    for (let i = 0; i < n; i += 1) {
      const ix = i * 3;
      const x = arr[ix];
      const y = arr[ix + 1];
      const z = arr[ix + 2];
      const spd = speeds[i];
      if (x === undefined || y === undefined || z === undefined || spd === undefined) {
        continue;
      }
      let nx = x + Math.sin(t * 0.16 + i) * delta * 0.03;
      let ny = y + spd * delta;
      let nz = z + Math.cos(t * 0.13 + i * 0.7) * delta * 0.022;
      if (nx > hx) nx -= width;
      else if (nx < -hx) nx += width;
      if (ny > height) ny -= height;
      else if (ny < 0) ny += height;
      if (nz > hz) nz -= depth;
      else if (nz < -hz) nz += depth;
      arr[ix] = nx;
      arr[ix + 1] = ny;
      arr[ix + 2] = nz;
    }
    attr.needsUpdate = true;
  });

  return (
    <points position={position} geometry={geometry}>
      <pointsMaterial
        map={sprite}
        color="#d8d0c4"
        size={0.02}
        sizeAttenuation
        transparent
        opacity={0.18}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}

const PAPERS = [
  { x: 0, y: 0, z: 0, rotY: 0.18, w: 0.18, d: 0.14, freq: 1.9 },
  { x: 0.15, y: 0.002, z: 0.05, rotY: -0.4, w: 0.14, d: 0.11, freq: 2.25 },
  { x: -0.12, y: 0.004, z: -0.05, rotY: 0.55, w: 0.12, d: 0.16, freq: 1.7 },
] as const;

/**
 * Loose sheets that catch a vent draft. Sit them on a desk or cabinet top.
 *
 * Suggested placements:
 * - `[0.55, 0.86, 0.15]` hot-desk under the west cassette (`CeilingAC` at [-5, 3.12, 2.5])
 * - `[0.2, 0.86, -0.05]` player desk, downwind of the aisle unit
 * - `[8.4, 0.96, -6.55]` coffee counter under the east-nook airflow
 */
export function VentPapers({
  position,
  rotationY = 0,
  animated = true,
}: {
  position: [number, number, number];
  rotationY?: number;
  animated?: boolean;
}) {
  const live = useAmbientMotion(animated);
  const sheets = useRef<(THREE.Mesh | null)[]>([null, null, null]);

  useFrame(({ clock }) => {
    const t = live ? clock.elapsedTime : 0;
    for (let i = 0; i < PAPERS.length; i += 1) {
      const spec = PAPERS[i];
      const mesh = sheets.current[i];
      if (!spec || !mesh) continue;
      mesh.rotation.x = 0.045 * Math.sin(t * spec.freq);
      mesh.rotation.z = 0.03 * Math.sin(t * (spec.freq + 0.35));
    }
  });

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {PAPERS.map((spec, i) => (
        <mesh
          key={spec.rotY}
          ref={(node) => {
            sheets.current[i] = node;
          }}
          position={[spec.x, spec.y, spec.z]}
          rotation={[0, spec.rotY, 0]}
          castShadow={false}
        >
          <boxGeometry args={[spec.w, 0.002, spec.d]} />
          <meshStandardMaterial color="#efe6d4" roughness={0.85} />
        </mesh>
      ))}
    </group>
  );
}
