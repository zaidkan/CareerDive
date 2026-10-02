# Final public frontend freeze

Branch: `worker/public-motion-sitewide-final`
Base: `12d32d60eddb9d6350cac1d0f3195eefcee888da`
Recovery checkpoint: `eeb61aa04604da23134696422c4f0e501b7cb9bb`

The checkpoint contains only the recovered public motion files and the recovered sitewide browser spec. The recovered careers unit suite passed 24/24 before checkpointing. No reset, clean, stash operation, branch switch, merge or deployment was performed.

## Final presentation

The homepage has seven chapters in this order:

1. **Hero:** preserves the headline and five layered career buttons. Supporting copy: “Try the ordinary work people usually don’t show you.” Cyber availability remains visible beside the single shared duration. Start is primary; unavailable selections remain disabled.
2. **Workplace:** “Walk into the job.” Large A-11 capture establishes the workplace without asking visitors to read interface details.
3. **Work:** “Do the work people usually don’t show you.” One readable excerpt from the actual synthetic A-1042 alert replaces the two screenshot/evidence views. The six failed identity checks and subsequent successful sign-in come from the existing record.
4. **Shift:** “A shift has a flow.” Enter → Investigate & decide → Hand it off. One vertically sequenced composition progresses with scroll; it retains “Real work keeps moving after your shift ends.”
5. **Debrief:** “See how you worked.” “A record of the calls you made. Not a score.” The large actual capture now frames the first decision and reasoning review rather than its introductory banner.
6. **Careers:** “Different careers. Different work.” Five large career/work statements, with explicit availability. Detailed sample artifacts remain on deeper pages.
7. **Questions:** three shared factual answers and links to FAQ/privacy. The first question now accurately asks “What will I do?” rather than asking duration and answering with tasks.

Removed from homepage presentation: supporting sign-in capture and evidence controls; standalone handoff section and its detailed excerpt; five small career artifact crops and their duplicate provenance labels; dormant optional story rendering; redundant closing chapter. Repository assets and deeper work samples remain available.

Section headings increase from a 32–59px range to approximately 37–64px on larger screens. Supporting text increases to approximately 19–24px. Narrow headings remain 32–39px; labels and captions used for availability/provenance are larger. Fonts, palette and product identity are preserved.

## Transition map

| Transition | Scroll behavior |
| --- | --- |
| Hero → workplace | Hero translates upward and scales to .94 while the workplace composition rises from up to 80px and .92 scale. |
| Workplace → work | Workplace recedes upward; the complete alert composition advances into prominence. |
| Work → shift | Work settles/recedes; the next shift step rises into emphasis as the previous step settles. |
| Shift → debrief | Native sticky release follows the final handoff emphasis; the decision capture rises into view. |
| Debrief → careers | Debrief recedes as career heading, controls, panel and actions advance together. |
| Careers → questions | Career progression completes; sticky releases and motion calms to a quiet FAQ reveal. |

Scroll stays native. There are no wheel handlers, scroll interception, WebGL, new animation dependencies or scroll-frame React renders. State changes occur only when the nearest career changes. Layout ancestors of sticky scenes remain untransformed.

Mobile transforms use half the desktop travel. Deliberate flow/career runways are shorter on mobile and live inside the sticky containing block. Reduced motion removes those runways and sticky positioning, shows all steps at rest, disables large scene transforms and preserves manual career browsing.

