import { DESK_SURFACE_Y } from "./furniture.js";

type DetailSurface = "desk" | "breakTable" | "coffeeCounter";
type DetailKind =
  | "headset"
  | "inboxTray"
  | "notebook"
  | "mug"
  | "napkins"
  | "supplyCaddy"
  | "cupStack"
  | "teaTin";

type WorkplaceDetail = {
  id: string;
  kind: DetailKind;
  x: number;
  z: number;
  width: number;
  depth: number;
};

type WorkplaceDetailGroup = {
  id: string;
  surface: DetailSurface;
  surfaceY: number;
  items: readonly WorkplaceDetail[];
};

/** Finished surfaces; all details are local to their tabletop origin. */
export const WORKPLACE_DETAIL_SURFACES = {
  desk: { width: 2.25, depth: 1.1, y: DESK_SURFACE_Y },
  breakTable: { width: 2.0, depth: 1.15, y: 0.82 },
  coffeeCounter: { width: 2.4, depth: 0.66, y: 0.945 },
} as const;

/**
 * These are the render placements as well as the collision-safe layout
 * contract. Nothing in this pass is floor-mounted or interactive.
 */
export const WORKPLACE_DETAIL_GROUPS: readonly WorkplaceDetailGroup[] = [
  {
    id: "desk",
    surface: "desk",
    surfaceY: DESK_SURFACE_Y,
    items: [
      {
        id: "headset",
        kind: "headset",
        x: 0.93,
        z: 0.23,
        width: 0.2,
        depth: 0.18,
      },
      {
        id: "inbox",
        kind: "inboxTray",
        x: -0.71,
        z: 0.23,
        width: 0.3,
        depth: 0.22,
      },
      {
        id: "notebook",
        kind: "notebook",
        x: 0.48,
        z: 0.22,
        width: 0.22,
        depth: 0.3,
      },
    ],
  },
  {
    id: "break-table",
    surface: "breakTable",
    surfaceY: 0.82,
    items: [
      { id: "mug", kind: "mug", x: -0.65, z: 0.23, width: 0.12, depth: 0.12 },
      {
        id: "napkins",
        kind: "napkins",
        x: 0.64,
        z: 0.22,
        width: 0.2,
        depth: 0.18,
      },
      {
        id: "caddy",
        kind: "supplyCaddy",
        x: 0.64,
        z: -0.25,
        width: 0.18,
        depth: 0.16,
      },
    ],
  },
  {
    id: "coffee-counter",
    surface: "coffeeCounter",
    surfaceY: 0.945,
    items: [
      {
        id: "cups",
        kind: "cupStack",
        x: 1.04,
        z: -0.1,
        width: 0.16,
        depth: 0.16,
      },
      {
        id: "tea",
        kind: "teaTin",
        x: 0.12,
        z: -0.18,
        width: 0.14,
        depth: 0.14,
      },
      {
        id: "supplies",
        kind: "supplyCaddy",
        x: -0.2,
        z: -0.18,
        width: 0.2,
        depth: 0.16,
      },
    ],
  },
] as const;

function detailGroup(id: string): WorkplaceDetailGroup {
  const group = WORKPLACE_DETAIL_GROUPS.find(
    (candidate) => candidate.id === id,
  );
  if (!group) throw new Error(`Unknown workplace detail group: ${id}`);
  return group;
}

function Headset({ item, accent }: { item: WorkplaceDetail; accent: string }) {
  return (
    <group position={[item.x, 0, item.z]}>
      <mesh position={[-0.065, 0.035, 0]}>
        <cylinderGeometry args={[0.04, 0.045, 0.07, 8]} />
        <meshStandardMaterial color="#172329" roughness={0.5} />
      </mesh>
      <mesh position={[0.065, 0.035, 0]}>
        <cylinderGeometry args={[0.04, 0.045, 0.07, 8]} />
        <meshStandardMaterial color="#172329" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.08, 0]}>
        <torusGeometry args={[0.07, 0.012, 6, 12, Math.PI]} />
        <meshStandardMaterial
          color={accent}
          metalness={0.18}
          roughness={0.42}
        />
      </mesh>
    </group>
  );
}

function InboxTray({ item }: { item: WorkplaceDetail }) {
  return (
    <group position={[item.x, 0, item.z]}>
      <mesh position={[0, 0.025, 0]}>
        <boxGeometry args={[item.width, 0.05, item.depth]} />
        <meshStandardMaterial
          color="#304852"
          roughness={0.55}
          metalness={0.12}
        />
      </mesh>
      <mesh position={[0.01, 0.058, -0.01]} rotation={[-0.08, 0.05, 0]}>
        <boxGeometry args={[0.23, 0.012, 0.16]} />
        <meshStandardMaterial color="#d5d5c8" roughness={0.8} />
      </mesh>
    </group>
  );
}

function Notebook({ item, accent }: { item: WorkplaceDetail; accent: string }) {
  return (
    <group position={[item.x, 0, item.z]} rotation={[0, -0.11, 0]}>
      <mesh position={[0, 0.014, 0]}>
        <boxGeometry args={[item.width, 0.028, item.depth]} />
        <meshStandardMaterial color={accent} roughness={0.78} />
      </mesh>
      <mesh position={[-item.width / 2 + 0.025, 0.031, 0]}>
        <boxGeometry args={[0.018, 0.01, item.depth - 0.035]} />
        <meshStandardMaterial
          color="#c8d8df"
          metalness={0.35}
          roughness={0.4}
        />
      </mesh>
    </group>
  );
}

