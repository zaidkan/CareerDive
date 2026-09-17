# Phase 1 — Interactivity Foundation & Migration-Contract Plan (Engineering DAG)

**Mode:** Planning only. No implementation dispatched. No production code changed by this document.

## Context

Phase 1 of the SOC Interactivity & Content-Depth redesign. It is the **foundation + migration-contract**
phase: prepare the deterministic runtime for later mechanics (Phases 2–6) WITHOUT implementing them.
Settled architecture (Appendix R): **Work Item = product term; runtime = extended `EventInstance`; no
separate WorkItem store.**

## Canonical Inputs

- `docs/superpowers/specs/interactivity-and-content-depth-design.md` (reconciled `a82a02b`) — AUTHORITATIVE. Phase 1 Boundary section + §6 state model + §15.0 migration protocol + §18 Phase 1 + Appendix R.
- `docs/superpowers/specs/interactivity-and-content-depth-phase0-audit.md` — verified repo baseline.
- `docs/superpowers/specs/interactivity-implementation-orchestrator-context.md` (`32f43d0`) — team-lead reference (subordinate).
- `phase0-core-runtime-audit.md`, `phase0-content-renderer-audit.md` — evidence.
- `AGENTS.md`, `docs/career-sim-build-spec.md` — locked constraints.

## Phase 1 Objective

Extend the existing event model into Work Item semantics with a client `WorkItem` projection; add a
per-action **gate-release mechanism** so migrated actions escape `TaskRequiredError` while unmigrated
actions stay gated; apply approved hidden-state corrections (`templateId`, `relatedArtifactIds`); add
approved pack validation; provide schema-only sketch types for Phases 2–6; wire-or-delete `rng.ts`.
All additive, replay-preserving, legacy shift fully playable.

## Non-Goals (hard exclusions — reject if a task drifts here)

Query engine / query history / datasets (beyond sketch types); Evidence Fact discovery / absence-proof
runtime / evidence attachment; structured ticket state machine / ticket UI; conditional/cancellable
consequence engine; NPC availability/intents/pending runtime; phishing content; full shift content
migration; renderer/Desk OS UX overhaul; global WorkTask removal; scoring/debrief changes. Any such item
is a later-phase dependency note, not a Phase 1 task.

## Repository Baseline (verified)

- `main` @ `32f43d0` (docs) on top of code baseline `54447df`; 36 web test files / 238 tests green.
- Reconciled spec `a82a02b`. Orchestrator context `32f43d0`.
- **Verified current shapes (evidence for tasks):**
  - `EventStatusSchema` = `[pending, active, resolved, escalated, expired]` (`packages/schemas/src/events.ts:6-12`).
  - `EventInstanceSchema` **already has** `priority` (`low|normal|high|urgent`, default normal) (`events.ts:18`), plus `templateId`, `status`, `triggeredAt`, `deadlineAt`, `completedActionIds`, `observedArtifactIds`, `resolution`.
  - Task gate: `AvailableAction.taskId?` (`schemas/actions.ts:43`) + `applyAction` throws `TaskRequiredError` when bound task progress `!completed` (`core/reducer.ts:44-50`).
  - Serializer emits `templateId` (`serializer.ts:90,103`) and `relatedArtifactIds` (`:41` task view, `:152` artifact); `ClientEventSchema` picks `templateId` (`client-view.ts:33`).
  - **Frontend consumes `templateId`**: `CaseRail.tsx:9-12,51` (case-type labels), `GuideSearch.tsx:41` (`=== "suspicious_login"`). → strip must provide a client-safe replacement (spec §6.10 permits "opaque client identifier").
  - Pack validation entry: single `superRefine` (`schemas/career-pack.ts:61`); does NOT currently validate `observeArtifactIds` targets or `instanceId` uniqueness.
  - `rng.ts` (`createSeededRandom`) exported, zero callers; `rngState` write-never (Phase 0 §J).

## Architecture Contracts (already approved — do NOT re-decide)

1. Runtime Work Item = extended `EventInstance`; add lifecycle states + fields additively.
2. Gate-release is per-action (compatibility flag/binding), not global removal.
3. `templateId` not exposed raw to client; related-record lists scoped per surfacing view.
4. Determinism/replay/parity/hidden-state/AI-phrasing-only/no-scores/no-movement-evidence preserved.
5. Sketch types are types-only (no behavior) to stabilize Phase 2–6 dependencies.

---

## Engineering DAG

