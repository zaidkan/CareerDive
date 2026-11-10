# Runtime performance candidate

Base: `integration/cyber-shift-final-v3` at `927dd43145995aef138444d398a628f5c241d7fe`.
Candidate branch: `worker/runtime-performance-final`.

The clean integration worktree and exact base were verified before profiling. The existing target worktree was at that base but contained two development-port edits and a proposed quality watchdog. Its original diff was preserved at `/tmp/ce-perf/pre-existing-runtime.patch`; the unrelated port edits were restored to the base, and the watchdog was reviewed, refined, and tested. The owner’s original repository worktree was not edited. No main checkout, production service, database migration, deployment, or merge was used.

## Measurement method and limits

Production Vite builds used `VITE_SERVER_URL=/api`, served locally with an SPA fallback and same-origin proxy to an in-memory development API. No Supabase project, credentials, or external production API was involved. Static responses were uncompressed and uncached. Gzip figures below are independently computed with Python gzip level 9, not actual HTTP transfer sizes. Browser timings include local CPU scheduling and external font loading; they are samples, not launch SLOs.

Baseline profiling preceded implementation. Raw evidence is in [runtime-performance](runtime-performance/). Public measurements use three fresh Chromium contexts at 1366×834. Reproduce with `WEB_ORIGIN=http://localhost:<port> OUTPUT=/tmp/public-profile.json node scripts/profile-public-runtime.mjs` against a production build. LCP and CLS come from PerformanceObserver. Scene comparisons use fresh contexts, an identical entry sequence, a 10-second settle and approximately 8-second frame sample, with hardware concurrency/device memory controlled to 8/8. Hardware Metal and software SwiftShader results are deliberately separate. GC heap snapshots use Chrome DevTools Protocol.

The host also runs other applications. Repeated software-renderer runs varied dramatically. GPU startup timings and isolated local navigation timings are not sufficient evidence of an improvement. The diagnostics overlay’s compositor draw-call counters describe the last render pass; they are not a total scene draw-call profile.

## Changes with before/change/after evidence

| Measured problem before | Implemented change | Verified result after |
| --- | --- | --- |
| Landing eagerly imported the default simulation client through StartPage, bringing client/schema code into the public entry: 400,944 B JS, 114,834 B gzip. | Keep the arrival page eager, but let the already lazy simulation App supply its default client. Preserve injected test clients and existing next-step prefetch. | Entry 291,630 B JS, 87,387 B gzip: 109,314 B (27.3%) raw and 27,447 B (23.9%) gzip removed from initial load. Arrival remains immediately available. |
| Quality sampler discarded every delta over 100 ms; sustained 5 FPS never degraded its starting tier. | A bounded consecutive-stall watchdog uses the existing degrade hold. Reset holds on tab visibility changes; remove that listener on unmount. | Deterministic 5 FPS test reaches LOW, then restores at 60 FPS. Single 10-second hitch and hidden/resumed-tab tests retain HIGH. This fixes adaptation behavior; no software FPS gain is claimed. |
| `?perf=1` crashed the scene with `R3F: Div is not part of THREE namespace`, then triggered recovery. | Diagnostic DOM belongs to document.body, outside the THREE reconciler, and is removed on unmount. | Browser diagnostic test has no page errors; one overlay, no duplicates on rerender, none after leaving. |
| Dialogue skip left one scheduled reveal RAF until its next callback. | Keep the frame handle in a ref and cancel it synchronously on skip. | Pending RAF count goes from 1 to 0 immediately; unmount remains 0. Hidden-tab/reduced-motion behavior and dialogue semantics pass existing tests. |
| An ambiguous start response was paused, but reloading discarded that pause and sent a second session-create POST. | Persist an unresolved-start flag in the default app’s tab storage before the POST; clear it after storing the confirmed session ID. Check it before starting again. | Aborted-response/reload browser regression now sends exactly 1 POST instead of 2 and stays paused. Ordinary start, recovery from a failed health read, Back/Forward and confirmed-session reload still pass. |
| Every walking Canvas emitted the deprecated PCFSoftShadowMap warning; Three already fell back to PCFShadowMap. | Explicitly request the same supported percentage shadow mode. | Shadow warning disappears in scene samples; high-tier appearance and roughly 60 FPS hardware behavior remain. |

A proposed lazy split of the entire Start route was rejected after it added a roughly 850 ms click-to-arrival stall. The final candidate keeps that route eager. No speculative Desk OS memoization, scenario changes, visual asset cuts, or dependency upgrades were added.

## Public bundle and timing results

