# Phase 1 Recovery — Repository/Worktree Forensic Audit (READ-ONLY)

Audit date: 2026-09-18. Auditor: Model A. No repair performed.
Main repo: `/Users/zaid/orca/Career-Expo`.

## Pre-existing known commits verified present on main

- `a82a02b` canonical reconciled SOC design — present.
- `32f43d0` orchestrator-context update — present.
- `91a8811` Phase 1 engineering plan — present.
- `73994cb` Phase 0/reference commit — present.

---

# Current Repository State

- Current branch: `main`
- Current HEAD: `6ad46a2` — `feat(P1-T03): per-action WorkTask gate-release mechanism`
- Main vs `origin/main`: ahead 85, behind 0. Phase 1 commits NOT pushed.
- Working tree: dirty. Staged: none (0 staged files). All changes unstaged or untracked.
- Unstaged (15 files):
  - `apps/web/src/components/CaseRail.tsx` — T04 category migration
  - `apps/web/src/components/tools/GuideSearch.tsx` — T04 category migration
  - `apps/web/test/app.test.tsx`, `desk-os.test.tsx`, `journey.test.ts`, `jules.test.tsx`, `work-tools.test.tsx`, `world.test.tsx` — templateId→category fixture updates (T02/T04 fallout)
  - `apps/web/test/workplace-golden-path.test.tsx` — new hidden-state assertions (no templateId, no relatedArtifactIds)
  - `packages/core/src/events.ts` — 1-line `isLegalEventTransition` tweak (T01 follow-up)
  - `packages/core/src/serializer.ts` — T02 projection (category bucket, acknowledgedAt/linkedTicketId/followUpRefs, drop relatedArtifactIds)
  - `packages/core/test/event-lifecycle.test.ts` — 1-line import cleanup
  - `packages/schemas/src/career-pack.ts` — T05 validation strengthening (+119)
  - `packages/schemas/src/client-view.ts` — ClientEvent drops templateId, adds category (+10/-2)
  - `packages/schemas/src/events.ts` — WorkItemCategorySchema (+14)
- Untracked (4):
  - `docs/superpowers/plans/phase1-integration-test-matrix.md` — 0 BYTES (interrupted write, see residue)
  - `docs/superpowers/specs/interactivity-playtest-and-acceptance-pack.md` — 206 lines, complete-looking
  - `packages/career-packs/test/pack-validation.test.ts` — 224 lines (P1-T05 tests)
  - `packages/core/test/workitem-projection.test.ts` — 147 lines (P1-T02 tests, header `P1-T02 WorkItem projection + hidden-state scoping`)
- Conflicts: none. No unmerged paths. No conflict markers (`<<<<<<<`/`>>>>>>>`) found via `git grep`.

---

# Worktree Inventory

`git worktree list --porcelain` reports 13 worktrees. All paths exist; none stale/missing. Nothing pruned.

| Worktree path | Branch | HEAD | Clean/dirty | Staged | Unstaged | Untracked | Suspected task |
|---|---|---|---|---|---|---|---|
| `/Users/zaid/orca/Career-Expo` | main | 6ad46a2 | dirty | 0 | 15 | 4 | Phase 1 T01/T03/T06/T07 committed; T02/T04/T05 dirty |
| `.../workspaces/Career-Expo/content-depth` | zaidkan/content-depth | 0fb4b31 | clean | 0 | 0 | 0 | older content work, pre-Phase 1 |
| `.../content-round2` | zaidkan/content-round2 | 4c0fc35 | clean | 0 | 0 | 0 | older content work, pre-Phase 1 |
| `.../env-polish` | zaidkan/env-polish | c4df481 | dirty-untracked-only | 0 | 0 | 1 (`packages/core/test/shift-depth.test.ts`) | unknown/unrelated scratch test (imports `applyTaskAttempt`, `julesDialogue`, `respondToNotification` — APIs not matching current tree) |
| `.../graphics-polish` | zaidkan/graphics-polish | 9a4eb0e | clean | 0 | 0 | 0 | visual polish, unrelated |
| `.../graphics-soc` | zaidkan/graphics-soc | 16cb357 | clean | 0 | 0 | 0 | visual polish, unrelated |
| `.../movement-wiring` | zaidkan/movement-wiring | 7367f8e | clean | 0 | 0 | 0 | movement, unrelated |
| `.../t11f1-inventory-lookup` | zaidkan/t11f1-inventory-lookup | 19e2658 | clean | 0 | 0 | 0 | inventory lookup, unrelated |
| `.../task10-parity-acceptance` | zaidkan/task10-parity-acceptance | 883d9f8 | clean | 0 | 0 | 0 | parity tests, unrelated |
| `.../task8-workstation-tools` | zaidkan/task8-workstation-tools | e2de9de | clean | 0 | 0 | 0 | workstation tools, unrelated |
| `.../task9-navigation` | zaidkan/task9-navigation | 830b245 | clean | 0 | 0 | 0 | navigation, unrelated |
| `.../zk1-now` | zaidkan/zk1-now | b8786dd | clean | 0 | 0 | 0 | scanner/evidence, unrelated |
| `.../zk2-polish` | zaidkan/zk2-polish | c4df481 | clean | 0 | 0 | 0 | copy polish, unrelated |

