# Map Travel + Detailed SOC Room + Hybrid Computer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 2D floor map, a walkable first-person SOC room (React Three Fiber), and a hybrid sit → monitor panel → Focus desk flow on top of the existing simulation UI.

**Architecture:** Presentation-only spatial layers (`floor_map` → `room_walk` → `seated_monitor` → `focus_desk`) wrap the existing `ClientView` / `WorkSurface`. The 3D room never invents actions or evidence; Structured mode skips spatial layers. Collisions use simple AABB (no Rapier). Monitor + Focus desk use HTML overlays.

**Tech Stack:** React 19, Vite, `three`, `@react-three/fiber`, `@react-three/drei`, existing `@sim/schemas` / tRPC client, Vitest + Testing Library.

## Global Constraints

- Server owns world state; client only renders `ClientView` and submits typed actions.
- No career evidence from walking, looking, or hotspot proximity.
- Structured / accessible mode remains a peer path with identical action IDs.
- First content slice: SOC room only; other map rooms greyed.
- Alert wall and coffee hotspots are flavor-only in PR1; desk sits; door returns to map; Morgan station may open Team chat focus only (no new actions).
- Manual AABB colliders; HTML overlays for computer UI; straight-line click-to-walk.
- Audio not required for merge.
- Keep lint / typecheck / test / build green.
- Do not require WebGL in CI for core tests (mock / lazy-load Canvas).

## File structure

| File | Responsibility |
|---|---|
| `apps/web/src/world/worldTypes.ts` | Presentation phases, hotspot IDs, room bounds types |
| `apps/web/src/world/FloorMap.tsx` | 2D map travel UI |
| `apps/web/src/world/Hotspot.tsx` | R3F interactable marker + proximity |
| `apps/web/src/world/PlayerController.tsx` | WASD + look + click-to-walk + AABB |
| `apps/web/src/world/rooms/SocRoom.tsx` | SOC meshes, lights, hotspots, Canvas scene |
| `apps/web/src/world/ComputerOverlay.tsx` | Seated monitor panel + Focus desk bridge |
| `apps/web/src/world/SpatialShell.tsx` | Orchestrates map/room/seated/focus for desk mode |
| `apps/web/src/index.tsx` | Wire spatial shell into App surfaces |
| `apps/web/src/styles.css` | Map + overlay styles |
| `apps/web/package.json` | R3F deps |
| `apps/web/test/world.test.tsx` | Presentation transition tests (no WebGL) |

---

### Task 1: Dependencies + world types + presentation reducer tests

**Files:**
- Modify: `apps/web/package.json`
- Create: `apps/web/src/world/worldTypes.ts`
- Create: `apps/web/src/world/presentation.ts`
- Create: `apps/web/test/world.test.tsx`

**Interfaces:**
- Produces: `SpatialPhase`, `HotspotId`, `reduceSpatialEvent`, `SpatialEvent`

- [ ] **Step 1: Install deps from `apps/web`**

```bash
cd /Users/zaid/personal-projects/Careerexpo/.worktrees/career-sim-beta/apps/web
pnpm add three @react-three/fiber @react-three/drei
pnpm add -D @types/three
```

- [ ] **Step 2: Write failing presentation tests**

Create `apps/web/test/world.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  INITIAL_SPATIAL,
  reduceSpatialEvent,
} from "../src/world/presentation.js";

describe("spatial presentation", () => {
  it("enters SOC room from the floor map", () => {
    const next = reduceSpatialEvent(INITIAL_SPATIAL, {
      type: "enter_room",
      roomId: "soc",
    });
    expect(next.phase).toBe("room_walk");
    expect(next.roomId).toBe("soc");
  });

  it("sits at the desk then focuses the computer", () => {
    let state = reduceSpatialEvent(INITIAL_SPATIAL, {
      type: "enter_room",
      roomId: "soc",
    });
    state = reduceSpatialEvent(state, { type: "sit_desk" });
    expect(state.phase).toBe("seated_monitor");
    state = reduceSpatialEvent(state, { type: "focus_desk" });
    expect(state.phase).toBe("focus_desk");
  });

  it("stands and can return to the floor map", () => {
    let state = reduceSpatialEvent(INITIAL_SPATIAL, {
      type: "enter_room",
      roomId: "soc",
    });
    state = reduceSpatialEvent(state, { type: "sit_desk" });
    state = reduceSpatialEvent(state, { type: "stand" });
    expect(state.phase).toBe("room_walk");
    state = reduceSpatialEvent(state, { type: "leave_room" });
    expect(state.phase).toBe("floor_map");
    expect(state.roomId).toBeUndefined();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd /Users/zaid/personal-projects/Careerexpo/.worktrees/career-sim-beta && pnpm --filter @sim/web test -- test/world.test.tsx`
