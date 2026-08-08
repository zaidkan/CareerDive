import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";

export type Aabb = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

const SPEED = 1.85;
const LOOK_SENS = 0.002;

function collides(x: number, z: number, boxes: Aabb[], radius = 0.32): boolean {
  for (const box of boxes) {
    if (
      x + radius > box.minX &&
      x - radius < box.maxX &&
      z + radius > box.minZ &&
      z - radius < box.maxZ
    ) {
      return true;
    }
  }
  return false;
}

function FirstPersonHands({
  visible,
  mode,
  movingRef,
}: {
  visible: boolean;
  mode: "walk" | "type";
  movingRef: React.MutableRefObject<boolean>;
}) {
  const group = useRef<THREE.Group>(null);
  const left = useRef<THREE.Group>(null);
  const right = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const phase = useRef(0);
  const attached = useRef(false);

  useEffect(() => {
    if (!group.current || attached.current) return;
    camera.add(group.current);
    attached.current = true;
    return () => {
      if (group.current) camera.remove(group.current);
      attached.current = false;
    };
  }, [camera]);

  useFrame((_, delta) => {
    if (!group.current) return;
    group.current.visible = visible;
    if (!visible) return;

    const active = mode === "type" || movingRef.current;
    if (active) {
      phase.current += delta * (mode === "type" ? 14 : 9.5);
    } else {
      phase.current *= 0.88;
    }
    const swing =
      mode === "type"
        ? Math.sin(phase.current) * 0.06
        : Math.sin(phase.current) * (active ? 0.12 : 0.02);
    const bob =
      mode === "walk" && active
        ? Math.abs(Math.sin(phase.current)) * 0.035
        : 0;

    group.current.position.set(0, 0, 0);
    group.current.rotation.set(0, 0, 0);

    if (left.current) {
      left.current.position.set(
        mode === "type" ? -0.18 : -0.32,
        mode === "type" ? -0.22 : -0.28,
        mode === "type" ? -0.38 : -0.48,
      );
      left.current.rotation.set(
        mode === "type" ? 0.9 + swing : 0.45 + swing * 0.5,
        0.2,
        0.15 + swing,
      );
      left.current.position.y -= bob;
    }
    if (right.current) {
      right.current.position.set(
        mode === "type" ? 0.18 : 0.32,
        mode === "type" ? -0.22 : -0.28,
        mode === "type" ? -0.38 : -0.48,
      );
      right.current.rotation.set(
        mode === "type" ? 0.9 - swing : 0.45 - swing * 0.5,
        -0.2,
        -0.15 - swing,
      );
      right.current.position.y -= bob;
    }
  });

  const skinMat = {
    color: "#e0c4a0",
    depthTest: false,
    toneMapped: false,
  } as const;
  const sleeveMat = {
    color: "#3a4a58",
    depthTest: false,
    toneMapped: false,
  } as const;

  return (
    <group ref={group} renderOrder={999}>
      <group ref={left} renderOrder={999}>
        <mesh position={[0, 0.12, 0]} renderOrder={999}>
          <boxGeometry args={[0.09, 0.22, 0.09]} />
          <meshBasicMaterial {...sleeveMat} />
        </mesh>
        <mesh position={[0, -0.02, 0.02]} renderOrder={999}>
          <boxGeometry args={[0.08, 0.1, 0.1]} />
          <meshBasicMaterial {...skinMat} />
        </mesh>
      </group>
      <group ref={right} renderOrder={999}>
        <mesh position={[0, 0.12, 0]} renderOrder={999}>
          <boxGeometry args={[0.09, 0.22, 0.09]} />
          <meshBasicMaterial {...sleeveMat} />
        </mesh>
        <mesh position={[0, -0.02, 0.02]} renderOrder={999}>
          <boxGeometry args={[0.08, 0.1, 0.1]} />
          <meshBasicMaterial {...skinMat} />
        </mesh>
      </group>
    </group>
  );
}

