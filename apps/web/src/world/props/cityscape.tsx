/**
 * Real-scale downtown outside the north and east glazing. Everything is true
 * geometry at true distance, so parallax through the window is physically
 * right from any spot and look angle.
 *
 * Cost: six draw calls, no lights, no shadows, no per-frame CPU work beyond
 * one shared time uniform. Cars move in the vertex shader; the sky draws after
 * the room so only window pixels shade it.
 */
import { memo, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  CITY,
  CITY_TIERS,
  planCity,
  type CityBuilding,
  type CityCar,
  type StreetProp,
} from "../cityLayout.js";
import type { QualityTier } from "../effects/useAdaptiveQuality.js";
import { useAmbientMotion } from "./ambient.js";
import { installCityRenderGate } from "./cityVisibility.js";

/** Morning sun low in the east, matching the room's directional light. */
export const CITY_SUN_DIRECTION = new THREE.Vector3(11, 9, 2).normalize();
/** Sky horizon and aerial haze are one colour, so distance melts into sky. */
const HORIZON = "#d9e4ee";
const ZENITH = "#78a6dc";
const HAZE_DENSITY = 0.0011;
/**
 * City geometry lives in world-space attributes, so three would depth-sort it
 * as if it sat at the origin. Drawing it after the room lets the walls reject
 * hidden fragments early; the sky goes last of all.
 */
const CITY_ORDER = 1;
const SKY_ORDER = 2;

type Shared = {
  uTime: { value: number };
  uSunDir: { value: THREE.Vector3 };
  uHaze: { value: THREE.Color };
  uHazeDensity: { value: number };
  uStreetY: { value: number };
};

const HAZE_GLSL = /* glsl */ `
uniform vec3 uHaze;
uniform float uHazeDensity;
vec3 applyHaze(vec3 col, vec3 world) {
  float d = length(world - cameraPosition);
  return mix(col, uHaze, 1.0 - exp(-d * uHazeDensity));
}
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
`;

const OUTPUT_GLSL = /* glsl */ `
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
`;

const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const SKY_FRAG = /* glsl */ `
uniform vec3 uSunDir;
uniform float uTime;
uniform int uOctaves;
uniform vec3 uZenith;
uniform vec3 uHorizon;
varying vec3 vDir;
${HAZE_GLSL}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x),
    mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  float norm = 0.0;
  for (int i = 0; i < 5; i++) {
    if (i >= uOctaves) break;
    v += a * noise(p);
    norm += a;
    p = p * 2.03 + vec2(11.7, 5.3);
    a *= 0.5;
  }
  return v / norm;
}
void main() {
  vec3 d = normalize(vDir);
  float up = clamp(d.y, 0.0, 1.0);
  vec3 col = mix(uHorizon, uZenith, pow(up, 0.55));
  float toSun = max(dot(d, uSunDir), 0.0);
  col += vec3(1.0, 0.9, 0.72) * (pow(toSun, 8.0) * 0.22 + pow(toSun, 900.0) * 6.0);
  if (d.y > 0.0) {
    vec2 uv = d.xz / (d.y + 0.08) * 0.55 + vec2(uTime * 0.0035, uTime * 0.0012);
    float c = fbm(uv);
    float cover = smoothstep(0.5, 0.78, c) * smoothstep(0.0, 0.18, d.y);
    vec3 cloud = mix(vec3(0.78, 0.82, 0.88), vec3(1.02, 1.0, 0.98), smoothstep(0.55, 0.9, c));
    col = mix(col, cloud, cover * 0.88);
  }
  gl_FragColor = vec4(col, 1.0);
  ${OUTPUT_GLSL}
}
`;

