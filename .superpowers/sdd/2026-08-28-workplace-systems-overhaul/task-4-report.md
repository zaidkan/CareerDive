# Task 4 Report: Finite Break-Room Interaction Loop

## Outcome

Implemented Task 4 only. The web workplace now renders energy and finite break-room resources exclusively from canonical `view.workplace`, submits bounded fridge/snack/coffee interactions through the public workplace handler, updates from the returned canonical view, and keeps carried snack bites usable at the workstation. The old wall-clock drain, collapse/refill overlay, global energy store, infinite snack/coffee restore path, and aisle snack hotspot are removed.

Implementation commit: `bd1a7be4d2f58f4f63105451b563e9bf464aa709` (`feat: build finite break room loop`)

## RED-GREEN-REFACTOR record

### RED

Break-room and layout tests were added before production edits. The requested package-local path resolved correctly, so no root-relative fallback was needed:

```text
pnpm --filter @sim/web exec vitest run test/break-room.test.tsx test/soc-layout.test.ts
```

The initial run exposed a floor-map timing issue in the new test harness. After replacing only that navigation delay with a direct test double, the same package-local command produced the decisive RED result: 9 failed and 15 passed tests. Failures showed that the aisle `snack` hotspot still existed, canonical energy `37` rendered as the presentation singleton's `100`, fridge/resource controls were absent, carried bites were unavailable at the desk, coffee had no canonical transitions or unavailable reason, zero energy had no recovery direction, and break-room exit submitted no `close_fridge` interaction.

### GREEN

After the minimal canonical state mapper, HUD controls, layout changes, handler wiring, and prop-state threading:

```text
pnpm --filter @sim/web exec vitest run test/break-room.test.tsx test/soc-layout.test.ts --reporter=dot
```

Passed 24/24 tests across 2 files.

### REFACTOR and final verification

- Added an App-level regression proving `performWorkplaceInteraction` replaces the displayed view with the returned canonical energy and fridge state; the focused break-room/layout/App set passed 38/38 tests.
- `pnpm --filter @sim/web test` — 118/118 web tests passed across 13 files.
- `pnpm test` — 208/208 repository tests passed across 26 files.
- `pnpm --filter @sim/web typecheck` — passed.
- `pnpm --filter @sim/web lint` — passed.
- Prettier check for every touched web source and test file — passed.
- `git diff --check` — passed.

## Files

- `apps/web/src/world/breakRoom.ts` — maps canonical fridge, carried snack, coffee, and energy state to one primary interaction or an explicit unavailable reason.
- `apps/web/src/world/BreakRoomPanel.tsx` — renders the canonical energy meter, finite resource controls, exact bite labels, and zero-energy recovery direction.
- `apps/web/src/world/SpatialShell.tsx` — removes presentation energy/sleep state, submits workplace interactions, keeps snack controls at the desk, and deduplicates pending fridge-close submissions on room/SOC exit.
- `apps/web/src/index.tsx` — wires the public workplace handler to the client and applies the returned canonical view.
- `apps/web/src/world/RoomCanvas.tsx`, `apps/web/src/world/rooms/SocRoom.tsx`, and `apps/web/src/world/rooms/GlassBreakNook.tsx` — thread canonical workplace state into the room and detect the break-room exit threshold.
- `apps/web/src/world/props/kitchen.tsx` — adds the damped canonical fridge door/stock visuals and stage-gated coffee hotplate/steam with existing reduced-motion handling.
- `apps/web/src/world/rooms/socLayout.ts` and `apps/web/src/world/worldTypes.ts` — remove the aisle snack hotspot and add reachable fridge/coffee/Jules break-room hotspots.
- `apps/web/src/styles.css` — styles the compact resource controls and removes the destructive sleep overlay.
- `apps/web/src/world/energy.ts`, `apps/web/test/energy.test.ts`, and `apps/web/test/world-sleep.test.tsx` — deleted obsolete wall-clock energy and collapse behavior.
- `apps/web/test/break-room.test.tsx` — covers canonical energy, fridge flow, exact bite labels, deterministic coffee stages, unavailable reasons, zero-energy recovery, and duplicate close prevention.
- `apps/web/test/soc-layout.test.ts`, `apps/web/test/world.test.tsx`, and `apps/web/test/signage.test.ts` — remove aisle snack expectations while preserving navigation, reachability, and workstation behavior.
- `apps/web/test/app.test.tsx` — verifies the public interaction request and canonical returned-view replacement.

## Self-review

- Every displayed energy, stock, bite, serving, open/closed, and coffee-stage value is derived from `view.workplace`; there is no local resource counter, animation-frame drain, sleep timer, auto-refill, or global energy singleton.
- The fridge shows stock only while open and nonempty. Taking is offered only with empty hands and remaining stock; manual close remains available, and leaving the break-room threshold or SOC submits `close_fridge` once while a close is pending.
- A carried bar remains visible and actionable in both walking and desk HUDs. Labels distinguish 3, 2, and 1 bites, and every enabled click submits `eat_snack_bite`.
- Coffee exposes only the canonical next step for `idle`, `brewing`, `ready`, or `poured`. Brewing never advances on elapsed real time, and depleted/full-energy states explain why the action is unavailable.
- Fridge door damping and stock meshes consume canonical state. Coffee steam renders only for `ready`/`poured`; the existing ambient-motion hook suppresses motion for reduced-motion users.
- Zero energy leaves the workstation and progress intact and points toward finite recovery resources instead of showing a collapse overlay.
- Keyboard `E`, pointer controls, floor-map navigation, fullscreen controls, desk login/workstation behavior, hidden floor-map state, and the existing non-deterministic Jules interaction remain intact. Deterministic Jules dialogue, Desk OS coordination, and navigation recovery were not implemented.
- The SDD ledger was not edited, and no subagent or reviewer was used.

## Concerns

- Spatial web tests continue to print the pre-existing `THREE.WARNING: Multiple instances of Three.js being imported` warning; all affected tests pass.
- General cross-surface mutation coordination remains intentionally deferred to Task 6. Task 4 only guards its resource buttons and duplicate fridge-close submission path.
