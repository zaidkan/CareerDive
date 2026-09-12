# Furniture refinement checkpoint

Follow-up to the September 11 graphics pass, implemented solo on experimental.

- Desk slabs no longer multiply their baked wood color by the same material color. The visible veneer now uses that shared wood texture too, instead of hiding it under a flat dark slab.
- Workstations use warm wood variants, muted metal bases, and readable blue-green fabric partitions. Fabric color is applied once. Top rails are matte rather than emissive, leaving bright markers for actual navigation cues.
- Chair upholstery and the break table have clearer material colors. Dimensions, placements, collision footprints, action IDs and simulation behavior are unchanged.
- Five wheel spheres per OfficeChair now use 8 by 6 segments rather than 12 by 12: verified geometry count drops from 1,320 to 400 triangles per chair. The four instances in SocRoom therefore remove 3,680 authored triangles before visibility/shadow passes. This is not an FPS or draw-call measurement; mesh counts remain unchanged.

Verification: three new regression tests failed against the old implementation and passed after changes. Full suite 283 tests across 43 files passed; web lint and production build (including TypeScript) passed. Browser practice entry and SOC entrance screenshot confirmed the new fabric/rail appearance. Close-up desk/break-room inspection and measured whole-scene frame-time profiling remain outstanding. The large lazy 3D bundle warning also remains. No subagents used.
