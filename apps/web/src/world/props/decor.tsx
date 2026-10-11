/**
 * Wall decor and greenery — plants, posters, art, certificates, clock.
 */
import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { fitFontSize, makePaintingTexture, makePortraitTexture } from "../textures.js";
import { labelFont, makeLabelTexture } from "./signage.js";

const certificateCache = new Map<string, THREE.CanvasTexture>();

/** Cream award document rather than a generic teal signage plate. */
function makeCertificateTexture(title: string, accent: string): THREE.CanvasTexture {
  const key = `${title}|${accent}`;
  const cached = certificateCache.get(key);
  if (cached) return cached;

  const w = 320;
  const h = 400;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas unavailable");

  ctx.fillStyle = "#f5efe0";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 6;
  ctx.strokeRect(16, 16, w - 32, h - 32);
  ctx.strokeStyle = "rgba(60,44,34,0.35)";
  ctx.lineWidth = 2;
  ctx.strokeRect(28, 28, w - 56, h - 56);

  ctx.fillStyle = "#6a5a44";
  ctx.font = "500 20px ui-monospace, monospace";
  ctx.textAlign = "center";
  ctx.fillText("VERDALY TECHNOLOGIES", w / 2, 78);

  ctx.fillStyle = "#2a1c12";
  ctx.font = labelFont(
    fitFontSize({
      measure: (px) => {
        ctx.font = labelFont(px);
        return ctx.measureText(title).width;
      },
      maxWidth: w - 90,
      startPx: 40,
      minPx: 12,
    }),
  );
  ctx.fillText(title, w / 2, 150);

  ctx.strokeStyle = "rgba(60,44,34,0.28)";
  ctx.lineWidth = 3;
  for (let i = 0; i < 4; i += 1) {
    const y = 200 + i * 26;
    ctx.beginPath();
    ctx.moveTo(70, y);
    ctx.lineTo(w - 70, y);
    ctx.stroke();
  }

  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(w / 2, 330, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.beginPath();
  ctx.arc(w / 2, 330, 19, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  certificateCache.set(key, tex);
  return tex;
}

/** Small potted plant for desks / side tables */
export function PlantPot({
  position,
  scale = 1,
}: {
  position: [number, number, number];
  scale?: number;
}) {
  return (
    <group position={position} scale={scale}>
      <mesh castShadow>
        <cylinderGeometry args={[0.12, 0.1, 0.18, 12]} />
        <meshStandardMaterial color="#ad8970" roughness={0.48} />
      </mesh>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.11, 0.11, 0.04, 12]} />
        <meshStandardMaterial color="#2a2118" />
      </mesh>
      <mesh position={[0, 0.28, 0]}>
        <sphereGeometry args={[0.16, 10, 10]} />
        <meshStandardMaterial color="#2d5a3d" roughness={0.9} />
      </mesh>
      <mesh position={[0.07, 0.36, 0.04]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial color="#527c4b" roughness={0.72} />
      </mesh>
      <mesh position={[-0.06, 0.34, -0.05]}>
        <sphereGeometry args={[0.09, 8, 8]} />
        <meshStandardMaterial color="#245536" />
      </mesh>
    </group>
  );
}

/** Corner planter — sits against walls, not in walking aisles */
export function TallFloorPlant({
  position,
  scale = 1,
}: {
  position: [number, number, number];
  scale?: number;
}) {
  return (
    <group position={position} scale={scale}>
      <mesh castShadow receiveShadow position={[0, 0.28, 0]}>
        <cylinderGeometry args={[0.32, 0.28, 0.56, 16]} />
        <meshStandardMaterial color="#8c9690" roughness={0.82} metalness={0} />
      </mesh>
      <mesh position={[0, 0.58, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.05, 16]} />
        <meshStandardMaterial color="#1e1812" />
      </mesh>
      <mesh position={[0, 0.62, 0]}>
        <cylinderGeometry args={[0.26, 0.26, 0.04, 16]} />
        <meshStandardMaterial color="#2a1c12" />
      </mesh>
      {(
        [
          [0, 1.05, 0, 0.34],
          [0.18, 0.95, 0.08, 0.22],
          [-0.16, 0.98, -0.1, 0.24],
          [0.04, 1.28, -0.06, 0.2],
          [-0.1, 1.22, 0.12, 0.18],
          [0.12, 1.18, -0.14, 0.16],
        ] as const
      ).map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]} castShadow>
          <sphereGeometry args={[r, 12, 12]} />
          <meshStandardMaterial
            color={i % 2 === 0 ? "#315b43" : "#5a7850"}
            roughness={0.9}
          />
        </mesh>
      ))}
    </group>
  );
}

/** Arrowhead leaf in the XZ plane, tip along +Z, base at the origin. */
function makeLeafGeometry(): THREE.ShapeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.04);
  shape.bezierCurveTo(-0.16, -0.06, -0.24, 0.12, -0.2, 0.28);
  shape.bezierCurveTo(-0.16, 0.44, -0.06, 0.58, 0, 0.66);
  shape.bezierCurveTo(0.06, 0.58, 0.16, 0.44, 0.2, 0.28);
  shape.bezierCurveTo(0.24, 0.12, 0.16, -0.06, 0, 0.04);
  const geometry = new THREE.ShapeGeometry(shape, 6);
  geometry.rotateX(Math.PI / 2);
  return geometry;
}

