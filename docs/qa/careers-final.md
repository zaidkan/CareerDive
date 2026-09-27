# Careers final implementation and QA

Status: complete. Worker only; no merge, push, or deployment.
Base: `zaidkan/product-experimental` at `8af4a80200ce1479943e9f6c84a79ba7dd8f0b48`.
Branch: `worker/careers-final`.
Worktree: `/Users/zaid/orca/workspaces/Career-Expo/worker-careers-final`.
Verified: 2026-09-27.

## What changed

- `/careers` now uses a featured playable Cybersecurity experience and alternating
  editorial Workshop rows, with workplace context, planned artifacts, inline
  task/skill previews, Coming Soon states, and reversible request controls.
- Registered Nurse, Mechanical Engineer, Electrician, and Lawyer / Attorney stay
  previews. They have no simulation or standalone detail links. Requests stay
  local to this page and are explicitly disclosed as uncollected.
- Cybersecurity detail renders the existing approved `pathway`, `misconceptions`,
  `realityNotes`, and `sources`. Excluded occupation-equivalence, wage, and outlook
  claims are not rendered. Public canonical data was not modified or researched.
- The workflow shows alert → evidence → judgment → documentation → communication.
  There is one simulation CTA in the page content; existing site navigation stays.
- Work imagery uses actual existing product components with canonical synthetic
  records. Handoff and ticket excerpts quote the approved pack. Capture provenance
  is in `apps/web/public/careers/README.md`.
- Layout, typography, light/dark captures, mobile record crops, and reduced-motion
  treatment are scoped to these career surfaces.
- Career routes make the existing main-content skip target focusable, preserving
  keyboard focus when native history returns to the skip-link fragment. The
  attribute is omitted on homepage and all other routes.

## Files changed

- `apps/web/src/site/pages/CareersPage.tsx`
- `apps/web/src/site/pages/CareerDetailPage.tsx`
- `apps/web/src/site/careers/CareerWorkSamples.tsx`
- `apps/web/src/site/careers/careers.css`
- `apps/web/src/site/SiteChrome.tsx` (career-route main focus attribute only)
- `apps/web/test/careers.test.tsx`
- `apps/web/public/careers/verdaly-alert-dark.webp`
- `apps/web/public/careers/verdaly-alert-light.webp`
- `apps/web/public/careers/verdaly-alert-dark-mobile.webp`
- `apps/web/public/careers/verdaly-alert-light-mobile.webp`
- `apps/web/public/careers/README.md`
- `docs/qa/careers-final.md`

## Required checks

| Check | Result |
| --- | --- |
| `pnpm typecheck` | Pass: 11 tasks |
| `pnpm lint` | Pass: 11 tasks |
| `pnpm test` | Final suite pass with `--maxWorkers=2`: 101 files, 735 passed, 6 existing skips |
| `pnpm build` | Pass: 10 tasks |
| `pnpm check:product-contract` | Pass |
| `git diff --check` | Pass |

The default-worker test run passed earlier. A later run alongside typecheck,
lint, and build hit two 5-second timeouts in untouched `os-session.test.tsx`
and `os-session-continuity.test.tsx`. The full suite then passed with two workers,
without changing runtime code, test timeouts, or those tests.

The added career regression checks approved context and provenance, workflow
order, canonical artifacts, the single content CTA, exclusion of unverified
figures, and the career-only focus attribute.

## Browser QA

Headless Chromium against the production build on local Vite preview.

- 16 complete cases: both routes × 1440×1000 / 390×844 × light / dark × normal /
  reduced motion.
- Four additional cases: both routes at 320px and 768px, including the longest
  Workshop preview.
- Verified keyboard traversal, visible focus, native skip-link continuation,
  Enter/Space preview toggles, all four request/undo controls, source disclosure,
  keyboard theme switching, detail heading focus, and history return focus.
- Confirmed Workshop roles have no playable links, exactly one simulation link
  appears in each page's content, captures load, and career browsing creates no
  simulation requests.
- No horizontal overflow, browser exceptions, console errors, failed resources,
  or WCAG 2 A/AA and WCAG 2.1 AA axe violations in the 16 complete cases.
  Browser axe included color contrast. Reduced motion has no authored animation
  or perceptible transition; the existing global 0.01ms reset remains.
- Inspected desktop/mobile screenshots in both themes, then confirmed the final
  composition and corrected product capture timing in a bounded second pass.
- Impeccable mechanical detector: no findings.

Local evidence: `/tmp/careers-final-qa/final.json` and
`/tmp/careers-final-qa/final-*.png`. Temporary capture/QA helpers were removed from
this worktree before committing.

## Known issues and limits

- Workshop requests are intentionally local and uncollected, as disclosed.
- The existing simulation `RoomCanvas` bundle still produces Vite's large-chunk
  warning. Simulation, `/start`, ArrivalFilm, FloorMap, Desk OS, auth, deployment,
  homepage structure, and protected branches were not changed.
- The default parallel suite can hit workstation-test timeouts under concurrent
  load; final two-worker suite passed. Six existing tests remain skipped.
- Browser QA covered Chromium; no manual screen-reader or other-engine run.
