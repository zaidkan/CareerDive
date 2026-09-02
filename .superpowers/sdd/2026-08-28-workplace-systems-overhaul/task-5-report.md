# Task 5 Report: Purposeful Deterministic Jules Dialogue

## Outcome

Implemented Task 5 only. Jules now uses one deterministic core resolver keyed by canonical topic memory and safe public workplace stage. The spatial UI replaces rotating flavor lines with an accessible dialogue panel, submits canonical `talk_to_jules` interactions before showing a topic reply, and shares Task 4's local workplace pending/queued-fridge-close gate.

Base: `f7b3caa16d9e775b2f6259809c1499ca08b8ccf4`

Implementation commit: `823424c9d5a48d2fe69e3d6010b1af52fdce41a4` (`feat: give Jules stage-aware dialogue`)

Review round 1 fix commit: `ea745c88f4c66136127d8f8390587a4b746d7c67` (`fix: refine Jules dialogue coordination`)

## RED-GREEN-REFACTOR record

### Core RED

Leakage, public-stage, topic-purpose, ClientView parity, repeat-wording, and canonical no-time/no-ledger/no-effects tests were written before the resolver.

The brief's exact focused command was attempted first:

```text
pnpm --filter @sim/core exec vitest run test/jules.test.ts
```

It exited 1 with `No test files found` because the repository Vitest include globs are root-relative while the filtered command runs from `packages/core`.

The equivalent root-relative command then produced the decisive RED result:

```text
pnpm exec vitest run packages/core/test/jules.test.ts
```

It exited 1 with 5/5 failures because `julesDialogue` and `julesDialogueFromClientView` did not exist.

### Core GREEN

After the minimal public projection and resolver implementation, the same root-relative focused command passed 5/5 tests.

### Web RED

Accessible panel, visual/keyboard parity, canonical topic IDs, success-before-reply, failure, shared pending gate, and queued-close tests were written before UI implementation.

```text
pnpm exec vitest run apps/web/test/jules.test.tsx --environment jsdom
```

It exited 1 with 4/4 failures: no dialogue existed and the rotating Jules flavor line still rendered.

### Web GREEN and refactor

After the minimal panel and Task 4 gate integration, the focused web command passed 4/4 tests. The combined Jules/core/Task 4 regression run passed 20/20 tests across 3 files after type and lint refactors.

## Verification

- Brief command `pnpm --filter @sim/core test && pnpm --filter @sim/web test` — attempted; exited before web with package-local `No test files found` for core.
- Root-relative full core suite — PASS; 39/39 tests across 4 files.
- Root-relative full web suite — PASS; 125/125 tests across 14 files.
- `pnpm test` — PASS; 220/220 repository tests across 28 files. Re-run immediately before commit.
- `pnpm typecheck` — PASS; 10/10 package tasks.
- `pnpm lint` — PASS; 10/10 package tasks.
- Focused package typechecks and linters for core/web — PASS.
- Prettier check for touched TypeScript, TSX, CSS, and JSON files — PASS.
- `git diff --cached --check` — PASS.
- Staged scope/security scan — PASS; no ledger, Task 6 coordinator, provider/AI call, or hidden-answer implementation path.

The root-relative full web suite retains existing duplicate-Three.js stderr warnings in three spatial test files; all affected tests pass.

## Files

- `packages/core/src/jules.ts` — adds the deterministic resolver, safe ClientView projection entry point, stage guidance, topic-purpose replies, repeat wording, and optional destination.
- `packages/core/src/index.ts` — exports the Task 5 resolver and reply type.
- `packages/core/test/jules.test.ts` — covers topic purpose, Alerts/Guides/Tickets stages, hidden/private/answer-key leakage resistance, ClientView parity, repeat determinism, and canonical interaction invariants.
- `apps/web/src/world/JulesDialogue.tsx` — adds the named accessible panel, three concise topic controls, discussed labels, close/Escape control, polite reply/pending status, and destination hint.
- `apps/web/src/world/SpatialShell.tsx` — replaces flavor-line rotation, submits canonical Jules topics, waits for success before displaying replies, and reuses the single Task 4 workplace pending/queued-close path.
- `apps/web/src/world/rooms/GlassBreakNook.tsx` — removes obsolete rotating Jules flavor lines while preserving the Jules figure, name tag, fridge, coffee, and snack-basket décor.
- `apps/web/src/styles.css` — styles the responsive dialogue panel using the existing visual tokens and reduced-motion behavior.
- `apps/web/test/jules.test.tsx` — covers panel semantics, pointer/keyboard parity, canonical IDs, success/failure timing, topic labels, destination hints, and resource/exit races.
- `apps/web/package.json` and `pnpm-lock.yaml` — add only the required workspace dependency on `@sim/core`.

