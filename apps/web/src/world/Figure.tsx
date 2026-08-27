/**
 * Stylized workplace figure using box limbs (stable proportions).
 * Presentation only — never drives simulation evidence.
 */
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { RefObject } from "react";
import type { Group, Mesh } from "three";
import {
  createMotionInput,
  createMotionState,
  resolvePhase,
  stepMotion,
  type FigureActivity,
  type MotionInput,
  type MotionPose,
  type MotionState,
} from "./figure/motion.js";

export type { FigureActivity };

export type FigureProps = {
  position?: [number, number, number];
  rotationY?: number;
  primary?: string;
  secondary?: string;
  accent?: string;
  skin?: string;
  hair?: string;
  seated?: boolean;
  seed?: number;
  lookAt?: [number, number, number];
  lookAtRef?: RefObject<[number, number, number]>;
  activity?: FigureActivity;
  animated?: boolean;
};

const SEATED_HEAD_Y = 1.42;
const STANDING_HEAD_Y = 1.82;

type ArmRest = {
  rotX: number;
  rotY: number;
  rotZ: number;
};

type FigureRest = {
  headY: number;
  leftArm: ArmRest;
  rightArm: ArmRest;
  leftLower: ArmRest;
  rightLower: ArmRest;
  leftHandY: number;
  rightHandY: number;
};

const SEATED_REST: FigureRest = {
  headY: SEATED_HEAD_Y,
  leftArm: { rotX: 0.9, rotY: 0, rotZ: 0.15 },
  rightArm: { rotX: 0.9, rotY: 0, rotZ: -0.15 },
  leftLower: { rotX: 0, rotY: 0, rotZ: 0 },
  rightLower: { rotX: 0, rotY: 0, rotZ: 0 },
  leftHandY: 0.78,
  rightHandY: 0.78,
};

const STANDING_REST: FigureRest = {
  headY: STANDING_HEAD_Y,
  leftArm: { rotX: 0.12, rotY: 0, rotZ: 0.35 },
  rightArm: { rotX: 0.12, rotY: 0, rotZ: -0.35 },
  leftLower: { rotX: 0.2, rotY: 0, rotZ: 0.2 },
  rightLower: { rotX: 0.2, rotY: 0, rotZ: -0.2 },
  leftHandY: 0.92,
  rightHandY: 0.92,
};

function Limb({
  args,
  position,
  rotation = [0, 0, 0],
  color,
}: {
  args: [number, number, number];
  position: [number, number, number];
  rotation?: [number, number, number];
  color: string;
}) {
  return (
    <mesh position={position} rotation={rotation} castShadow={false}>
      <boxGeometry args={args} />
      <meshStandardMaterial color={color} roughness={0.72} />
    </mesh>
  );
}

function applyArm(group: Group | null, rest: ArmRest, dRotX: number, dRotZ: number): void {
  if (group === null) return;
  group.rotation.x = rest.rotX + dRotX;
  group.rotation.y = rest.rotY;
  group.rotation.z = rest.rotZ + dRotZ;
}

function applyHand(mesh: Mesh | null, restY: number, deltaY: number): void {
  if (mesh === null) return;
  mesh.position.y = restY + deltaY;
}

function applyEye(mesh: Mesh | null, scaleY: number): void {
  if (mesh === null) return;
  mesh.scale.set(1, scaleY, 1);
}

function applyPose(
  pose: MotionPose,
  rest: FigureRest,
  hips: Group | null,
  spine: Group | null,
  head: Group | null,
  leftArm: Group | null,
  rightArm: Group | null,
  leftLower: Group | null,
  rightLower: Group | null,
  leftHand: Mesh | null,
  rightHand: Mesh | null,
  leftEye: Mesh | null,
  rightEye: Mesh | null,
): void {
  if (hips !== null) {
    hips.position.x = pose.spineX;
    hips.position.z = pose.spineZ;
  }
  if (spine !== null) {
    spine.position.y = pose.spineY;
    spine.rotation.x = pose.spineRotX;
  }
  if (head !== null) {
    head.position.y = rest.headY + pose.headY;
    head.rotation.y = pose.headYaw;
    head.rotation.x = -pose.headPitch;
  }
  applyArm(leftArm, rest.leftArm, pose.leftArmRotX, pose.leftArmRotZ);
  applyArm(rightArm, rest.rightArm, pose.rightArmRotX, pose.rightArmRotZ);
  applyArm(leftLower, rest.leftLower, pose.leftLowerArmRotX, 0);
  applyArm(rightLower, rest.rightLower, pose.rightLowerArmRotX, 0);
  applyHand(leftHand, rest.leftHandY, pose.leftHandY);
  applyHand(rightHand, rest.rightHandY, pose.rightHandY);
  applyEye(leftEye, pose.eyeScaleY);
  applyEye(rightEye, pose.eyeScaleY);
}

