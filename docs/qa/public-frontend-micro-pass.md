# Final public frontend micro-pass

Branch: `worker/public-motion-sitewide-final`
Base: `51cf5a66585982e32a5a55d1ff62b0180da23458`

## Scope and result

Only Shift Flow presentation, Careers reveal timing, and Privacy and safety were changed. The seven homepage chapters, hero, career stack, Workplace, Real Work, Debrief, Different Careers, careers structure, and global type system remain intact. No backend, simulation, dependencies, deployment, or merge changes.

### Shift Flow

Desktop uses the existing three concise steps on the left and one contextual work panel occupying approximately 43% of the composition on the right. Its persistent A-1042 case heading connects three verbatim synthetic work excerpts: starting handoff, sign-in alert/evidence, and outgoing handoff. Scroll progress drives the panel's opacity, translation, and scale alongside the existing left-step animation. Contexts share one grid cell; only one readable context paints at a time. Intrinsic sizing reserves the tallest context rather than changing height during transitions.

At 834px and below, the panel follows the steps vertically. Reduced motion removes scroll choreography and exposes three native, keyboard-operable context buttons; all step labels remain visible. No screenshot thumbnails or additional artifacts were introduced.

### Careers reveals

All nine existing reveal wrappers use `amount={0.4}` and `margin="0px 0px -120px 0px"`. The observer excludes the bottom 120px of the viewport; 40% of the target must intersect that reading area before animation starts. Barely entering content stays fully readable rather than ghosted. The reveal lasts 0.72s, keeps `[0.16, 1, 0.3, 1]`, and retains card delays of 0/.08/.16/.24s.

`once: true` plus a persistent per-wrapper guard prevents replay on upward/downward revisits and unrelated selection updates. Existing career-preview transitions remain separate. Reduced motion stays fully visible with no entrance transform. Defaults for other MotionReveal callers remain unchanged.

### Privacy and safety

Eight short sections explain collection, purposes, excluded uses, integrations, retention, AI, reporting, and questions. Access/deletion nuance moves into a native disclosure. Copy is roughly one-third shorter and distinguishes tab-local drafts from server records. Contact/diagnostics remain optional. Unconfirmed production providers, access, logging, and retention are explicitly labeled.

Factual references inspected: `apps/server/src/main.ts`, `render.yaml`, `.env.example`, public career-request controls, problem-report/diagnostics components, and `docs/qa/trust-claim-audit.md`. Supabase, Anthropic, PostgreSQL, and Render are described as code/template integrations, not asserted live vendors. Persistent support-report storage is explicitly unimplemented; tab-session drafts, Copy report details, and retry remain the stated fallback. No compliance, encryption, deletion, or fixed-retention guarantees were added.

## Verification

- Relevant unit tests: 45/45 across `site-entry.test.tsx`, `careers.test.tsx`, and `trust-page.test.tsx`.
- Browser suites: 32/32 across `public-micro-pass.spec.ts` (12), `public-sitewide-motion.spec.ts` (12), and `public-scroll.spec.ts` (8).
- Primary matrix: 1366, 834, and 390px; dark/light; normal/reduced motion. Existing scroll coverage additionally exercises 1280 and 320px.
- Verified desktop panel geometry, stacked mobile layout, one visible work context, sticky content fitting the viewport, keyboard context controls, keyboard privacy disclosure, no horizontal overflow, and no browser runtime errors.
- Careers first-entry tests verify readable content at 20% intersection, deliberate animation after 45% intersection, and no replay after down/up/down revisits. Request controls preserve geometry and unavailable careers do not expose a start link.
- Normal and slow homepage scroll suites pass; representative screenshots and motion recordings remain local under ignored `test-results/`.
- Worst CLS in the browser suites: **0.020513**. A separate 24-route sweep measured Privacy and Careers across the same 12 viewport/theme/motion combinations: Privacy max **0.032138**, Careers max **0.020513**. All remain below 0.05; no overflow. Measurements use layout-shift session windows, excluding recent-input entries.
- Privacy color-contrast checks: no violations or incomplete results across all 12 combinations. The changed Shift reading position also has no detected violations in dark/light; each full-home scan leaves one image/animated-content item for manual review rather than proving every rendered pixel contrast-safe. Representative desktop/mobile captures were reviewed.
- `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm check:product-contract`, and `git diff --check`: pass. Build retains the existing large simulation-chunk warning.
- Impeccable detector: no findings for changed public UI targets.

Commands:

```sh
pnpm exec vitest run apps/web/test/site-entry.test.tsx apps/web/test/careers.test.tsx apps/web/test/trust-page.test.tsx
WEB_ORIGIN=http://127.0.0.1:5178 pnpm exec playwright test apps/web/e2e/public-micro-pass.spec.ts apps/web/e2e/public-sitewide-motion.spec.ts apps/web/e2e/public-scroll.spec.ts --workers=2
pnpm typecheck
pnpm lint
pnpm build
pnpm check:product-contract
git diff --check
```

The first browser attempt exposed an ordering error in the new revisit test: revisiting one card prematurely traversed and revealed future cards before their first-entry assertions. The corrected test checks all first entries before revisits; final matrix passes without weakening the reveal assertions.

## Remaining limits

No new P0/P1 visual issues found in the requested matrix. Production processor/configuration and retention decisions remain launch items; support-report persistence remains deferred. These are disclosed, not implemented by this frontend pass. No server/database tests were requested or run; no PostgreSQL skip is being represented as a pass. Unrelated pre-existing untracked files were left untouched.