const WORLD_VERT = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const GROUND_FRAG = /* glsl */ `
uniform vec2 uOrigin;
uniform float uPitch;
uniform float uRoadHalf;
uniform float uWalkHalf;
varying vec3 vWorld;
${HAZE_GLSL}
float band(float x, float halfWidth, float aa) {
  return 1.0 - smoothstep(halfWidth - aa, halfWidth + aa, abs(x));
}
void main() {
  vec2 q = vWorld.xz - uOrigin;
  vec2 c = q - uPitch * floor(q / uPitch + 0.5);
  vec2 aa = fwidth(q) + 1e-4;
  float roadNS = band(c.x, uRoadHalf, aa.x);
  float roadEW = band(c.y, uRoadHalf, aa.y);
  float walk = max(band(c.x, uWalkHalf, aa.x), band(c.y, uWalkHalf, aa.y));
  vec3 col = mix(vec3(0.34, 0.34, 0.32), vec3(0.52, 0.51, 0.48), walk);
  col = mix(col, vec3(0.085, 0.09, 0.095), max(roadNS, roadEW));

  float dist = length(vWorld - cameraPosition);
  float detail = 1.0 - smoothstep(160.0, 340.0, dist);
  float onlyNS = roadNS * (1.0 - roadEW);
  float onlyEW = roadEW * (1.0 - roadNS);
  float yellow = band(abs(c.x) - 0.18, 0.07, aa.x) * onlyNS + band(abs(c.y) - 0.18, 0.07, aa.y) * onlyEW;
  float dashes =
    band(abs(c.x) - 3.5, 0.07, aa.x) * step(0.5, fract(q.y / 9.0)) * onlyNS +
    band(abs(c.y) - 3.5, 0.07, aa.y) * step(0.5, fract(q.x / 9.0)) * onlyEW;
  float zebra =
    roadNS * band(abs(c.y) - (uRoadHalf + 2.2), 1.6, aa.y) * step(0.5, fract(c.x / 1.1)) +
    roadEW * band(abs(c.x) - (uRoadHalf + 2.2), 1.6, aa.x) * step(0.5, fract(c.y / 1.1));
  col = mix(col, vec3(0.72, 0.55, 0.12), clamp(yellow, 0.0, 1.0) * detail);
  col = mix(col, vec3(0.8), clamp(dashes + zebra, 0.0, 1.0) * detail);

  gl_FragColor = vec4(applyHaze(col, vWorld), 1.0);
  ${OUTPUT_GLSL}
}
`;

const BUILDING_VERT = /* glsl */ `
attribute vec4 aFootprint;
attribute vec4 aSpan;
attribute vec2 aCell;
attribute vec3 aColor;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vColor;
varying vec4 vInfo;
void main() {
  vec3 world = position * vec3(aFootprint.z, aSpan.y, aFootprint.w) + vec3(aFootprint.x, aSpan.x, aFootprint.y);
  vWorld = world;
  vNormal = normal;
  vColor = aColor;
  vInfo = vec4(aSpan.z, aSpan.w, aCell);
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}
`;

const BUILDING_FRAG = /* glsl */ `
uniform vec3 uSunDir;
uniform float uStreetY;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vColor;
varying vec4 vInfo;
${HAZE_GLSL}
void main() {
  vec3 n = normalize(vNormal);
  float sun = max(dot(n, uSunDir), 0.0);
  float sky = 0.6 + 0.2 * n.y;
  float kind = vInfo.x;
  float h = vWorld.y - uStreetY;
  vec3 col;
  if (n.y > 0.5) {
    col = mix(vColor, vec3(0.42, 0.43, 0.44), 0.55) * (sky + sun * 0.75);
  } else {
    float u = abs(n.x) > 0.5 ? vWorld.z : vWorld.x;
    vec2 cell = vec2(u, h) / vInfo.zw;
    vec2 f = fract(cell);
    vec2 frame = kind < 0.5 ? vec2(0.07, 0.12) : kind < 1.5 ? vec2(0.24, 0.3) : vec2(0.05, 0.1);
    vec2 aa = fwidth(cell) * 1.2;
    vec2 m = smoothstep(frame - aa, frame + aa, f) * (1.0 - smoothstep(1.0 - frame - aa, 1.0 - frame + aa, f));
    float coverage = (1.0 - 2.0 * frame.x) * (1.0 - 2.0 * frame.y);
    float win = mix(m.x * m.y, coverage, smoothstep(0.35, 0.8, max(aa.x, aa.y)));
    win *= step(5.0, h) * step(kind, 2.5);
    float r = hash12(floor(cell) + vInfo.y * 17.0);
    vec3 glass = mix(vec3(0.1, 0.15, 0.21), vec3(0.42, 0.52, 0.62), 0.25 + 0.5 * r);
    glass = mix(glass, vec3(0.66, 0.74, 0.82), sun * 0.45);
    float ao = mix(0.72, 1.0, smoothstep(0.0, 24.0, h));
    col = mix(vColor * (sky + sun * 0.8), glass * (0.85 + 0.35 * sun), win) * ao;
  }
  gl_FragColor = vec4(applyHaze(col, vWorld), 1.0);
  ${OUTPUT_GLSL}
}
`;