const LEAF_GEOMETRY = makeLeafGeometry();
const STEM_GEOMETRY = new THREE.CylinderGeometry(1, 1, 1, 5);
const LEAF_TONES = ["#6f9b46", "#86ad59", "#5d8a3a", "#9cbd6c"] as const;

type Placed = { matrix: THREE.Matrix4; color?: string };

/** Golden-angle spiral of leaves on arching stems, fixed so every mount matches. */
function heroPlantParts(count: number): { leaves: Placed[]; stems: Placed[] } {
  const leaves: Placed[] = [];
  const stems: Placed[] = [];
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < count; i += 1) {
    const azimuth = i * 2.39996;
    const lift = (i * 0.618) % 1;
    const reach = 0.16 + ((i * 0.381) % 1) * 0.3;
    const height = 0.95 + lift * 0.9;
    const dir = new THREE.Vector3(Math.cos(azimuth), 0, Math.sin(azimuth));
    const base = new THREE.Vector3(0, 0.6, 0).addScaledVector(dir, 0.04);
    const tip = new THREE.Vector3(0, height, 0).addScaledVector(dir, reach);
    const stemDir = tip.clone().sub(base);
    const length = stemDir.length();
    stems.push({
      matrix: new THREE.Matrix4().compose(
        base.clone().addScaledVector(stemDir, 0.5),
        new THREE.Quaternion().setFromUnitVectors(up, stemDir.normalize()),
        new THREE.Vector3(0.007, length, 0.007),
      ),
    });
    const droop = 0.35 + lift * 0.55;
    const size = 0.36 + ((i * 0.27) % 1) * 0.14;
    leaves.push({
      matrix: new THREE.Matrix4().compose(
        tip,
        new THREE.Quaternion().setFromEuler(
          new THREE.Euler(droop, Math.PI / 2 - azimuth, (i % 3) * 0.18 - 0.18, "YXZ"),
        ),
        new THREE.Vector3(size, size, size),
      ),
      color: LEAF_TONES[i % LEAF_TONES.length] ?? LEAF_TONES[0],
    });
  }
  return { leaves, stems };
}

function InstancedParts({
  parts,
  geometry,
  color = "#ffffff",
  side = THREE.FrontSide,
}: {
  parts: Placed[];
  geometry: THREE.BufferGeometry;
  color?: string;
  side?: THREE.Side;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const target = mesh.current;
    if (!target) return;
    const tint = new THREE.Color();
    parts.forEach(({ matrix, color: partColor }, i) => {
      target.setMatrixAt(i, matrix);
      if (partColor) target.setColorAt(i, tint.set(partColor));
    });
    target.instanceMatrix.needsUpdate = true;
    if (target.instanceColor) target.instanceColor.needsUpdate = true;
    target.computeBoundingSphere();
  }, [parts]);
  return (
    <instancedMesh ref={mesh} args={[geometry, undefined, parts.length]} castShadow>
      <meshStandardMaterial color={color} roughness={0.7} side={side} />
    </instancedMesh>
  );
}

/**
 * Statement plant from the arrival film: a wide stone-white bowl on a dark
 * saucer, with broad arrowhead leaves on arching stems.
 */
export function HeroPlant({
  position,
  scale = 1,
}: {
  position: [number, number, number];
  scale?: number;
}) {
  const { leaves, stems } = useMemo(() => heroPlantParts(22), []);
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.015, 0]} receiveShadow>
        <cylinderGeometry args={[0.31, 0.33, 0.03, 28]} />
        <meshStandardMaterial color="#2a2826" roughness={0.5} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.35, 0]} scale={[1, 0.9, 1]} castShadow receiveShadow>
        <sphereGeometry args={[0.44, 32, 18, 0, Math.PI * 2, Math.PI * 0.28, Math.PI * 0.52]} />
        <meshStandardMaterial color="#ebe7df" roughness={0.88} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.585, 0]}>
        <cylinderGeometry args={[0.33, 0.33, 0.02, 28]} />
        <meshStandardMaterial color="#3d3024" roughness={1} />
      </mesh>
      <InstancedParts parts={stems} geometry={STEM_GEOMETRY} color="#5f7a3e" />
      <InstancedParts parts={leaves} geometry={LEAF_GEOMETRY} side={THREE.DoubleSide} />
    </group>
  );
}

export function AccentPoster({
  position,
  rotationY = 0,
  color = "#2a4840",
}: {
  position: [number, number, number];
  rotationY?: number;
  color?: string;
}) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh castShadow>
        <boxGeometry args={[0.7, 0.95, 0.04]} />
        <meshStandardMaterial color="#2a2118" />
      </mesh>
      <mesh position={[0, 0, 0.025]}>
        <boxGeometry args={[0.58, 0.78, 0.01]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.15} />
      </mesh>
    </group>
  );
}