The continuous active pill uses the existing Motion LayoutGroup/layoutId primitive, inside real controlled buttons. It preserves aria-pressed, click, arrows, Home/End, focus and scroll selection. The registry was inspected: one component, already-installed Motion dependency, hardcoded palette and a mount gate. Nothing was installed or copied into global configuration. References: [continuous-tabs registry](https://registry.watermelon.sh/r/continuous-tabs.json), [Realtime Colors hierarchy](https://www.realtimecolors.com/?colors=050315-fbfbfe-2f27ce-dedcff-433bff&fonts=Inter-Inter). Palette was not copied. No reference video was supplied; the requested transition choreography guided implementation.

Hero Start has a delayed entrance, restrained hover lift/arrow movement and .97 press compression, without looping effects. The finite Cyber → RN → Mechanical → Electrician → Lawyer → Cyber introduction and manual-stop behavior remain intact. Start and Taking shape use identical action tracks; unavailable careers never route into Cyber.

Recovered /careers intro/headings, four-card stagger, preview transition and request-toggle motion are preserved, with no additional redesign.

## Verification

Read-order assessment, not a timed study with new users:

- **5 seconds:** the headline, “Try…” sentence, Cyber availability, career controls and primary action explain the purpose without a paragraph.
- **15 seconds of scrolling:** workplace, alert evidence/judgment, progressive shift/handoff and debrief have one large focal composition each.
- **30 seconds:** playable Cyber, the record of decisions and four taking-shape careers are explicit. Detailed methodology/privacy/AI stays on deeper pages.

Chromium matrix: 1366, 1280, 834, 390 and 320px; dark/light; normal/reduced motion. The full public-motion, public-scroll and public-sitewide suites passed **41/41**. After the midpoint collision guard, the strengthened public-scroll suite passed **8/8**, including forward/backward progression, keyboard, manual override, non-overlapping flow rows, exclusive career-panel painting, reduced motion and actual normal/slow wheel recordings. The final tablet-specific matrix passed **4/4** for selector order and the shared 834px stacked-layout boundary.

A supplementary browser sweep covered all five widths in both themes: midpoint exclusivity, arrow/Home/End selection, active pill bounds and visible heading bounds passed **10/10** cases. No horizontal overflow or page errors were recorded. Hero geometry/CTA collision, disabled-state routing and phone touch interaction are covered by the existing matrix. Screenshots and filmstrips were reviewed for desktop/tablet/phone readability and chapter progression. Product captures are deliberately excerpted; their viewport crop is intentional, not clipped page text.

Maximum CLS across the 20 homepage and 12 sitewide measurements: **0.0227240944**. 390px dark normal: **0.0036969945** in the homepage sweep and **0** in the sitewide sweep. The recovered failure was approximately **0.06966**. The fix addresses changing action row counts and stable shared panel geometry; there is no artificial chapter min-height workaround. Deliberate narrative runways are independent of the selected career.

Axe color-contrast checks on the homepage in dark/light returned **zero violations** after reducing excessive departing-scene opacity. Each has one incomplete result requiring manual inspection; screenshots/capture crops were reviewed. The Impeccable detector returned an empty findings list.

Exact verification commands (repository root):

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm check:product-contract
git diff --check
pnpm exec vitest run apps/web/test/careers.test.tsx
pnpm exec vitest run apps/web/test/site-entry.test.tsx apps/web/test/careers.test.tsx apps/web/test/home-media.test.tsx
WEB_ORIGIN=http://127.0.0.1:5178 pnpm exec playwright test apps/web/e2e/public-motion.spec.ts apps/web/e2e/public-scroll.spec.ts apps/web/e2e/public-sitewide-motion.spec.ts --workers=2
WEB_ORIGIN=http://127.0.0.1:5178 pnpm exec playwright test apps/web/e2e/public-scroll.spec.ts --workers=1 --output /tmp/freeze-scroll-final-results
WEB_ORIGIN=http://127.0.0.1:5178 pnpm exec playwright test apps/web/e2e/public-motion.spec.ts --grep '834 ' --workers=1 --output /tmp/freeze-tablet-final-results
```

Final full unit result: **806 passed, 9 skipped, 0 failed** across 115 passing files and 2 skipped files. Focused final frontend result: **48/48**. The nine skips are three PostgreSQL checks requiring TEST_DATABASE_URL/TEST_DATABASE_URL_WITHOUT_REVIEW, two proposed false-positive content checks and four pending DOM-binding checks. They were not forced green. One concurrent full run had a recovery startup wait timeout; the untouched recovery suite passed 4/4 on retry, and the subsequent full run passed. Initial sticky failures were corrected rather than weakening their valid geometry checks.

Build/typecheck/lint/product contract/diff check pass. Build retains the existing large-chunk warning; no runtime/deployment bundling change was introduced.

## Artifacts and remaining work

Uncommitted, ignored QA output: `test-results/public-motion/`, `test-results/public-scroll/`, `test-results/public-scroll-video/`, `test-results/public-sitewide/`. Supplementary scripts, contrast/geometry results, inspection images, filmstrips and command logs are in `/tmp/freeze-*`; none is committed.

- **P0:** none identified in this public frontend scope.
- **P1:** none identified in this public frontend scope.
- **P2:** cold-user timing remains a read-order assessment, not a new participant study. The referenced video was not provided. Existing build chunk warning remains. The two-question baseline remains an open pre-launch item outside this task.

Final commit files: LandingPage.tsx, home.css, faqData.ts, site-entry.test.tsx, public-scroll.spec.ts and this report. Checkpoint also preserves ArtDirection.tsx, CareerPreview.tsx, CareerRequestToggle.tsx, CareersPage.tsx and public-sitewide-motion.spec.ts.

Pre-existing untracked files remain untouched: `docs/planning/requests-and-analytics-handoff.md`, `qa-debug-redirect.mjs`, `qa-howitworks-shots.mjs`, `qa-nav-fix.mjs`, `qa-phase1a-redirect.mjs`, `qa-phase1b-faq.mjs`, `qa-shots-ui2/`, `qa-ui0-faq.mjs`, `qa-ui2-home.mjs`, `qa-ui2-probe.mjs`, `qa-workshop-artifacts.mjs`.

No backend, database, analytics implementation, simulation, decision content, Desk OS, 3D runtime, scoring, deployment or main-branch content changed.
