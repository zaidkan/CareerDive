# First measured batching pass: chair bases

Solo implementation on experimental. `ChairBase` groups five wheel spheres and five spokes into two InstancedMesh batches per chair. Instance matrices are uploaded on mount, with an explicit bounding sphere for frustum culling. Original dimensions, nested transforms, materials, and shadow flags are preserved. No per-frame animation loop, lights, collision, gameplay, or evidence changes.

## Observed comparison

Same stationary SOC entrance, local development browser, walking, DPR 1, effects on, 300-frame windows. Before is the immediately preceding diagnostics checkpoint; after is this implementation, not a simultaneous isolated A/B test.

| Measurement | Before | After |
| --- | ---: | ---: |
| Mean draw calls/frame | 824 | 776 |
| Mean triangles/frame | 39,482 | 39,481 |
| Geometry resources | 912 | 848 |
| Texture resources | 40 | 40 |
| Mean FPS | 59.8 | 60.0 |
| p95 frame interval | 17.6 ms | 17.6 ms |

About 5.8% fewer observed draw calls. Triangle-count variation of one is negligible in an animated scene. Both samples are near 60 FPS; this does not establish an FPS improvement. Resource counts include renderer-managed objects/passes, not only authored meshes. Broader moving-camera and low-quality measurements remain necessary.

## Verification

- Tests compare all wheel/spoke matrices against the original group transforms, check bounds/update flags, verify two batches with five instances each, and preserve the 400-triangle wheel budget.
- Full suite: 288 tests across 46 files passed. Web lint and production build passed; large 3D bundle warning remains.
- Live entrance screenshot and diagnostics confirmed appearance and the measurements above. Close-up/break-room and full-shift manual verification are not claimed.

Next candidate: repeated static desk/partition or ceiling components. Keep separate materials and shadow behavior; measure one family at a time before expanding batching.
