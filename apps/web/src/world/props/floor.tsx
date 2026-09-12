/**
 * Ground surfaces — tiled floor plane and carpet runners.
 */
import { useEffect, useMemo } from "react";
import { makeCarpetTexture, makeFloorTileTexture } from "../textures.js";

/**
 * One tiled plane instead of a mesh per tile. The checkerboard lives in the
 * texture, which took the floor from ~130 draw calls down to one.
 */
export function FloorTileGrid({
  rangeX = 8,
  rangeZ = 7,
  step = 1.6,
}: {
  rangeX?: number;
  rangeZ?: number;
  /** World size of one tile; the texture holds a 2x2 block of them. */
  step?: number;
}) {
  const width = rangeX * 2;
  const depth = rangeZ * 2;
  /** Whole repeats only, so no tile is sliced mid-grout. */
  const repeatX = Math.max(1, Math.round(width / (step * 2)));
  const repeatZ = Math.max(1, Math.round(depth / (step * 2)));
  const tile = useMemo(() => {
    const tex = makeFloorTileTexture();
    tex.repeat.set(repeatX, repeatZ);
    return tex;
  }, [repeatX, repeatZ]);
  useEffect(
    () => () => {
      tile.dispose();
    },
    [tile],
  );

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.005, 0]}
      receiveShadow
    >
      <planeGeometry args={[width, depth]} />
      <meshStandardMaterial map={tile} roughness={0.92} />
    </mesh>
  );
}

export function CarpetRunner({
  position,
  size = [2.4, 4.5],
  rotationY = 0,
  color = "#5a3a2e",
}: {
  position: [number, number, number];
  size?: [number, number];
  rotationY?: number;
  color?: string;
}) {
  /**
   * Depend on the numbers, not the array. `size` arrives as a fresh literal
   * every render, which used to allocate (and leak) a canvas texture per frame.
   */
  const [sizeX, sizeZ] = size;
  const carpet = useMemo(() => {
    const tex = makeCarpetTexture(color);
    tex.repeat.set(sizeX * 0.55, sizeZ * 0.55);
    return tex;
  }, [color, sizeX, sizeZ]);
  useEffect(
    () => () => {
      carpet.dispose();
    },
    [carpet],
  );
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh
        receiveShadow
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.014, 0]}
      >
        <planeGeometry args={size} />
        <meshStandardMaterial map={carpet} roughness={0.96} />
      </mesh>
    </group>
  );
}
