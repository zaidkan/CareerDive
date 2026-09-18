# Phase 1 Recovery Completeness Audit (Model B — implementation, read-only)

**Date:** 2026-09-18
**Auditor:** Model B (implementation quality/completeness; no fixes applied)
**Scope note:** Model A covers Git/worktree/reflog/recovery state separately. This document covers only what Phase 1 functionality is actually implemented, incomplete, broken, missing, or inconsistent with the approved plan.
**Authoritative contracts:** Phase 1 plan `91a8811`, reconciled spec `a82a02b`, orchestrator context `32f43d0`. Architecture not reopened.

## Baseline

- **Branch:** `main`
- **HEAD:** `6ad46a2` — `feat(P1-T03): per-action WorkTask gate-release mechanism`
- **Status:** dirty. `main` is ahead of `origin/main` by 85 commits (pre-existing divergence, not assessed here).
- **Committed Phase 1 work (visible from this checkout):**
  - `b40b064` — P1-T06 schema-only sketch types (records, evidence-facts, ticket, npc-intent + type tests)
  - `fc77cff` — P1-T07 rng.ts + rngState deletion
  - `7e984b0` — P1-T01 EventInstance Work Item lifecycle statuses/fields + transition helper + tests
  - `6ad46a2` (HEAD) — P1-T03 `releasesActionGate` flag + availability/reducer agreement + tests
- **Uncommitted working-tree work (15 files, +192/−23):** P1-T02 serializer/client-view projection, P1-T04 frontend `category` migration + web fixture updates, P1-T05 pack-validation strengthening, plus a one-line hardening edit in `packages/core/src/events.ts` and a dead-import removal in the T01 test. No commit messages were trusted; all behavior below was verified by reading code and running tests.
- **Untracked planning/test artifacts:** `docs/superpowers/plans/phase1-integration-test-matrix.md`, `docs/superpowers/specs/interactivity-playtest-and-acceptance-pack.md`, `packages/career-packs/test/pack-validation.test.ts`, `packages/core/test/workitem-projection.test.ts`.
- Other worktrees/branches exist (content-depth, graphics, movement, etc.) but none were modified by this audit. No Phase 1 implementation was found that lives only on another branch — all T01–T07 work is present in this checkout (committed or dirty).

## Test Results

Exact runs on the audited working tree (code unmodified):

| Suite | Result |
|---|---|
| `pnpm typecheck` (turbo, all 10 packages/apps) | **PASS — 10/10** |
| `pnpm build` (turbo, all 10 incl. `@sim/web`) | **PASS — 10/10** |
| `packages/schemas/test/sketches.test.ts` (T06) | **PASS — 11/11** (includes no-runtime-import assertion) |
| `packages/career-packs/test/pack-validation.test.ts` (T05, untracked) | **9/10 pass**; fails only `loads the checked-in cybersecurity pack` |
| `apps/web` focused files (app, desk-os, journey, jules, work-tools, world) | **PASS — 58/58** |
| `apps/web/test/workplace-golden-path.test.tsx` | **FAIL at suite load** — `loadDefaultCybersecurityPack` throws `ZodError` (T05 rules vs real pack, see below) |
| `packages/core` + `packages/career-packs` full run | **37 failed / 23 passed; 16 of 17 files fail** — every failure traces to `loadDefaultCybersecurityPack` throwing under the uncommitted T05 validation |

Failure classification (all 37 + golden path): **introduced by Phase 1 (T05 uncommitted validation) colliding with invalid existing content** — not pre-existing breakage and not incomplete implementation of the rule itself. Evidence: committed `HEAD:packages/schemas/src/career-pack.ts` contains no orphan/observe-target rules and the Phase 0 baseline pack loaded; the uncommitted diff adds the rules; the failing assertions name exactly the Phase 0-documented DEAD phishing scaffolding:
- `Action "open_phishing_report" observes unknown artifact "phishing-email-1"` (and `inspect_email_headers` → `phishing-headers-1`, plus 3 sibling orphan actions: `check_link_destination`, `quarantine_message`, `notify_reporter`).

Per the plan (§P1-T05 Risks: "STOP and report — decision whether to quarantine or fix content is not Phase 1's to make silently"), this is the predicted stop condition. Verdict on the validator-vs-content question: **existing content is invalid; the validator is correct per the plan.** The plan's acceptance criterion ("real pack still loads") is therefore unsatisfiable without a content decision that Phase 1 is not authorized to make silently.

## T01–T08 Completeness Matrix

