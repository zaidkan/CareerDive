# Design: Map travel + detailed rooms + hybrid computer (Orwell-inspired presentation)

**Date:** 2026-08-06  
**Branch / worktree:** `feature/career-sim-beta`  
**Status:** Approved for planning (pending user review of this written spec)  
**Inspiration:** Presentation craft of *Orwell: Keeping an Eye On You* (sit at desk, enter computer, map-based travel, built rooms). **Not** Orwell’s story, surveillance fantasy, or “watch real people” mechanics.

---

## 1. Goal

Make Career Expo feel like a lightweight indie workplace game while keeping the deterministic simulation as the sole authority for rules, time, actions, and evidence.

Players should:

1. Travel between workplace areas on a **2D floor map** (hallways stay map-only, not graphically intense).
2. Enter a **detailed first-person room** and **walk around** (not only sit at one cubicle).
3. Interact with multiple room aspects (desk, team area, manager presence, ambient props).
4. Sit at a workstation and use a **hybrid computer UI**: tools appear on the monitor, then **Focus desk** expands to the existing readable DOM console.
5. Continue using **Structured mode** as a peer path that never requires 3D skill.

---

## 2. Non-goals (this phase)

- Photoreal graphics or AAA fidelity.
- 3D hallway corridors or open-world campus.
- Free-aim combat, stealth, or Orwell-style citizen surveillance.
- Avatars / character creators / multiplayer.
- Navigation skill, exploration completeness, or “time spent walking” as career evidence.
- Replacing server-owned world state with client-side game logic.
- Shipping every room fully interactive on day one.

---

## 3. Locked product decisions

| Decision | Choice |
|---|---|
| Travel between rooms | 2D floor map; avatar/head walks the path; halls are map-only |
| Inside a room | Detailed R3F first-person scene; player can walk around |
| Computer UI | Hybrid: monitor panel → Focus desk full overlay (`WorkSurface`) |
| Visual fidelity target | Higher-detail indie / stylized; night SOC lighting |
| Interaction progression | Sit/framing first, then expand hotspot → system wiring |
| First content slice | SOC floor room only; other map rooms greyed/locked |
| Accessibility | Structured mode skips map/room; same action IDs / scoring |
| Evidence | 3D presentation only; no evidence from walking or looking |

---

## 4. World structure

### Layers

```text
Floor map (2D travel)
    ↓ enter room
Room walk (R3F first-person)
    ↓ sit at workstation
Seated monitor panel (hybrid)
    ↓ Focus desk
Existing WorkSurface / tools / guidance
```

### Rooms

- **SOC (v1 unlocked):** walkable workplace with more than the cubicle — e.g. player desk + chair, secondary monitor/alert bank, Morgan’s station (presence), coffee/side prop area, door back to map.
- **Future (map-visible, locked):** break room, manager office, other floors — greyed with short “not open this shift” copy.

### Hotspots (SOC v1)

| Hotspot | v1 behavior |
|---|---|
| Player chair / desk | Sit → hybrid computer → existing sim tools |
| Alert wall / shared monitors | Flavor + optional jump to Alerts system if sim allows |
| Morgan station | Flavor / open Team chat when legal; manager overlay unchanged |
| Coffee / ambient props | Flavor only |
| Door / exit | Return to floor map |

---

## 5. Player flow & controls

### Session surfaces (web)

```text
briefing → floor_map → room_walk → seated_monitor → focus_desk
         ↘ manager overlay (existing)
         ↘ structured mode (peer; skips spatial layers)
```

Tutorial should guide: open map → enter SOC → walk to desk → sit → one practice action → Focus desk as needed.

### Room controls

- Move: WASD / arrows.
- Look: mouse / drag (touch-friendly).
- Optional: click-to-walk on floor for younger / less FPS-comfortable users.
- Interact: **E** / tap when near a hotspot.
- Leave room: Esc or Floor map control → 2D map.
- Leave desk: Stand / Leave desk → walk mode.

### Sit / Focus desk

1. Approach chair → Interact.
2. Camera settles on monitors (seated).
3. **Monitor panel** shows a compact view of the active system / guidance CTA.
4. **Focus desk** expands to full `WorkSurface` (readable DM Sans UI, guided next step).
5. Standing exits Focus desk then chair.

### Audio (optional, later in same epic or follow-up)

Soft footsteps, chair settle, UI beeps; global mute; respect reduced motion where applicable. Not required for first PR merge.

---

## 6. Simulation contract

- Client still receives `ClientView` and submits typed `performAction` intents.
- Spatial UI may only:
  - Change presentation state (map / room / seated / focus).
  - Focus a work system tab (`email`, `alert_dashboard`, etc.).
  - Trigger the same `AvailableAction` IDs as the DOM UI.
- Spatial UI must not:
  - Invent actions, facts, deadlines, or outcomes.
  - Record evidence for exploration, camera aim, or movement speed.
- Structured / accessible mode remains a peer renderer with identical legal actions.

---

## 7. Technical architecture

### Dependencies (`apps/web`)

- `three`
- `@react-three/fiber`
- `@react-three/drei`
- Collisions: simple AABB / `@react-three/rapier` (choose during implementation plan; prefer the lighter option that keeps walk stable)

Lazy-load the room Canvas so Structured mode and most unit tests do not require WebGL.

### Proposed modules

```text
apps/web/src/world/
  FloorMap.tsx
  rooms/SocRoom.tsx
  PlayerController.tsx
  Hotspot.tsx
  ComputerOverlay.tsx
  worldTypes.ts
```

Existing `components/WorkSurface.tsx` remains the Focus desk body. `App` gains presentation phase state for map/room/seated/focus without moving sim authority to the client.

### Art approach

- Stylized modular meshes (in-repo GLTF and/or composed primitives), night SOC palette (amber task light, cool monitor glow).
- Upgradeable assets behind stable hotspot IDs (`desk_player`, `morgan_station`, …).
- No reliance on third-party narrative game assets.

### Testing

- Keep DOM / action-id parity tests.
- Add shallow tests for presentation phase transitions (map → room → seated → focus) with mocked Canvas where needed.
- Do not require GPU in CI for core sim tests; gate WebGL smoke as optional/local if needed.

---

## 8. First PR vertical slice

Must ship:

1. Install R3F stack in `apps/web`.
2. Floor map with SOC unlocked; other rooms greyed.
3. Walkable SOC room (desk, chair, ≥2 non-desk hotspots, exit).
4. Sit → monitor panel → Focus desk → existing guided console.
5. Leave desk / return to map.
6. Structured mode still skips spatial layers and works.
7. Lint / typecheck / tests / build green.

Explicitly out of first PR:

- Additional fully built rooms.
- 3D hallways.
- Full sound pack.
- Every prop interactive.
- Polished multi-NPC schedules.

---

## 9. Success criteria

- A new player feels they **arrived at work**, **moved through a workplace**, and **sat down at a real computer**, not a quiz dashboard.
- Computer work remains readable (Focus desk) for younger explorers.
- Simulation determinism, evidence rules, and accessibility peer path remain intact.
- Roadmap alignment: graphics stay a renderer over the pack-driven core.

---

## 10. Open implementation choices (resolve in plan, not product)

- Rapier vs manual colliders.
- Exact monitor-panel chrome (HTML overlay vs CSS3D vs texture).
- Click-to-walk pathfinding fidelity in v1 (straight-line vs navmesh).
- Whether alert-wall hotspot opens Alerts in v1 or stays flavor-only.

Defaults if unspecified during planning: **manual/simple colliders**, **HTML overlay for monitor + Focus desk**, **straight-line click-to-walk**, **alert wall flavor-only in PR1**.