```
        P1-T01 (event schema + lifecycle)  ── contract foundation
                 │
      ┌──────────┼───────────────────────────┐
      ▼          ▼                            ▼
  P1-T02      P1-T03                       P1-T05
 (WorkItem   (gate-release               (pack validation
  serializer  mechanism)                  strengthening)
  projection) │                            │
   + hidden   │                            │
   -state)    │                            │
      │       │                            │
      └────┬──┴───────────┬────────────────┘
           ▼              ▼
        P1-T04        P1-T06 (sketch types, types-only)  ── independent, parallel-safe
     (frontend        P1-T07 (rng.ts wire-or-delete)      ── independent, parallel-safe
      templateId
      consumer
      migration)
           │
           ▼
        P1-T08 (integration + replay + full-suite verification)
           │
           ▼
        P1-R* (independent reviews at checkpoints)
```

| Task | Title | Depends on |
|---|---|---|
| P1-T01 | Event lifecycle + field schema extension | — |
| P1-T02 | `WorkItem` serializer projection + `relatedArtifactIds` scoping | P1-T01 |
| P1-T03 | Per-action task-gate-release mechanism | P1-T01 |
| P1-T04 | Frontend `templateId` consumer migration (client-safe category) | P1-T02 |
| P1-T05 | Pack validation strengthening | P1-T01 |
| P1-T06 | Schema-only sketch types (NPC intent, Evidence Fact, dataset, ticket) | — (uses P1-T01 refs where needed) |
| P1-T07 | `rng.ts` wire-or-delete | — |
| P1-T08 | Phase 1 integration + replay + full-suite check | T02,T03,T04,T05,T06,T07 |

---

## Detailed Tasks

### P1-T01 — Event lifecycle + field schema extension
- **Objective:** Extend `EventInstanceSchema` + `EventStatusSchema` with the approved Work Item semantics, additively.
- **Why:** Foundation contract every downstream task depends on; "Work Item = extended EventInstance" (Appendix R1, §18 Phase 1).
- **Dependencies:** none.
- **Scope:** Add statuses `acknowledged`, `monitoring`, `waiting` to `EventStatusSchema`. Add fields: `acknowledgedAt?: number`, `linkedTicketId?: string`, `followUpRefs?: string[]` (names per spec). **Do NOT re-add `priority` — it already exists** (`events.ts:18`); confirm it satisfies "priority/attention metadata". Define allowed lifecycle transitions (pending→active→acknowledged→monitoring/waiting→resolved/escalated/expired) as a validated helper in core. Update `WorldStateSchema.parse` compatibility (all new fields optional/defaulted).
- **Non-scope:** no reducer behavior change for legacy flows; no serializer/client change (T02); no consequence targeting of new states (Phase 5).
- **Likely files:** `packages/schemas/src/events.ts`, `packages/schemas/src/world.ts`, `packages/core/src/world.ts` (initial state defaults), new transition helper in `packages/core/src/` (e.g. `events.ts` or within reducer helpers), `packages/core/test/*`.
- **Tests first (RED):** existing event states remain valid after schema change; each new legal transition validates; illegal transition rejected; new fields default correctly on existing sessions; `WorldStateSchema.parse` round-trips a state with new fields.
- **Implementation expectations:** additive, optional/defaulted fields; no change to existing status semantics; transitions expressed as a pure validated function.
- **Acceptance:** new statuses/fields parse; transition helper accepts legal / rejects illegal; existing 238 tests green; replay unaffected.
- **Risks:** widening `EventStatusSchema` may touch exhaustive `switch`/serializer mappings (e.g. `scheduler.ts` expiry, `CaseRail`); enumerate consumers of `status`. **Medium.**
- **Worker:** strongest reasoning/coding worker (contract foundation).

### P1-T02 — `WorkItem` serializer projection + hidden-state scoping
- **Objective:** Project a client `WorkItem` view from extended events; stop leaking raw `templateId`; scope `relatedArtifactIds` to the surfacing view.
- **Why:** C4/R8 hidden-state correction (§6.10 `:1043-1044`) + Phase 2 handoff needs a stable projection shape.
- **Dependencies:** P1-T01.
- **Scope:** In `toClientView`, replace raw `templateId` on client events with a client-safe field (opaque id OR a derived non-authoring `category` — coordinate exact shape with T04 consumer needs; spec permits "opaque client identifier"). Remove exhaustive `relatedArtifactIds` emission per artifact/task view; expose related records only in the context that legitimately surfaced them. Add the `WorkItem` projection fields (status/priority/acknowledged/linkedTicket/followups) to `ClientEventSchema`.
- **Non-scope:** no new tools; no query/discovery; no ticket structure.
- **Likely files:** `packages/core/src/serializer.ts`, `packages/schemas/src/client-view.ts`, `packages/core/test/serializer.test.ts`.
- **Tests first (RED):** serialized client view no longer contains raw `templateId`; `relatedArtifactIds` not emitted exhaustively (only scoped); `WorkItem` projection carries approved fields; golden-path no-leak assertion extended and green; legacy-required client identity still present (client-safe category/opaque id).
- **Acceptance:** no-leak tests green; projection stable; existing serializer/golden-path tests green.
- **Risks:** breaking frontend `templateId` consumers if T04 not aligned — **contract must be frozen before T04 starts.** **High (guardrail boundary).**
- **Worker:** strongest reasoning/coding worker; **independent review required** (hidden-state guardrail).

