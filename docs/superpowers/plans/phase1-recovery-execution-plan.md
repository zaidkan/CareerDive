# Phase 1 Recovery Execution Plan

**Role:** Recovery orchestrator (Kiro). **Date:** 2026-09-18.
**Status:** Recovery path decided. No destructive action executed by this document.
**Not in scope:** re-auditing architecture, reopening canonical design, redesigning Phase 1.

---

## Incident Summary

Several Phase 1 agents ran concurrently; the laptop became unstable and work was
interrupted mid-flight. Result across the repo: some tasks committed to `main`,
several tasks left uncommitted/untracked in the main working tree, one 0-byte
interrupted-write residue file, and one unrelated scratch test in another worktree.

Two read-only recovery audits were produced and are the inputs to this plan:

- **Model A** — repository/worktree/Git/reflog forensic audit.
- **Model B** — Phase 1 implementation completeness/correctness audit.

Both audits reconcile cleanly with live Git. Orchestrator re-verification confirmed
the single pivotal finding (T05 validator vs. real pack cascade).

---

## Inputs Used

- `docs/superpowers/plans/phase1-recovery-repository-audit.md` (Model A)
- `docs/superpowers/plans/phase1-recovery-completeness-audit.md` (Model B)
- Authoritative: Phase 1 plan `91a8811`, reconciled spec `a82a02b`, orchestrator context `32f43d0`, Phase 0 baseline `73994cb`.
- Live Git re-verification by orchestrator (2026-09-18).

### Orchestrator re-verification (delta vs. the audits)

The audits recorded HEAD as `6ad46a2`. Live HEAD is now **`73a75f4`**. Two commits
landed on top of the audited base:

- `42e4cb6` — `docs: add SOC structured record fixtures companion spec`
- `73a75f4` — `docs: Phase 2 query engine implementation prep (planning only)`

`git diff --name-only 6ad46a2 73a75f4` = **docs-only** (no Phase 1 code changed).
Therefore both audits' code findings remain valid against the live tree.

Independently reproduced:
- `pnpm typecheck` → **10/10 PASS**.
- `@sim/career-packs` tests → **7 failed / 23 passed**, failing on the checked-in pack
  because the uncommitted T05 validator rejects the DEAD phishing scaffolding
  (`open_phishing_report`, `inspect_email_headers`, `check_link_destination`,
  `quarantine_message`, `notify_reporter`; observe refs to `phishing-email-1`,
  `phishing-headers-1`). No conflict markers in any tracked file. 0-byte
  `phase1-integration-test-matrix.md` residue confirmed present.

---

## Canonical Recovery Base

**Base commit: `73a75f4` (current `main` HEAD).**

Rationale:
- It is a linear descendant of the approved doc/spec state (`a82a02b` → `32f43d0` → `91a8811`).
- It contains all genuinely COMPLETE, committed Phase 1 tasks: **T01 (`7e984b0`), T03 (`6ad46a2`), T06 (`b40b064`), T07 (`fc77cff`)**.
- The two commits above `6ad46a2` are docs-only (verified) — no broken/incomplete code was merged.
- No competing Phase 1 implementation exists on any other branch (Model A duplicate check: none). T02/T04/T05 live in exactly one place: the main working tree.

No branch switch, reset, or rebase is required to establish the base. The base is
where we already stand. Recovery is: commit the good dirty work in coherent slices,
after clearing the one content blocker.

---

## T01–T08 Recovery Matrix