Expected: FAIL (module not found)

- [ ] **Step 4: Implement types + reducer**

`apps/web/src/world/worldTypes.ts`:

```ts
export type SpatialPhase =
  | "floor_map"
  | "room_walk"
  | "seated_monitor"
  | "focus_desk";

export type RoomId = "soc" | "break_room" | "manager_office";

export type HotspotId =
  | "desk_player"
  | "alert_wall"
  | "morgan_station"
  | "coffee"
  | "door_exit";

export type SpatialState = {
  phase: SpatialPhase;
  roomId?: RoomId;
  nearbyHotspotId?: HotspotId;
  flavorMessage?: string;
};
```

`apps/web/src/world/presentation.ts`:

```ts
import type { RoomId, SpatialState } from "./worldTypes.js";

export const INITIAL_SPATIAL: SpatialState = {
  phase: "floor_map",
};

export type SpatialEvent =
  | { type: "enter_room"; roomId: RoomId }
  | { type: "leave_room" }
  | { type: "sit_desk" }
  | { type: "focus_desk" }
  | { type: "stand" }
  | { type: "set_nearby"; hotspotId?: SpatialState["nearbyHotspotId"] }
  | { type: "set_flavor"; message?: string };

export function reduceSpatialEvent(
  state: SpatialState,
  event: SpatialEvent,
): SpatialState {
  switch (event.type) {
    case "enter_room":
      return { phase: "room_walk", roomId: event.roomId };
    case "leave_room":
      return { phase: "floor_map" };
    case "sit_desk":
      return { ...state, phase: "seated_monitor", flavorMessage: undefined };
    case "focus_desk":
      return { ...state, phase: "focus_desk" };
    case "stand":
      return { ...state, phase: "room_walk" };
    case "set_nearby":
      return { ...state, nearbyHotspotId: event.hotspotId };
    case "set_flavor":
      return { ...state, flavorMessage: event.message };
    default:
      return state;
  }
}
```

- [ ] **Step 5: Run tests to verify pass**

Run: `pnpm --filter @sim/web test -- test/world.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/web/package.json apps/web/src/world pnpm-lock.yaml apps/web/test/world.test.tsx
git commit -m "feat: add spatial presentation state and R3F dependencies"
```

---

### Task 2: Floor map UI

**Files:**
- Create: `apps/web/src/world/FloorMap.tsx`
- Modify: `apps/web/src/styles.css`
- Modify: `apps/web/test/world.test.tsx`

**Interfaces:**
- Consumes: `RoomId`
- Produces: `FloorMap({ onEnterRoom, lockedMessage? })`

- [ ] **Step 1: Extend test for map unlock behavior**

Add to `apps/web/test/world.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FloorMap } from "../src/world/FloorMap.js";

it("lets the player enter the unlocked SOC room", async () => {
  const user = userEvent.setup();
  let entered: string | undefined;
  render(
    <FloorMap
      onEnterRoom={(roomId) => {
        entered = roomId;
      }}
    />,
  );
  await user.click(screen.getByRole("button", { name: /Security Operations/i }));
  expect(entered).toBe("soc");
  expect(screen.getByRole("button", { name: /Break room/i })).toBeDisabled();
});
```

- [ ] **Step 2: Run test — expect fail**

- [ ] **Step 3: Implement FloorMap**

`FloorMap.tsx` shows a stylized 2D floor plan with rooms: SOC (enter), Break room (disabled), Manager office (disabled). On SOC click, animate a small “you” marker along a path (CSS transition ~600ms) then call `onEnterRoom("soc")`.

