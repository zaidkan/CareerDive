/**
 * Signage and paper — label plates, whiteboards, calendars, sticky notes.
 * Owns the shared label-plate texture used by furniture and decor plates.
 */
import { useMemo } from "react";
import * as THREE from "three";
import { fitFontSize, makePostItTexture } from "../textures.js";

export const labelFont = (px: number) => `bold ${String(px)}px ui-monospace, monospace`;

const labelCache = new Map<string, THREE.CanvasTexture>();

/**
 * Signage plate. The font shrinks until the text fits, otherwise long labels
 * render clipped to their middle characters ("TEAM AWARD" as "AM AWA").
 */
export function makeLabelTexture(text: string, w = 256, h = 64): THREE.CanvasTexture {
  const key = `${text}|${String(w)}x${String(h)}`;
  const cached = labelCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas unavailable");
  ctx.fillStyle = "#10272b";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#4fd0c8";
  ctx.lineWidth = 2;
  ctx.strokeRect(4, 4, w - 8, h - 8);

  const inset = Math.max(10, w * 0.07);
  const size = fitFontSize({
    measure: (px) => {
      ctx.font = labelFont(px);
      return ctx.measureText(text).width;
    },
    maxWidth: w - inset * 2,
    startPx: h * 0.5,
  });
  ctx.font = labelFont(size);

  ctx.fillStyle = "#f2faf7";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, w / 2, h / 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  labelCache.set(key, tex);
  return tex;
}

