# Reveal lifecycle and privacy presentation micro-pass

Branch: `worker/public-motion-sitewide-final`

Base: `02a18d9488369e48f379b63bff11a7dfd5d7fc9c`

## Root cause and correction

`MotionReveal` used `initial={false}` with animation controls. Its entry callback then started an opacity keyframe sequence at zero. That explicitly rendered final content before making it disappear to rehearse the reveal. Changing viewport amount could not correct that lifecycle. The public app is client-rendered; the examined wrappers have stable keys and selection-independent identity. No hydration mismatch or keyed remount was needed to reproduce this bug.

The shared primitive now uses Motion's initial hidden state and native `whileInView` final target, with `viewport.once: true`. Opacity increases from zero to one; no entry callback resets it. Normal reveals last **0.96s**, ease **[0.16, 1, 0.3, 1]**, and rise **28px** (depth: 30px). Careers keeps its 40% intersection threshold with the bottom 120px excluded and restrained card delays. Reduced motion and environments without IntersectionObserver render final content immediately, without registering a viewport animation. Other homepage composition and scroll choreography are unchanged.

## Privacy presentation

The existing eight factual sections are grouped into four pairs. Collection/purpose and reporting/questions use restrained raised surfaces; intermediate facts use open space and thin dividers. Larger section headings and consistent padding improve scanning. Desktop pairs use two columns; tablet/phone pairs stack. Each pair has one quiet reveal; reduced motion is static.

An AST text comparison against the base commit confirms **all existing privacy copy is unchanged**. `/privacy` now aliases the existing `/trust` route, retaining current navigation and the same page. No new claims, backend behavior, dependencies, or simulation changes.

## Verification

- Requested matrix: 1366, 834, 390px; dark/light; normal/reduced motion.
- Browser tests: **30/30** across `reveal-lifecycle.spec.ts` (6), `public-sitewide-motion.spec.ts` (12), and `public-micro-pass.spec.ts` (12).
- Lifecycle regression checks collect animation-frame opacity values and assert monotonic progression. They cover first load, slow scrolling, fast jumps, down/up/down revisits, current request-control state changes, stable wrapper identity, and mid-page reload/re-entry. All six lifecycle cases pass.
- The current Careers page has fixed career previews rather than a career-selection switcher. Its request controls are exercised without remounting/refading wrappers; the existing career preview keyboard unit checks remain covered.
- Existing sitewide tests now assert hidden pre-trigger state for normal motion and visible final state for reduced motion. Settling waits account for the requested slower duration; replay and availability assertions remain intact.
- Privacy alias, eight section headings, truthful report fallback, keyboard disclosure, viewport geometry, and overflow checks pass.
- A separate 24-route browser sweep checks Privacy and Careers across all 12 combinations. Worst CLS: **0.046846** (390px dark reduced-motion Privacy); all combinations remain below **0.05**. No overflow. This is closer to the budget than the previous privacy pass; zero CLS is not claimed.
- Privacy axe color-contrast checks: no violations or incomplete results across the matrix. Representative desktop dark and mobile light screenshots were inspected after traversing all reveal groups. Full-page screenshots taken before traversing unrevealed content intentionally leave those regions hidden and are not final-state visual evidence.
- Relevant unit tests: **45/45**. Typecheck, lint, build, product contract, and diff check pass. Build retains the existing large simulation chunk warning.
- Impeccable detector: no findings on the changed UI targets.

```sh
pnpm exec vitest run apps/web/test/site-entry.test.tsx apps/web/test/careers.test.tsx apps/web/test/trust-page.test.tsx
WEB_ORIGIN=http://127.0.0.1:5178 pnpm exec playwright test apps/web/e2e/reveal-lifecycle.spec.ts apps/web/e2e/public-sitewide-motion.spec.ts apps/web/e2e/public-micro-pass.spec.ts --workers=2
pnpm typecheck
pnpm lint
pnpm build
pnpm check:product-contract
git diff --check
```

Initial verification found that supplying `whileInView` in an observer-less unit environment still attempted to register IntersectionObserver. The corrected fallback omits that prop entirely. A separate existing film-entry unit timing test timed out once under concurrent verification load and passed unchanged on rerun. Final results are reported above; no valid assertions were weakened.

## Limits

No outstanding reveal reset or presentation defect identified in the requested matrix. Privacy CLS has limited remaining headroom and should remain monitored. Existing unresolved production provider/configuration, retention, and support persistence decisions remain unchanged and disclosed. No backend, simulation, deployment, or merge. Unrelated pre-existing untracked files are untouched; screenshots, recordings, and temporary QA scripts remain uncommitted.