/** Framed wall art. Procedural texture keeps it free of asset downloads. */
export function WallArt({
  position,
  rotationY = 0,
  variant = 0,
  width = 1.1,
  height = 0.82,
}: {
  position: [number, number, number];
  rotationY?: number;
  variant?: number;
  width?: number;
  height?: number;
}) {
  const texture = useMemo(() => makePaintingTexture(variant), [variant]);
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh castShadow>
        <boxGeometry args={[width, height, 0.05]} />
        <meshStandardMaterial color="#786049" roughness={0.38} />
      </mesh>
      <mesh position={[0, 0, 0.028]}>
        <boxGeometry args={[width - 0.09, height - 0.09, 0.01]} />
        <meshStandardMaterial color="#dad6c9" roughness={0.92} />
      </mesh>
      <mesh position={[0, 0, 0.042]}>
        <planeGeometry args={[width - 0.14, height - 0.14]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
    </group>
  );
}

export function FramedCertificate({
  position,
  rotationY = 0,
  title = "CERTIFIED",
  accent = "#c4a060",
}: {
  position: [number, number, number];
  rotationY?: number;
  title?: string;
  accent?: string;
}) {
  const texture = useMemo(() => makeCertificateTexture(title, accent), [title, accent]);
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Thin frame; back flush to wall, face on +Z */}
      <mesh castShadow position={[0, 0, 0]}>
        <boxGeometry args={[0.55, 0.7, 0.03]} />
        <meshStandardMaterial color="#3a2c22" roughness={0.55} />
      </mesh>
      <mesh position={[0, 0, 0.026]}>
        <planeGeometry args={[0.47, 0.6]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
    </group>
  );
}

export function EmployeeOfMonth({
  position,
  rotationY = 0,
  name = "Dana",
}: {
  position: [number, number, number];
  rotationY?: number;
  name?: string;
}) {
  const nameplate = useMemo(() => makeLabelTexture(name.toUpperCase(), 256, 72), [name]);
  const caption = useMemo(
    () => makeLabelTexture("EMPLOYEE OF THE MONTH", 512, 72),
    [],
  );
  const portrait = useMemo(
    () => makePortraitTexture({ hair: "#241610", top: "#7a5a42", longHair: true }),
    [],
  );
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh castShadow>
        <boxGeometry args={[0.85, 1.15, 0.04]} />
        <meshStandardMaterial color="#2a2118" roughness={0.55} />
      </mesh>
      {/* Caption band across the top, wide enough for the full phrase */}
      <mesh position={[0, 0.44, 0.032]}>
        <planeGeometry args={[0.74, 0.11]} />
        <meshBasicMaterial map={caption} toneMapped={false} />
      </mesh>
      {/* Portrait, matted inside a mount */}
      <mesh position={[0, 0.03, 0.026]} castShadow>
        <boxGeometry args={[0.52, 0.6, 0.015]} />
        <meshStandardMaterial color="#efe6d4" />
      </mesh>
      <mesh position={[0, 0.03, 0.045]}>
        <planeGeometry args={[0.42, 0.5]} />
        <meshBasicMaterial map={portrait} toneMapped={false} />
      </mesh>
      <mesh position={[0, -0.42, 0.032]}>
        <planeGeometry args={[0.46, 0.11]} />
        <meshBasicMaterial map={nameplate} toneMapped={false} />
      </mesh>
    </group>
  );
}

export function WallClock({
  position,
  rotationY = 0,
}: {
  position: [number, number, number];
  rotationY?: number;
}) {
  const hour = useRef<THREE.Mesh>(null);
  const minute = useRef<THREE.Mesh>(null);
  const lastTick = useRef(-1);
  useFrame(({ clock }) => {
    const t = Math.floor(clock.elapsedTime);
    if (t === lastTick.current) return;
    lastTick.current = t;
    const now = new Date();
    const h = (now.getHours() % 12) + now.getMinutes() / 60;
    const m = now.getMinutes() + now.getSeconds() / 60;
    if (hour.current) hour.current.rotation.z = -((h / 12) * Math.PI * 2);
    if (minute.current) minute.current.rotation.z = -((m / 60) * Math.PI * 2);
  });
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.32, 0.32, 0.06, 32]} />
        <meshStandardMaterial color="#e8e4dc" roughness={0.4} />
      </mesh>
      <mesh position={[0, 0, 0.035]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.28, 32]} />
        <meshStandardMaterial color="#f8f4ec" />
      </mesh>
      {/* Tick marks */}
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[Math.sin(a) * 0.22, Math.cos(a) * 0.22, 0.04]}
          >
            <boxGeometry args={[0.02, 0.04, 0.01]} />
            <meshStandardMaterial color="#2a2118" />
          </mesh>
        );
      })}
      <mesh ref={hour} position={[0, 0, 0.05]}>
        <boxGeometry args={[0.025, 0.12, 0.01]} />
        <meshStandardMaterial color="#2a2118" />
      </mesh>
      <mesh ref={minute} position={[0, 0, 0.055]}>
        <boxGeometry args={[0.018, 0.18, 0.01]} />
        <meshStandardMaterial color="#c45c48" />
      </mesh>
    </group>
  );
}