export function PlayerController({
  colliders,
  onPosition,
  enabled,
  spawn = [0, 1.6, 4.2],
  seated = false,
  maximized = false,
  seatPosition = [3.2, 1.35, -1.75],
  seatLookAt = [3.2, 1.25, -3.4],
}: {
  colliders: Aabb[];
  onPosition: (position: [number, number, number]) => void;
  enabled: boolean;
  spawn?: [number, number, number];
  seated?: boolean;
  maximized?: boolean;
  seatPosition?: [number, number, number];
  seatLookAt?: [number, number, number];
}) {
  const { camera, gl } = useThree();
  const keys = useRef(new Set<string>());
  const yaw = useRef(0);
  const pitch = useRef(0);
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const target = useRef<THREE.Vector3 | null>(null);
  const pos = useRef(new THREE.Vector3(...spawn));
  const resumePos = useRef(new THREE.Vector3(...spawn));
  const wasSeated = useRef(false);
  const reported = useRef(0);
  const movingRef = useRef(false);
  const look = useRef(new THREE.Vector3());
  const baseFov = useRef(62);
  const seatSettled = useRef(false);

  useEffect(() => {
    if (seated && !wasSeated.current) {
      resumePos.current.copy(pos.current);
      seatSettled.current = false;
    }
    if (!seated && wasSeated.current) {
      pos.current.copy(resumePos.current);
      camera.position.copy(pos.current);
      if ("fov" in camera) {
        (camera as THREE.PerspectiveCamera).fov = baseFov.current;
        camera.updateProjectionMatrix();
      }
    }
    wasSeated.current = seated;

    const onKeyDown = (event: KeyboardEvent) => {
      keys.current.add(event.code);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      keys.current.delete(event.code);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!enabled || seated) return;
      if (event.button !== 0) return;
      dragging.current = true;
      last.current = { x: event.clientX, y: event.clientY };
    };
    const onPointerUp = () => {
      dragging.current = false;
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!enabled || seated || !dragging.current) return;
      const dx = event.clientX - last.current.x;
      const dy = event.clientY - last.current.y;
      last.current = { x: event.clientX, y: event.clientY };
      yaw.current -= dx * LOOK_SENS;
      pitch.current = Math.max(
        -1.15,
        Math.min(1.15, pitch.current - dy * LOOK_SENS),
      );
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    gl.domElement.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointermove", onPointerMove);

    const onWalkTo = (event: Event) => {
      if (seated) return;
      const custom = event as CustomEvent<{ x: number; z: number }>;
      target.current = new THREE.Vector3(custom.detail.x, spawn[1], custom.detail.z);
    };
    window.addEventListener("soc-walk-to", onWalkTo);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      gl.domElement.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("soc-walk-to", onWalkTo);
    };
  }, [camera, enabled, gl.domElement, seated, spawn]);

  useEffect(() => {
    seatSettled.current = false;
  }, [maximized, seatPosition, seatLookAt]);

  useFrame((_, delta) => {
    if (seated) {
      movingRef.current = false;
      const seat = new THREE.Vector3(...seatPosition);
      const lookTarget = new THREE.Vector3(...seatLookAt);
      if (!seatSettled.current) {
        camera.position.lerp(seat, 1 - Math.exp(-5 * delta));
        look.current.lerp(lookTarget, 1 - Math.exp(-5 * delta));
        if (camera.position.distanceTo(seat) < 0.02) {
          camera.position.copy(seat);
          look.current.copy(lookTarget);
          seatSettled.current = true;
        }
      } else if (maximized) {
        camera.position.lerp(seat, 1 - Math.exp(-4 * delta));
        look.current.lerp(lookTarget, 1 - Math.exp(-4 * delta));
      } else {
        camera.position.copy(seat);
        look.current.copy(lookTarget);
      }
      camera.lookAt(look.current);
      if ("fov" in camera) {
        const persp = camera as THREE.PerspectiveCamera;
        const targetFov = maximized ? 48 : 58;
        if (Math.abs(persp.fov - targetFov) > 0.05) {
          persp.fov += (targetFov - persp.fov) * (1 - Math.exp(-3 * delta));
          persp.updateProjectionMatrix();
        }
      }
      return;
    }

    seatSettled.current = false;

    if (!enabled) {
      movingRef.current = false;
      return;
    }

    const forward = new THREE.Vector3(
      -Math.sin(yaw.current),
      0,
      -Math.cos(yaw.current),
    );
    const right = new THREE.Vector3(
      Math.cos(yaw.current),
      0,
      -Math.sin(yaw.current),
    );
    const wish = new THREE.Vector3();

    if (keys.current.has("KeyW") || keys.current.has("ArrowUp")) {
      wish.add(forward);
    }
    if (keys.current.has("KeyS") || keys.current.has("ArrowDown")) {
      wish.sub(forward);
    }
    if (keys.current.has("KeyA") || keys.current.has("ArrowLeft")) {
      wish.sub(right);
    }
    if (keys.current.has("KeyD") || keys.current.has("ArrowRight")) {
      wish.add(right);
    }

    if (wish.lengthSq() > 0) {
      target.current = null;
      wish.normalize().multiplyScalar(SPEED * delta);
    } else if (target.current) {
      const to = target.current.clone().sub(pos.current);
      to.y = 0;
      const dist = to.length();
      if (dist < 0.08) {
        target.current = null;
      } else {
        wish.copy(to.normalize().multiplyScalar(Math.min(dist, SPEED * delta)));
      }
    }

    movingRef.current = wish.lengthSq() > 0;

    if (wish.lengthSq() > 0) {
      const nextX = pos.current.x + wish.x;
      const nextZ = pos.current.z + wish.z;
      if (!collides(nextX, pos.current.z, colliders)) {
        pos.current.x = nextX;
      }
      if (!collides(pos.current.x, nextZ, colliders)) {
        pos.current.z = nextZ;
      }
      pos.current.x = Math.max(-10.2, Math.min(10.2, pos.current.x));
      pos.current.z = Math.max(-7.0, Math.min(7.0, pos.current.z));
    }

    camera.position.copy(pos.current);
    camera.rotation.order = "YXZ";
    camera.rotation.y = yaw.current;
    camera.rotation.x = pitch.current;

    reported.current += delta;
    if (reported.current >= 0.05) {
      reported.current = 0;
      onPosition([pos.current.x, pos.current.y, pos.current.z]);
    }
  });

  return (
    <FirstPersonHands
      mode={seated ? "type" : "walk"}
      movingRef={movingRef}
      visible={enabled && !seated}
    />
  );
}
