# Cubicle batching checkpoint

Implemented solo on experimental after chair batching. Each cubicle now uses two InstancedMesh batches instead of six individual meshes: three fabric panels share one batch, three matte rails share the other. Panels retain castShadow; rails remain non-shadow-casting. Unit-box instance scales preserve original geometry dimensions and UV mapping. Bounds and GPU matrices refresh when width/depth/height change. Outer position/rotation and canonical collision data are unchanged.

Verification: 290 tests across 47 files, web lint and production build passed. Tests verify both authored cubicle dimensions, all panel/rail matrices and bounds, batch counts, material tinting and shadow separation. Live entrance screenshot showed intact fabric, rails and placement.

## Measurement limitation

Live sample: walking, DPR 0.85, effects off, approximately 30.0 FPS, 552 draw calls, 27,148 triangles/frame, 827 geometry resources, 33 textures (184 samples at capture). The preceding chair checkpoint used DPR 1/effects on. These are **not comparable quality modes**; do not report 776-to-552 as a batching improvement or claim an FPS gain. Reason for the timing difference is not diagnosed. A matching-quality baseline/after run remains outstanding.

The code-level reduction is six meshes to two per cubicle (four fewer batches before visibility/shadow passes). Full-room draw-call reduction and sustained performance must still be measured in matching conditions. Large 3D bundle warning and close-up/moving-camera checks remain.