Include copy: “Hallways stay simple — pick a room to go there.”

- [ ] **Step 4: Add `.floor-map` styles** in `styles.css` matching night SOC palette, readable DM Sans, clear disabled state.

- [ ] **Step 5: Tests pass + commit**

```bash
git commit -m "feat: add 2D floor map travel into the SOC"
```

---

### Task 3: SOC room scene + player controller + hotspots

**Files:**
- Create: `apps/web/src/world/Hotspot.tsx`
- Create: `apps/web/src/world/PlayerController.tsx`
- Create: `apps/web/src/world/rooms/SocRoom.tsx`
- Create: `apps/web/src/world/RoomCanvas.tsx` (lazy-friendly wrapper)

**Interfaces:**
- Produces: `SocRoom({ onInteract, onNearbyChange })`, `RoomCanvas` lazy export
- Hotspot ids: `desk_player`, `alert_wall`, `morgan_station`, `coffee`, `door_exit`
- Room bounds: floor ~12×10 units; spawn near door; desk opposite wall

- [ ] **Step 1: Implement `Hotspot`**

R3F group with position, radius, label; reports proximity when player distance < radius; highlight when nearby.

- [ ] **Step 2: Implement `PlayerController`**

- Pointer lock optional; also support drag-to-look without lock for younger users.
- WASD / arrows move on XZ; collide with AABB list (desk, walls).
- Click floor (raycast y≈0) → straight-line walk toward point until blocked.
- Call `onMove(position)` each frame for proximity.

- [ ] **Step 3: Implement `SocRoom`**

Composed primitives (no external GLTF required for PR1): floor, walls, player desk+dual monitors+chair, alert wall bank, Morgan desk silhouette, coffee table, exit door frame. Night lighting: amber key, cool monitor emissives, soft fill. Wire five hotspots.

`onInteract(hotspotId)` when E pressed or Interact button while nearby.

- [ ] **Step 4: `RoomCanvas`** wraps `<Canvas>` + `SocRoom`; export for dynamic `import()`.

- [ ] **Step 5: Manual sanity via `pnpm --filter @sim/web typecheck` (unit tests mock this layer).

- [ ] **Step 6: Commit**

```bash
git commit -m "feat: add walkable SOC room with hotspots"
```

---

### Task 4: Computer overlay + SpatialShell

**Files:**
- Create: `apps/web/src/world/ComputerOverlay.tsx`
- Create: `apps/web/src/world/SpatialShell.tsx`
- Modify: `apps/web/src/styles.css`
- Modify: `apps/web/test/world.test.tsx`

**Interfaces:**
- Consumes: `ModeProps` (`view`, `onAction`), `reduceSpatialEvent`
- Produces: `SpatialShell({ view, onAction, guided?, onAskManager? })`

- [ ] **Step 1: Test SpatialShell phase buttons with mocked room**

Mock `RoomCanvas` as a div with buttons that fire interact callbacks so jsdom never loads WebGL:

```tsx
vi.mock("../src/world/RoomCanvas.js", () => ({
  RoomCanvas: ({
    onInteract,
  }: {
    onInteract: (id: string) => void;
  }) => (
    <div>
      <button type="button" onClick={() => onInteract("desk_player")}>
        Sit at desk
      </button>
      <button type="button" onClick={() => onInteract("door_exit")}>
        Exit room
      </button>
    </div>
  ),
}));
```

Assert: map → enter SOC → sit → Focus desk shows WorkSurface heading → stand/exit returns to map.

- [ ] **Step 2: Implement ComputerOverlay**

- `seated_monitor`: bezel frame + compact guidance (“Focus desk to work”) + primary CTA Focus desk + Stand.
- `focus_desk`: full `WorkSurface` + sticky “Leave desk” control that dispatches `stand`.

- [ ] **Step 3: Implement SpatialShell**

```ts
// phases:
// floor_map → FloorMap
// room_walk → Suspense RoomCanvas + HUD (nearby label, Interact, Floor map)
// seated_monitor | focus_desk → ComputerOverlay (+ dimmed/frozen room optional)
```