| Task | Status | Tests | Functional evidence | Missing work | Broken work | Safe to keep? |
|---|---|---|---|---|---|---|
| P1-T01 Event lifecycle + fields | COMPLETE | `packages/core/test/event-lifecycle.test.ts` committed (legal/illegal transitions, defaults, `WorldStateSchema` round-trip, replay) — currently unloadable only via T05 cascade | `EventStatusSchema` + `acknowledged/monitoring/waiting`; `acknowledgedAt?`, `linkedTicketId?`, `followUpRefs` (defaulted); `isLegalEventTransition` pure helper preserving legacy direct transitions; `createInitialWorldState` defaults `followUpRefs: []`; no second store (only `WorkItemCategory` projection + sketch ID refs); no Phase 2 runtime | None | Trivial nit only (see below) | Yes |
| P1-T02 Serializer projection + hidden-state | PARTIAL | New `workitem-projection.test.ts` (untracked, 7 tests) covers no-`templateId`, category mapping incl. `general` fallback, T01 field projection, artifact `relatedArtifactIds` absence, hidden-state absence, replay equality | `toClientView` emits `category` via server-side `workItemCategoryForTemplate`, drops raw `templateId`, projects `acknowledgedAt/linkedTicketId/followUpRefs`, strips artifact `relatedArtifactIds`; `ClientEventSchema` matches; golden-path no-leak assertions extended | **Task-view `relatedArtifactIds` still emitted exhaustively** (`serializer.ts:59` + `ClientTaskViewSchema.relatedArtifactIds` retained; test `keeps legacy task-view record lists working` explicitly locks the leak in). Plan required scoping per artifact/task view. Needs Kiro ruling: compat exception vs plan violation | Nothing broken; leak half-fixed | Yes, conditional on ruling |
| P1-T03 Gate release | COMPLETE | `gate-release.test.ts` committed (7 tests: legacy blocked, released executes, unrelated stays gated, post-completion legacy works, availability/reducer agreement, replay determinism, malformed-flag rejection) — logic sound, currently unrunnable via T05 cascade | `releasesActionGate` (default false) on `PackTaskDefinitionSchema`; availability omits `taskId` for released bindings; reducer double-checks binding flag; energy/event legality untouched and evaluated independently; no global bypass (per-binding lookup); zero real-pack flags set | T05-side flag-consistency validation (see conflicts) | None | Yes |
| P1-T04 Frontend migration | COMPLETE | Web fixtures updated to `category`; 58/58 focused web tests pass; golden-path blocked only by T05 cascade | **Zero `templateId` references remain in `apps/web/src`** (grep clean); `CaseRail` labels via `category`, `GuideSearch` branch via `category === "main_case"`; no casts/fallback hacks; visible behavior preserved | None | None | Yes |
| P1-T05 Pack validation | PARTIAL | 9/10 new tests pass (observe-targets, instanceId uniqueness, orphan detector ± non-tracking exemption, deadline sanity, dup action ids, artifact eventIds) | Implements all plan rules **except** migration-gate flag consistency, which is explicitly deferred with a stale comment (claims "P1-T03 has not frozen the authoring shape" though T03 is committed) | Migration-gate consistency rule; stale-comment correction; content decision for DEAD phishing (out-of-scope to fix silently) | **Blocking:** new rules reject the checked-in real pack → pack unloadable → 37 cascading failures + golden-path suite failure (see Validation Check) | Yes — the rules, not the breakage; do not revert, resolve content first |
| P1-T06 Sketch types | COMPLETE | 11/11 pass incl. `NOT referenced by any runtime path` assertion | `records.ts`, `evidence-facts.ts` (distinct from assessment `EvidenceSignal`), `ticket.ts`, `npc-intent.ts`; types-only, no reducer/serializer/server/web imports (grep clean outside schemas + its test) | None | None | Yes |
| P1-T07 RNG | COMPLETE (as DELETED) | `rng-wire-or-delete.test.ts` committed (entrypoint clean, no `rngState`, replay equality) — unrunnable only via T05 cascade | `rng.ts` deleted, `rngState` removed from both schemas (`HEAD:world.ts` grep for rng: clean), zero `Math.random`/rng references in `packages/core/src`, entrypoint export removed | None (back-compat: `WorldStateSchema` parses states without `rngState`; old logs with the inert field would need stripping — no evidence any persisted log carries it) | None | Yes |
| P1-T08 Integration | NOT STARTED | Untracked `phase1-integration-test-matrix.md` is a planning artifact only; no integration run exists | Typecheck 10/10 + build 10/10 green; full suite red (T05 cascade); replay/golden-path unprovable until pack loads | Entire T08 verification after unblocking | Nothing (nothing claimed) | n/a |

