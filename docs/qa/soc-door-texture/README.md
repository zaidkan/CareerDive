# SOC exit-door review

Base: `6179019` (`worker/blind-audit-remediation-final`). Branch: `fix/soc-door-texture`.

Only the exit-door assembly in `SocRoom.tsx` changes. The backing now spans the full wall height, overlaps each side of the opening by 20 cm, and extends 5 cm below the floor and above the wall. Its front is 5 cm behind the leaf's back. The leaf and jambs have separate faces, and the header meets the jambs without intersecting them. The opaque oak-colored finish stays smooth; the handle is now on the room-facing side, and the EXIT label has 15 mm clearance from its plaque.

The leaf's room-facing depth stays at world Z=7.15. Hotspots, interaction callbacks, player clamps, collision/reachability definitions, simulation state, and arrival flow are unchanged.

## Captures

- [Entry view](entry.png): actual `PLAYER_SPAWN` position `[0, 1.6, 4.6]`, looking back toward the exit door at `[0, 1.25, 7.2]`.
- [Oblique view](oblique.png): position `[-2, 1.6, 5.2]`, looking at the same door.
- [Capture metadata](capture-metadata.json): all five inspected views, browser version, and render settings.

These are direct Chromium screenshots of the existing `/fixtures/product-media.html` fixture rendering the current `RoomCanvas` and `SocRoom`, with the canonical initial world view (seed 7). The normal continuous render loop, lighting, effects, and adaptive quality remain enabled. Entry and left-oblique captures retained a shadow-casting light. No screenshot edits or generated imagery were used.

The owner's referenced screenshots were not available in this session. The old geometry did not visibly reproduce garbling in headless Chromium, so this verifies the revised assembly, not a reproduction on the owner's GPU. The original assembly had intersecting leaf/backing volumes and overlapping frame faces; the revised geometry removes those intersections and gives the opening a larger continuous seal.

## Validation

An actual-scene raycast scan sampled the 2.2 m opening at 5 cm intervals across its full height from entry, both oblique positions, the closest allowed player Z=6.9, and an exterior inspection position. All 15,525 rays hit an opaque, depth-writing door box before reaching the far plane of the seal; none were clipped by the camera near plane. All eight door box meshes were opaque. Leaf/backing bounds were disjoint with a 5 cm gap. See [results](seal-check.json).

`pnpm lint && pnpm typecheck && pnpm test && pnpm build` passed. `soc-layout.test.ts` passed all 23 tests. The full suite passed 1,074 tests; 13 tests were skipped, including database integration tests that require configured test database URLs. No database code changed.
