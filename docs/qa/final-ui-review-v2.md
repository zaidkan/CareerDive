# Final UI review v2 integration

Branch: `integration/final-ui-review-v2`
Base: `integration/final-ui-review-rc` / `cb3b8ea479d02871c7c57a7699b23ec97a3987cf`
Date: 2026-09-30

## Committed workers integrated, in order

| Owner | Requested worker tip | Integration commits |
| --- | --- | --- |
| Homepage / Motion Stack | `b1c9bbf370b1e300155fe94b7cd6aa22e1668838` | `e538eb1` |
| Trust / FAQ | `358f8697faa7e3a4992136e40ffe9d6d3dc3c825` | `6767dcf`, `a1e0127`, `c500fe2`, `1fd4593` |
| Recovery / Support | `a4113bec35dcc840f68227c8c0788b223661fca9` | `d4c92ae` |

The Trust worker contains four commits after the base. An initial attempt to pick only its tip conflicted in `FaqPage.tsx` and `TrustPage.tsx`. That incomplete pick was aborted. Picking the full committed Trust range applied cleanly and preserved its owned implementations. Homepage and recovery picks had no conflicts. No worker worktree files or untracked artifacts were integrated.

## Shared cleanup

- Public duration comes from `careers/publicCopy.ts`: `About 10–15 minutes` / `~10–15 min`. Home displays duration once.
- Public availability uses `Playable now` / `Taking shape`; internal enum values remain intact. Lawyer is Taking shape in Home and the careers explorer.
- SiteChrome keeps one Beta badge, including mobile, one privacy label (`Privacy and safety`), and Source on GitHub. The duplicate footer disclaimer is removed.
- Primary public start links use `Start your first day`; contextual Continue labels remain.
- Trust now says `There is no single fixed retention period.` Its qualified deployment explanation remains.
- Footer links, brand and shared disclosure controls have a minimum 24px target height; existing nav links already exceed it. No typography redesign.
- Home's three mini-FAQ entries are shared with FAQ through `site/faqData.ts`.
- FAQ names actual retry/report controls, automatic compatibility/recovery, tab-session draft retention, Copy report details and retry delivery. It makes no persistent server-report promise and offers no GitHub support path.
- Cyber copy removes “seeded,” duplicate fit-score explanation, repeated identical capture provenance labels, and competing primary start wording.
- Worker Home route typing and lint issues were corrected without changing its motion behavior. CTA tests now query the intended page region.

## Homepage result

Physical card rearrangement and the finite Cyber → RN → Mechanical → Electrician → Lawyer → Cyber → STOP sequence passed at all five widths. Manual selection stopped autoplay. Reduced motion kept Cyber static with no inline card transforms. Marketing Home had zero canvases. Cyber's career-specific CTA was active; Nurse and Lawyer selections exposed a disabled Taking shape button with no `/start` link in the career action region. Real Work has two evidence views; handoff has one artifact.

**P1: cards overlap while moving.** Bounding-rectangle sampling found overlapping card pairs during transitions at every width. Stable screenshots and final positions were intact. This was not repaired because integration authorization limits post-worker changes to the enumerated shared-system fixes; motion remains worker-owned. The candidate therefore fails the no-card-collision visual criterion despite passing the other recorded checks.

## Trust / FAQ result

Preserved no-account-required copy, session access boundaries, configuration-qualified database protection, constrained AI dialogue and first-party recovery/report wording. Technical proof stays optional. Shared Home answers match FAQ exactly. Source on GitHub remains an open-source link only.

## Recovery / Support result

Recovery E2E verified two connectivity checks (initial + one safe automatic retry), zero session POSTs before connectivity succeeds, keyboard manual retry creating exactly one session, and no repeated POST after unconfirmed creation. No-WebGL recovery preserved the session, offered a compatibility result and recovery workstation, maintained focus/keyboard flow, and respected reduced motion. Report fallback retained the draft, copied details, and excluded the session identifier from technical diagnostics. The persistent report backend remains deferred.

## ONE continuous browser path: PASS

The successful run started at landing and used actual UI controls throughout:

landing → Start your first day → arrival film → doors → day-one brief → Continue to floor → workplace → WASD walk → sit → workplace sign-in → Desk OS → stand/leave desk → walk away → return/sit → preserved scratch notes and Browser state → SOC Ops Console → assessed work → ticket decisions → handoff → completion → debrief.