| Task | Physical location | Commit/branch/worktree | Implementation status | Tests | Recovery decision | Dependency |
|---|---|---|---|---|---|---|
| **T01** Event lifecycle + field schema | main repo | committed `7e984b0` (+1 trivial dirty line in `packages/core/src/events.ts`, +1 dirty test import cleanup) | Complete; new statuses/fields, validated transitions, world-state round-trip | event-lifecycle suite passes (currently unrunnable only via T05 cascade) | **KEEP AS COMPLETE** (decide the 1-line `isLegalEventTransition` follow-up in the T02 commit) | none |
| **T02** WorkItem serializer projection + hidden-state | main repo working tree | uncommitted: `serializer.ts`, `schemas/client-view.ts`, `schemas/events.ts`; untracked `core/test/workitem-projection.test.ts` | Partial-but-coherent: emits `category`, drops raw `templateId`, projects T01 fields, strips artifact `relatedArtifactIds`. **Task-view `relatedArtifactIds` still emitted** (test-locked) | 7 projection tests written; run blocked by T05 cascade | **KEEP + FINISH** (commit projection now; resolve task-view leak per ruling below) | T01 |
| **T03** per-action task-gate-release | main repo | committed `6ad46a2` (HEAD ancestor) | Complete; `releasesActionGate` flag, availability/reducer agreement, replay | gate-release suite passes (unrunnable only via T05 cascade) | **KEEP AS COMPLETE** | T01 |
| **T04** frontend templateId consumer migration | main repo working tree | uncommitted: `CaseRail.tsx`, `GuideSearch.tsx`, 6 web test fixtures | Complete: zero `templateId` in `apps/web/src` (grep clean), labels/branches via `category` | 58/58 focused web tests pass; golden-path blocked only by T05 cascade | **KEEP + FINISH** (commit together with T02 — shares the `category` contract) | T02 |
| **T05** pack validation strengthening | main repo working tree | uncommitted: `schemas/career-pack.ts` (+119); untracked `career-packs/test/pack-validation.test.ts` | Partial: 6 rules implemented correctly; **missing** migration-gate (`releasesActionGate`) consistency rule; stale "T03 not frozen" comment | 9/10 new tests pass; **correctly rejects invalid real pack** → cascade | **KEEP + REPAIR** (rules are correct — do NOT revert; add missing rule, fix comment; requires content decision first) | T01, T03 |
| **T06** schema-only sketch types | main repo | committed `b40b064` | Complete; types-only, no runtime imports | 11/11 pass incl. isolation assertion | **KEEP AS COMPLETE** | none (independent) |
| **T07** rng wire-or-delete | main repo | committed `fc77cff` | Complete (resolved to DELETE); no second randomness | rng-wire-or-delete suite passes (unrunnable only via T05 cascade) | **KEEP AS COMPLETE** | none (independent) |
| **T08** integration + replay + full-suite verification | main repo | not started; only 0-byte `phase1-integration-test-matrix.md` residue | Not started | none | **NOT STARTED** (runnable only after content decision + T02/T04/T05 committed) | T01,T02,T03,T04,T05 |

**No task is DISCARD/RESTART.** All uncommitted work is coherent, single-sourced,
and verified as forward progress. Discarding any of it would throw away correct
implementation and require re-doing work that already passes its own tests — strictly
less safe than keeping it. The only "broken" symptom (37-test cascade) is a *correct*
validator meeting *known-invalid* content, not defective task code.

---

## Commits / Branches / Worktrees to Preserve

- **Preserve as-is (already committed, canonical):** `73a75f4`, `42e4cb6`, `6ad46a2`, `7e984b0`, `fc77cff`, `b40b064` on `main`.
- **Preserve before any cleanup (uncommitted, valuable):** the 15 dirty tracked files + 4 relevant untracked files in the main working tree. These carry T02/T04/T05 and the two audit reports. Preservation mechanism: commit them (steps below). Optional belt-and-suspenders before touching the tree: `git stash push -u` snapshot or a `wip/phase1-recovery-snapshot` branch (see Git Recovery Actions).
- **Do NOT touch / leave alone:** all `zaidkan/*` worktrees and branches — Model A verified they contain only older/unrelated content, graphics, movement, navigation, and inventory work. `zaidkan/t2-navigation` and `zaidkan/t3-goldenpath` are name-coincidence only (verified NOT P1-T02/T03).
- **No orphan/dangling Phase 1 commit needs rescue** — `git fsck` dangling objects are historical WIP fully superseded by committed work (Model A §Reflog).

