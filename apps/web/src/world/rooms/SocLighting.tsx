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
      <hemisphereLight args={["#c9d9e8", "#4b4037", seated ? 0.9 : 1.28]} />
      <ambientLight color="#d9e5f3" intensity={seated ? 0.28 : 0.38} />
      <directionalLight
        castShadow={directionalShadows}
        intensity={seated ? 0.72 : 1.08}
        position={[5, 10, 5]}
        color="#ffe6c5"
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
        intensity={seated ? 0.48 : 0.78}
        distance={seated ? 7 : 14}
        position={seated ? [COL.east, 2.1, ROW.north] : [7, 2.5, -4.5]}
        color="#ffc07c"
      />
    </>
  );
}