### P1-T03 — Per-action task-gate-release mechanism
- **Objective:** Allow individual migrated actions to bypass `TaskRequiredError` while unmigrated actions stay gated.
- **Why:** C2/R2 — "hiding quiz UI is not migration" (§15.0 step 6). Release-critical.
- **Dependencies:** P1-T01.
- **Scope:** Define where "migrated" is declared (recommend: authoring flag on the action/task binding in content, surfaced through `rules`, evaluated in `availability.ts`/`reducer.ts`). When an action is flagged migrated, `applyAction` must NOT throw `TaskRequiredError` for it; availability and reducer must agree. Legacy (unflagged) actions keep exact current gating. No workflow is actually migrated in Phase 1 — this is the *mechanism* + a test fixture proving it.
- **Non-scope:** do NOT migrate real workflows; do NOT remove any WorkTask; no replacement interaction built.
- **Likely files:** `packages/schemas/src/{actions,tasks,career-pack}.ts` (flag), `packages/core/src/{availability,reducer}.ts`, `packages/core/test/*` (fixture pack or test-only content).
- **Tests first (RED):** legacy task-gated action still blocked until task completes; an action flagged migrated executes WITHOUT completing its legacy WorkTask; an unrelated legacy action stays gated; availability list and reducer agree on legality; replay reproduces identical result.
- **Acceptance:** all RED green; zero change to real pack behavior (no real action flagged yet); replay exact.
- **Risks:** availability/reducer divergence; silent global bypass. **High.** Independent review required.
- **Worker:** strongest reasoning/coding worker; **independent review required.**

### P1-T04 — Frontend `templateId` consumer migration
- **Objective:** Update `CaseRail`/`GuideSearch` to use the client-safe field from T02 instead of raw `templateId`.
- **Why:** T02 stops leaking raw `templateId`; these consumers must keep working (case labels, guide branch).
- **Dependencies:** P1-T02 (contract frozen).
- **Scope:** Replace `event.templateId` reads in `CaseRail.tsx:9-12,51` and `GuideSearch.tsx:41` with the T02 client-safe category/opaque id. Preserve identical visible behavior (case-type labels, suspicious-login guide branch).
- **Non-scope:** no UX redesign; no other components.
- **Likely files:** `apps/web/src/components/CaseRail.tsx`, `apps/web/src/components/tools/GuideSearch.tsx`, their tests.
- **Tests first (RED):** CaseRail renders correct case-type labels from the new field; GuideSearch still branches for the main case; no reference to raw `templateId` remains.
- **Acceptance:** web tests green; visible behavior unchanged; grep shows no client `templateId` dependence.
- **Risks:** hidden additional consumers — task must grep `templateId` across `apps/web/src` first. **Medium.**
- **Worker:** normal Codex implementation worker.

