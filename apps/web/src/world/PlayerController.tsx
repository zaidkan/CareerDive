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

export function PlayerController({
  colliders,
  onPosition,
  enabled,
  spawn = [0, 1.6, 4.2],
}: {
  colliders: Aabb[];
  onPosition: (position: [number, number, number]) => void;
  enabled: boolean;
  spawn?: [number, number, number];
}) {
  const { camera, gl } = useThree();
  const keys = useRef(new Set<string>());
  const yaw = useRef(0);
  const pitch = useRef(0);
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const target = useRef<THREE.Vector3 | null>(null);
  const pos = useRef(new THREE.Vector3(...spawn));
  const reported = useRef(0);

  useEffect(() => {
    pos.current.set(...spawn);
    camera.position.copy(pos.current);
    const onKeyDown = (event: KeyboardEvent) => {
      keys.current.add(event.code);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      keys.current.delete(event.code);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!enabled) return;
      // Left button only for look — avoid fighting UI
      if (event.button !== 0) return;
      dragging.current = true;
      last.current = { x: event.clientX, y: event.clientY };
    };
    const onPointerUp = () => {
      dragging.current = false;
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!enabled || !dragging.current) return;
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
  }, [camera, enabled, gl.domElement, spawn]);

  useFrame((_, delta) => {
    if (!enabled) return;

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

    if (wish.lengthSq() > 0) {
      const nextX = pos.current.x + wish.x;
      const nextZ = pos.current.z + wish.z;
      if (!collides(nextX, pos.current.z, colliders)) {
        pos.current.x = nextX;
      }
      if (!collides(pos.current.x, nextZ, colliders)) {
        pos.current.z = nextZ;
      }
      pos.current.x = Math.max(-8.5, Math.min(8.5, pos.current.x));
      pos.current.z = Math.max(-5.8, Math.min(5.8, pos.current.z));
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

  return null;
}
