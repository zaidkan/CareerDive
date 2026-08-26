import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { clampToRoom, collidesAt, type Aabb } from "./collision.js";

const SPEED = 1.85;
const SPRINT_MUL = 1.6;
const LOOK_SENS = 0.002;
const VEL_DAMP = 11;
const SEAT_DAMP = 5;
const STAND_DAMP = 5;
const BOB_FREQ = 10.5;
const BOB_Y = 0.032;
const BOB_Z = 0.016;
const BOB_FADE = 8;
const LEAN_MAX = 0.038;
const LEAN_DAMP = 9;
const POSE_DAMP = 11;
const PITCH_MIN = -1.15;
const PITCH_MAX = 1.15;
const ARRIVE = 0.08;
const SETTLE = 0.02;
const DT_CAP = 0.05;

function expAlpha(lambda: number, dt: number): number {
  return 1 - Math.exp(-lambda * dt);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function FirstPersonHands({
  visible,
  mode,
  movingRef,
}: {
  visible: boolean;
  mode: "walk" | "type";
  movingRef: React.RefObject<boolean>;
}) {
  const group = useRef<THREE.Group>(null);
  const left = useRef<THREE.Group>(null);
  const right = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const phase = useRef(0);
  const pose = useRef(0);
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

    const dt = Math.min(delta, DT_CAP);
    const poseTarget = mode === "type" ? 1 : 0;
    pose.current += (poseTarget - pose.current) * expAlpha(POSE_DAMP, dt);
    const t = pose.current;

    const active = mode === "type" || movingRef.current;
    if (active) {
      phase.current += dt * lerp(9.5, 14, t);
    } else {
      phase.current *= 0.88;
    }
    const walkSwing = Math.sin(phase.current) * (active ? 0.12 : 0.02);
    const typeSwing = Math.sin(phase.current) * 0.06;
    const swing = lerp(walkSwing, typeSwing, t);
    const bob =
      (1 - t) * (mode === "walk" && active ? Math.abs(Math.sin(phase.current)) * 0.035 : 0);

    group.current.position.set(0, 0, 0);
    group.current.rotation.set(0, 0, 0);

    if (left.current) {
      left.current.position.set(
        lerp(-0.32, -0.18, t),
        lerp(-0.28, -0.22, t),
        lerp(-0.48, -0.38, t),
      );
      left.current.rotation.set(
        lerp(0.45 + walkSwing * 0.5, 0.9 + typeSwing, t),
        0.2,
        0.15 + swing,
      );
      left.current.position.y -= bob;
    }
    if (right.current) {
      right.current.position.set(
        lerp(0.32, 0.18, t),
        lerp(-0.28, -0.22, t),
        lerp(-0.48, -0.38, t),
      );
      right.current.rotation.set(
        lerp(0.45 - walkSwing * 0.5, 0.9 - typeSwing, t),
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
  const roll = useRef(0);
  const walkTarget = useRef(new THREE.Vector3());
  const hasWalkTarget = useRef(false);
  const pos = useRef(new THREE.Vector3(...spawn));
  const resumePos = useRef(new THREE.Vector3(...spawn));
  const vel = useRef(new THREE.Vector3());
  const wish = useRef(new THREE.Vector3());
  const forward = useRef(new THREE.Vector3());
  const right = useRef(new THREE.Vector3());
  const toScratch = useRef(new THREE.Vector3());
  const seatScratch = useRef(new THREE.Vector3());
  const lookTarget = useRef(new THREE.Vector3());
  const wasSeated = useRef(false);
  const reported = useRef(0);
  const movingRef = useRef(false);
  const look = useRef(new THREE.Vector3());
  const baseFov = useRef(62);
  const seatSettled = useRef(false);
  const standSettled = useRef(true);
  const bobPhase = useRef(0);
  const bobAmt = useRef(0);
  const reduceMotion = useRef(false);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      reduceMotion.current = media.matches;
    };
    apply();
    media.addEventListener("change", apply);
    return () => {
      media.removeEventListener("change", apply);
    };
  }, []);

  useEffect(() => {
    if (seated && document.pointerLockElement === gl.domElement) {
      document.exitPointerLock();
    }

    const onKeyDown = (event: KeyboardEvent) => {
      keys.current.add(event.code);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      keys.current.delete(event.code);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!enabled || seated) return;
      if (event.button !== 0) return;
      if (document.pointerLockElement === gl.domElement) return;
      if (typeof gl.domElement.requestPointerLock !== "function") return;
      const result: unknown = gl.domElement.requestPointerLock();
      if (result instanceof Promise) {
        void result.catch(() => undefined);
      }
    };
    const onMouseMove = (event: MouseEvent) => {
      if (!enabled || seated) return;
      if (document.pointerLockElement !== gl.domElement) return;
      yaw.current -= event.movementX * LOOK_SENS;
      pitch.current = Math.max(
        PITCH_MIN,
        Math.min(PITCH_MAX, pitch.current - event.movementY * LOOK_SENS),
      );
    };
    const onLockChange = () => {
      if (document.pointerLockElement === gl.domElement) return;
      camera.rotation.order = "YXZ";
      camera.rotation.x = pitch.current;
      camera.rotation.y = yaw.current;
      camera.rotation.z = roll.current;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    gl.domElement.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("pointerlockchange", onLockChange);

    const onWalkTo = (event: Event) => {
      if (seated) return;
      const custom = event as CustomEvent<{ x: number; z: number }>;
      walkTarget.current.set(custom.detail.x, spawn[1], custom.detail.z);
      hasWalkTarget.current = true;
    };
    window.addEventListener("soc-walk-to", onWalkTo);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      gl.domElement.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("pointerlockchange", onLockChange);
      window.removeEventListener("soc-walk-to", onWalkTo);
    };
  }, [camera, enabled, gl.domElement, seated, spawn]);

  useEffect(() => {
    seatSettled.current = false;
  }, [maximized, seatPosition, seatLookAt]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, DT_CAP);

    if (seated) {
      if (!wasSeated.current) {
        resumePos.current.copy(pos.current);
        seatSettled.current = false;
        vel.current.set(0, 0, 0);
        hasWalkTarget.current = false;
      }
      wasSeated.current = true;
      movingRef.current = false;
      vel.current.set(0, 0, 0);
      seatScratch.current.set(seatPosition[0], seatPosition[1], seatPosition[2]);
      lookTarget.current.set(seatLookAt[0], seatLookAt[1], seatLookAt[2]);
      const seatAlpha = expAlpha(maximized && seatSettled.current ? 4 : SEAT_DAMP, dt);
      if (!seatSettled.current) {
        camera.position.lerp(seatScratch.current, seatAlpha);
        look.current.lerp(lookTarget.current, seatAlpha);
        if (camera.position.distanceTo(seatScratch.current) < SETTLE) {
          camera.position.copy(seatScratch.current);
          look.current.copy(lookTarget.current);
          seatSettled.current = true;
        }
      } else if (maximized) {
        camera.position.lerp(seatScratch.current, seatAlpha);
        look.current.lerp(lookTarget.current, seatAlpha);
      } else {
        camera.position.copy(seatScratch.current);
        look.current.copy(lookTarget.current);
      }
      camera.lookAt(look.current);
      if (camera instanceof THREE.PerspectiveCamera) {
        const targetFov = maximized ? 48 : 58;
        if (Math.abs(camera.fov - targetFov) > 0.05) {
          camera.fov += (targetFov - camera.fov) * expAlpha(3, dt);
          camera.updateProjectionMatrix();
        }
      }
      return;
    }

    seatSettled.current = false;

    if (wasSeated.current) {
      pos.current.copy(resumePos.current);
      standSettled.current = false;
      vel.current.set(0, 0, 0);
      bobAmt.current = 0;
      roll.current = 0;
      camera.rotation.order = "YXZ";
      camera.rotation.x = pitch.current;
      camera.rotation.y = yaw.current;
      camera.rotation.z = 0;
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.fov = baseFov.current;
        camera.updateProjectionMatrix();
      }
      wasSeated.current = false;
    }

    if (!enabled) {
      movingRef.current = false;
      return;
    }

    forward.current.set(-Math.sin(yaw.current), 0, -Math.cos(yaw.current));
    right.current.set(Math.cos(yaw.current), 0, -Math.sin(yaw.current));
    wish.current.set(0, 0, 0);

    if (keys.current.has("KeyW") || keys.current.has("ArrowUp")) {
      wish.current.add(forward.current);
    }
    if (keys.current.has("KeyS") || keys.current.has("ArrowDown")) {
      wish.current.sub(forward.current);
    }
    if (keys.current.has("KeyA") || keys.current.has("ArrowLeft")) {
      wish.current.sub(right.current);
    }
    if (keys.current.has("KeyD") || keys.current.has("ArrowRight")) {
      wish.current.add(right.current);
    }

    const sprinting =
      keys.current.has("ShiftLeft") || keys.current.has("ShiftRight");
    const maxSpeed = SPEED * (sprinting ? SPRINT_MUL : 1);

    if (wish.current.lengthSq() > 0) {
      hasWalkTarget.current = false;
      wish.current.normalize().multiplyScalar(maxSpeed);
    } else if (hasWalkTarget.current) {
      toScratch.current.copy(walkTarget.current).sub(pos.current);
      toScratch.current.y = 0;
      const dist = toScratch.current.length();
      if (dist < ARRIVE) {
        hasWalkTarget.current = false;
      } else {
        const arriveSpeed = Math.min(maxSpeed, dist * 6);
        wish.current.copy(toScratch.current).multiplyScalar(arriveSpeed / dist);
      }
    }

    const damp = expAlpha(VEL_DAMP, dt);
    vel.current.x += (wish.current.x - vel.current.x) * damp;
    vel.current.y = 0;
    vel.current.z += (wish.current.z - vel.current.z) * damp;

    const speed = Math.hypot(vel.current.x, vel.current.z);
    movingRef.current = speed > 0.04;

    if (speed > 0.0001) {
      const nextX = pos.current.x + vel.current.x * dt;
      const nextZ = pos.current.z + vel.current.z * dt;
      if (!collidesAt(nextX, pos.current.z, colliders)) {
        pos.current.x = nextX;
      } else {
        vel.current.x = 0;
      }
      if (!collidesAt(pos.current.x, nextZ, colliders)) {
        pos.current.z = nextZ;
      } else {
        vel.current.z = 0;
      }
      pos.current.x = clampToRoom(pos.current.x, "x");
      pos.current.z = clampToRoom(pos.current.z, "z");
    }

    if (!standSettled.current) {
      camera.position.lerp(pos.current, expAlpha(STAND_DAMP, dt));
      if (camera.position.distanceTo(pos.current) < SETTLE) {
        camera.position.copy(pos.current);
        standSettled.current = true;
      }
    } else {
      camera.position.copy(pos.current);
    }

    const strafe = vel.current.x * right.current.x + vel.current.z * right.current.z;
    const leanTarget = (-strafe / maxSpeed) * LEAN_MAX;
    roll.current += (leanTarget - roll.current) * expAlpha(LEAN_DAMP, dt);

    camera.rotation.order = "YXZ";
    camera.rotation.x = pitch.current;
    camera.rotation.y = yaw.current;
    camera.rotation.z = roll.current;

    const bobTarget = reduceMotion.current ? 0 : Math.min(1, speed / SPEED);
    bobAmt.current += (bobTarget - bobAmt.current) * expAlpha(BOB_FADE, dt);
    if (bobAmt.current > 0.01) {
      bobPhase.current += dt * BOB_FREQ * (0.55 + bobAmt.current);
      camera.translateY(Math.sin(bobPhase.current * 2) * BOB_Y * bobAmt.current);
      camera.translateZ(Math.cos(bobPhase.current) * BOB_Z * bobAmt.current);
    } else {
      bobPhase.current *= 0.9;
    }

    reported.current += dt;
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