| Metric | Base | Final |
| --- | ---: | ---: |
| Initial JS, raw | 400,944 B | 291,630 B |
| Initial JS, gzip level 9 | 114,834 B | 87,387 B |
| Total JS, all chunks | 1,685,109 B | 1,684,934 B |
| Total JS, all chunks gzip | 466,173 B | 465,121 B |
| Initial CSS | 100,322 B | 100,322 B |
| Median load event, 3 fresh contexts | 1,038.7 ms | 519.5 ms |
| Median LCP | 592 ms | 588 ms |
| CLS | 0.000488 | 0.000488 |
| Median Start click → arrival heading | 68 ms | 56 ms |

The byte reduction is deterministic. The load-event sample is faster but cannot establish a general latency improvement; another earlier run had worse final LCP. LCP is effectively unchanged in the final sample. Initial landing requests contain no video/audio payload or workplace scene chunks. Public screenshots remain unchanged. The arrival film loads only at its existing entry phase.

The largest deferred chunk remains RoomCanvas: 1,015,427 → 1,015,990 raw bytes. The Vite chunk advisory remains. The simulation App chunk grows because it now owns its client dependencies. Total JS is effectively unchanged. Existing lazy scene/effects/work surface boundaries remain; further Three splitting was not justified by the measurements. No duplicated asset was identified that justified removing or recompressing visual media.

## Entry, 3D, and Desk OS

The initial software-renderer baseline recorded floor map initialization at 809 ms, room Canvas at 6,318 ms, idle 5 FPS and walking 2 FPS. Login → useful Desk OS was 117 ms; cycling seven app tabs took 13,019 ms including scripted input/waits. These are baseline observations, not isolated render-cost measurements. Normal idle entry sent one health read, one create POST, and one movement write; no polling loop was observed.

Controlled Metal scene sample:

| Metric | Base | Candidate |
| --- | ---: | ---: |
| Canvas startup | 3,065 ms | 2,975 ms |
| Sample FPS | 60.09 | 60.04 |
| p95 frame interval | 16.7 ms | 16.7 ms |
| Worst sampled frame interval | 16.8 ms | 16.8 ms |
| GC heap, scene | 22.76 MB | 22.77 MB |

These results show preserved hardware behavior, not a meaningful speedup. An earlier contended hardware walking sample was approximately 36 FPS; walking and chair interaction subsequently passed real-input browser QA, but a controlled walking FPS comparison is still needed on representative student devices.

Software scene sample was poor: 1.43 → 0.60 FPS, p95 1,183 → 4,017 ms. Other software runs differed substantially. The watchdog tests prove adaptation can now react to slow frames; they do not prove this renderer becomes usable. No shader, texture, geometry, collision, or quality-budget reductions were made.

Existing seated rendering uses demand mode and skips quality sampling. Window drag already uses direct transforms. Auditing search, evidence, source comparison, decisions, app switching, hints and dialogue did not establish a repeatable broad rerender bottleneck. No Desk OS state restructuring or extra memoization was applied. Final full-shift recorded activations are mostly 140–215 ms including Playwright overhead; they must not be presented as component render duration. Notes minimize/restore and reload persistence passed.

## Audio, timers, subscriptions, and memory

Dialogue uses one lazily unlocked AudioContext, a maximum 10 Hz tick rate and 24 ms voices with oscillator/gain disconnection on end. Muting, skipping, hiding the document and closing dialogue stop voices. Live Morgan dialogue produced one context and six voices; zero voices remained after skip/mute/close. The context is intentionally reusable for the page lifetime, not repeatedly created per dialogue. Reduced motion showed complete dialogue without a reveal loop. Existing tests cover audio bounds, failed resume, mute and hidden state.

Hint queue remains bounded to three, with its timeout and visibility listener cleaned on changes/unmount. Hint, callback, reduced-motion and dialogue tests passed. No accumulating timer, subscription, or unhandled promise was observed in the exercised paths. This is source review plus unit/browser evidence, not a multi-hour leak certification.

Desktop complete-shift forced-GC snapshots: heap 17.31 → 13.82 MB; listeners 258 → 248. Reloaded debrief: 3.95 MB, 182 listeners. Tablet: heap 14.99 → 12.96 MB, listeners 261 → 248; reload 3.91 MB. Each snapshot had one document. Debrief contains more DOM nodes than the desk, as expected. One completed shift showed no accumulating heap/listener growth; repeated long-duration shift cycling remains unmeasured.

## Network and session boundaries

Normal golden path creates exactly one assessed session; no API, asset, console, or page errors. Back/Forward, leave/return and reload resume the confirmed session and preserve Notes. Source work, search, decisions and handoff use real local server state. No accidental fetch/persistence loop was observed. Existing startup generation guards and the shared in-flight promise remain intact; stale-start responses still cannot replace the active UI.

The new unresolved-start flag is a conservative tab-storage guard, **not durable server idempotency**. Storage disabled/unavailable, separate tabs and direct API callers are outside its protection. A lost POST response intentionally remains paused because the client cannot know whether the server created a session. The base has no create-request key or server recovery lookup; that architectural work remains outside this performance candidate.

