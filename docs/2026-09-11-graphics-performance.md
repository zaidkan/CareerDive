# Office graphics and rendering checkpoint

Implemented on experimental; stable main is unchanged.

## Changes

- Retuned the existing four-light rig, with cooler office fill and warmer break-area accent. No additional lights.
- Reduced bloom intensity, blur levels, vignette, and grain. Preserved reduced-motion grain suppression.
- Refined wall/window/HVAC materials, neutral tile floor and ceiling, teal circulation/desk carpets, and a warm break-area carpet.
- Removed duplicate carpet overlays (five fewer scene meshes), and removed double color multiplication on carpet/wall textures.
- Wall texture memoization now depends on dimensions rather than fresh array identity. Wall/floor/carpet textures and monitor-owned texture clones are disposed when replaced/unmounted; shared cached monitor sources are not disposed by instances.
- Adaptive quality now handles sustained severe stalls instead of ignoring every slow frame, rejects non-finite samples, and avoids using seated performance to restore expensive walking effects.
- Fallback/seated WebGL resolution is 0.85 DPR; full mode remains 1. DOM desktop and accessibility text are unaffected. This reduces fallback pixel count by about 28%, not a measured 28% FPS gain.

## Verification

- Full suite: 280 tests across 42 files passed.
- Web lint and production build passed, including TypeScript checking. Fixed an interrupted worker's lighting-test type error during solo review.
- Live browser: entered practice, floor map, and SOC; inspected the rendered office from the entrance. This is not a complete shift playthrough or GPU benchmark.
- Large lazy 3D chunk remains (~1,009 kB minified, ~269 kB gzip).
- No backend, canonical action, evidence, resource, or privacy changes.

## Remaining work

This is a first graphics/performance refinement, not completion of every graphics overhaul. Profile draw calls/frame times on the target laptop before batching props or adding detail; inspect desks and break nook at close range; refine dark furniture and ceiling composition; validate walking/seated transitions and prolonged memory stability. Arrival cutscene remains explicitly deferred. Independent subagent review was interrupted by usage limits; resumed work was reviewed and verified by the parent alone at the user's request.