---

## Partial Work to Repair

1. **T05 validator (`packages/schemas/src/career-pack.ts`)** — add the missing
   `releasesActionGate` migration-gate consistency rule; correct the stale
   "T03 has not frozen the authoring shape" comment (T03 is committed at `6ad46a2`).
   Do **not** weaken the correct orphan/observe-target rules.
2. **T02 task-view `relatedArtifactIds`** — orchestrator ruling required (below).
3. **`packages/core/src/events.ts` one-line guard** — orchestrator ruling (below).

## Work to Discard / Restart

- **None** at the task level.
- **0-byte `docs/superpowers/plans/phase1-integration-test-matrix.md`** — interrupted-write
  residue. Discard the empty file; it will be regenerated as a real artifact during T08.

---

## Orchestrator Rulings (so workers do not stall)

- **R1 — Content decision (the blocker):** The DEAD phishing scaffolding is invalid
  content that Phase 0 already flagged. Per Phase 1 plan §P1-T05 Risks, Phase 1 must
  not silently re-author content. **Escalate to user** with two clean options:
  (a) *quarantine* — remove the 5 dead phishing actions + their 2 undefined observe
  refs from `content/packs/cybersecurity-analyst/pack.yaml`; or (b) *greenfield-fix* —
  properly define the artifacts/wiring (larger, likely Phase 7 territory).
  **Recommended: (a) quarantine** — smallest correct change, unblocks everything,
  removes known-dead content rather than masking it with an allowlist.
  **An allowlist exemption is disfavored** (it hides real dead content).
- **R2 — Task-view `relatedArtifactIds`:** Ruling = **complete the scope** (strip it in
  the serializer and update the `keeps legacy task-view record lists working` test),
  matching the plan's "no exhaustive `relatedArtifactIds`" DoD item. This keeps T02
  fully plan-compliant rather than shipping a documented compat exemption. Assign to
  the T02 finisher.
- **R3 — `core/events.ts` guard:** Ruling = **revert to `?.includes(to) ?? false`**
  (defensive form). No caller passes invalid statuses; the safer form matches the
  committed T01 helper intent. One-line change, fold into the T02 commit.

---

## Integration Order (safest sequence)

1. Establish/confirm base = `73a75f4` (no action; we are here).
2. (Optional safety) snapshot dirty tree to `wip/phase1-recovery-snapshot`.
3. Resolve **R1 content decision** (user) — unblocks all pack-dependent tests.
4. Commit **T02 + T04** together (shared `category` contract) incl. R2 + R3.
5. Commit **T05** repair (missing rule + comment fix).
6. Run **T08** full verification; only then push `main`.

Prefer: reviewed committed work (T01/T03/T06/T07 already in) → isolated clean task
commits (T02+T04, then T05) → then integration. Never merge broken partial work to
preserve it — here nothing is broken, so this is straightforward commit slicing.

---

## Exact Git Recovery Actions (conceptual — do NOT execute until instructed)

1. **Preserve (optional, recommended first):**
   `git stash push -u -m "phase1-recovery-snapshot"` then `git stash apply` to keep working;
   OR `git branch wip/phase1-recovery-snapshot && git add -A && git commit -m "wip: phase1 recovery snapshot"` on that branch, then return to `main`. Purpose: lossless rollback point.
