/**
 * Break-room appliances — fridge, coffee pot.
 */
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { makeSoftParticleTexture } from "../textures.js";
import { STEAM_WISP_COUNT, useAmbientMotion } from "./ambient.js";

export function Fridge({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.85, 1.7, 0.7]} />
        <meshStandardMaterial color="#c8c4bc" metalness={0.45} roughness={0.35} />
      </mesh>
      <mesh position={[0.38, 0.2, 0.36]}>
        <boxGeometry args={[0.04, 0.55, 0.04]} />
        <meshStandardMaterial color="#8a8680" metalness={0.6} />
      </mesh>
      <mesh position={[0, 0.35, 0.36]}>
        <boxGeometry args={[0.7, 0.02, 0.02]} />
        <meshStandardMaterial color="#9a9690" />
      </mesh>
      <mesh position={[0.28, 0.7, 0.36]}>
        <boxGeometry args={[0.12, 0.08, 0.03]} />
        <meshStandardMaterial
          color="#4fd0c8"
          emissive="#4fd0c8"
          emissiveIntensity={0.3}
        />
      </mesh>
    </group>
  );
}

function CoffeeSteam({ animated }: { animated: boolean }) {
  const live = useAmbientMotion(animated);
  const attrRef = useRef<THREE.BufferAttribute | null>(null);
  const speedsRef = useRef<Float32Array | null>(null);
  const originRef = useRef<Float32Array | null>(null);
  const sprite = makeSoftParticleTexture();

  const geometry = useMemo(() => {
    const positions = new Float32Array(STEAM_WISP_COUNT * 3);
    const speeds = new Float32Array(STEAM_WISP_COUNT);
    const origins = new Float32Array(STEAM_WISP_COUNT * 2);
    for (let i = 0; i < STEAM_WISP_COUNT; i += 1) {
      const ix = i * 3;
      const ang = (i / STEAM_WISP_COUNT) * Math.PI * 2;
      const rad = 0.012 + (i % 3) * 0.01;
      origins[i * 2] = Math.cos(ang) * rad;
      origins[i * 2 + 1] = Math.sin(ang) * rad;
      positions[ix] = origins[i * 2] ?? 0;
      positions[ix + 1] = 0.02 + i * 0.035;
      positions[ix + 2] = origins[i * 2 + 1] ?? 0;
      speeds[i] = 0.07 + (i % 4) * 0.018;
    }
    const geom = new THREE.BufferGeometry();
    const attr = new THREE.BufferAttribute(positions, 3);
    attr.setUsage(THREE.DynamicDrawUsage);
    geom.setAttribute("position", attr);
    attrRef.current = attr;
    speedsRef.current = speeds;
    originRef.current = origins;
    return geom;
  }, []);

  useFrame(({ clock }, delta) => {
    if (!live) return;
    const attr = attrRef.current;
    const speeds = speedsRef.current;
    const origins = originRef.current;
    if (!attr || !speeds || !origins) return;
    const arr = attr.array;
    if (!(arr instanceof Float32Array)) return;
    const t = clock.elapsedTime;
    for (let i = 0; i < STEAM_WISP_COUNT; i += 1) {
      const ix = i * 3;
      const y = arr[ix + 1];
      const spd = speeds[i];
      const ox = origins[i * 2];
      const oz = origins[i * 2 + 1];
      if (y === undefined || spd === undefined || ox === undefined || oz === undefined) {
        continue;
      }
      let ny = y + spd * delta;
      let nx = ox + Math.sin(t * 1.15 + i) * 0.025;
      let nz = oz + Math.cos(t * 0.9 + i * 0.6) * 0.02;
      if (ny > 0.52) {
        ny = 0.02;
        nx = ox;
        nz = oz;
      }
      arr[ix] = nx;
      arr[ix + 1] = ny;
      arr[ix + 2] = nz;
    }
    attr.needsUpdate = true;
  });

  if (!live) return null;

  return (
    <points position={[0, 0.26, 0]} geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        map={sprite}
        color="#f3e6c8"
        size={0.055}
        sizeAttenuation
        transparent
        opacity={0.28}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}

export function CoffeePot({
  position,
  animated = true,
}: {
  position: [number, number, number];
  animated?: boolean;
}) {
  return (
    <group position={position}>
      <mesh castShadow>
        <cylinderGeometry args={[0.14, 0.16, 0.28, 14]} />
        <meshStandardMaterial color="#1a130f" metalness={0.45} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.1, 0.12, 0.1, 12]} />
        <meshStandardMaterial color="#f3e6c8" roughness={0.35} />
      </mesh>
      <mesh position={[0.16, 0.05, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.08, 0.015, 8, 16, Math.PI]} />
        <meshStandardMaterial color="#2a2118" metalness={0.5} />
      </mesh>
      {/* Warmer hotplate glow, which reads the same as the point light it replaced */}
      <mesh position={[0, -0.145, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.02, 14]} />
        <meshStandardMaterial
          color="#8a3a20"
          emissive="#e8611a"
          emissiveIntensity={0.9}
          roughness={0.5}
        />
      </mesh>
      <CoffeeSteam animated={animated} />
    </group>
  );
}