function Mug({ item }: { item: WorkplaceDetail }) {
  return (
    <group position={[item.x, 0, item.z]}>
      <mesh position={[0, 0.045, 0]}>
        <cylinderGeometry args={[0.045, 0.04, 0.09, 10]} />
        <meshStandardMaterial color="#c47d50" roughness={0.5} />
      </mesh>
      <mesh position={[0.05, 0.05, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.025, 0.007, 6, 10, Math.PI]} />
        <meshStandardMaterial color="#754434" roughness={0.48} />
      </mesh>
    </group>
  );
}

function Napkins({ item }: { item: WorkplaceDetail }) {
  return (
    <group position={[item.x, 0, item.z]}>
      <mesh position={[0, 0.016, 0]}>
        <boxGeometry args={[item.width, 0.032, item.depth]} />
        <meshStandardMaterial color="#eee0c7" roughness={0.88} />
      </mesh>
      <mesh position={[0.03, 0.036, -0.02]} rotation={[0.05, 0.12, 0]}>
        <boxGeometry args={[item.width - 0.04, 0.012, item.depth - 0.04]} />
        <meshStandardMaterial color="#f8efd9" roughness={0.9} />
      </mesh>
    </group>
  );
}

function SupplyCaddy({
  item,
  warm = false,
}: {
  item: WorkplaceDetail;
  warm?: boolean;
}) {
  return (
    <group position={[item.x, 0, item.z]}>
      <mesh position={[0, 0.035, 0]}>
        <boxGeometry args={[item.width, 0.07, item.depth]} />
        <meshStandardMaterial
          color={warm ? "#76523b" : "#3e5961"}
          roughness={0.65}
        />
      </mesh>
      <mesh position={[-0.04, 0.095, 0]}>
        <cylinderGeometry args={[0.022, 0.022, 0.11, 8]} />
        <meshStandardMaterial color="#e8b84a" roughness={0.5} />
      </mesh>
      <mesh position={[0.04, 0.085, 0.01]}>
        <cylinderGeometry args={[0.018, 0.018, 0.09, 8]} />
        <meshStandardMaterial color="#c45c48" roughness={0.5} />
      </mesh>
    </group>
  );
}

function CupStack({ item }: { item: WorkplaceDetail }) {
  return (
    <group position={[item.x, 0, item.z]}>
      {[0.025, 0.065, 0.105].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <cylinderGeometry args={[0.045, 0.05, 0.04, 10]} />
          <meshStandardMaterial color="#e9d6af" roughness={0.78} />
        </mesh>
      ))}
    </group>
  );
}

function TeaTin({ item }: { item: WorkplaceDetail }) {
  return (
    <group position={[item.x, 0, item.z]}>
      <mesh position={[0, 0.055, 0]}>
        <cylinderGeometry args={[0.055, 0.06, 0.11, 10]} />
        <meshStandardMaterial
          color="#a8673f"
          metalness={0.16}
          roughness={0.42}
        />
      </mesh>
      <mesh position={[0, 0.115, 0]}>
        <cylinderGeometry args={[0.047, 0.047, 0.012, 10]} />
        <meshStandardMaterial
          color="#e8b84a"
          metalness={0.3}
          roughness={0.35}
        />
      </mesh>
    </group>
  );
}

function DetailMeshes({
  items,
  deskVariant = 0,
  warm = false,
}: {
  items: readonly WorkplaceDetail[];
  deskVariant?: number;
  warm?: boolean;
}) {
  const coolAccent = deskVariant % 2 === 0 ? "#4a7181" : "#516b79";
  return items.map((item) => {
    switch (item.kind) {
      case "headset":
        return <Headset accent={coolAccent} item={item} key={item.id} />;
      case "inboxTray":
        return <InboxTray item={item} key={item.id} />;
      case "notebook":
        return <Notebook accent={coolAccent} item={item} key={item.id} />;
      case "mug":
        return <Mug item={item} key={item.id} />;
      case "napkins":
        return <Napkins item={item} key={item.id} />;
      case "supplyCaddy":
        return <SupplyCaddy item={item} key={item.id} warm={warm} />;
      case "cupStack":
        return <CupStack item={item} key={item.id} />;
      case "teaTin":
        return <TeaTin item={item} key={item.id} />;
    }
  });
}

/** Add a restrained, cool-toned work cluster to an existing desk. */
export function DeskSurfaceDetails({
  position,
  variant = 0,
}: {
  position: [number, number, number];
  variant?: number;
}) {
  const group = detailGroup("desk");
  return (
    <group position={[position[0], group.surfaceY, position[2] - 0.2]}>
      <DetailMeshes deskVariant={variant} items={group.items} />
    </group>
  );
}

/** Small warm supplies placed on the existing lounge table. */
export function BreakTableSupplies({
  position,
}: {
  position: [number, number, number];
}) {
  const group = detailGroup("break-table");
  return (
    <group position={[position[0], group.surfaceY, position[2]]}>
      <DetailMeshes items={group.items} warm />
    </group>
  );
}

/** Small warm supplies placed on the existing coffee counter. */
export function CoffeeCounterSupplies({
  position,
}: {
  position: [number, number, number];
}) {
  const group = detailGroup("coffee-counter");
  return (
    <group position={[position[0], group.surfaceY, position[2]]}>
      <DetailMeshes items={group.items} warm />
    </group>
  );
}