2. **Discard residue:** remove 0-byte `docs/superpowers/plans/phase1-integration-test-matrix.md` (it is empty; recreated in T08).
3. **After R1 content decision:** edit `content/packs/cybersecurity-analyst/pack.yaml` per the approved option (quarantine recommended). This is a content change requiring the recorded decision — not silent.
4. **Commit the two audit reports** (currently untracked) as a docs commit so the recovery record is durable.
5. **Commit T02 + T04** (one coherent commit): `serializer.ts`, `schemas/client-view.ts`, `schemas/events.ts`, `core/test/workitem-projection.test.ts`, `CaseRail.tsx`, `GuideSearch.tsx`, the 6 web fixture files, golden-path assertions, plus R2 (task-view strip + test) and R3 (`events.ts` revert + test import cleanup).
6. **Commit T05** (repair): `schemas/career-pack.ts` (+ missing migration-gate rule, comment fix) and `career-packs/test/pack-validation.test.ts`.
7. **Do NOT** cherry-pick, merge, rebase, or delete any `zaidkan/*` branch/worktree — all unrelated.
8. **Do NOT** pop/apply/drop any stash — none live.
9. **Push `main`** (currently 87 ahead of `origin/main`) only after T08 is green.

---

## Restart DAG (actual recovery state)

```
[COMPLETE] T01 ──┬──────────────► T02 ──► T04 ──┐
                 ├──► T03 (COMPLETE) ────────────┤
                 └──► T05 (repair, needs R1) ────┼──► T08 (integration + verify)
[COMPLETE, independent] T06 ────────────────────┤
[COMPLETE, independent] T07 ────────────────────┘
```

- T01, T03, T06, T07: done. Keep.
- Content decision R1 gates T05 and all pack-dependent verification.
- T02→T04 client contract must be stable before T04 is finalized (it is — same commit).
- T08 last.

---

## First Coding Wave After Recovery

Gated hard by **R1 (user content decision)**. Once R1 is resolved:

- **Wave 1 (can start immediately after R1, parallel — disjoint files):**
  - *Worker α* → **T05 repair**: `packages/schemas/src/career-pack.ts` + `packages/career-packs/test/pack-validation.test.ts`.
  - *Worker β* → **T02 finish + T04**: `packages/core/src/serializer.ts`, `packages/schemas/src/{client-view,events}.ts`, `apps/web/src/**`, web fixtures, `core/test/workitem-projection.test.ts` (incl. R2, R3).
  - File ownership is disjoint (schemas/career-pack.ts vs serializer+client-view+events+web), so these two are safe to parallelize. Note: both touch `packages/schemas`, so coordinate the commit order (T02/β lands `events.ts`/`client-view.ts`; T05/α lands only `career-pack.ts`). If contention appears, serialize β then α.
- **Wave 2 (sequential, after Wave 1 green):**
  - **T08** integration owner: full lint/typecheck/test/build + replay equality + golden-path all-renderers + hidden-state + no-Phase-2-mechanics; then push.

---

## Verification Before Resuming

- Baseline already green: `pnpm typecheck` 10/10, `pnpm build` 10/10 (Model B; typecheck re-confirmed by orchestrator).
- After R1 content fix, re-run `@sim/career-packs` and `@sim/core` suites → expect the 37-test cascade to clear.
- After T02+T04 commit: `@sim/core` serializer/projection + `apps/web` focused suites.
- After T05 commit: pack-validation suite 10/10 incl. `loads the checked-in cybersecurity pack`.

## Phase 1 Definition-of-Done Remaining

| DoD item | State after recovery plan |
|---|---|
| EventInstance Work Item semantics | PASS (T01) |
| Client WorkItem projection, no raw `templateId` | PASS on commit (T02) |
| No exhaustive `relatedArtifactIds` | PASS after R2 (task-view strip) |
| Migrated opt-out / unmigrated gated | PASS (T03/T04) |
| Pack validation catches errors; real pack loads | PASS after R1 content decision + T05 repair |
| `rng.ts` resolved, no second randomness | PASS (T07) |
| `foldActionLog` replay exact; full suite + build green | Pending T08 (unblocked after R1) |
| Legacy shift playable in all 3 renderers | Pending — unblocked once pack loads (R1) |
| Sketch types frozen, runtime-unused | PASS (T06) |
| No Phase 2 mechanics implemented | PASS |

The only true blocker to resuming is the **R1 content decision**, which is a
governance/content call reserved for the user per the plan's explicit STOP condition.
Everything else is mechanical commit-slicing of already-correct work.