Only dirty worktrees: main repo (Phase 1) and env-polish (1 unrelated untracked scratch test).

---

# Branch Inventory

Local branches (15) + remotes `origin/HEAD`, `origin/experimental`, `origin/feature/career-sim-beta`, `origin/main` (all at older commits; local main 85 ahead, nothing pushed).

| Branch | Commit | Ahead of main | Behind main | Worktree | Likely worker/task (inference) |
|---|---|---:|---:|---|---|
| main | 6ad46a2 | 0 | 0 | main repo | Phase 1 T01/T03/T06/T07 (committed) |
| zaidkan/content-depth | 0fb4b31 | 0 | 62 | yes | older content — inference |
| zaidkan/content-round2 | 4c0fc35 | 0 | 29 | yes | older content — inference |
| zaidkan/env-polish | c4df481 | 0 | 32 | yes | copy polish — inference |
| zaidkan/graphics-polish | 9a4eb0e | 0 | 60 | yes | visual — inference |
| zaidkan/graphics-soc | 16cb357 | 0 | 57 | yes | visual — inference |
| zaidkan/movement-wiring | 7367f8e | 0 | 66 | yes | movement — inference |
| zaidkan/t11f1-inventory-lookup | 19e2658 | 0 | 64 | yes | inventory — inference |
| zaidkan/t2-navigation | c493cad | 1 | 85 | none | old navigation fix (collision.ts/navigation.ts); name coincidence, NOT P1-T02 — verified via diff |
| zaidkan/t3-goldenpath | 511484d | 1 | 85 | none | old golden-path test; name coincidence, NOT P1-T03 — verified via diff |
| zaidkan/task10-parity-acceptance | 883d9f8 | 0 | 68 | yes | parity tests — inference |
| zaidkan/task8-workstation-tools | e2de9de | 0 | 77 | yes | workstation tools — inference |
| zaidkan/task9-navigation | 830b245 | 0 | 77 | yes | navigation — inference |
| zaidkan/zk1-now | b8786dd | 0 | 25 | yes | scanner/evidence — inference |
| zaidkan/zk2-polish | c4df481 | 0 | 32 | yes | copy polish — inference |

No Phase 1 work on any branch except main. Large "behind" counts reflect main advancing 85 commits past old fork points, not deletions.

---

# Phase 1 Commit Inventory

Search covered ALL refs (`git log --all`, P1 grep + keyword grep + diff inspection).

| Commit | Branch/ref | Suspected task | Changed files | Merged into current main? |
|---|---|---|---|---|
| b40b064 `feat(schemas): add P1-T06 schema-only sketch types` | main | T06 | schemas evidence-facts/npc-intent/records/ticket + sketches.test.ts (6 files, +373) | YES (ancestor of HEAD) |
| fc77cff `feat(P1-T07): delete unused rng.ts and rngState` | main | T07 | core index/rng/world, schemas world, rng-wire-or-delete.test.ts | YES |
| 7e984b0 `feat(P1-T01): extend EventInstance with Work Item lifecycle` | main | T01 | schemas events, core events/world, event-lifecycle.test.ts (251 lines) | YES |
| 6ad46a2 `feat(P1-T03): per-action WorkTask gate-release` | main (HEAD) | T03 | schemas tasks, core availability/reducer, gate-release.test.ts (141), tasks.test.ts | YES (is HEAD) |
| (uncommitted dirty) serializer+schemas+web | main working tree | T02 + T04 | serializer.ts, client-view.ts, events.ts, CaseRail, GuideSearch, 7 web tests | NO — uncommitted |
| (uncommitted dirty) career-pack.ts +119 | main working tree | T05 | schemas career-pack.ts | NO — uncommitted |
| (untracked) workitem-projection.test.ts | main working tree | T02 | 147-line test, header names P1-T02 | NO — untracked |
| (untracked) pack-validation.test.ts | main working tree | T05 | 224-line test | NO — untracked |

