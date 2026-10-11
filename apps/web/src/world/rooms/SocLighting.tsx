import type { ReactElement, ReactNode } from "react";
import { COL, ROW } from "./socLayout.js";

/**
 * Bright, even daylight with a warm floor bounce and a warm break-corner
 * accent, using the existing four-light budget. The sun sits low in the east
 * so it streams through the east glazing, matching the city outside.
 */
export function SocLighting({
  seated,
  directionalShadows,
}: {
  seated: boolean;
  directionalShadows: boolean;
}): ReactElement<{ children: ReactNode }> {
  return (
    <>
      <hemisphereLight args={["#eef3fb", "#d6cbb9", seated ? 1.3 : 1.75]} />
      <ambientLight color="#fff8ef" intensity={seated ? 0.45 : 0.6} />
      <directionalLight
        castShadow={directionalShadows}
        intensity={seated ? 1.4 : 2.1}
        position={[11, 9, 2]}
        color="#fff3e2"
        shadow-mapSize-width={512}
        shadow-mapSize-height={512}
        shadow-bias={-0.0002}
        shadow-camera-near={2}
        shadow-camera-far={30}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
      />
      <pointLight
        intensity={seated ? 0.75 : 1.2}
        distance={seated ? 8 : 14}
        position={seated ? [COL.east, 2.1, ROW.north] : [8.4, 2.5, 4.4]}
        color="#ffd49b"
      />
    </>
  );
}
