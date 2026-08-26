/**
 * Devices and peripherals — monitors, input gear, racks, desk clutter,
 * cameras and shredders.
 */
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { makeMonitorGlowTexture } from "../textures.js";
import { StickyNotes } from "./signage.js";

export function DualMonitor({
  position,
  leftEmissive = "#4fd0c8",
  rightEmissive = "#e8b84a",
  leftScreen,
}: {
  position: [number, number, number];
  leftEmissive?: string;
  rightEmissive?: string;
  leftScreen?: ReactNode;
}) {
  const leftTex = useMemo(
    () => makeMonitorGlowTexture(leftEmissive),
    [leftEmissive],
  );
  const rightTex = useMemo(
    () => makeMonitorGlowTexture(rightEmissive),
    [rightEmissive],
  );
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
              map={i === 0 ? leftTex : rightTex}
              emissive={i === 0 ? leftEmissive : rightEmissive}
              emissiveIntensity={leftScreen && i === 0 ? 0.15 : 0.55}
              roughness={0.25}
            />
          </mesh>
          <mesh position={[0, 0.2, 0.055]}>
            <boxGeometry args={[0.55, 0.02, 0.01]} />
            <meshStandardMaterial
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
      <mesh castShadow>
        <boxGeometry args={[0.52, 0.025, 0.18]} />
        <meshStandardMaterial color="#141414" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[0.48, 0.01, 0.14]} />
        <meshStandardMaterial color="#1c1c1c" />
      </mesh>
      <mesh position={[0.4, 0.01, 0.08]} castShadow>
        <boxGeometry args={[0.07, 0.02, 0.11]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
    </group>
  );
}

export function ServerRack({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.7, 1.8, 0.55]} />
        <meshStandardMaterial color="#12161a" metalness={0.35} roughness={0.45} />
      </mesh>
      {[-0.55, -0.25, 0.05, 0.35, 0.65].map((y, i) => (
        <mesh key={y} position={[0, y, 0.28]}>
          <boxGeometry args={[0.55, 0.12, 0.02]} />
          <meshStandardMaterial
            color="#0a0e12"
            emissive={i % 2 === 0 ? "#4fd0c8" : "#e8b84a"}
            emissiveIntensity={0.35 + (i % 3) * 0.1}
          />
        </mesh>
      ))}
      <mesh position={[0.22, 0.85, 0.29]}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshStandardMaterial color="#7dba6a" emissive="#7dba6a" emissiveIntensity={0.8} />
      </mesh>
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
  return (
    <group position={position}>
      {/* Coffee mug */}
      <mesh position={[-0.42 + v * 0.05, 0.05, 0.12]} castShadow>
        <cylinderGeometry args={[0.045, 0.04, 0.09, 12]} />
        <meshStandardMaterial color={v === 0 ? "#4a6a88" : v === 1 ? "#8a5038" : "#2a4840"} />
      </mesh>
      <mesh position={[-0.42 + v * 0.05, 0.1, 0.12]}>
        <torusGeometry args={[0.048, 0.008, 8, 16]} />
        <meshStandardMaterial color="#3a3a3a" />
      </mesh>
      {/* Water bottle */}
      <mesh position={[0.55, 0.1, 0.08]} castShadow>
        <cylinderGeometry args={[0.035, 0.038, 0.2, 12]} />
        <meshStandardMaterial color="#a8d4e8" transparent opacity={0.55} roughness={0.2} />
      </mesh>
      <mesh position={[0.55, 0.22, 0.08]}>
        <cylinderGeometry args={[0.03, 0.032, 0.04, 10]} />
        <meshStandardMaterial color="#2a4840" />
      </mesh>
      {/* Desk phone */}
      <group position={[0.35, 0.02, -0.15]}>
        <mesh castShadow>
          <boxGeometry args={[0.22, 0.04, 0.16]} />
          <meshStandardMaterial color="#2a2a2a" roughness={0.5} />
        </mesh>
        <mesh position={[0.02, 0.05, 0]}>
          <boxGeometry args={[0.08, 0.04, 0.05]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
        <mesh position={[-0.06, 0.06, 0]} rotation={[0.2, 0, 0.1]}>
          <boxGeometry args={[0.06, 0.03, 0.14]} />
          <meshStandardMaterial color="#3a3a3a" />
        </mesh>
      </group>
      {/* Document tray */}
      <mesh position={[-0.55, 0.03, -0.2]} castShadow>
        <boxGeometry args={[0.28, 0.04, 0.22]} />
        <meshStandardMaterial color="#5c4634" />
      </mesh>
      <mesh position={[-0.55, 0.06, -0.2]} rotation={[-0.08, 0.05, 0]}>
        <boxGeometry args={[0.24, 0.01, 0.18]} />
        <meshStandardMaterial color="#efe6d4" />
      </mesh>
      <mesh position={[-0.55, 0.08, -0.22]} rotation={[-0.12, -0.04, 0]}>
        <boxGeometry args={[0.22, 0.01, 0.16]} />
        <meshStandardMaterial color="#e0d4bc" />
      </mesh>
      {/* Notebook + pen */}
      <mesh position={[0.15, 0.015, 0.18]} rotation={[0, 0.25, 0]} castShadow>
        <boxGeometry args={[0.18, 0.02, 0.24]} />
        <meshStandardMaterial color="#3a5a48" />
      </mesh>
      <mesh position={[0.28, 0.03, 0.12]} rotation={[0, 0.4, 0.05]}>
        <cylinderGeometry args={[0.008, 0.008, 0.14, 8]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      {/* Folder / binder stack */}
      <mesh position={[0.5, 0.04, -0.28]} rotation={[0, -0.15, 0]} castShadow>
        <boxGeometry args={[0.2, 0.06, 0.26]} />
        <meshStandardMaterial color="#c45c48" />
      </mesh>
      <mesh position={[0.52, 0.09, -0.26]} rotation={[0, 0.1, 0]}>
        <boxGeometry args={[0.18, 0.05, 0.24]} />
        <meshStandardMaterial color="#4a6a88" />
      </mesh>
      <StickyNotes position={[-0.7, 0.02, 0.05]} />
    </group>
  );
}

export function SecurityCamera({
  position,
  rotationY = 0,
}: {
  position: [number, number, number];
  rotationY?: number;
}) {
  const led = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (!led.current) return;
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
