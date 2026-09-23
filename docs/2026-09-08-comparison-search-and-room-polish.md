# September 8 checkpoint — comparison, guide search, room polish

> **Supersession (2026-09-22):** “Simple list” / mode-control references are historical peer-mode wording; superseded by the single-experience Desk OS plan (`docs/planning/desk-os-audit/DESK_OS_OVERHAUL_PLAN.md`). Tool/search behavior claims remain historical facts for their date.

## Completed

- Account-pattern comparison displays two inspected records, lets the player mark literal passages, and shows selected findings with source citations. Plain-language term disclosures explain unfamiliar vocabulary. The conclusion step remains a structured choice, not free-form investigation.
- Career-pack source metadata uses the existing server inspection gate. Regression tests reject submission before the required source is opened without mutating state.
- Shared GuideSearch filters public guide metadata locally; opening a guide still invokes the canonical interaction. It is available in desktop tools and Simple list, even without an active knowledge-base action. Search does not spend simulated time or reveal unopened record bodies.
- Mode controls now have explicit selected/focus styling. Removed a misleading empty-actions message under active tasks.
- Modular decorative headset, inbox, notebook, mug, napkin, supply, cup, and tea props sit on desk/table/counter surfaces. They are not new interactions, colliders, or shadow casters.
- SocLighting keeps four lights and the existing quality-controlled directional shadow. Office fill is cooler and the walking-mode warm accent is moved toward the break area. No performance gain is claimed.

## Verification

- Full suite: 273 passing tests, 39 test files.
- Lint, TypeScript checks, production build passed. Lighting tests rerun after adding an explicit React return type required by lint.
- Layout footprint tests and existing SOC reachability tests passed.
- Browser smoke check: practice onboarding entered the SOC and the room rendered; mode styling inspected. Not a full shift playthrough or close-up review of every prop.
- Production RoomCanvas chunk remains about 1,009 kB minified (269 kB gzip), with Vite's size warning. No GPU/FPS benchmark or measured player completion time.

## Resume next

1. Build the approved guided ticket-composition interaction, retaining deterministic scoring and source provenance rather than introducing arbitrary technical trivia.
2. Add reference-matching interaction and test prerequisite discovery across the intended player path.
3. Preserve active work when consulting Morgan; manually verify recovery and navigation across all three modes.
4. Playtest clarity and 10–15 minute pacing before adding further decorative density. Inspect prop placements close up and benchmark graphics separately.

The street/building arrival cutscene is a future concept, not part of this checkpoint. Existing sessions may retain older pack data; use a fresh session to inspect changed content. No deployment or database production-readiness claim.