## Browser QA coverage

- Final normal Playwright run: **7 passed, 1 skipped**, 32.1 seconds. Golden entry, physical walking/chair/login, Desk OS continuity, safe startup retry, recovery/support UI, deferred public loading, diagnostics and ambiguous-start reload guard.
- Separate required debrief fixture run: **1 passed**, 16.9 seconds. Seeded completion, five-card debrief, keyboard controls, contrast/themes, responsive layout and reduced motion. This fixture is explicitly seeded; it is not the evidence for a full unseeded shift.
- Two additional full unseeded API shifts completed, at 1366 and 834 widths: source investigation, record search, evidence inspection, comparisons, scanner work before finalizing the main case, interruption, employee requests, decisions, handoff and debrief. Each created one real in-memory session and had zero page errors. These harnesses seeded only the seated presentation state after real session creation; physical movement/login were independently covered by the golden test.
- Physical walking to Morgan and Jules, callback state on reopening, sound on/mute/close and reduced-motion dialogue passed with no page errors.
- Notes open/edit/minimize/restore, public navigation Back/Forward and desk reload preserved drafts.
- 36 public route/theme/width checks: 1366, 834, 390; dark/light; home, careers, career detail, FAQ, trust and Start; reduced motion. No horizontal overflow or page errors. Theme values were independently checked. Desktop/tablet desk and 1366/834/390 debrief layouts also had no overflow. Tablet Desk OS dark/light screenshots were inspected.
- Early golden runs failed because the test’s 450 ms northward hold overshot the chair’s clear approach on Metal. The harness now uses 150 ms and held-key repeats eastward, preserving the physical chair assertion and timeout. No product movement shortcut was introduced.

## Validation

| Check | Result |
| --- | --- |
| `pnpm typecheck` | Pass, 11 tasks; 10 unchanged tasks cached |
| `pnpm lint` | Pass, 11 tasks; 10 unchanged tasks cached |
| `VITE_SERVER_URL=/api pnpm build --force --env-mode=loose` | Pass, all 10 tasks uncached |
| `VITE_SERVER_URL=/api pnpm --filter @sim/web build` after final source changes | Pass; deferred RoomCanvas size advisory remains |
| `pnpm check:product-contract` | Pass |
| `pnpm test --maxWorkers=1 --testTimeout=20000` | **838 passed, 9 skipped; 125 files passed, 2 files skipped**, 144.03 seconds |
| Normal browser suite + separate seeded debrief | **8 distinct tests passed**; fixture-only test intentionally skipped in normal run |
| `git diff --check` | Pass |

Browser runs used one Chromium worker, Metal ANGLE (`--use-gl=angle --use-angle=metal --enable-webgl --ignore-gpu-blocklist`), a 180-second test timeout and a 20-second expectation timeout. Normal suite command: `WEB_ORIGIN=http://localhost:4179 API_ORIGIN=http://localhost:4179/api pnpm exec playwright test --config /tmp/ce-perf/playwright-performance.config.ts`. Fixture command: `DEBRIEF_BROWSER_FIXTURE=1 pnpm exec playwright test --config /tmp/ce-perf/playwright-debrief.config.ts debrief.spec.ts`, against the local fixture API and proxy. Temporary configs/logs/screenshots remain in `/tmp/ce-perf`; committed JSON captures the reported measurements.

The first concurrent default test run had six failures (timeouts/recovery timing under host contention); those six passed in isolation. The final entire suite was serialized with the explicit timeout above and passed. Assertions were not weakened to produce the unit-test result. The nine skipped cases comprise three PostgreSQL integration tests requiring unavailable `TEST_DATABASE_URL` / `TEST_DATABASE_URL_WITHOUT_REVIEW`, two existing proposed false-positive scenario cases, and four existing deferred DOM accessibility contracts. PostgreSQL persistence is unverified here.

## Remaining risks and severity

- **P0:** None observed in the exercised local candidate. This is not production readiness certification.
- **P1:** Poor/variable software-renderer performance remains; test actual low-end student hardware before broad launch. Durable server idempotency and lost-start recovery remain absent. The new tab guard improves the measured reload case but cannot cover cross-tab or storage-denied starts.
- **P2:** Deferred approximately 1.016 MB scene chunk and cold shader initialization remain; no controlled walking comparison or long soak was completed. The dependency-originated `THREE.Clock` deprecation warning remains; upgrading the rendering stack solely to silence it was not justified. Browser timing samples are local and host-dependent. Database-dependent tests remain unverified.

Product UI, scenario truth, high-tier visual budgets, production deployment and main were left unchanged. The candidate is suitable for review with the remaining device and persistence risks explicit.
