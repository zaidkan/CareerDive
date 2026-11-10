# SOC Room Rebuild Spec — match the arrival film (CareerDive)

Reference assets (visual source of truth): `apps/web/reference/arrival-film/arrival-film.mp4` + `final-frame.png`.
Goal: re-dress + re-lay-out the Security Operations room so entering the sim feels continuous
with the 8.8s arrival film. **Same simulation, new room set.** No logic/content/scoring changes.

Grounded in the real files (already read): `apps/web/src/world/rooms/socLayout.ts`,
`SocRoom.tsx`, `collision.ts`, `navigation.ts`. All coordinates below are in that system:
**+X = east/right, −X = west/left, +Z = south (toward entry), −Z = north (far wall).**
Room: `ROOM.halfX = 10.9`, `ROOM.halfZ = 7.4`. Player capsule radius 0.32; `CLAMP {x:10.2, z:6.9}`.

---

## 0) Key insight — the camera orientation ALREADY matches the film

Today the player spawns at `PLAYER_SPAWN = [0, 1.6, 6.6]` (south) looking **north (−Z)**, with the
**player desk EAST (`COL.east = 3.8`)** = on the **right**. The film also enters with **desks on the right**.
So the view axis is correct. The rebuild is therefore mostly: (a) swap which walls are glass vs clutter,
(b) add the `04` partition + credenza + plant on the left, (c) nudge spawn slightly forward, (d) restyle
materials. Reachability test `test/soc-layout.test.ts` must stay green throughout.

---

## 1) Wall / perimeter assignment (film-derived)

| Side | Sim axis | Film shows | Action |
|---|---|---|---|
| LEFT | west, `x ≈ -10.9` | frosted glass partition + black mullions, plant in front | NEW frosted-glass curtain wall; relocate current west clutter (server racks, Samir desk, storage) |
| FAR / FRONT | north, `z ≈ -7.4` | dark-framed city glazing (spandrel band) | City window wall with depth/parallax view behind desks |
| RIGHT | east, `x ≈ +10.9` | bright city glazing alongside desks | City window wall (continuation) |
| NEAR-LEFT (free-standing) | `x ≈ -2`, `z ≈ -1` | `04 SECURITY OPERATIONS` cream pony-wall + wood-slat accent + low credenza | Free-standing partition jutting in, room continues behind/right of it |
| ENTRY | south, `z ≈ +7.4` | elevator doorway (film) / floor-map door (sim) | Keep `door_exit`; spawn just inside |

The `04` wall is a **free-standing divider near entry-left**, NOT the back wall — desks wrap to its right.

---

## 2) Zone coordinates (build targets)

- **Frosted glass wall (LEFT):** panels along `x = -10.6`, from `z ≈ -6` to `z ≈ 5`, full height (~2.8m). Black mullions. Solid collider = west perimeter (already bounded by CLAMP; add explicit glass panel colliders flush to `x=-10.6`).
- **Large plant:** front-left, approx `[-8.5, 0, 4.0]` (in front of glass, near entry). Collider ~0.5m radius box.
- **`04` partition wall:** center around `[-2.0, 0, -0.5]`, facing +X/+Z (readable from entry). ~3m wide, ~2.6m tall, 0.2m thick. Wood-slat accent on its left edge. Collider = the wall box.
- **Credenza:** below/front of the `04` wall, approx `[-2.0, 0.45, 0.6]`, ~2.4m × 0.5m. Low collider.
- **City window walls:** north (`z = -7.25`) and east (`x = +10.6`). Depth/parallax view (see §4).
- **Desk cluster (RIGHT half):** keep player desk EAST and the existing cubicle grid, but shift the field to read as 2 clean rows on the right. Keep `PLAYER_DESK = [COL.east, 0, ROW.north]` as the player's seat (east/right, matches film). Morgan/hot desk may stay west-of-player but should not crowd the left glass — keep them in the right-center field, not against the left glass.
- **Relocate off the left:** server racks, Samir's wall desk, storage cabinets → move to the NORTH-WEST back corner behind the `04` wall / along the north wall where they don't block the hero left view or the entry reveal. Re-derive their colliders.
- **Break room (`GlassBreakNook`, Jules/coffee/fridge):** currently far east/SE. Keep it a back corner — move to **NE or SE back corner**, out of the entry hero shot. Owner suggested top-left but top-left is now the glass/plant hero zone, so use a BACK corner instead.

---

## 3) Spawn + handoff (owner's intent)

- **Spawn slightly forward of the door**, matching the film's final camera position (camera ends ~⅓ into the room).
  Change `PLAYER_SPAWN` from `[0, 1.6, 6.6]` to approx **`[0, 1.6, 4.6]`** (forward ~2m), still looking **north (−Z)**.
  Must be standable (`isStandable`) and clear of colliders. Update `SAFE_ANCHORS.entrance`/`aisle` if needed so
  nearest-standable still resolves cleanly.