const CAR_VERT = /* glsl */ `
attribute vec4 aLane;
attribute vec2 aMotion;
attribute vec3 aColor;
uniform float uTime;
uniform float uStreetY;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vColor;
varying vec3 vLocal;
void main() {
  float s = aLane.z + mod(aMotion.x + aMotion.y * uTime, aLane.w);
  vec3 local = position * vec3(4.5, 1.45, 1.9);
  vec3 world;
  vec3 n;
  if (aLane.x < 0.5) {
    world = vec3(s + local.x, uStreetY + local.y, aLane.y + local.z);
    n = normal;
  } else {
    world = vec3(aLane.y + local.z, uStreetY + local.y, s + local.x);
    n = vec3(normal.z, normal.y, normal.x);
  }
  vWorld = world;
  vNormal = n;
  vColor = aColor;
  vLocal = position;
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}
`;

const CAR_FRAG = /* glsl */ `
uniform vec3 uSunDir;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vColor;
varying vec3 vLocal;
${HAZE_GLSL}
void main() {
  vec3 n = normalize(vNormal);
  float light = 0.62 + 0.2 * n.y + max(dot(n, uSunDir), 0.0) * 0.7;
  float glass = n.y > 0.5
    ? step(-0.22, vLocal.x) * step(vLocal.x, 0.3)
    : step(0.55, vLocal.y) * step(vLocal.y, 0.9);
  vec3 col = mix(vColor, vec3(0.08, 0.1, 0.12), glass * 0.85) * light;
  gl_FragColor = vec4(applyHaze(col, vWorld), 1.0);
  ${OUTPUT_GLSL}
}
`;

