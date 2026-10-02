# Public scroll motion completion pass

Branch: `worker/public-motion-scroll-final`
Exact base: `7e3083de81f7f0934cca382bbcd06ddedc2cbb53`.
Scope: public frontend motion, browser tests, this QA report. No dependencies added.

## Preserved

Hero shelf, five layered careers, finite introduction, drag/swipe, keyboard selection, headline entrance, reduced-motion hero geometry, CTA/link microinteractions, availability semantics, existing copy and media. Debrief width, enlarged crop, tighter composition and FAQ spacing retained. No backend, simulation, analytics or deployment changes.

## Motion and classification

- Workplace: **scroll-linked** image scale .94→1, y 52→0px, opacity .75→1. Untransformed wrapper measures arrival from its top at 95% viewport to 35%; clamped final state. Caption: **viewport-triggered**, 28px/opacity arrival, 120ms delay.
- Real Work: heading and supporting statement **viewport-triggered**, 28px/opacity, 520ms, support delayed 120ms. Primary artifact **scroll-linked**, .96→1 scale, 48→0px, opacity 0→1. Alert plus one supporting record only, manual evidence controls unchanged.
- How a shift works: section **viewport-triggered**. Steps **scroll-linked** over list top at 75% viewport to list bottom at 35%. Prepare→Decide→Pass it on emphasis; active opacity 1/scale 1/y 0, other steps opacity .52/scale .965/y 18px. No sticky/carousel.
- Handoff: copy **viewport-triggered**, 28px/opacity, 520ms. Single artifact **scroll-linked**, .97→1 scale, 32→0px, opacity 0→1.
- Different Careers: heading **viewport-triggered**; panels **scroll-linked**. Native sticky chapter, viewport plus 1600px desktop runway; viewport plus 1000px below 834px. Scroll progress continuously maps 0→4 across Cyber/RN/Mechanical/Electrician/Lawyer; previous panel recedes toward scale .92/y -46px, incoming panel advances from scale .96/y 64px, opacity 0→1→0, no rotation. Active information/CTA switches at nearest career interval. React state updates only at interval boundaries; transforms remain motion values. Manual choice animates shared progress over 420ms and holds until scroll enters another interval; resumed scroll cancels manual animation. Scroll reversible. Stable grid reserves all panels' footprint. Mobile uses compact cue buttons with full accessible names and smaller artifact crops.
- Debrief: heading/support **viewport-triggered**, 28px/opacity, support delayed 120ms. Existing enlarged artifact **scroll-linked**, .94→1 scale, 60→0px, opacity 0→1. Stable final state.
- FAQ/finale: **viewport-triggered** modest shared entrance. Existing accordion/link treatment untouched; footer unchanged.
- Hero: preserved mount-triggered headline and finite/manual shelf interaction, not scroll-linked.

Shared entrance increased 16→28px, 440→520ms, viewport amount .12→.2; once-only, visible baseline, missing IntersectionObserver fallback preserved. No optional blur/gooey/glow effect.

## QA executed

- `pnpm typecheck`: pass (11 packages).
- `pnpm lint`: pass (11 packages); final added recording tests also passed web lint.
- `pnpm test`: 115 files passed, 2 skipped; 806 tests passed, 9 skipped.
- `pnpm build`: pass (10 packages). Existing >500kB warning remains; public entry approximately 549.5kB minified / 165.0kB gzip.
- `pnpm check:product-contract`: pass.
- `git diff --check`: pass.
- Public Chromium browser checks: 27 passed together (20 width/theme/preference combinations, preserved hero/secondary-page smoke, 6 new continuous motion/reduced tests). After final motion-value cancellation/state optimization, 6 continuous tests passed again. Two normal/slow native-wheel video tests passed separately: total 29 distinct passing browser cases.
- Widths: 1366, 1280, 834, 390, 320; dark/light; standard/reduced. Mobile touch hero swipe, keyboard browsing, disabled Taking shape CTA, backward/forward navigation, reversible career order, sticky viewport bounds, all four artifact transform ranges and sequential step emphasis covered.
- First pass exposed sticky viewport-fit failures at 1366/1280/320; corrected artifact sizing/mobile typography and bottom clearance. Confirmation matrix passed.
- CLS maximum across 20 matrix samples: **0.01963709606388963** (<.05). Horizontal overflow: none. Browser runtime errors: none.

## Evidence and visual acceptance limitation

Local, ignored evidence (not committed):
- `test-results/public-scroll/{1366,390}/`: four arrival frames per artifact, career frames 0–4, numeric frame samples.
- `test-results/public-scroll-video/{1366,390}/`: WebM recordings of normal (280px wheel increments) and slow (80px increments) scroll through Workplace, careers and Debrief.
- `test-results/public-motion/`: matrix screenshots and CLS/runtime/overflow JSON.

Chromium samples demonstrate continuous—not threshold-only—movement: workplace intermediate scale .949556/y 43.7185→.972556/y 23.7852→1/0; debrief .950111/y 49.8889→.973111/y 26.8889→1/0. Careers progress both forward and backward and resume after manual selection.

**Owner visual acceptance remains pending.** This tool environment returns screenshot base64 rather than inspectable images. Browser scrolling and transform/state assertions were executed, and videos/frame sequences captured; no human/pixel visual review was completed. Do not treat passing tests as owner visual approval. Orca embedded browser synchronous style sampling initially showed stale starting transforms until requestAnimationFrame; Chromium assertions after rendered frames passed. Safari/WebKit visual behavior requires dedicated confirmation.

## Reduced motion

No scroll transform choreography, no sticky runway, no intro autoplay; static readable steps and immediate manual career browsing. Keyboard access, selected states, availability, focus treatment retained. No information depends on animation.

## Remaining risks

- Owner normal/slow visual signoff is required before calling this task visually accepted.
- Safari/Firefox, real-device browser chrome and unusually short viewports not certified by Chromium matrix.
- During depth transitions adjacent artifact/copy layers overlap briefly; professional quality must be judged from recordings by owner.
- Existing public bundle warning remains. No new motion libraries or decorative loops.

No backend changed. No simulation changed. No deployment performed. No merge performed. Unrelated pre-existing untracked scripts/screenshots/planning document excluded.
