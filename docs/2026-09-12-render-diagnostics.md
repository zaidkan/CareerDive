# Local rendering diagnostics

Enable with `?graphics=1` on the development web URL, then enter the SOC. Remove the query and reload to disable. The observer is lazy-loaded only in development. It sends nothing to a server and does not read simulation state.

Shows rolling (maximum 300 frames) mean FPS, p95/max frame interval, average draw calls/triangles across render passes, and Three.js geometry/texture counts. Resource counts are not bytes. Frame intervals are not GPU timings. Samples warm up for two seconds and reset on visibility, seated/walking, or quality-mode changes. The observer temporarily disables renderer counter auto-reset to include every pass, reads/reset counters before the next frame, and restores the setting on unmount. UI updates at most once per second; there is no automatic live-region announcement.

## Initial observation

September 12, local development build, Codex in-app browser, stationary SOC entrance, walking mode, DPR 1, effects on, 300 samples:

- 59.8 FPS; p95 interval 17.6 ms; maximum interval 31.9 ms.
- 824 average draw calls; 39,482 average rendered triangles per frame.
- 912 geometries; 40 textures allocated according to Three.js counters.

This is one observed window, not an isolated benchmark or before/after improvement. Other local processes/browser activity can affect timing. High draw-call count makes batching repeated static props a candidate for the next controlled experiment; this sample alone does not prove the CPU/GPU bottleneck.

## Repeatable follow-up

1. Use the same browser, window size, power mode and build; close other simulation tabs.
2. Let each position/mode settle, then capture a full 300-frame window: entrance, player desk, break nook, and seated desktop.
3. Record mode/DPR/effects alongside numbers. Do not compare high/low quality as equivalent scenes.
4. Change one repeated prop family, preserving visual shape/materials/interaction bounds. Compare draw calls and frame intervals on the same route.
5. Re-enter/unmount the room repeatedly to check that resources stabilize. Inspect shadows and transparent surfaces after batching.

Verification: metric calculation/opt-in/bounded storage and renderer cleanup have automated tests. Live observer rendered and supplied the snapshot above. Full baseline suite plus these additions: 287 tests. Close-up checks and a controlled before/after optimization run remain outstanding.