No T04 or T08 commits exist anywhere. No T02/T05 commits exist anywhere (work is dirty/untracked only).

---

# Uncommitted Work Inventory

Main repo only (env-polish scratch file classified separately as unrelated).

- T02 (serializer projection): `packages/core/src/serializer.ts` (+34/-11 approx), `packages/schemas/src/client-view.ts`, `packages/schemas/src/events.ts` (WorkItemCategorySchema), `packages/core/test/workitem-projection.test.ts` (untracked), golden-path hidden-state assertions. Classification: coherent likely-progress, partially staged = NO (0 staged; fully unstaged), tests present (GREEN/RED state unknown — Model B verifies).
- T04 (frontend templateId consumer migration): `CaseRail.tsx` (caseType on category), `GuideSearch.tsx` (category check), 6 web test fixture updates templateId→category. Classification: coherent likely-progress, paired with T02.
- T05 (pack validation): `packages/schemas/src/career-pack.ts` (+119: duplicate instanceId, deadlineMinutes>triggerAt, observeArtifactIds reference checks), `packages/career-packs/test/pack-validation.test.ts` (untracked, 224 lines). Classification: coherent likely-progress.
- T01 follow-up: 1-line `isLegalEventTransition` change (drop `?? false`) + 1-line test import cleanup. Classification: unclear, trivial; needs care (removes undefined-guard — Model B should review).
- No unfinished RED-only state identifiable; no merge/conflict residue; no `.rej`/`.orig`/swap/patch files.

---

# Reflog / Dangling Commit Candidates

Reflog (main): two `reset: moving to HEAD` events during Phase 1 day (13:46:28 at 91a8811; 13:57:55 at 7e984b0). No detached-HEAD work, no rebase/amend/cherry-pick entries. Resets bracket T06+T07 commits and T01 commit — consistent with worker resetting to plan base then rebuilding.

`git fsck --unreachable --dangling`: no dangling commits from interrupted Phase 1 edits. Unreachable objects are pre-existing: two stash entries from Sep 17 12:01–12:03 (`MODEL_ROUTING.md`/`.gitignore` WIP/index pairs, unrelated desk-OS merge period), one Sep 12 stash (`92a3bc1` task10 parity untracked files), plus Sep 17 13:46/13:57 WIP/index/untracked commits that ARE Phase 1-adjacent but fully superseded:

| Reflog commit | Reachable normally? | Changed files | Likely task | Recovery importance |
|---|---|---|---|---|
| 414a5a7 WIP on main @91a8811 (13:46) | no (unreachable) | core index/rng/world, schemas events/index/world | T06+T07 mid-flight mix | LOW — superseded by b40b064 + fc77cff |
| b9098ee index on main @7e984b0 (13:57) | no | index snapshot of T01 | T01 | LOW — T01 committed as 7e984b0 |
| 464c00e untracked on main @7e984b0 (13:57) | no | playtest pack (206), pack-validation.test (194 at the time), gate-release.test (141), workitem-projection.test (147) | T02/T03/T05 + playtest doc in flight | LOW-MEDIUM — proves dirty T02/T05/T03-test work existed pre-reset and survives today; gate-release.test.ts since committed (6ad46a2). No action needed unless current dirty files prove truncated. |

No orphan Phase 1 commit needs rescue. No branches/tags created (per instruction).

---

# Stashes

`git stash list` empty in main repo and spot-checked worktrees (content-depth, env-polish, zk1-now). Unreachable stash-like objects listed above are historical, not live stashes. Do NOT pop/apply/drop — nothing to pop.

---

# Duplicate Implementations

None. Methodical check: diffed `serializer.ts`, `core/events.ts`, `schemas/events.ts`, `schemas/career-pack.ts` between main and nearest-neighbor branches (content-depth, content-round2, zk1-now, task8-workstation-tools) — all show only ABSENCE of P1 changes (old fork points), no competing implementations. `zaidkan/t2-navigation` / `zaidkan/t3-goldenpath` are old unrelated navigation/golden-path work (verified by diff), despite suggestive names. T02/T04/T05 exist in exactly one place: main working tree.