export function MeshLabel({  text,
  position,
  rotationY = 0,
  width = 0.55,
  height = 0.14,
}: {
  text: string;
  position: [number, number, number];
  rotationY?: number;
  width?: number;
  height?: number;
}) {
  const texture = useMemo(() => makeLabelTexture(text), [text]);
  return (
    <mesh position={position} rotation={[0, rotationY, 0]}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial
        map={texture}
        toneMapped={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/**
 * Freestanding desk tent card ("YOUR DESK", "MORGAN", "HOT DESK").
 * Sits on the finished surface and faces the chair side (+Z local).
 * Reuses the shared label-plate texture — no new assets.
 */
export function StationPlate({
  text,
  position,
  rotationY = 0,
  width = 0.36,
}: {
  text: string;
  position: [number, number, number];
  rotationY?: number;
  width?: number;
}) {
  const texture = useMemo(() => makeLabelTexture(text), [text]);
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 0.006, 0]} receiveShadow>
        <boxGeometry args={[width + 0.05, 0.012, 0.13]} />
        <meshStandardMaterial color="#232a31" roughness={0.6} metalness={0.15} />
      </mesh>
      <mesh position={[0, 0.068, -0.026]} rotation={[-0.22, 0, 0]}>
        <planeGeometry args={[width, 0.115]} />
        <meshBasicMaterial
          map={texture}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

export function Whiteboard({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow>
        <boxGeometry args={[1.6, 1.0, 0.06]} />
        <meshStandardMaterial color="#e8dcc4" roughness={0.55} />
      </mesh>
      <mesh position={[0, 0, 0.035]}>
        <boxGeometry args={[1.45, 0.85, 0.01]} />
        <meshStandardMaterial color="#f5efe0" roughness={0.4} />
      </mesh>
      {/* Marker tray */}
      <mesh position={[0, -0.55, 0.08]}>
        <boxGeometry args={[1.5, 0.06, 0.12]} />
        <meshStandardMaterial color="#3a2c22" />
      </mesh>
    </group>
  );
}

export function WallCalendar({
  position,
  rotationY = 0,
}: {
  position: [number, number, number];
  rotationY?: number;
}) {
  const texture = useMemo(() => {
    const today = new Date();
    const day = today.getDate();
    const month = today.toLocaleString("en-US", { month: "long" });
    const year = today.getFullYear();
    const daysInMonth = new Date(year, today.getMonth() + 1, 0).getDate();
    const startWeekday = new Date(year, today.getMonth(), 1).getDay();

    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 640;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("WallCalendar requires a 2D canvas context");
    ctx.fillStyle = "#f5efe0";
    ctx.fillRect(0, 0, 512, 640);
    ctx.fillStyle = "#c45c48";
    ctx.fillRect(0, 0, 512, 88);
    ctx.fillStyle = "#fff8f0";
    ctx.font = "bold 36px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${month} ${String(year)}`, 256, 56);

    ctx.fillStyle = "#8a7664";
    ctx.font = "bold 18px system-ui, sans-serif";
    const dows = ["S", "M", "T", "W", "T", "F", "S"];
    dows.forEach((d, i) => {
      ctx.fillText(d, 48 + i * 60, 120);
    });

    ctx.font = "22px system-ui, sans-serif";
    let cell = startWeekday;
    for (let d = 1; d <= daysInMonth; d += 1) {
      const col = cell % 7;
      const row = Math.floor(cell / 7);
      const x = 48 + col * 60;
      const y = 160 + row * 52;
      if (d === day) {
        ctx.strokeStyle = "#c62828";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y - 6, 18, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "#c62828";
        ctx.font = "bold 22px system-ui, sans-serif";
      } else {
        ctx.fillStyle = "#3a2c22";
        ctx.font = "22px system-ui, sans-serif";
      }
      ctx.fillText(String(d), x, y);
      cell += 1;
    }

    // Hire note — flat, no perspective warp
    ctx.fillStyle = "#f3e6a8";
    ctx.fillRect(60, 520, 392, 90);
    ctx.strokeStyle = "#c4a060";
    ctx.lineWidth = 2;
    ctx.strokeRect(60, 520, 392, 90);
    ctx.fillStyle = "#5c3030";
    ctx.font = "bold 28px Georgia, serif";
    ctx.fillText("First day for new hires", 256, 575);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    tex.needsUpdate = true;
    return tex;
  }, []);

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh castShadow>
        <boxGeometry args={[0.95, 1.2, 0.04]} />
        <meshStandardMaterial color="#d8d0c0" roughness={0.55} />
      </mesh>
      <mesh position={[0, 0, 0.025]}>
        <planeGeometry args={[0.88, 1.12]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
    </group>
  );
}

export function StickyNotes({
  position,
  rotationY = 0,
  flat = false,
}: {
  position: [number, number, number];
  rotationY?: number;
  /** Lie on a desk instead of hanging on a wall. */
  flat?: boolean;
}) {
  const notes = [
    { x: 0, y: 0, color: "#f3e6a8", rot: 0.05 },
    { x: 0.18, y: -0.12, color: "#f0c4c0", rot: -0.1 },
    { x: -0.14, y: -0.18, color: "#c8e0d0", rot: 0.12 },
  ] as const;
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {notes.map((n, i) =>
        flat ? (
          <mesh
            key={i}
            position={[n.x, 0.004 + 0.002 * i, n.y]}
            rotation={[-Math.PI / 2, 0, n.rot]}
            castShadow
          >
            <boxGeometry args={[0.14, 0.14, 0.006]} />
            <meshStandardMaterial color={n.color} roughness={0.75} />
          </mesh>
        ) : (
          <mesh
            key={i}
            position={[n.x, n.y, 0.01 * i]}
            rotation={[0, 0, n.rot]}
            castShadow
          >
            <boxGeometry args={[0.16, 0.16, 0.01]} />
            <meshStandardMaterial color={n.color} roughness={0.75} />
          </mesh>
        ),
      )}
    </group>
  );
}

/** Desk post-it with workstation login — canvas texture (no HTML overlay). */
export function LoginPostIt({
  position,
  rotationY = 0,
  upright = false,
}: {
  position: [number, number, number];
  rotationY?: number;
  /** Stick to a monitor bezel, facing the seated player. */
  upright?: boolean;
}) {
  const note = useMemo(
    () => makePostItTexture(["login", "day1.analyst", "FirstDay!"]),
    [],
  );
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {upright ? (
        <mesh position={[0, 0, 0.004]} rotation={[0.06, 0, 0.1]}>
          <planeGeometry args={[0.3, 0.3]} />
          <meshBasicMaterial map={note} toneMapped={false} />
        </mesh>
      ) : (
        <mesh castShadow position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0.08]}>
          <boxGeometry args={[0.22, 0.22, 0.008]} />
          <meshStandardMaterial map={note} roughness={0.8} />
        </mesh>
      )}
    </group>
  );
}