- The player still walks from here to the desk — gameplay beat preserved.
- **Seamless fullscreen handoff** (film ends in fullscreen → sim starts in the SAME fullscreen, no un-fullscreen
  flicker): this is a SEPARATE front-end task (StartPage/ArrivalFilm), done AFTER this room rebuild. Not in scope here,
  but the spawn pose above is chosen to match the film's last frame so that handoff can be seamless.

---

## 4) The one genuinely-new graphics piece — depth windows

Current `OfficeWindow` (`props/building.tsx`) is a FLAT painted canvas texture — no parallax. The film's city
glazing needs apparent depth so it looks right as the player turns their head at the window.
- Build a layered/boxed exterior (skybox or 2–3 parallax layers or low-poly city) behind the north + east glazing:
  sun-up sky + soft clouds, downtown towers at varied distance, streets/streetlights/cars when looking down.
- Must respect `useWorldQuality` (LOW/MED/HIGH) and `prefers-reduced-motion` (simplify/freeze on LOW/reduced).
- No per-frame heavy work (sim-runtime perf pass just landed — don't regress). Prefer shared/static geometry.
- Not hyper-detailed; must read clearly and hold up across the player's look range.

---

## 5) Material palette (film)

floor = light oak/pale ash · walls = warm cream · slat accent = honey oak · frames/mullions = matte charcoal/black
· desks = soft white legs + light wood top · chairs = muted sage/dusty green · credenza = medium walnut.
Ceiling white + thin black linear pendants running front-to-back. Even, bright, modern light (not moody).

---

## 6) Keep identical (do NOT touch)

Sim logic, investigation flow, alerts/tickets/evidence, Desk OS, Morgan/Jules/handoffs, hotspot IDs + content
meaning, scoring/consequence, determinism. Hotspots may MOVE position (their anchors live in `socLayout.ts`) but
their IDs and meaning stay. Monitors keep showing the real Case-queue / Investigation-workspace UI.

---

## 7) File split for the worker

- **`socLayout.ts`** = all coordinates, colliders, hotspot anchors, spawn, `ROOM_COLLIDERS`. Every moved prop updates here.
- **`SocRoom.tsx`** = the JSX/props/materials (what's rendered where), reading positions from `socLayout.ts`.
- **`props/building.tsx`** = upgrade/replace `OfficeWindow` for the depth glazing; add frosted-glass-wall prop.
- **`rooms/SocLighting.tsx`** = brighter, even daytime light motivated by the glazing.
- **`test/soc-layout.test.ts`** = reachability guard — MUST stay green (every hotspot reachable, no stranded anchors).

## 8) Verify

`pnpm lint && pnpm typecheck && pnpm test && pnpm build` all green (reachability test included). Provide
screenshots: (a) entry/spawn view vs the film final frame, (b) the window at 2–3 look angles showing parallax.
Do NOT merge — leave the branch for owner playtest.

---

## HANDOFF

**Status:** Phases 1–3 are all done and committed on `feat/soc-room-film-match`. Verify is green
(150 test files, 1041 tests). Not merged; waiting on the owner's playtest. Nothing is in progress.

**As built, where it differs from this spec:**
- **Frosted glass:** an interior curtain wall at `x = −3.9` (`GLASS_SUITE`), not `x = −10.6`, which falls
  outside the spawn view. The `04` wall closes the suite's north end.
- **Break nook:** in the SE back corner (`BREAK_NOOK`). The east glazing stops at `z = 1.2` so the nook keeps a
  solid wall.
- **North glazing:** runs from `x = −0.4` to the NE corner; the back office keeps its solid wall. Both runs are
  in `GLAZING` in `socLayout.ts`. Collisions are unchanged, because the perimeter clamp treats glass as wall.
- **Pendants:** run along X, as in the film.
- **Depth windows:**
  - Real low-poly city geometry at true scale, 42 m below the office floor. `world/cityLayout.ts` is the pure
    plan (tested in `test/cityscape-layout.test.ts`); `props/cityscape.tsx` renders it.
  - Cost: 6 draw calls, with no per-frame CPU work beyond one time uniform.
  - The tier sets the radius, car count, trees and cloud detail.
  - Traffic and clouds freeze on LOW, under reduced motion, and while seated.
- **Camera and lighting:**
  - Camera `far` went 48 → 1200 to reach the city.
  - The sun light moved to `[11, 9, 2]` (low in the east).
  - `ContactShadows` now covers only the room footprint; the old 24 m plane hung outside the glazing.
- **Removed:** the flat `OfficeWindow` texture.

**Playtest focus:**
- The look from the north and east glazing, including looking down.
- LOW tier on a Chromebook-class device.
- Whether the frosted suite reads from spawn.