Hotspot handling:
- `desk_player` → `sit_desk`
- `door_exit` → `leave_room`
- `coffee` / `alert_wall` → `set_flavor` short message
- `morgan_station` → `set_flavor` (“Ask Morgan from Team chat at your desk”) for PR1

- [ ] **Step 4: Styles for overlay bezel, HUD, leave-desk**

- [ ] **Step 5: Tests pass + commit**

```bash
git commit -m "feat: add hybrid monitor and focus-desk spatial shell"
```

---

### Task 5: Wire App surfaces + update existing tests

**Files:**
- Modify: `apps/web/src/index.tsx`
- Modify: `apps/web/src/components/shell.tsx` (briefing CTA → floor map)
- Modify: `apps/web/test/app.test.tsx`
- Modify: `apps/web/src/styles.css` if needed

**Interfaces:**
- Replace work-mode `dashboard` path with `SpatialShell` after briefing.
- `activeSurface`: `"briefing" | "spatial" | "manager"` (or keep dashboard as spatial).
- Structured mode: render `AccessibleMode` directly (skip SpatialShell).
- Tutorial: still show Tutorial + SpatialShell in work mode so practice includes map → desk.

- [ ] **Step 1: Update App**

After “Sit down at the desk” / briefing open → `activeSurface = "spatial"`.  
Work mode + spatial → `<SpatialShell ... />`.  
Accessible → `<AccessibleMode ... />` (no map).  
Manager overlay unchanged; return → spatial.

- [ ] **Step 2: Fix app.test.tsx selectors**

- Skip practice → briefing → Sit down → expect floor map heading / SOC button.
- Manager test: from spatial, use Structured mode OR mock path that reaches ask_manager without WebGL (prefer switch to Simple list after entering spatial, or start accessible).
- Prefer: after sit-down, click “Simple list” mode to exercise manager flow without Canvas, **or** mock RoomCanvas globally in app tests.

Recommended: in `app.test.tsx`, mock `RoomCanvas` like world tests; after sit down, click Enter SOC → Sit at desk → Focus desk → then Team chat / ask manager as today.

- [ ] **Step 3: Run full suite**

```bash
cd /Users/zaid/personal-projects/Careerexpo/.worktrees/career-sim-beta
pnpm test && pnpm --filter @sim/web typecheck && pnpm --filter @sim/web build
```

Expected: all green.

- [ ] **Step 4: Commit**

```bash
git commit -m "feat: route desk mode through map and SOC spatial shell"
```

---

### Task 6: Polish pass for first-feel + verify

**Files:**
- Modify: `apps/web/src/world/rooms/SocRoom.tsx` (lighting/prop density)
- Modify: `apps/web/src/world/FloorMap.tsx` (marker walk animation)
- Modify: `docs/superpowers/specs/2026-08-06-map-room-hybrid-computer-design.md` status → Implemented (PR1)

- [ ] **Step 1:** Ensure ≥2 non-desk hotspots visible with labels when nearby.
- [ ] **Step 2:** Ensure Focus desk remains the readable WorkSurface (no tiny 3D text for work).
- [ ] **Step 3:** Full verify commands from Task 5.
- [ ] **Step 4: Commit**

```bash
git commit -m "polish: SOC room presence and map travel feel"
```

---

## Spec coverage checklist

| Spec requirement | Task |
|---|---|
| 2D map travel, halls map-only | 2 |
| Walkable detailed SOC room | 3 |
| Multiple room aspects / hotspots | 3–4 |
| Hybrid monitor → Focus desk | 4 |
| Structured mode skips spatial | 5 |
| No evidence from movement | 1, 4 (presentation-only reducer) |
| R3F deps, lazy/mock Canvas for CI | 1, 4–5 |
| SOC only; others greyed | 2 |
| Defaults: AABB, HTML overlay, click-to-walk, alert flavor | 3–4 |

## Execution note

User directed: do not pause for preference questions. Execute this plan inline in the current session (executing-plans), commit per task, and only surface a choice when the vertical slice is fully done.
