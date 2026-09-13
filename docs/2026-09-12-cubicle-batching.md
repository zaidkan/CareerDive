# Cubicle batching checkpoint

Implemented solo on experimental after chair batching. Each cubicle now uses two InstancedMesh batches instead of six individual meshes: three fabric panels share one batch, three matte rails share the other. Panels retain castShadow; rails remain non-shadow-casting. Unit-box instance scales preserve original geometry dimensions and UV mapping. Bounds and GPU matrices refresh when width/depth/height change. Outer position/rotation and canonical collision data are unchanged.

Verification: 290 tests across 47 files, web lint and production build passed. Tests verify both authored cubicle dimensions, all panel/rail matrices and bounds, batch counts, material tinting and shadow separation. Live entrance screenshot showed intact fabric, rails and placement.

## Measurement limitation

Live sample: walking, DPR 0.85, effects off, approximately 30.0 FPS, 552 draw calls, 27,148 triangles/frame, 827 geometry resources, 33 textures (184 samples at capture). The preceding chair checkpoint used DPR 1/effects on. These are **not comparable quality modes**; do not report 776-to-552 as a batching improvement or claim an FPS gain. Reason for the timing difference is not diagnosed. A matching-quality baseline/after run remains outstanding.

The code-level reduction is six meshes to two per cubicle (four fewer batches before visibility/shadow passes). Full-room draw-call reduction and sustained performance must still be measured in matching conditions. Large 3D bundle warning and close-up/moving-camera checks remain.

## Follow-up: matched comparison and desk check

Temporarily substituted only the pre-batching CubicleWalls function from `acc5ae8`, sampled the stationary entrance, then restored the committed batched function exactly. Same browser tab, walking mode, DPR 1, effects on, 300-frame windows after settling:

| Metric | Original cubicles | Batched cubicles |
| --- | ---: | ---: |
| Draw calls/frame | 775 | 759 |
| Triangles/frame | 39,480 | 39,494 |
| Geometry resources | 848 | 836 |
| Textures | 40 | 40 |
| FPS | 60.0 | 60.0 |
| p95 frame interval | 17.1 ms | 17.4 ms |
| Maximum interval | 17.8 ms | 17.7 ms |

This matching-quality check supports 16 fewer observed calls (about 2.1%), not an FPS improvement. Small triangle variation is consistent with animation and differing per-batch culling; no geometry detail was deliberately removed. Timing differences are too small and the test too narrow for a broad speed claim.

A temporary camera spawn near the player chair allowed visual inspection of panel/rail alignment and fabric close-up. Used normal Sit, entered the displayed practice credentials, confirmed the handoff email workspace loaded, then returned with Leave desk. This verifies those transitions, not the walking route or a full shift. All temporary source/camera changes were restored and `git diff --exit-code -- apps/web/src` passed. Six focused batching/furniture tests passed again. Break-nook close-ups, moving-camera checks, and prolonged resource stability remain outstanding.