The arrival video was fast-forwarded to its genuine door gate, using the existing golden-path method. Scenario state was not seeded, injected, or advanced through direct API calls. Requests originated from UI actions. The same run performed alert review, login context/history, device inventory, access-authority decision, two login-help steps, three Morgan status steps, guide review, two ticket submissions, three continuity handoff steps, escalation, scanner dismissal, and complete shift.

Evidence: one `session.create`, `sessionKind=assessed`, two successful movement calls, zero API failures, zero missing assets, zero page errors, zero console errors. The completed debrief screenshot is `continuous-debrief.png`.

Earlier exploratory harness attempts stopped on a missing SOC bookmark, notification overlays, and a ticket-task selector that did not match the actual ticket composer. Those partial attempts are not aggregated into this PASS. The final successful run alone covered the entire path (1.4 minutes).

## Visual QA

Widths: 1366, 1280, 834, 390, 320. Dark/light, normal/reduced motion.

- Production preview: 120 route/viewport/theme/motion checks; no horizontal overflow, clipped-text detector findings, or undersized shared targets. Maximum observed CLS: **0.036003**, below 0.05.
- A preliminary Vite development-server run measured CLS 0.053780 at 390px reduced motion. Trace showed development CSS arriving after initial layout. The production-preview measurements above are the final CLS result.
- Motion sampling at every width: finite sequence and manual stop passed; transition overlaps failed. Maximum motion-run CLS: 0.034337.
- axe color-contrast checks: no violations on Home, FAQ, Trust, Start and Cyber in dark/light at 390px, with disclosures expanded.
- Startup recovery/report: 20 viewport/theme/motion checks; no overflow before or after opening the report form.
- Compatibility and recovery workstation: 10 width/theme checks; no overflow. These runtime checks used the dev origin allowed by the local server's CORS configuration.
- Careers explorer: every width/theme checked; Lawyer appears under Taking shape. Reduced-motion Cyber and unavailable-Lawyer CTA additionally checked.
- Representative Home hero, Real Work, Handoff, Different Careers, FAQ, Trust, Start, recovery, compatibility, workstation and report screenshots were captured. Section captures hide the sticky nav to avoid screenshot-only occlusion. Full-page captures keep normal chrome.

Artifacts and retained QA sources: `/tmp/final-ui-v2-qa/`. Production visual measurements are in `visual-results.json`; motion sampling in `motion-results.json`; contrast, recovery and compatibility results in their respective JSON files. The continuous-run harness/log and completed debrief screenshot are in that same directory. Temporary QA scripts are not committed. To rerun the retained continuous spec, copy it into `apps/web/e2e/final-continuous-qa.spec.ts`, run Playwright from the repository root against the local dev stack, then remove that temporary file.

## Verification

- `pnpm typecheck`: PASS
- `pnpm lint`: PASS
- `pnpm test`: **799 passed, 9 skipped, 0 failed**; 115 passing files, 2 skipped files.
- Skipped: three PostgreSQL checks lack `TEST_DATABASE_URL` / `TEST_DATABASE_URL_WITHOUT_REVIEW`; four pre-existing pending query DOM-binding checks; two proposed-content false-positive-cluster checks.
- `pnpm build`: PASS; existing large-chunk warning remains.
- `pnpm check:product-contract`: PASS
- `git diff --check`: PASS
- Existing entry + recovery browser suites: **4 passed**.
- Continuous assessed entry-through-debrief browser run: **1 passed**.
- Dedicated seeded debrief suite requires `DEBRIEF_BROWSER_FIXTURE=1`; its fixture-specific run is skipped in the ordinary stack. The successful continuous run exercised real completion and debrief without that fixture.

## Known items

- P0: none found in this integration verification.
- P1: Home card transition overlaps; no-card-collision gate is not met.
- P2: two-question baseline remains an open pre-launch item, not an integration blocker. Persistent support-report backend and career-request server wiring remain deferred. Existing large-chunk build warning remains.

No main merge, Supabase setup, analytics, branch cleanup, gameplay/correctness changes, or scoring changes were performed.

## Uncommitted repository files

Only pre-existing untracked files remain after integration commits:

- `docs/planning/requests-and-analytics-handoff.md`
- `qa-debug-redirect.mjs`
- `qa-howitworks-shots.mjs`
- `qa-nav-fix.mjs`
- `qa-phase1a-redirect.mjs`
- `qa-phase1b-faq.mjs`
- `qa-shots-ui2/`
- `qa-ui0-faq.mjs`
- `qa-ui2-home.mjs`
- `qa-ui2-probe.mjs`
- `qa-workshop-artifacts.mjs`

`qa-home-motion.mjs` and `qa-shots-home-motion/` were never copied or committed.
