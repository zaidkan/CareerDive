/**
 * Extra office fixtures — shredder, cameras, HVAC, lockers, clock.
 */
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

function makeLabelTexture(text: string, w = 256, h = 64): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#1a3028";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#4fd0c8";
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, w - 8, h - 8);
  ctx.fillStyle = "#9fe8e0";
  ctx.font = `bold ${Math.floor(h * 0.42)}px ui-monospace, monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, w / 2, h / 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
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

export function WallClock({
  position,
  rotationY = 0,
}: {
  position: [number, number, number];
  rotationY?: number;
}) {
  const hour = useRef<THREE.Mesh>(null);
  const minute = useRef<THREE.Mesh>(null);
  useFrame(() => {
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

export function CeilingAC({
  position,
  rotationY = 0,
}: {
  position: [number, number, number];
  rotationY?: number;
}) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Large cassette / inverter housing */}
      <mesh castShadow>
        <boxGeometry args={[3.4, 0.28, 1.35]} />
        <meshStandardMaterial color="#e4e0d8" metalness={0.3} roughness={0.4} />
      </mesh>
      {/* Recessed face */}
      <mesh position={[0, -0.16, 0]}>
        <boxGeometry args={[3.15, 0.06, 1.15]} />
        <meshStandardMaterial color="#c8c4bc" metalness={0.2} roughness={0.5} />
      </mesh>
      {/* Center intake grille */}
      <mesh position={[0, -0.2, 0]}>
        <boxGeometry args={[1.1, 0.04, 0.7]} />
        <meshStandardMaterial color="#8a8880" />
      </mesh>
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
        <mesh key={`b${x}`} position={[x, 0.2, 0]}>
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

export function CoatRack({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.035, 0.045, 1.8, 10]} />
        <meshStandardMaterial color="#4a3a2c" metalness={0.3} />
      </mesh>
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.32, 0.32, 0.05, 16]} />
        <meshStandardMaterial color="#2a2118" />
      </mesh>
      {([-0.25, -0.08, 0.08, 0.25] as const).map((x, i) => (
        <mesh key={i} position={[x, 1.65, 0]} rotation={[0, 0, x * 0.9]}>
          <cylinderGeometry args={[0.015, 0.015, 0.32, 8]} />
          <meshStandardMaterial color="#5c4634" />
        </mesh>
      ))}
      {/* Jacket */}
      <mesh position={[-0.18, 1.25, 0.06]} rotation={[0.15, 0.25, 0.08]} castShadow>
        <boxGeometry args={[0.32, 0.55, 0.1]} />
        <meshStandardMaterial color="#2a3a48" roughness={0.85} />
      </mesh>
      {/* Second jacket */}
      <mesh position={[0.2, 1.2, 0.04]} rotation={[0.1, -0.2, -0.05]} castShadow>
        <boxGeometry args={[0.28, 0.5, 0.09]} />
        <meshStandardMaterial color="#5c3a2c" roughness={0.8} />
      </mesh>
      {/* Backpack on base */}
      <mesh position={[0.28, 0.35, 0.1]} castShadow>
        <boxGeometry args={[0.28, 0.4, 0.18]} />
        <meshStandardMaterial color="#3a5040" />
      </mesh>
      <mesh position={[0.28, 0.5, 0.2]}>
        <boxGeometry args={[0.22, 0.12, 0.04]} />
        <meshStandardMaterial color="#2a3a30" />
      </mesh>
      {/* Umbrella leaning */}
      <mesh position={[-0.3, 0.7, 0.15]} rotation={[0.35, 0, 0.2]} castShadow>
        <cylinderGeometry args={[0.02, 0.02, 1.1, 8]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[-0.38, 1.25, 0.32]} rotation={[0.35, 0, 0.2]}>
        <sphereGeometry args={[0.1, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#c45c48" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

export function PersonalLockers({
  position,
  rotationY = 0,
}: {
  position: [number, number, number];
  rotationY?: number;
}) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {([-0.7, 0, 0.7] as const).map((x, i) => (
        <group key={i} position={[x, 0, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.65, 1.9, 0.5]} />
            <meshStandardMaterial color="#3d4650" metalness={0.2} roughness={0.55} />
          </mesh>
          <mesh position={[0.22, 0.2, 0.26]}>
            <boxGeometry args={[0.05, 0.12, 0.04]} />
            <meshStandardMaterial color="#c4a060" metalness={0.5} />
          </mesh>
          <mesh position={[0, 0.7, 0.26]}>
            <boxGeometry args={[0.35, 0.12, 0.02]} />
            <meshStandardMaterial color="#1a2228" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function MeshLabel({
  text,
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
        transparent
      />
    </mesh>
  );
}

export function StorageCabinet({
  position,
  rotationY = 0,
  label,
  open = false,
}: {
  position: [number, number, number];
  rotationY?: number;
  label: string;
  open?: boolean;
}) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1.1, 1.55, 0.55]} />
        <meshStandardMaterial color="#3a342c" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.78, 0.28]}>
        <boxGeometry args={[1.0, 0.02, 0.02]} />
        <meshStandardMaterial color="#2a241c" />
      </mesh>
      <mesh position={[0.4, 0.2, 0.29]}>
        <boxGeometry args={[0.06, 0.2, 0.04]} />
        <meshStandardMaterial color="#8a8680" metalness={0.5} />
      </mesh>
      <mesh position={[0.4, -0.35, 0.29]}>
        <boxGeometry args={[0.06, 0.2, 0.04]} />
        <meshStandardMaterial color="#8a8680" metalness={0.5} />
      </mesh>
      {/* World-locked label plate (no Html billboard) */}
      <mesh position={[0, 0.55, 0.285]}>
        <boxGeometry args={[0.72, 0.2, 0.025]} />
        <meshStandardMaterial color="#14241e" />
      </mesh>
      <MeshLabel text={label} position={[0, 0.55, 0.3]} width={0.65} height={0.14} />
      {open ? (
        <group position={[0, 0.1, 0.45]}>
          <mesh position={[-0.2, 0.2, 0]}>
            <boxGeometry args={[0.25, 0.08, 0.15]} />
            <meshStandardMaterial color="#5a6a40" />
          </mesh>
          <mesh position={[0.15, 0.05, 0.02]}>
            <boxGeometry args={[0.2, 0.12, 0.12]} />
            <meshStandardMaterial color="#4a3a2c" />
          </mesh>
          <mesh position={[0, -0.25, 0]}>
            <boxGeometry args={[0.4, 0.05, 0.2]} />
            <meshStandardMaterial color="#c8c4bc" metalness={0.4} />
          </mesh>
        </group>
      ) : null}
    </group>
  );
}

export function MonitorArmDesk({
  position,
  rotationY = 0,
}: {
  position: [number, number, number];
  rotationY?: number;
}) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Desk against wall */}
      <mesh position={[0, 0.78, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.9, 0.06, 0.85]} />
        <meshStandardMaterial color="#2c241c" roughness={0.5} />
      </mesh>
      {(
        [
          [-0.8, 0.32],
          [0.8, 0.32],
          [-0.8, -0.28],
          [0.8, -0.28],
        ] as const
      ).map(([x, z], i) => (
        <mesh key={i} position={[x, 0.39, z]}>
          <boxGeometry args={[0.07, 0.78, 0.07]} />
          <meshStandardMaterial color="#16110e" />
        </mesh>
      ))}
      {/* Clamp + articulated arm into desk */}
      <mesh position={[0, 0.86, -0.28]}>
        <boxGeometry args={[0.14, 0.08, 0.18]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.5} />
      </mesh>
      <mesh position={[0, 1.15, -0.28]} rotation={[0.4, 0, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.55, 10]} />
        <meshStandardMaterial color="#4a4a4a" metalness={0.55} />
      </mesh>
      <mesh position={[0, 1.4, -0.05]} rotation={[1.1, 0, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.4, 10]} />
        <meshStandardMaterial color="#4a4a4a" metalness={0.55} />
      </mesh>
      {/* Dual screens on arm head */}
      {([-0.38, 0.38] as const).map((x, i) => (
        <group key={x} position={[x, 1.45, 0.12]}>
          <mesh castShadow>
            <boxGeometry args={[0.7, 0.45, 0.05]} />
            <meshStandardMaterial color="#0a0a0a" />
          </mesh>
          <mesh position={[0, 0, 0.03]}>
            <boxGeometry args={[0.62, 0.38, 0.02]} />
            <meshStandardMaterial
              color="#050a0c"
              emissive={i === 0 ? "#ff6b4a" : "#4fd0c8"}
              emissiveIntensity={0.55}
            />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.84, 0.15]}>
        <boxGeometry args={[0.45, 0.02, 0.16]} />
        <meshStandardMaterial color="#141414" />
      </mesh>
    </group>
  );
}

export function TrashBin({
  position,
  recycling = false,
}: {
  position: [number, number, number];
  recycling?: boolean;
}) {
  const color = recycling ? "#3a6a48" : "#3a3a3a";
  return (
    <group position={position}>
      <mesh castShadow receiveShadow position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.2, 0.18, 0.7, 14]} />
        <meshStandardMaterial color={color} roughness={0.65} />
      </mesh>
      <mesh position={[0, 0.72, 0]}>
        <torusGeometry args={[0.2, 0.025, 8, 20]} />
        <meshStandardMaterial color={recycling ? "#4a8a58" : "#2a2a2a"} />
      </mesh>
      {recycling ? (
        <mesh position={[0, 0.4, 0.19]}>
          <boxGeometry args={[0.12, 0.12, 0.02]} />
          <meshStandardMaterial color="#7dba6a" emissive="#7dba6a" emissiveIntensity={0.2} />
        </mesh>
      ) : null}
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
  const texture = useMemo(() => makeLabelTexture(title, 320, 200), [title]);
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Thin frame; back flush to wall, face on +Z */}
      <mesh castShadow position={[0, 0, 0]}>
        <boxGeometry args={[0.55, 0.7, 0.03]} />
        <meshStandardMaterial color="#3a2c22" roughness={0.55} />
      </mesh>
      <mesh position={[0, 0, 0.018]}>
        <boxGeometry args={[0.48, 0.62, 0.008]} />
        <meshStandardMaterial color="#f5efe0" />
      </mesh>
      <mesh position={[0, 0.08, 0.024]}>
        <planeGeometry args={[0.4, 0.28]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      <mesh position={[0, -0.2, 0.024]}>
        <boxGeometry args={[0.2, 0.08, 0.008]} />
        <meshStandardMaterial color={accent} metalness={0.4} />
      </mesh>
    </group>
  );
}

export function EmployeeOfMonth({
  position,
  rotationY = 0,
  name = "Priya",
}: {
  position: [number, number, number];
  rotationY?: number;
  name?: string;
}) {
  const texture = useMemo(
    () => makeLabelTexture(`EOTM · ${name.toUpperCase()}`, 384, 96),
    [name],
  );
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh castShadow>
        <boxGeometry args={[0.85, 1.15, 0.04]} />
        <meshStandardMaterial color="#2a2118" roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.35, 0.022]}>
        <boxGeometry args={[0.7, 0.28, 0.015]} />
        <meshStandardMaterial color="#1a3028" />
      </mesh>
      <mesh position={[0, 0.35, 0.032]}>
        <planeGeometry args={[0.62, 0.2]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      <mesh position={[0, -0.05, 0.022]} castShadow>
        <boxGeometry args={[0.42, 0.48, 0.015]} />
        <meshStandardMaterial color="#8a7a68" />
      </mesh>
      <mesh position={[0, -0.05, 0.032]}>
        <boxGeometry args={[0.36, 0.28, 0.008]} />
        <meshStandardMaterial color="#d4b896" />
      </mesh>
      <mesh position={[0, -0.45, 0.022]}>
        <boxGeometry args={[0.55, 0.12, 0.015]} />
        <meshStandardMaterial
          color="#e8b84a"
          emissive="#e8b84a"
          emissiveIntensity={0.25}
        />
      </mesh>
      <MeshLabel
        text="EMPLOYEE OF THE MONTH"
        position={[0, -0.45, 0.04]}
        width={0.72}
        height={0.1}
      />
    </group>
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
  const blinds = [];
  const slatCount = 14;
  for (let i = 0; i < slatCount; i += 1) {
    const y = height / 2 - 0.12 - i * ((height - 0.25) / slatCount);
    blinds.push(
      <mesh key={i} position={[0, y, 0.04]}>
        <boxGeometry args={[width - 0.2, 0.06, 0.02]} />
        <meshStandardMaterial color="#d8d0c0" roughness={0.7} />
      </mesh>,
    );
  }
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Frame */}
      <mesh castShadow>
        <boxGeometry args={[width + 0.15, height + 0.15, 0.1]} />
        <meshStandardMaterial color="#3a2c22" roughness={0.6} />
      </mesh>
      {/* Glass / sky glow */}
      <mesh position={[0, 0, 0.02]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial
          color="#8ec8e0"
          emissive="#6eb0d0"
          emissiveIntensity={0.35}
          transparent
          opacity={0.85}
        />
      </mesh>
      {/* Blind header */}
      <mesh position={[0, height / 2 - 0.06, 0.06]}>
        <boxGeometry args={[width - 0.1, 0.1, 0.08]} />
        <meshStandardMaterial color="#c4b8a4" />
      </mesh>
      {blinds}
      {/* Cord */}
      <mesh position={[width / 2 - 0.12, 0, 0.08]}>
        <cylinderGeometry args={[0.01, 0.01, height * 0.7, 6]} />
        <meshStandardMaterial color="#8a7664" />
      </mesh>
    </group>
  );
}