## Self-review

- The core world entry converts through `toClientView`; the browser entry accepts `ClientView` only and immediately narrows it to visible events, public available actions/artifacts, canonical workplace resources, and seen topics. Neither resolver path reads `WorldState.hidden`, facts, assessment state, task answer keys, or `requiredOptionIds`.
- Leakage tests poison hidden metrics, private fact content, and a task answer key and confirm identical output. Output also excludes private IDs/content, option-answer IDs, a correct final decision, and action-ID answers.
- `current_work` changes deterministically across public Alerts, device inventory/Guides, documentation/Tickets, and decision stages without choosing the player's outcome. Jules sends procedural decisions to Morgan.
- `first_day`, `break_room`, and `team_context` each provide the requested practical purpose. Repeat wording depends only on canonical `julesTopicsSeen`.
- `talk_to_jules` retains canonical topic recording, uniqueness, zero simulated time, empty domain effects, and no ledger consequence.
- Topic replies are calculated from the pre-submit safe view but enter React state only after the canonical mutation succeeds. Failure leaves the prior/intro reply untouched and re-enables controls.
- Jules, fridge, coffee, carried snack, pointer hotspots, keyboard `E`, and queued exit-close requests all share the Task 4 local gate. No Task 6 global coordinator was introduced.
- The old flavor rotation is removed. Both pointer and keyboard interaction call the same `handleInteract("jules")` path and topic buttons submit schema-defined canonical IDs.
- The Desk OS, navigation, fullscreen, finite resources, approved static snack basket, canonical fridge visuals, queued close, accessible semantics, and reduced-motion rules remain covered by passing existing tests.
- No server dialogue, provider call, AI authority, specialized Task 6 tools, ledger edit, subagent, or reviewer was added.

## Concerns

- Package-local Vitest commands remain incompatible with the repository-root include globs. Exact attempted commands and passing root-relative equivalents are recorded above.
- The dialogue panel intentionally offers three topic buttons at a time. Before `first_day` is discussed it offers first day/current work/break; afterward it offers current work/break/team context, while all seen topics remain visible as discussed labels.
- Existing duplicate-Three.js warnings remain in spatial tests; this task did not alter Three.js loading.

## Review round 1

### Findings and fixes

1. `current_work` now prioritizes every recognized public investigation or documentation step over generic dismiss/escalate decision wording. Explicit fixtures prove `dismiss_alert` is public alongside `inspect_login_context`, and again alongside `inspect_account_history` after the device check is complete.
2. The resolver recognizes public `read_handoff` availability and gives beginner-safe Email guidance to read the shift handoff and note unfinished work. The unknown-public-action fallback now acknowledges that public work is available without emitting action IDs, answer IDs, or an outcome.
3. A latched exit-close intent is drained after either success or rejection of the initial Jules/resource request. Rejected initial requests trigger exactly one `close_fridge` attempt, the shared gate remains held until that attempt settles, repeated exit intent is suppressed, and close failure gives explicit return-and-retry direction.
4. The nonmodal dialogue Close button and Escape dismissal remain available during canonical submission. Dismissal does not cancel the request; a reply is retained for the next open only after success, while topic and resource controls remain blocked by the shared pending gate.

No SDD ledger, Task 6 coordinator, specialized tool, provider/AI path, server dialogue, pack answer key, or full-world browser path was added or changed.

### Review RED-GREEN-REFACTOR record

Core review regressions were added first for early-dismiss priority, device-complete/account-history priority, shift-handoff coverage, and non-denial of unrecognized public work:

