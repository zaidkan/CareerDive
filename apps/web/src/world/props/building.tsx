/**
 * Building shell and services — wall panels, windows, HVAC, thermostat.
 */
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { makeWallTexture } from "../textures.js";
import { useAmbientMotion } from "./ambient.js";

export function WallPanel({
  position,
  size,
  color = "#454a47",
}: {
  position: [number, number, number];
  size: [number, number, number];
  color?: string;
}) {
  const wall = useMemo(() => {
    const tex = makeWallTexture(color);
    tex.repeat.set(Math.max(1, size[0] / 4), Math.max(1, size[1] / 3));
    return tex;
  }, [color, size]);
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial map={wall} roughness={0.9} />
    </mesh>
  );
}

export function OfficeWindow({
  position,
  rotationY = 0,
  width = 2.4,
  height = 1.8,
}: {
  position: [number, number, number];
  rotationY?: number;
  width?: number;
  height?: number;
}) {
  /** Blinds are raised to the header, so the view stays readable. */
  const slatCount = 5;
  const blinds = Array.from({ length: slatCount }, (_, i) => (
    <mesh key={i} position={[0, height / 2 - 0.14 - i * 0.035, 0.05]}>
      <boxGeometry args={[width - 0.14, 0.03, 0.05]} />
      <meshStandardMaterial color="#d8d0c0" roughness={0.7} />
    </mesh>
  ));

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Reveal behind the glass so the wall never shows through */}
      <mesh position={[0, 0, -0.04]}>
        <boxGeometry args={[width + 0.02, height + 0.02, 0.06]} />
        <meshStandardMaterial color="#0d1418" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial
          color="#7fb8d4"
          emissive="#4f86a8"
          emissiveIntensity={0.5}
          roughness={0.25}
        />
      </mesh>
      {/* City band at the horizon reads as an outside view */}
      <mesh position={[0, -height * 0.22, 0.02]}>
        <planeGeometry args={[width, height * 0.3]} />
        <meshStandardMaterial color="#2c4655" emissive="#20323d" emissiveIntensity={0.3} />
      </mesh>
      {/* Outer casing, built as four sides so glass is never buried */}
      {(
        [
          [0, height / 2 + 0.055, width + 0.14, 0.11],
          [0, -height / 2 - 0.055, width + 0.14, 0.11],
        ] as const
      ).map(([x, y, w, hh]) => (
        <mesh key={`h${String(y)}`} position={[x, y, 0.02]} castShadow>
          <boxGeometry args={[w, hh, 0.12]} />
          <meshStandardMaterial color="#54636a" metalness={0.55} roughness={0.38} />
        </mesh>
      ))}
      {([-1, 1] as const).map((side) => (
        <mesh
          key={`v${String(side)}`}
          position={[side * (width / 2 + 0.055), 0, 0.02]}
          castShadow
        >
          <boxGeometry args={[0.11, height + 0.14, 0.12]} />
          <meshStandardMaterial color="#54636a" metalness={0.55} roughness={0.38} />
        </mesh>
      ))}
      {/* Mullions */}
      <mesh position={[0, 0, 0.03]}>
        <boxGeometry args={[0.05, height, 0.04]} />
        <meshStandardMaterial color="#829093" metalness={0.55} roughness={0.34} />
      </mesh>
      <mesh position={[0, height * 0.12, 0.03]}>
        <boxGeometry args={[width, 0.045, 0.04]} />
        <meshStandardMaterial color="#829093" metalness={0.55} roughness={0.34} />
      </mesh>
      {/* Blind header + raised stack, then sill */}
      <mesh position={[0, height / 2 - 0.07, 0.06]}>
        <boxGeometry args={[width - 0.06, 0.09, 0.09]} />
        <meshStandardMaterial color="#c4b8a4" />
      </mesh>
      {blinds}
      <mesh position={[0, -height / 2 - 0.09, 0.08]} castShadow receiveShadow>
        <boxGeometry args={[width + 0.2, 0.06, 0.22]} />
        <meshStandardMaterial color="#a3aaa6" roughness={0.48} />
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