---

# Interrupted-Write / Conflict Residue

- `docs/superpowers/plans/phase1-integration-test-matrix.md` — 0 bytes, timestamp Sep 17 14:11. Empty file = interrupted-agent write residue (T08 prep started, never written). Exact path recorded. No other truncated/malformed files found; new untracked tests have valid headers/imports; no `.rej`/`.orig`/swap/patch files; no conflict markers anywhere.
- env-polish untracked `packages/core/test/shift-depth.test.ts` imports APIs (`applyTaskAttempt`, `julesDialogue`, `respondToNotification`) absent from current tree — stale scratch from another line of work, left behind. Unrelated; do not delete per instructions.

---

# Recent Supporting Documents

`docs/superpowers/plans/`: `phase1-interactivity-foundation-plan.md` (tracked, committed 91a8811, complete); `phase1-integration-test-matrix.md` (UNTRACKED, 0 bytes, INCOMPLETE — interrupted write). No `phase1-t02-t04-impact-map.md` or `phase1-t03-t05-impact-map.md` exist (tracked or untracked).

`docs/superpowers/specs/`: `interactivity-playtest-and-acceptance-pack.md` (UNTRACKED, 206 lines, Sep 17 13:57, appears complete; implementation-agnostic manual playtest pack). Canonical spec `interactivity-and-content-depth-design.md` and Phase 0/rotation docs unchanged.

---

# Phase 1 Task Location Matrix

| Task | Status | Branch/worktree | Commit(s) | Dirty files | Confidence |
|---|---|---|---|---|---|
| T01 Event lifecycle + field schema | INTEGRATED | main / main repo | 7e984b0 | 2 trivial follow-up lines (core events.ts, event-lifecycle.test.ts) | high |
| T02 WorkItem serializer projection | STARTED — UNCOMMITTED | main / main repo | none | serializer.ts, client-view.ts, schemas events.ts, workitem-projection.test.ts (untracked), golden-path assertions | high |
| T03 task-gate-release | INTEGRATED | main / main repo | 6ad46a2 (HEAD) | none | high |
| T04 frontend templateId migration | STARTED — UNCOMMITTED | main / main repo | none | CaseRail.tsx, GuideSearch.tsx, 6 web test fixtures | high |
| T05 pack validation | STARTED — UNCOMMITTED | main / main repo | none | schemas career-pack.ts +119, pack-validation.test.ts (untracked) | high |
| T06 future contract sketches | INTEGRATED | main / main repo | b40b064 | none | high |
| T07 rng wire-or-delete | INTEGRATED | main / main repo | fc77cff | none | high |
| T08 integration + replay + full suite | NOT STARTED | — (empty 0-byte matrix file only) | — | phase1-integration-test-matrix.md (0 bytes) | high |

Correctness NOT judged (Model B scope). Locations only.

---

# Recommended Recovery Order

Inspect/recover in this order only. Perform no recovery in this audit.

1. Verify dirty T02 work first: `packages/core/src/serializer.ts`, `packages/schemas/src/client-view.ts`, `packages/schemas/src/events.ts`, `packages/core/test/workitem-projection.test.ts` — largest coherent uncommitted chunk; T04 depends on it.
2. Verify T04 migration: `CaseRail.tsx`, `GuideSearch.tsx`, web test fixtures — must stay consistent with T02 projection.
3. Verify T05: `packages/schemas/src/career-pack.ts` delta + `packages/career-packs/test/pack-validation.test.ts`.
4. Review 1-line T01 follow-up (`isLegalEventTransition` guard removal) before any commit — only risky line in tree.
5. Decide fate of 0-byte `phase1-integration-test-matrix.md` (T08 prep residue: keep-and-fill vs remove) and commit or track playtest pack (206-line untracked doc).
6. Run focused suites (workitem-projection, pack-validation, gate-release, event-lifecycle, web golden-path) then full suite before committing T02/T04/T05.
7. Decide env-polish scratch `shift-depth.test.ts` disposition (unrelated worktree; likely discard, not Phase 1).
8. Push main (85 ahead of origin) only after Model B correctness review + integration green.
