# Debrief composition micro-pass

Branch: `worker/public-motion-sitewide-final`

Base: `d472b1cbafa4918ffb17ef51c19e81febd2ad0a8`

Only scoped debrief selectors in `apps/web/src/site/home.css` changed. No component markup, copy, assets, global motion, Careers reveal, Privacy page, CTA, simulation, or backend changes.

- Section padding reduced to 32–48px per side. Gap before the proof reduced from 28px to 20px.
- Media frame centered and capped at 992px; image capped at 960px, with restrained inset padding.
- Frame height: 340–420px desktop/tablet, 400px mobile. Image crop offset softened to preserve the first decision's top border and context. The existing long capture remains an excerpt, not a miniature of the entire debrief.
- Headline/support hierarchy remains unchanged. At desktop/tablet, the case, decision, and reasoning are visible together; mobile retains a readable case and decision inside its responsive capture.

Measured section heights at 900px viewport height, reduced motion:

| Width | Before | After | Reduction |
| --- | --- | --- | --- |
| 1366 | 889.8px | 671.9px | 24.5% |
| 834 | 618.5px | 537.2px | 13.1% |
| 390 | 787.6px | 643.6px | 18.3% |

QA covers 1366/834/390, dark/light, normal/reduced motion: 12 combinations. Visible product images were decoded before captures; hidden alternate-theme lazy images were not awaited. Representative desktop dark, tablet light, and mobile light screenshots were inspected. No horizontal overflow, runtime errors, or broken mobile framing found. Homepage CLS maximum **0.022334**, below 0.05. Media geometry stays reserved before image loading.

Checks passed:

```sh
pnpm exec vitest run apps/web/test/site-entry.test.tsx
WEB_ORIGIN=http://127.0.0.1:5178 pnpm exec playwright test apps/web/e2e/public-scroll.spec.ts --workers=2
pnpm typecheck
pnpm lint
pnpm build
pnpm check:product-contract
git diff --check
```

Results: 19/19 relevant unit tests; 8/8 browser tests, including normal/slow scrolling and reduced-motion continuity. Existing scroll suite also covers 1280 and 320px. Impeccable detector reports no findings. Build retains its existing large simulation chunk warning.

Temporary QA scripts/screenshots remain outside the repository. Pre-existing untracked files remain untouched. No deployment or merge. No remaining debrief composition blocker identified in the requested matrix.
