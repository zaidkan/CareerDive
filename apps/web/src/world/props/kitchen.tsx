/**
 * Break-room appliances — fridge, coffee pot.
 */
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { CoffeeStage } from "@sim/schemas";
import * as THREE from "three";
import { makeSoftParticleTexture } from "../textures.js";
import { STEAM_WISP_COUNT, useAmbientMotion } from "./ambient.js";
import { MeshLabel } from "./signage.js";

export function Fridge({
  position,
  open,
  snackBars,
  animated = true,
}: {
  position: [number, number, number];
  open: boolean;
  snackBars: number;
  animated?: boolean;
}) {
  const door = useRef<THREE.Group>(null);
  const angle = useRef(0);
  const live = useAmbientMotion(animated);

  useFrame((_, delta) => {
    if (!door.current) return;
    const target = open ? -Math.PI * 0.62 : 0;
    angle.current = live
      ? THREE.MathUtils.damp(angle.current, target, 6, delta)
      : target;
    door.current.rotation.y = angle.current;
  });

  return (
    <group position={position}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.85, 1.7, 0.7]} />
        <meshStandardMaterial
          color="#aeb9bc"
          metalness={0.55}
          roughness={0.42}
        />
      </mesh>
      <mesh position={[0, 0, 0.356]}>
        <boxGeometry args={[0.72, 1.5, 0.025]} />
        <meshStandardMaterial
          color="#d9e5df"
          emissive="#d9e5df"
          emissiveIntensity={open ? 0.18 : 0}
          roughness={0.78}
        />
      </mesh>
      {open ? (
        <MeshLabel
          text={snackBars > 0 ? `${String(snackBars)} BARS` : "EMPTY"}
          position={[0, 0.56, 0.375]}
          width={0.48}
          height={0.12}
        />
      ) : null}
      {/* Thin shelf edges and a recessed toe kick give the appliance depth
          without extra lights, textures, or animation. */}
      {[-0.44, 0.12].map((height) => (
        <mesh key={height} position={[0, height, 0.39]}>
          <boxGeometry args={[0.7, 0.025, 0.055]} />
          <meshStandardMaterial
            color="#829895"
            metalness={0.3}
            roughness={0.5}
          />
        </mesh>
      ))}
      <mesh position={[0, -0.79, 0.36]}>
        <boxGeometry args={[0.73, 0.09, 0.025]} />
        <meshStandardMaterial color="#28383b" roughness={0.8} />
      </mesh>
      {open && snackBars > 0
        ? Array.from({ length: snackBars }, (_, index) => (
            <mesh
              key={index}
              position={[-0.2 + index * 0.2, -0.35, 0.39]}
              rotation={[0, 0, index % 2 === 0 ? 0.08 : -0.08]}
            >
              <boxGeometry args={[0.16, 0.08, 0.05]} />
              <meshStandardMaterial
                color={index % 2 === 0 ? "#e8b84a" : "#c45c48"}
                roughness={0.55}
              />
            </mesh>
          ))
        : null}
      <group ref={door} position={[-0.425, 0, 0.39]}>
        <mesh castShadow position={[0.425, 0, 0]}>
          <boxGeometry args={[0.82, 1.66, 0.07]} />
          <meshStandardMaterial
            color="#d5dedb"
            metalness={0.5}
            roughness={0.4}
          />
        </mesh>
        <mesh position={[0.76, 0.2, 0.05]}>
          <boxGeometry args={[0.04, 0.55, 0.04]} />
          <meshStandardMaterial
            color="#283b40"
            metalness={0.5}
            roughness={0.32}
          />
        </mesh>
        <mesh position={[0.425, 0.35, 0.05]}>
          <boxGeometry args={[0.7, 0.02, 0.02]} />
          <meshStandardMaterial color="#9a9690" />
        </mesh>
        <mesh position={[0.7, 0.7, 0.055]}>
          <boxGeometry args={[0.12, 0.08, 0.03]} />
          <meshStandardMaterial
            color="#4fd0c8"
            emissive="#4fd0c8"
            emissiveIntensity={0.3}
          />
        </mesh>
      </group>
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
      if (
        y === undefined ||
        spd === undefined ||
        ox === undefined ||
        oz === undefined
      ) {
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
  stage,
  animated = true,
}: {
  position: [number, number, number];
  stage: CoffeeStage;
  animated?: boolean;
}) {
  const hot = stage !== "idle";
  const steaming = stage === "ready" || stage === "poured";
  return (
    <group position={position}>
      <mesh position={[0, -0.175, 0]} receiveShadow>
        <boxGeometry args={[0.43, 0.04, 0.36]} />
        <meshStandardMaterial color="#26363c" metalness={0.3} roughness={0.6} />
      </mesh>
      <mesh castShadow>
        <cylinderGeometry args={[0.14, 0.16, 0.28, 14]} />
        <meshStandardMaterial
          color="#71868b"
          metalness={0.72}
          roughness={0.28}
        />
      </mesh>
      <mesh position={[0, 0.145, 0]}>
        <cylinderGeometry args={[0.145, 0.145, 0.025, 14]} />
        <meshStandardMaterial color="#26363c" metalness={0.4} roughness={0.4} />
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
          emissiveIntensity={hot ? 0.9 : 0.08}
          roughness={0.5}
        />
      </mesh>
      {/* Literal public stage stays readable without motion or color perception. */}
      <MeshLabel
        text={stage.toUpperCase()}
        position={[0, -0.06, 0.164]}
        width={0.36}
        height={0.09}
      />
      {steaming ? <CoffeeSteam animated={animated} /> : null}
    </group>
  );
}

export function SnackBasket({
  position,
}: {
  position: [number, number, number];
}) {
  const bars = [
    { x: -0.04, z: 0.02, rot: 0.18, color: "#c45c48" },
    { x: 0.05, z: -0.03, rot: -0.22, color: "#e8b84a" },
    { x: 0.0, z: 0.05, rot: 0.08, color: "#7dba6a" },
  ] as const;
  return (
    <group position={position}>
      <mesh position={[0, 0.06, 0]} castShadow>
        <boxGeometry args={[0.28, 0.08, 0.2]} />
        <meshStandardMaterial color="#5a3a28" roughness={0.75} />
      </mesh>
      {bars.map((bar) => (
        <mesh
          key={bar.color}
          position={[bar.x, 0.13, bar.z]}
          rotation={[0, bar.rot, 0.12]}
          castShadow
        >
          <boxGeometry args={[0.16, 0.05, 0.07]} />
          <meshStandardMaterial color={bar.color} roughness={0.55} />
        </mesh>
      ))}
    </group>
  );
}