### P1-T05 — Pack validation strengthening
- **Objective:** Fail loudly at load on the approved authoring errors.
- **Why:** §18 Phase 1 validation; would have caught the DEAD phishing scaffolding.
- **Dependencies:** P1-T01 (new fields/states referenced).
- **Scope:** Extend `CareerPackSchema.superRefine` (`career-pack.ts:61`) to validate: `observeArtifactIds` targets reference defined artifacts; event `instanceId` uniqueness; orphan detector (progression-unreferenced non-utility actions AND effect-referenced-but-undefined artifacts); trigger/deadline sanity (`triggerAt`/`deadlineMinutes` non-negative/positive coherence); migration-gate flag consistency (T03 flag well-formed).
- **Non-scope:** NO Phase 2 dataset/query validation.
- **Likely files:** `packages/schemas/src/career-pack.ts`, `packages/schemas/test/*` or `packages/career-packs/test/*`.
- **Tests first (RED):** invalid `observeArtifactIds` ref rejected; duplicate `instanceId` rejected; orphan action/undefined artifact rejected; bad trigger/deadline rejected; current real pack still passes.
- **Acceptance:** RED green; **current `cybersecurity-analyst/pack.yaml` still loads** (fix authoring only if it exposes a real defect — flag first, don't silently edit content).
- **Risks:** the real pack may already violate a new rule (e.g. the DEAD phishing actions/artifacts). If so, **STOP and report** — decision whether to quarantine or fix content is not Phase 1's to make silently. **Medium.**
- **Worker:** normal Codex implementation worker.

### P1-T06 — Schema-only sketch types
- **Objective:** Freeze types-only contracts for NPC intent, Evidence Fact definition, dataset, ticket, so Phases 2–6 don't revisit Phase 1.
- **Why:** §18 Phase 1 "schema-only sketches"; Phase 2 handoff.
- **Dependencies:** none hard (may reference T01 types).
- **Scope:** Add Zod schemas/TS types with NO runtime behavior, NO reducer/serializer wiring, clearly marked as Phase 2–6 contracts. Shapes per spec §5/§6 (Evidence Fact: id/provenance rule/definition; dataset: rows/columns; ticket: fields/status/attachments; NPC intent: action id/availability predicate/payload/fallback).
- **Non-scope:** no evaluation, no discovery, no query, no consequence, no NPC behavior.
- **Likely files:** new `packages/schemas/src/{records,evidence-facts,ticket,npc-intent}.ts` (types only) + type-level tests.
- **Tests first (RED):** types compile; example fixtures parse; NOT referenced by any runtime path (assert no import from reducer/serializer).
- **Acceptance:** typecheck green; sketches unused by runtime; documented as forward contracts.
- **Risks:** speculative over-design — keep minimal, cite spec section per type. **Low-Medium.**
- **Worker:** senior design for shapes; cheaper executor acceptable after shapes agreed.

### P1-T07 — `rng.ts` wire-or-delete
- **Objective:** Remove the dormant second-randomness risk before Phase 2.
- **Why:** Phase 0 §J — `rng.ts` exported, zero callers, `rngState` write-never; a stray second RNG would break replay determinism.
- **Dependencies:** none.
- **Scope:** Either delete `rng.ts` + `rngState` (if truly unused) OR document+wire it as the single sanctioned randomness source. Recommend **delete** unless a Phase 2+ need is identified in the spec (none found).
- **Non-scope:** no new randomness introduced.
- **Likely files:** `packages/core/src/rng.ts`, `packages/schemas/src/world.ts` (`rngState`), call-site grep.
- **Tests first (RED):** grep proves zero callers; replay equality unchanged after removal; `WorldStateSchema` still parses existing logs (if `rngState` removed, ensure back-compat or confirm no persisted dependency).
- **Acceptance:** replay exact; no RNG on turn path; suite green.
- **Risks:** `rngState` may be persisted in existing sessions/logs — verify before removal. **Low-Medium.**
- **Worker:** normal Codex implementation worker.

### P1-T08 — Phase 1 integration + replay + full-suite verification
- **Objective:** Verify Phase 1 as a whole against the Definition of Done.
- **Dependencies:** T02, T03, T04, T05, T06, T07.
- **Scope:** Run all Phase 1 RED tests + full `pnpm lint && typecheck && test && build`; `foldActionLog` replay equality; confirm legacy shift fully playable (golden-path all 3 renderers); confirm migrated-gate mechanism works on the fixture; confirm client visibility matches approved (no `templateId`/exhaustive related lists); confirm no Phase 2 mechanic introduced; confirm no unrelated production behavior changed.
- **Non-scope:** no new features.
- **Likely files:** test-only / CI; no production edits (fix-forward via owning task if a defect found).
- **Tests first (RED):** N/A (verification task) — asserts the aggregate.
- **Acceptance:** everything green; DoD satisfied.
- **Risks:** integration-surfaced conflicts between T02/T03 contracts. **Medium.**
- **Worker:** independent reviewer / integration owner (not a task implementer).

---

## Parallel Execution Groups

- **Group 0 (must complete first):** P1-T01 (foundation contract). Blocks T02/T03/T05.
- **Group A (parallel after T01):** P1-T02, P1-T03, P1-T05 — different primary files (serializer/client-view vs availability/reducer vs career-pack). Low overlap; `career-pack.ts` touched by T03 (flag) *and* T05 (validation) → **sequence T03 before T05, or freeze the flag shape in T01/T03 first** (see merge-risk).
- **Group B (fully independent, anytime):** P1-T06 (new files only), P1-T07 (rng files only) — no overlap with others.
- **Group C (after T02 frozen):** P1-T04 (frontend consumers).
- **Integration:** P1-T08 after all.

## Merge-Conflict Risk Control

- `packages/schemas/src/career-pack.ts`: touched by **T03** (migration-gate flag) and **T05** (validation). Mitigation: T01 (or a tiny contract step) freezes the flag field shape; then T03 and T05 edit disjoint regions, or run T03→T05 sequentially. **Flagged.**
- `packages/schemas/src/{events,world,actions,tasks}.ts`: mostly T01-owned; T02/T03 consume its frozen types → keep T01's schema output stable before Group A starts.
- `serializer.ts`/`client-view.ts`: T02-only. `CaseRail`/`GuideSearch`: T04-only. Disjoint from core tasks.
- Recommend each task in its own worktree; T01 merges to main before Group A dispatch.

## RED/GREEN Strategy

Every task lists its RED tests above; workers write failing tests first, implement to green, then run
`pnpm --filter @sim/web test` (+ `packages/core`/`packages/schemas` suites as relevant) and `foldActionLog`
replay where state changes. Full `pnpm lint && typecheck && test && build` at T08.

## Review Checkpoints

1. **After P1-T01** (schema/contract foundation) — before Group A relies on it. Reviewer ≠ implementer.
2. **After P1-T03** (migration gate) — incorrect behavior can silently bypass/preserve quiz gating. Mandatory independent review.
3. **After P1-T02** (serializer/hidden-state) — guardrail boundary. Mandatory independent review.
4. **P1-T08 final integration** — before Phase 2 planning.

## Integration Plan

T01 → review → merge. Group A (T02/T03/T05) + Group B (T06/T07) in isolated worktrees; T03 before T05 on `career-pack.ts`. T04 after T02 contract frozen+merged. T08 verifies aggregate on integrated main; reviews 2 & 3 before their merges.

## Phase 1 Definition of Done

- `EventInstance` supports approved Work Item semantics (new states/fields, validated transitions).
- Client receives the approved `WorkItem` projection; **no raw `templateId`, no exhaustive `relatedArtifactIds`.**
- Migrated actions can opt out of legacy WorkTask gating; unmigrated actions stay gated (proven by fixture).
- Pack validation catches the approved authoring errors; real pack still loads (or a real defect is flagged).
- `rng.ts` resolved (deleted or sanctioned); no second randomness source.
- `foldActionLog` replay exact; full suite + build green; legacy shift fully playable in all 3 renderers.
- Sketch types frozen for Phase 2–6, unused by runtime.
- No Phase 2 gameplay required to call Phase 1 done.

## Phase 2 Handoff Contract

After Phase 1, Phase 2 may assume: a stable client `WorkItem` projection shape; a cleaned visibility
contract (no authoring metadata leak); a working per-action gate-release mechanism to migrate the first
workflow; frozen sketch types for datasets/query/Evidence Facts/ticket/NPC intents; validated pack
authoring; deterministic replay preserved. Phase 2 builds the query engine on these without revisiting
Phase 1 architecture.

## Worker Prompt Template (reusable; do NOT dispatch yet)

```
TASK <P1-Txx>: <title>
CANONICAL SPEC: interactivity-and-content-depth-design.md — <sections>; Appendix R <items>.
DEPENDENCIES COMPLETED: <list + commit SHAs>.
WORKING DIR: <isolated worktree off current main>.
OBJECTIVE: <one line>.
EXACT SCOPE: <bullet list>.
EXPLICIT NON-GOALS: <Phase 1 exclusions relevant here; do NOT implement Phase 2+ mechanics>.
LIKELY FILES: <list>.
RED TESTS (write first, must fail): <list>.
IMPLEMENTATION: additive/compat; preserve determinism, replay, renderer parity, hidden-state boundary,
  AI-phrasing-only; no scores/correctness UI; no movement-as-evidence.
CONSTRAINTS: do NOT redesign settled architecture (Appendix R). If you find a concrete repository
  contradiction with the spec, STOP and report it — do not silently substitute a design.
ACCEPTANCE: <criteria>; run pnpm lint && typecheck && test (+ replay where state changes); do NOT push/merge.
REPORT: changed-files summary, tests added, verification output, any spec-vs-repo contradiction.
END: <P1-Txx>_DONE <sha>.
```

## Later-Phase Dependency Notes (parked, NOT Phase 1)

Query engine/history/absence-proof → Phase 2. Evidence Fact discovery/attachment → Phase 3. Structured
ticket state/handoff builder → Phase 4. Conditional/cancellable consequences + "un-gate decisions" quick
win → Phase 5. NPC availability/intents/pending + generalize `ask_manager` → Phase 6. Phishing +
false-positive (SHOULD) + full migration → Phase 7. Parity tests + queue pressure → Phase 8. Hardening → Phase 9.
