import type { ReactNode } from "react";
import { PlantPot } from "./props/decor.js";
import { CubicleWalls, DESK_SURFACE_Y, DeskFrame } from "./props/furniture.js";
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
        position={[0, DESK_SURFACE_Y, -0.48]}
        {...(leftEmissive ? { leftEmissive } : {})}
        {...(rightEmissive ? { rightEmissive } : {})}
        {...(monitorScreen ? { leftScreen: monitorScreen } : {})}
      />
      <KeyboardMouse position={[0, DESK_SURFACE_Y, 0.05]} />
      {showLamp ? <TaskLamp position={[0.95, DESK_SURFACE_Y + 0.02, -0.18]} /> : null}
      <PlantPot position={[-0.95, DESK_SURFACE_Y + 0.09, 0.02]} scale={1.05} />
      <DeskClutter position={[0.18, DESK_SURFACE_Y, -0.04]} variant={clutterVariant} />
      {showLoginNote ? (
        <LoginPostIt position={[0.68, DESK_SURFACE_Y, 0.1]} />
      ) : null}
    </group>
  );
}
