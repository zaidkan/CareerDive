# Public motion launch final

Branch: `worker/public-motion-launch-final`
Base / HEAD: `2e04a4b24a7a7ef0412563117244644f3a557556`
Changes remain uncommitted; no merge, deployment, backend or simulation changes.

## Historical source

Inspected actual `51ffbcb` LandingPage HeroShelf/useReducedMotion and v2.css shelf, responsive, reduced-motion and v2-stage rules via git show.
Restored five overlapping document cards, 0/52/108/164/224px desktop offsets, restrained 5/-4/3/-2/1 degree rotations, depth opacity, offset shadows, centered straightened enlarged selection and stronger selected border. Geometry scales with card height on phones.
Not restored: div-only/aria-hidden controls, infinite autoplay, old homepage structure/copy, CareerFields, fixed desktop mobile geometry or duplicated availability claims.

## Hero

Cyber first. Native buttons expose aria-pressed; all remain keyboard reachable. Arrow keys select/focus neighboring cards; Home/End select first/last. Separate 44px selectors give unobscured access when documents overlap. Focus outline preserved.
Horizontal pointer drag follows finger with bounded movement; release settles by spring and selects adjacent career after 35px travel. Vertical touch panning stays native. No wraparound swipe. Drag-generated clicks are suppressed.
Introduction: Cyber → RN → Mechanical → Electrician → Lawyer → Cyber, 2s steps, then stops. Pointer, key, touch, wheel, focus or explicit pause permanently cancels introduction. Hidden document cancels it.
Selected taking-shape career disables hero Start CTA, with no /start route. Cyber retains /start. Existing Continue copy remains for returning visitors.
Reduced motion disables introduction, spatial rearrangement, drag-follow and spring motion. Cyber-first geometry stays fixed while careers remain selectable and CTA/selected states update.
Helper: “Pick one. See what the work feels like.”

## Section motion

- Hero: word-only headline entrance, once; shelf spring selection.
- A-11: bounded depth reveal, 28px settle / .98→1 scale / opacity.
- Real Work: whole heading + support + artifact + controls reveal together; alert plus one record preserved.
- How a shift works: section reveal plus 80ms Prepare/Decide/Pass it on stagger; text only.
- Handoff: calm whole-composition reveal; one artifact.
- Different Careers: native scroll progress selects Cyber/RN/Mechanical/Electrician/Lawyer; manual selection permanently overrides scroll. One visible artifact; blank recessed backing layers; vertical/scale entrance. Equal grid footprint prevents layout shifts across career panels.
- Debrief: larger proof teaser with depth entrance, tighter copy/proof/caption/link spacing.
- FAQ/finale: calm section reveal. Native details get progressive-enhancement open/close height transitions where supported; instant native fallback elsewhere. Applies to homepage FAQ, FAQ page and Trust details without content edits.
- Shared primary CTA: 1px hover lift, inset highlight, subtle press scale; disabled excluded.
- Editorial links: animated underline plus arrow response, equivalent focus treatment.
- Careers layout and Trust/FAQ copy untouched.

Reveals start from visible baseline, run once, and never require animation completion for interaction. Missing IntersectionObserver keeps content visible. Reduced preference changes reset reveals immediately. No permanent will-change, decorative loops, scroll-jacking, GSAP or WebGL marketing.

## Debrief composition

Before: 74ch reading-width container; 200–280px crop; standard 5–9rem section padding.
After: up to 1040px proof width; 280–440px crop (320px phones); 3–5rem section padding; 1.35rem copy-to-proof gap; tighter caption/link; FAQ begins with 2.5–4rem padding. Teaser crop remains; no new/full debrief exposed.

## Dependencies

User explicitly approved adding Motion because repository had no existing Motion dependency.
Added `motion` (^13.4.6) to @sim/web and lockfile. No removed dependencies. No copied paid/vendor source; references informed interaction ideas only.

## QA evidence

Chromium public browser suite: 21 passed.
Matrix: 1366, 1280, 834, 390, 320 × dark/light × standard/reduced motion.
Checks: all selections, selected bounds, no CTA collision, keyboard Home/End, disabled CTA routing, actual CDP touch swipe at phone widths, reduced fixed geometry, debrief size, horizontal overflow, runtime errors, finite introduction, scroll career order, /careers, /careers/cybersecurity-analyst, /faq and /trust page smoke, keyboard accordion open/close.
Measured maximum CLS (session-window algorithm): **0.02405**, target ≤0.05. Overflow: 0/20. Page errors: none.
Local desktop headless Chromium only; not real-device performance certification. Screenshots captured but no human/pixel-level comparison completed. No existing public visual browser suite found; existing browser specs target simulation and intentionally were not run.

## Gates

- pnpm typecheck: pass
- pnpm lint: pass
- pnpm test: 115 files passed, 2 skipped; 806 tests passed, 9 skipped
- pnpm build: pass; existing-style >500kB chunk warning remains (public entry now ~547kB minified, ~164kB gzip)
- pnpm check:product-contract: pass
- git diff --check: pass

## Screenshot / metric paths

`test-results/public-motion/`
- `hero-{width}-{dark|light}-{no-preference|reduce}.png`
- `debrief-{width}-{dark|light}-{no-preference|reduce}.png`
- `home-{width}-{dark|light}-{no-preference|reduce}.png`
- `metrics-{width}-{dark|light}-{no-preference|reduce}.json`

Unit log: `test-results/public-motion-unit.log`.

## Risks

P0: none found by executed checks.
P1: launch-quality visual signoff remains unverified; generated screenshot pixels not reviewed. Safari/Firefox/real-device QA not performed.
P2: shared public entry exceeds Vite 500kB warning; adding Motion adds bundle cost. Career scroll sequence is a restrained in-flow switcher, not a tall sticky stacked gallery. A-11 caption reveals with frame, not a separately delayed caption.

## Uncommitted files

This wave:
- apps/web/package.json
- pnpm-lock.yaml
- apps/web/src/site/ArtDirection.tsx
- apps/web/src/site/pages/LandingPage.tsx
- apps/web/src/site/home.css
- apps/web/src/site/v2.css
- apps/web/test/site-entry.test.tsx
- apps/web/e2e/public-motion.spec.ts (new)
- docs/qa/public-motion-launch-final.md (new)

Pre-existing untracked files preserved: docs/planning/requests-and-analytics-handoff.md; qa-debug-redirect.mjs; qa-howitworks-shots.mjs; qa-nav-fix.mjs; qa-phase1a-redirect.mjs; qa-phase1b-faq.mjs; qa-shots-ui2/; qa-ui0-faq.mjs; qa-ui2-home.mjs; qa-ui2-probe.mjs; qa-workshop-artifacts.mjs.