## Broken / Partial Implementations

1. **T05 vs real pack (CRITICAL, blocking).** Uncommitted orphan-detector + observe-target rules correctly flag the Phase 0-known DEAD phishing scaffolding, which makes `loadDefaultCybersecurityPack` throw. Consequence: no pack-dependent test, replay, golden path, or legacy shift can execute in this working tree. This is the plan-anticipated STOP condition, not a validator bug.
2. **T02 task-view `relatedArtifactIds` (MEDIUM, plan-compliance).** Artifact-level leak fixed; task-view leak retained and test-locked (`keeps legacy task-view record lists working`). Either the plan's "per artifact/task view" scoping needs a compat exemption ruling, or the serializer + test need a follow-up.
3. **`packages/core/src/events.ts` uncommitted one-liner (LOW).** `EVENT_TRANSITIONS[from]?.includes(to) ?? false` → `EVENT_TRANSITIONS[from].includes(to)`: unknown/invalid status input now throws instead of returning false. No current caller passes invalid statuses (typed), but the defensive form was strictly safer. Revert-or-keep is a one-line Kiro call.
4. **T05 stale deferral comment (LOW).** `career-pack.ts` comment says T03 "has not frozen the authoring shape"; T03 (`releasesActionGate`, committed `6ad46a2`) has. Comment must be corrected when the missing migration-gate rule is added.

No TODO/FIXME/HACK, `as any`, `@ts-ignore`/`@ts-expect-error`, `.skip`/`.only`, placeholder returns, debug logging, commented-out code, or duplicated competing-agent implementations were found in Phase 1-touched code (grep clean across `packages/` and `apps/web/src`).

## Cross-Task Conflicts

| Producer task | Conflicting task | Evidence | Severity |
|---|---|---|---|
| T05 (uncommitted validation) | T01/T03/T07 + all pack consumers (core tests, career-packs tests, web golden path) | New orphan + observe-target rules reject checked-in `pack.yaml` (`open_phishing_report`, `inspect_email_headers`, `check_link_destination`, `quarantine_message`, `notify_reporter`; refs to `phishing-email-1`, `phishing-headers-1`) → `loadDefaultCybersecurityPack` throws → 37 failures / 16 files + golden-path suite load failure | **Critical / blocking** |
| T05 (deferred rule) | T03 (committed flag) | `career-pack.ts` defers "migration-gate flag consistency" as "T03 has not frozen the authoring shape", but T03 froze `releasesActionGate` in `6ad46a2`; no validation of the flag's well-formedness exists | Medium (gap, no breakage) |
| T02 (uncommitted serializer) | T04 (uncommitted frontend) | None — aligned: both use `category` (`main_case`/`routine`/`handoff`/`general`); grep confirms zero `templateId` in `apps/web/src` | None |
| T02 | T01 | None — projection consumes exactly the committed T01 fields | None |
| T06 sketches | T01/runtime | None — no runtime imports; 11/11 tests incl. isolation assertion | None |
| Uncommitted `events.ts` edit | T01 (committed helper) | Removes optional-chaining guard; throws on invalid input instead of false | Low |

## Hidden-State Check

- Raw `templateId`: **no longer emitted** (serializer maps to `category` server-side; `ClientEventSchema` dropped the field; golden-path asserts absence + valid category). Internal canonical use (`event.templateId` in availability/effects/scheduler/world/notifications, `EventInstanceSchema.templateId`) is server-side only and permitted.
- Artifact `relatedArtifactIds`: **no longer emitted** (serializer strips; schema retains optional field but nothing populates it; tests assert absence).
- Task-view `relatedArtifactIds`: **STILL emitted** (`serializer.ts:59`, schema-required) — residual pre-answering of "which records matter". See partial-T02 item.
- Rules/facts/answer keys/assessment state: still stripped; golden-path + serializer assertions extended and (modulo pack cascade) intact. `ClientArtifactSchema` still permits `body/metadata/searchableText` but only populates them for observed/openable artifacts (unchanged gating).

## Task-Gate Check

- Legacy path: preserved — unflagged bindings keep `taskId` in availability and `applyAction` throws `TaskRequiredError` on incomplete progress (test: `blocks a legacy task-bound action before task completion`).
- Migrated path: released binding offers plain canonical action (`taskId` omitted) and executes without task completion while leaving `taskProgress` incomplete (test asserts `completed === false` post-execution — no silent auto-completion).
- Isolation: release flag is consulted per-binding only; energy gate, event-active filtering, and progression legality are untouched and evaluated independently. No global bypass string exists (grep: only `releasesActionGate` sites are schema def, availability target, reducer guard, tests).
- Consistency: availability and reducer agree by construction (both read the same binding flag; reducer guard additionally covers divergent caller state). Test `availability agrees with execution` locks this.
- Replay: released-action log folds to identical state (test). Determinism mechanism unchanged (`structuredClone` in, `WorldStateSchema.parse` out).
- Real-pack impact: zero — no production task sets the flag.