export function Figure({
  position = [0, 0, 0],
  rotationY = 0,
  primary = "#6d7f78",
  secondary = "#2a322c",
  accent = "#4fd0c8",
  skin = "#d4b896",
  hair = "#2a1c12",
  seated = false,
  seed,
  lookAt,
  lookAtRef,
  activity = "idle",
  animated = true,
}: FigureProps) {
  const hipsRef = useRef<Group>(null);
  const spineRef = useRef<Group>(null);
  const headRef = useRef<Group>(null);
  const leftArmRef = useRef<Group>(null);
  const rightArmRef = useRef<Group>(null);
  const leftLowerRef = useRef<Group>(null);
  const rightLowerRef = useRef<Group>(null);
  const leftHandRef = useRef<Mesh>(null);
  const rightHandRef = useRef<Mesh>(null);
  const leftEyeRef = useRef<Mesh>(null);
  const rightEyeRef = useRef<Mesh>(null);
  const animatedRef = useRef(animated);
  const localTimeRef = useRef(0);
  const motionRef = useRef<MotionState | null>(null);
  const inputRef = useRef<MotionInput | null>(null);

  const phase = resolvePhase(seed, position);
  if (motionRef.current === null) {
    motionRef.current = createMotionState(phase);
  }
  if (inputRef.current === null) {
    inputRef.current = createMotionInput();
  }

  animatedRef.current = animated;
  const live = inputRef.current;
  live.phase = phase;
  live.seated = seated;
  live.activity = activity;
  const initialLookAt = lookAtRef?.current ?? lookAt;
  live.hasLookAt = initialLookAt !== undefined;
  if (initialLookAt !== undefined) {
    live.lookAtX = initialLookAt[0];
    live.lookAtY = initialLookAt[1];
    live.lookAtZ = initialLookAt[2];
  }
  live.figureX = position[0];
  live.figureY = position[1];
  live.figureZ = position[2];
  live.rotationY = rotationY;
  live.headHeight = seated ? SEATED_HEAD_Y : STANDING_HEAD_Y;

  useFrame((_, delta) => {
    if (!animatedRef.current) return;
    const motion = motionRef.current;
    const input = inputRef.current;
    if (motion === null || input === null) return;
    const currentLookAt = lookAtRef?.current ?? lookAt;
    input.hasLookAt = currentLookAt !== undefined;
    if (currentLookAt !== undefined) {
      input.lookAtX = currentLookAt[0];
      input.lookAtY = currentLookAt[1];
      input.lookAtZ = currentLookAt[2];
    }
    localTimeRef.current += delta;
    input.time = localTimeRef.current;
    input.delta = delta;
    stepMotion(motion, input);
    applyPose(
      motion.pose,
      input.seated ? SEATED_REST : STANDING_REST,
      hipsRef.current,
      spineRef.current,
      headRef.current,
      leftArmRef.current,
      rightArmRef.current,
      leftLowerRef.current,
      rightLowerRef.current,
      leftHandRef.current,
      rightHandRef.current,
      leftEyeRef.current,
      rightEyeRef.current,
    );
  });

  const head = (
    <Head
      accent={accent}
      groupRef={headRef}
      hair={hair}
      leftEyeRef={leftEyeRef}
      rightEyeRef={rightEyeRef}
      skin={skin}
      y={seated ? SEATED_HEAD_Y : STANDING_HEAD_Y}
    />
  );

  if (seated) {
    return (
      <group position={position} rotation={[0, rotationY, 0]}>
        {/* Chair-sit: thighs forward, calves down, torso upright */}
        <Limb args={[0.16, 0.14, 0.42]} position={[-0.12, 0.52, 0.12]} color={secondary} />
        <Limb args={[0.16, 0.14, 0.42]} position={[0.12, 0.52, 0.12]} color={secondary} />
        <Limb args={[0.14, 0.38, 0.14]} position={[-0.12, 0.28, 0.28]} color={secondary} />
        <Limb args={[0.14, 0.38, 0.14]} position={[0.12, 0.28, 0.28]} color={secondary} />
        <Limb args={[0.16, 0.08, 0.28]} position={[-0.12, 0.08, 0.3]} color="#1a130f" />
        <Limb args={[0.16, 0.08, 0.28]} position={[0.12, 0.08, 0.3]} color="#1a130f" />

        <group ref={hipsRef}>
          <Limb args={[0.42, 0.16, 0.28]} position={[0, 0.62, 0]} color={secondary} />
          <group ref={spineRef}>
            <Limb args={[0.4, 0.52, 0.26]} position={[0, 1.0, 0]} color={primary} />

            {/* Arms resting forward */}
            <group
              ref={leftArmRef}
              position={[-0.3, 0.92, 0.18]}
              rotation={[0.9, 0, 0.15]}
            >
              <Limb args={[0.12, 0.36, 0.12]} position={[0, 0, 0]} color={primary} />
            </group>
            <group
              ref={rightArmRef}
              position={[0.3, 0.92, 0.18]}
              rotation={[0.9, 0, -0.15]}
            >
              <Limb args={[0.12, 0.36, 0.12]} position={[0, 0, 0]} color={primary} />
            </group>
            <mesh position={[-0.32, 0.78, 0.38]} ref={leftHandRef}>
              <sphereGeometry args={[0.07, 12, 12]} />
              <meshStandardMaterial color={skin} roughness={0.55} />
            </mesh>
            <mesh position={[0.32, 0.78, 0.38]} ref={rightHandRef}>
              <sphereGeometry args={[0.07, 12, 12]} />
              <meshStandardMaterial color={skin} roughness={0.55} />
            </mesh>

            {head}
          </group>
        </group>
      </group>
    );
  }

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Standing: clear vertical limbs */}
      <Limb args={[0.15, 0.08, 0.28]} position={[-0.12, 0.06, 0.02]} color="#1a130f" />
      <Limb args={[0.15, 0.08, 0.28]} position={[0.12, 0.06, 0.02]} color="#1a130f" />

      <Limb args={[0.14, 0.48, 0.14]} position={[-0.12, 0.36, 0]} color={secondary} />
      <Limb args={[0.14, 0.48, 0.14]} position={[0.12, 0.36, 0]} color={secondary} />
      <Limb args={[0.14, 0.42, 0.14]} position={[-0.12, 0.78, 0]} color={secondary} />
      <Limb args={[0.14, 0.42, 0.14]} position={[0.12, 0.78, 0]} color={secondary} />

      <group ref={hipsRef}>
        <Limb args={[0.4, 0.16, 0.26]} position={[0, 1.02, 0]} color={secondary} />
        <group ref={spineRef}>
          <Limb args={[0.4, 0.55, 0.26]} position={[0, 1.4, 0]} color={primary} />

          {/* Upper + lower arms */}
          <group ref={leftArmRef} position={[-0.3, 1.42, 0]} rotation={[0.12, 0, 0.35]}>
            <Limb args={[0.12, 0.34, 0.12]} position={[0, 0, 0]} color={primary} />
          </group>
          <group ref={rightArmRef} position={[0.3, 1.42, 0]} rotation={[0.12, 0, -0.35]}>
            <Limb args={[0.12, 0.34, 0.12]} position={[0, 0, 0]} color={primary} />
          </group>
          <group
            ref={leftLowerRef}
            position={[-0.38, 1.12, 0.04]}
            rotation={[0.2, 0, 0.2]}
          >
            <Limb args={[0.11, 0.32, 0.11]} position={[0, 0, 0]} color={primary} />
          </group>
          <group
            ref={rightLowerRef}
            position={[0.38, 1.12, 0.04]}
            rotation={[0.2, 0, -0.2]}
          >
            <Limb args={[0.11, 0.32, 0.11]} position={[0, 0, 0]} color={primary} />
          </group>

          <mesh position={[-0.42, 0.92, 0.06]} ref={leftHandRef}>
            <sphereGeometry args={[0.07, 12, 12]} />
            <meshStandardMaterial color={skin} roughness={0.55} />
          </mesh>
          <mesh position={[0.42, 0.92, 0.06]} ref={rightHandRef}>
            <sphereGeometry args={[0.07, 12, 12]} />
            <meshStandardMaterial color={skin} roughness={0.55} />
          </mesh>

          {head}
        </group>
      </group>
    </group>
  );
}