```text
pnpm exec vitest run packages/core/test/jules.test.ts --reporter=dot
```

- RED: 3 failed, 5 passed. The resolver selected decision wording before required investigation, did not recognize the handoff stage, and denied a public step in its fallback.
- GREEN: 8/8 passed after reordering recognized safe work, adding handoff guidance, and making the fallback action-presence-safe.

Web review regressions were then added for pending Close, pending Escape/shared gating, and a rejected Jules request with a queued exit-close:

```text
pnpm exec vitest run apps/web/test/jules.test.tsx --environment jsdom --reporter=dot
```

- RED: 3 failed, 4 passed. Close was disabled, Escape did not dismiss, and initial rejection released the gate without attempting the queued close.
- GREEN: 7/7 passed after decoupling nonmodal dismissal from pending state and draining the queued close before releasing the shared gate.
- REFACTOR: removed the now-dead disabled Close styling and strengthened stage fixtures to assert the competing dismiss action is actually public.

### Review verification

- Focused core Jules: `pnpm exec vitest run packages/core/test/jules.test.ts --reporter=dot` — PASS; 8/8 tests in 1 file.
- Focused web Jules plus Task 4 break-room: `pnpm exec vitest run apps/web/test/jules.test.tsx apps/web/test/break-room.test.tsx --environment jsdom --reporter=dot` — PASS; 18/18 tests across 2 files.
- Full core: `pnpm exec vitest run packages/core/test --reporter=dot` — PASS; 42/42 tests across 4 files.
- Full web: `pnpm exec vitest run apps/web/test --environment jsdom --reporter=dot` — PASS; 128/128 tests across 14 files.
- Repository: `pnpm test` — PASS; 226/226 tests across 28 files.
- Typecheck: `pnpm typecheck` — PASS; 10/10 package tasks.
- Lint: `pnpm lint` — PASS; 10/10 package tasks.
- Formatting: Prettier check of all six review implementation/test files — PASS.
- Diff checks: `git diff ea745c8^ ea745c8 --check` and `git diff --check` — PASS.
- Scope audit: review fix commit contains only the six files listed below; no ledger file was touched.

The full web suite still emits the pre-existing duplicate-Three.js warning from `soc-layout.test.ts`, `desk-surface.test.ts`, and `sit-zone.test.ts`; all three files pass.

### Review files

- `packages/core/src/jules.ts` — safe-work priority, handoff guidance, and non-denying public-action fallback.
- `packages/core/test/jules.test.ts` — competing-action stage, handoff, and fallback regressions.
- `apps/web/src/world/JulesDialogue.tsx` — pending-safe nonmodal Close and Escape.
- `apps/web/src/world/SpatialShell.tsx` — rejection-safe queued-close draining under the single Task 4 gate.
- `apps/web/test/jules.test.tsx` — pending dismissal, retained-success, shared-gate, and rejected-request queued-close regressions.
- `apps/web/src/styles.css` — removal of obsolete disabled Close styling.

### Review self-review

- The resolver decision branch remains below device inventory, knowledge search, ticket documentation, login context, account history, alert review, and handoff branches. It uses only the existing safe public projection and does not expose action identifiers in reply output.
- The queued-close helper clears the latch before awaiting the close. A repeated exit during that close cannot create a third request because final cleanup clears any new latch without looping; direct failed `close_fridge` submissions are not recursively retried.
- Successful initial requests still decide whether to close from the returned canonical view. Rejected non-close requests make one ambiguity-safe close attempt, and the pending ref/state are released only in the outer `finally` after it settles.
- Closing the panel changes presentation state only. Canonical submission continues, failure leaves the reply untouched, and success stores the deterministic safe reply for the next open.
- Existing Task 4 break-room controls, fridge queued-close behavior, canonical resources, navigation, Desk OS, accessibility, and reduced-motion behavior remain covered by the focused and full passing suites.

### Review concerns

- No implementation concerns remain from the four review findings.
- Package-local filtered Vitest remains incompatible with repository-root include globs, as documented in the original verification section; root-relative commands are the working equivalent.
- The duplicate-Three.js test warning is unchanged and outside Task 5 scope.
