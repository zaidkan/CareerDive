import type { ReactNode } from "react";
import { PlantPot } from "./props/decor.js";
import { CubicleWalls, DeskFrame } from "./props/furniture.js";
import { TaskLamp } from "./props/lighting.js";
import { LoginPostIt } from "./props/signage.js";
import { DeskClutter, DualMonitor, KeyboardMouse } from "./props/tech.js";

/** Slightly roomier default cubicle footprint. */
export function Workstation({
  position,
  rotationY = 0,
  deskColor = "#2e251c",
  leftEmissive,
  rightEmissive,
  showLamp = true,
  showLoginNote = false,
  clutterVariant = 0,
  monitorScreen,
}: {
  position: [number, number, number];
  rotationY?: number;
  deskColor?: string;
  leftEmissive?: string;
  rightEmissive?: string;
  showLamp?: boolean;
  showLoginNote?: boolean;
  clutterVariant?: number;
  monitorScreen?: ReactNode;
}) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <CubicleWalls position={[0, 0, 0.1]} width={2.95} depth={2.55} />
      <DeskFrame position={[0, 0, -0.2]} color={deskColor} width={2.25} depth={1.1} />
      <DualMonitor
        position={[0, 0.82, -0.48]}
        {...(leftEmissive ? { leftEmissive } : {})}
        {...(rightEmissive ? { rightEmissive } : {})}
        {...(monitorScreen ? { leftScreen: monitorScreen } : {})}
      />
      <KeyboardMouse position={[0, 0.84, 0.18]} />
      {showLamp ? <TaskLamp position={[0.95, 0.84, -0.15]} /> : null}
      <PlantPot position={[-0.95, 0.84, 0.22]} scale={1.05} />
      <DeskClutter position={[0.15, 0.84, 0.28]} variant={clutterVariant} />
      {showLoginNote ? (
        <LoginPostIt position={[0.85, 0.86, 0.35]} />
      ) : null}
    </group>
  );
}