function Head({
  skin,
  hair,
  accent,
  y,
  groupRef,
  leftEyeRef,
  rightEyeRef,
}: {
  skin: string;
  hair: string;
  accent: string;
  y: number;
  groupRef: RefObject<Group | null>;
  leftEyeRef: RefObject<Mesh | null>;
  rightEyeRef: RefObject<Mesh | null>;
}) {
  return (
    <group position={[0, y, 0]} ref={groupRef}>
      <mesh position={[0, -0.12, 0]}>
        <cylinderGeometry args={[0.07, 0.08, 0.1, 12]} />
        <meshStandardMaterial color={skin} />
      </mesh>
      <mesh castShadow>
        <sphereGeometry args={[0.16, 20, 20]} />
        <meshStandardMaterial color={skin} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.08, -0.02]}>
        <sphereGeometry args={[0.14, 14, 14]} />
        <meshStandardMaterial color={hair} roughness={0.78} />
      </mesh>
      <mesh position={[-0.05, 0.02, 0.13]} ref={leftEyeRef}>
        <sphereGeometry args={[0.022, 8, 8]} />
        <meshStandardMaterial color="#1a130f" />
      </mesh>
      <mesh position={[0.05, 0.02, 0.13]} ref={rightEyeRef}>
        <sphereGeometry args={[0.022, 8, 8]} />
        <meshStandardMaterial color="#1a130f" />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.14, 0.016, 8, 20]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.35} />
      </mesh>
      <mesh position={[0.15, 0, 0]}>
        <sphereGeometry args={[0.05, 10, 10]} />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={0.4}
        />
      </mesh>
      <mesh position={[-0.15, 0, 0]}>
        <sphereGeometry args={[0.05, 10, 10]} />
        <meshStandardMaterial color="#333" />
      </mesh>
    </group>
  );
}