## Replay / Determinism Check

- Mechanism intact: `foldActionLog` switch (action/task_attempt/notification_response/workplace_interaction) untouched; T01 fields flow through `WorldStateSchema.parse`; T07 removed the only second-randomness risk (no `Math.random` in core, no `rngState`).
- New replay evidence exists for T01 (empty-log equality), T02 (projection doesn't alter fold), T03 (released-action fold equality), T07 (seed-identical init equality) — all currently unrunnable due to the T05 pack-load cascade, none refuted.
- Scheduler/event-state interaction: new statuses are inert by design (no reducer path writes them; availability/scheduler/notifications still key on `active`/`pending`/terminal sets). Correct per plan non-scope, but note: an event moved to `acknowledged/monitoring/waiting` would drop out of `availableActions` — expected until Phase 5 consequences target the new states.

## Validation Check

Implemented (uncommitted, 9/10 tests green): `observeArtifactIds` target existence (both action defaults and per-template effects), event `instanceId` uniqueness, orphan detector (tracked-but-unreferenced actions; non-tracking globals exempt), trigger/deadline coherence (`deadlineMinutes > triggerAt`), duplicate action ids, artifact `eventIds` → known instances.
Missing: migration-gate flag consistency (deferred; see conflicts).
Against the real pack: **fails loudly on exactly the Phase 0 DEAD phishing scaffolding** (5 orphan tracked actions + observe refs to undefined `phishing-email-1`/`phishing-headers-1`). Per plan §P1-T05 Risks this requires a content decision (quarantine vs greenfield fix, Phase 7 territory), not a silent content edit. Validator is right; content is invalid.

## Phase 1 Definition-of-Done Gap Analysis

| DoD item | Verdict |
|---|---|
| `EventInstance` supports approved Work Item semantics (states/fields, validated transitions) | PASS |
| Client receives approved `WorkItem` projection; no raw `templateId` | PASS (working tree) |
| No exhaustive `relatedArtifactIds` | PARTIAL (artifacts fixed; task view still emits) |
| Migrated actions opt out; unmigrated stay gated (fixture-proven) | PASS (code + tests; execution evidence blocked by cascade) |
| Pack validation catches approved authoring errors; real pack still loads (or defect flagged) | PARTIAL — catches errors, but real-pack load FAILs; defect flagged, decision pending |
| `rng.ts` resolved; no second randomness | PASS |
| `foldActionLog` replay exact; full suite + build green | PARTIAL — build + typecheck green; full suite red via T05 cascade |
| Legacy shift fully playable in all 3 renderers | FAIL — pack unloadable, shift cannot start |
| Sketch types frozen, runtime-unused | PASS |
| No Phase 2 mechanics implemented | PASS |

## Recommended Restart Sequence

Dependencies are strict — do not parallelize step 1 past step 2.

1. **Content decision (requires user/Kiro, blocks everything):** quarantine or greenfield-fix the DEAD phishing actions/artifacts in `content/packs/cybersecurity-analyst/pack.yaml` (or scope the orphan rule with an explicit allowlist — disfavored, masks real dead content). Phase 1 must not silently re-author; record the decision. Unblocks: all 37 failing tests, golden path, T08.
2. **Commit the verified working tree as-is (T02 + T04 + T01-test cleanup):** serializer projection, client-view schema, `CaseRail`/`GuideSearch` migration, web fixture updates, golden-path no-leak assertions, `workitem-projection.test.ts`. Re-run serializer + web suites after step 1.
3. **Complete T05:** add the missing migration-gate flag consistency rule for `releasesActionGate`, correct the stale "T03 has not frozen" comment, and get a Kiro ruling on task-view `relatedArtifactIds` (compat exemption vs full scoping + test update).
4. **One-line call on `core/events.ts`:** revert to `?.includes(to) ?? false` (recommended) or keep throwing form deliberately.
5. **Run T08:** full `pnpm lint && typecheck && test && build` + `foldActionLog` replay equality + golden-path all-renderers + client-visibility + no-Phase-2-mechanics checks. T08 has not started; it becomes runnable only after steps 1–3.
