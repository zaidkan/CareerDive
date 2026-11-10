# Movement comfort and render-load checkpoint

> **Supersession (2026-09-22):** “Desk only presentation” in verification below is historical peer-mode wording; superseded by the single-experience plan (`docs/planning/desk-os-audit/DESK_OS_OVERHAUL_PLAN.md`). Movement/input fixes remain valid.

User requested reliable looking, less tilt, one fast pace, no Shift sprint or double-click travel, and reduced lag.

## Changes

- `lookControls.ts` separates browser input from simulation/controller state. Pointer lock remains available; held-left-button drag provides fallback when unsupported or rejected. Handles synchronous failures, promise rejection, blur, release, cancellation, and listener cleanup.
- PlayerController removes strafe roll and uses the former sprint speed (2.96 world units/second) for ordinary normalized WASD/arrow movement. No Shift modifier or click-to-travel target remains. Existing collisions and reduced-motion bob handling remain.
- Input clears on blur, disable, seating, and pointer unlock; typing in ordinary form fields does not add movement keys. Input listeners no longer reinstall when a spawn-array reference changes.
- Removed the floor double-click raycast/listener and updated visible controls.
- Canvas and adaptive quality both use DPR 1, rather than supersampling up to 1.25. At the prior high-quality resolution this reduces buffer pixel count by 36%; it is not a measured FPS improvement. Existing adaptive effects/shadow reductions remain.

## Verification and limits

- 277 tests across 41 files pass, including pointer-lock rejection fallback, locked relative movement, cleanup/blur, level strafe camera, default fast movement, and Shift speed parity.
- Browser smoke check entered the office and changed the view through dragging; restored the user's prior Desk only presentation afterward. Not a full cross-browser pointer-lock or GPU benchmark.
- No canonical timing, energy, evidence, privacy, or career-pack changes.
- Separate independent review found no correctness blockers in the scoped movement/render diff.

Run lint, typecheck, and build before committing. The existing 3D bundle-size warning is unrelated and remains a future optimization target.