const PROP_VERT = /* glsl */ `
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vColor;
void main() {
  mat4 model = modelMatrix * instanceMatrix;
  vec4 world = model * vec4(position, 1.0);
  vWorld = world.xyz;
  vNormal = normalize(mat3(model) * normal);
  #ifdef USE_INSTANCING_COLOR
    vColor = instanceColor;
  #else
    vColor = vec3(1.0);
  #endif
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const PROP_FRAG = /* glsl */ `
uniform vec3 uSunDir;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vColor;
${HAZE_GLSL}
void main() {
  vec3 n = normalize(vNormal);
  float light = 0.58 + 0.22 * n.y + max(dot(n, uSunDir), 0.0) * 0.7;
  gl_FragColor = vec4(applyHaze(vColor * light, vWorld), 1.0);
  ${OUTPUT_GLSL}
}
`;

function useDisposable<T extends { dispose: () => void }>(value: T): T {
  useEffect(
    () => () => {
      value.dispose();
    },
    [value],
  );
  return value;
}

function cityMaterial(
  vertexShader: string,
  fragmentShader: string,
  uniforms: Record<string, THREE.IUniform>,
  options: Partial<THREE.ShaderMaterialParameters> = {},
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms, ...options });
}

/** Unit box standing on y = 0, centred in x/z. */
function baseBox(): THREE.BoxGeometry {
  return new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
}

function instancedBoxes(
  count: number,
  attributes: Record<string, { data: Float32Array; size: number }>,
): THREE.InstancedBufferGeometry {
  const box = baseBox();
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setIndex(box.index);
  geometry.setAttribute("position", box.getAttribute("position"));
  geometry.setAttribute("normal", box.getAttribute("normal"));
  for (const [name, { data, size }] of Object.entries(attributes)) {
    geometry.setAttribute(name, new THREE.InstancedBufferAttribute(data, size));
  }
  geometry.instanceCount = count;
  return geometry;
}

function linearRgb(hex: string, target: THREE.Color): [number, number, number] {
  target.set(hex);
  return [target.r, target.g, target.b];
}

function buildingGeometry(buildings: readonly CityBuilding[]): THREE.InstancedBufferGeometry {
  const n = buildings.length;
  const footprint = new Float32Array(n * 4);
  const span = new Float32Array(n * 4);
  const cell = new Float32Array(n * 2);
  const color = new Float32Array(n * 3);
  const tint = new THREE.Color();
  buildings.forEach((b, i) => {
    footprint.set([b.x, b.z, b.width, b.depth], i * 4);
    span.set([b.baseY, b.height, b.kind, b.seed], i * 4);
    cell.set(b.cell, i * 2);
    color.set(linearRgb(b.color, tint), i * 3);
  });
  return instancedBoxes(n, {
    aFootprint: { data: footprint, size: 4 },
    aSpan: { data: span, size: 4 },
    aCell: { data: cell, size: 2 },
    aColor: { data: color, size: 3 },
  });
}

function carGeometry(cars: readonly CityCar[]): THREE.InstancedBufferGeometry {
  const n = cars.length;
  const lane = new Float32Array(n * 4);
  const motion = new Float32Array(n * 2);
  const color = new Float32Array(n * 3);
  const tint = new THREE.Color();
  cars.forEach((car, i) => {
    lane.set([car.axis, car.lane, car.spanStart, car.span], i * 4);
    motion.set([car.offset, car.speed], i * 2);
    color.set(linearRgb(car.color, tint), i * 3);
  });
  return instancedBoxes(n, {
    aLane: { data: lane, size: 4 },
    aMotion: { data: motion, size: 2 },
    aColor: { data: color, size: 3 },
  });
}

function hazeUniforms(shared: Shared) {
  return { uHaze: shared.uHaze, uHazeDensity: shared.uHazeDensity };
}

function CitySky({ shared, octaves }: { shared: Shared; octaves: number }) {
  const material = useDisposable(
    useMemo(
      () =>
        cityMaterial(
          SKY_VERT,
          SKY_FRAG,
          {
            ...hazeUniforms(shared),
            uTime: shared.uTime,
            uSunDir: shared.uSunDir,
            uOctaves: { value: 3 },
            uZenith: { value: new THREE.Color(ZENITH) },
            uHorizon: { value: new THREE.Color(HORIZON) },
          },
          { side: THREE.BackSide, depthWrite: false },
        ),
      [shared],
    ),
  );
  useEffect(() => {
    const uniform = material.uniforms.uOctaves;
    if (uniform) uniform.value = octaves;
  }, [material, octaves]);
  return (
    <mesh material={material} renderOrder={SKY_ORDER} frustumCulled={false}>
      <sphereGeometry args={[1000, 32, 16]} />
    </mesh>
  );
}

function StreetGround({ shared }: { shared: Shared }) {
  const material = useDisposable(
    useMemo(
      () =>
        cityMaterial(WORLD_VERT, GROUND_FRAG, {
          ...hazeUniforms(shared),
          uOrigin: { value: new THREE.Vector2(CITY.originX, CITY.originZ) },
          uPitch: { value: CITY.pitch },
          uRoadHalf: { value: CITY.roadHalf },
          uWalkHalf: { value: CITY.walkHalf },
        }),
      [shared],
    ),
  );
  return (
    <mesh
      material={material}
      position={[0, CITY.streetY, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      renderOrder={CITY_ORDER}
    >
      <planeGeometry args={[2400, 2400]} />
    </mesh>
  );
}

function Buildings({ shared, buildings }: { shared: Shared; buildings: readonly CityBuilding[] }) {
  const geometry = useDisposable(useMemo(() => buildingGeometry(buildings), [buildings]));
  const material = useDisposable(
    useMemo(
      () =>
        cityMaterial(BUILDING_VERT, BUILDING_FRAG, {
          ...hazeUniforms(shared),
          uSunDir: shared.uSunDir,
          uStreetY: shared.uStreetY,
        }),
      [shared],
    ),
  );
  return (
    <mesh geometry={geometry} material={material} frustumCulled={false} renderOrder={CITY_ORDER} />
  );
}

function Traffic({ shared, cars }: { shared: Shared; cars: readonly CityCar[] }) {
  const geometry = useDisposable(useMemo(() => carGeometry(cars), [cars]));
  const material = useDisposable(
    useMemo(
      () =>
        cityMaterial(CAR_VERT, CAR_FRAG, {
          ...hazeUniforms(shared),
          uSunDir: shared.uSunDir,
          uStreetY: shared.uStreetY,
          uTime: shared.uTime,
        }),
      [shared],
    ),
  );
  return (
    <mesh geometry={geometry} material={material} frustumCulled={false} renderOrder={CITY_ORDER} />
  );
}

type PropPart = { position: [number, number, number]; scale: [number, number, number] };

/** Pole, arm reaching over the road along local +X, and the lamp head. */
const LAMP_PARTS: readonly PropPart[] = [
  { position: [0, 0, 0], scale: [0.2, 8, 0.2] },
  { position: [0.9, 7.8, 0], scale: [1.8, 0.14, 0.14] },
  { position: [1.6, 7.66, 0], scale: [0.6, 0.12, 0.3] },
];

function StreetProps({
  shared,
  props,
  parts,
  geometry,
}: {
  shared: Shared;
  props: readonly StreetProp[];
  parts: readonly PropPart[];
  geometry: THREE.BufferGeometry;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const material = useDisposable(
    useMemo(
      () => cityMaterial(PROP_VERT, PROP_FRAG, { ...hazeUniforms(shared), uSunDir: shared.uSunDir }),
      [shared],
    ),
  );
  const count = props.length * parts.length;
  useLayoutEffect(() => {
    const target = mesh.current;
    if (!target) return;
    const root = new THREE.Matrix4();
    const part = new THREE.Matrix4();
    const tint = new THREE.Color();
    props.forEach((prop, i) => {
      root.makeRotationY(prop.yaw).setPosition(prop.x, CITY.streetY, prop.z);
      tint.set(prop.color);
      parts.forEach((p, k) => {
        part.makeScale(p.scale[0] * prop.scale, p.scale[1] * prop.scale, p.scale[2] * prop.scale);
        part.setPosition(p.position[0] * prop.scale, p.position[1] * prop.scale, p.position[2] * prop.scale);
        target.setMatrixAt(i * parts.length + k, part.premultiply(root));
        target.setColorAt(i * parts.length + k, tint);
      });
    });
    target.instanceMatrix.needsUpdate = true;
    if (target.instanceColor) target.instanceColor.needsUpdate = true;
  }, [parts, props]);
  if (count === 0) return null;
  return (
    <instancedMesh
      key={count}
      ref={mesh}
      args={[geometry, material, count]}
      frustumCulled={false}
      renderOrder={CITY_ORDER}
    />
  );
}

const LAMP_GEOMETRY = baseBox();
/** Crown only: trunks vanish at forty metres up. */
const TREE_GEOMETRY = new THREE.IcosahedronGeometry(1, 1).translate(0, 3.6, 0);
const TREE_PARTS: readonly PropPart[] = [{ position: [0, 0, 0], scale: [1, 0.9, 1] }];

export const Cityscape = memo(function Cityscape({
  tier,
  animated = true,
}: {
  tier: QualityTier;
  animated?: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const { scene, camera, clock } = useThree();
  const plan = useMemo(() => planCity(tier), [tier]);
  const live = useAmbientMotion(animated);
  const shared = useMemo<Shared>(
    () => ({
      uTime: { value: 0 },
      uSunDir: { value: CITY_SUN_DIRECTION.clone() },
      uHaze: { value: new THREE.Color(HORIZON) },
      uHazeDensity: { value: HAZE_DENSITY },
      uStreetY: { value: CITY.streetY },
    }),
    [],
  );
  useLayoutEffect(() => {
    const target = group.current;
    if (!target) return undefined;
    return installCityRenderGate(scene, camera, target, shared.uTime, clock, live);
  }, [camera, clock, live, scene, shared]);
  return (
    <group ref={group}>
      <CitySky shared={shared} octaves={CITY_TIERS[tier].cloudOctaves} />
      <StreetGround shared={shared} />
      <Buildings shared={shared} buildings={plan.buildings} />
      <Traffic shared={shared} cars={plan.cars} />
      <StreetProps shared={shared} props={plan.streetlights} parts={LAMP_PARTS} geometry={LAMP_GEOMETRY} />
      <StreetProps shared={shared} props={plan.trees} parts={TREE_PARTS} geometry={TREE_GEOMETRY} />
    </group>
  );
});
