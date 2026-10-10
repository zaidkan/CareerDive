import type { ReactElement, ReactNode } from "react";
import { COL, ROW } from "./socLayout.js";

/** Cool office fill and warm break-area accent, using the existing four-light budget. */
export function SocLighting({
  seated,
  directionalShadows,
}: {
  seated: boolean;
  directionalShadows: boolean;
}): ReactElement<{ children: ReactNode }> {
  return (
    <>
      <hemisphereLight args={["#e6f1ff", "#49443e", seated ? 1.2 : 1.85]} />
      <ambientLight color="#f2f5ff" intensity={seated ? 0.65 : 0.8} />
      <directionalLight
        castShadow={directionalShadows}
        intensity={seated ? 1.35 : 2.15}
        position={[5, 10, 5]}
        color="#fff4e5"
        shadow-mapSize-width={512}
        shadow-mapSize-height={512}
        shadow-bias={-0.0002}
        shadow-camera-near={2}
        shadow-camera-far={28}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
      />
      <pointLight
        intensity={seated ? 0.85 : 1.45}
        distance={seated ? 8 : 18}
        position={seated ? [COL.east, 2.1, ROW.north] : [7, 2.5, 4.5]}
        color="#ffd49b"
      />
    </>
  );
}
