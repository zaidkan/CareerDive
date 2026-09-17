# Interactivity Implementation — Orchestrator Context (Team-Lead Reference)

**Purpose:** concise coordination reference for the SOC Interactivity & Content-Depth redesign.
NOT a competing spec. Derived from the approved design spec + Phase 0 audit. Where they disagree,
the canonical documents win, and any conflict is flagged below.

**Baseline:** `main` @ `a42fdec` (36 web test files / 238 tests green).

---

## Mission

Replace the SOC shift's quiz core (`read artifact → select requiredOptionIds → success/fail → next`)
with real work: **work arrives → investigate structured records → correlate evidence → interact with
workplace → document findings → make a bounded decision → resume work → experience deterministic
consequences later.** One deeply authored Junior Cybersecurity Analyst shift. Success = the player
spends most of the shift *doing* SOC work, not selecting authored answers.

## Locked Constraints (non-negotiable; from AGENTS.md + build spec)

- Deterministic backend owns all canonical truth, time, resources, legality, consequences, evidence; fully replayable.
- AI phrases bounded authored dialogue ONLY — never creates facts/procedures/deadlines/evidence/outcomes.
- 3-renderer parity: walk-the-office / desk-only / simple-list expose the SAME canonical action IDs + outcomes. Navigation/pointer/gaming skill NEVER produces career evidence.
- Never expose hidden state (answer keys, hidden facts, undiscovered provenance). Privacy/RLS on reflections.
- No numeric scores, no correct/incorrect feedback on operational decisions, no career-fit judgment, no minigames, no busywork.
- Beta scope: one shift only. No second career, no 3D-authority expansion, no multiplayer, no recommendation ranking, no sandbox.

## Canonical Documents & Authority

| Layer | File | Role |
|---|---|---|
| Locked product/governance | `AGENTS.md`, `docs/career-sim-build-spec.md` | Constraints; cannot be overridden |
| Canonical target design | `interactivity-and-content-depth-design.md` (TRACKED, reconciled `a82a02b`) | Target experience + phases. **Reconciled with Phase 0 (C1–C9 + §24 in Appendix R + body). Verified by Kiro.** |
| Canonical Phase 0 findings | `interactivity-and-content-depth-phase0-audit.md` (UNTRACKED) | Verified repo baseline; raises C1–C9 + 4 open §24 questions |
| Investigator reports | `phase0-core-runtime-audit.md` (TRACKED), `phase0-content-renderer-audit.md` (UNTRACKED) | Deeper evidence behind the synthesis |
| Supporting/reference only | `renderer-parity-accessibility-matrix.md`, `soc-shift-realism-reference.md`, `soc-structured-content-pack.md` (all UNTRACKED) | Guide content/UI/acceptance later; may NOT override canonical architecture (each self-declares "canonical design spec wins") |
| Historical/superseded | `2026-07-14`, `2026-08-06`, `2026-08-27`, `2026-08-28` design docs | Prior-era; superseded for this redesign |

**Authority conflict flagged:** the canonical design spec was authored BEFORE Phase 0 and does NOT
**Authority conflict RESOLVED (commit `a82a02b`):** the canonical design spec has been reconciled with
Phase 0 — C1–C9 and the four §24 decisions are recorded in Appendix R (Reconciliation Decision Registry)
and woven into the body. Kiro verified each is present and free of stale contradictions. The canonical
design spec is now the single source of truth for planning; the Phase 0 audit remains the verified
baseline evidence behind it.

## Architecture Baseline

### REUSE AS-IS (verified foundations)
Pure replayable reducer + `foldActionLog`; canonical action lifecycle + error taxonomy; action-driven
scheduler (activate/expire/**delayed consequences**); `observeArtifactIds`/`observedArtifactIds`
provenance substrate + observed-gated serializer; free-text note/notebook/KB-query plumbing (canonical,
replayed); content-pack governance loader; architectural 3-renderer parity (shared `deriveSystemState` +
canonical `data-action-id`); Morgan bounded-AI boundary; Jules deterministic LLM-free peer.

### EXTEND (right foundation, more capability)
`EventInstance` → **Work Item semantics** (it is already a proto–Work-Item: add `acknowledgedAt`,
priority, `linkedTicketId`, follow-up refs; add `acknowledged/monitoring/waiting` to `EventStatusSchema`;
project a `WorkItem` VIEW in the serializer — **do NOT create a second Work Item state subsystem**);
`ConsequenceEntry` (+ predicate + cancel + typed op); artifact/record representation (+ structured rows);
pack validation (artifact refs, instanceId uniqueness, orphaned actions); client views (scope leaks).

### MIGRATE / REPLACE (move away from)
`requiredOptionIds` as primary mechanic; `build_summary` ticket generation; **task gating
(`TaskRequiredError`) for migrated actions**; hardcoded `ask_manager` effect branch.

### BUILD NEW (genuinely missing)
Deterministic structured record **query engine** (datasets/filters/history/absence-proof/ordering);
**Evidence Facts** + discovery rules (distinct from assessment evidence); structured **ticket/case**
state (status/attachments/transitions/handoff); **conditional/cancellable** consequences with typed ops;
**NPC runtime** contracts (availability/intents/pending replies). Phishing workflow = greenfield (DEAD today).
False-positive review content = greenfield.

## Critical Phase 0 Findings (implementation-relevant)

1. **Quiz is schema-level:** all 5 WorkTask kinds reduce to `requiredOptionIds` exact-match (`tasks.ts:exactRequiredSelection`). 10/10 tasks.
2. **Delayed unconditional consequences ALREADY ship from YAML** (`dismiss_alert` +40m, pack `:984-986`); only conditional/cancellable is missing. Scheduler is the right home — extend, don't rebuild.
3. **Notebook/ticket/KB/decision actions are ALREADY shipped canonical** (as string stores / quiz-gated) — upgrades, not greenfield.
4. **Phishing is DEAD** (undefined artifacts, unreachable actions) — greenfield.
5. **Parity is architectural**, not test-proven — Phase 8 = add per-action parity tests.
6. **Determinism/replay is a strong enforced foundation** — must be preserved every phase.

## Final Architectural Decisions

### C1–C9 — STATUS: RECONCILED INTO CANONICAL SPEC (commit `a82a02b`, Appendix R + body). Verified by Kiro.
| # | Corrected direction (summary) | Registry | In-body |
|---|---|---|---|
| C1 | Narrow consequence gap to conditional/cancellable (delayed unconditional already works) | R3 | §8 (`:846`, `:1035`, `:1228`) |
| C2 | Migration MUST release the `TaskRequiredError` gate per migrated action | R2 | §15 binding rule `:1649` + §15.0 `:1651` |
| C3 | Reframe notebook/ticket/KB/decisions as upgrades, not greenfield | R3/R10 | §16 non-greenfield list `:1748` |
| C4 | Scope/strip serializer leaks (`templateId`, `relatedArtifactIds`) | R8 | §6.10 `:1043-1044`, §12 `:1497` |
| C5 | NPC availability = engine+schema (Phase 6); intent sketch in Phase 1 | R6 | §11 status `:917`, Phase 6 `:2047` |
| C6 | Phishing = greenfield, not re-author | R10 | §4 status `:386`, migration `:1691` |
| C7 | Jules = narrow authored intents on shared infra (never grader) | R6 | §11 `:1411`, Phase 6 `:2047` |
| C8 | Rescope Phase 8 to parity TESTS | (phases) | §17/§18 RED reqs `:1782` |
| C9 | Movement/time asymmetry explicit (presentation-only) | R11 | Appendix R |

### Four §24 decisions — STATUS: RESOLVED (Appendix R registry, binding)
1. **Evidence Fact ownership (R4):** definitions + provenance rules in pack `rules` snapshot; discovery state (IDs/time/provenance/attachments) in instance state; NEVER assessment `EvidenceSignal`. (§6.3-6.4 `:703,925,949`)
2. **False-positive review (R5):** **SHOULD-ship, not MUST** — include only if budget allows after core stabilizes. (§19.1 re-tagged `:2180`, §19.2 `:2187`)
3. **Jules (R6):** narrow authored intents on shared NPC infrastructure; no Morgan-depth knowledge; never a grader; deterministic peer replies become fallback text. (§11 `:1411`)
4. **VPN absence (R7):** coverage-based provenance rule (account + IP + interval ⊇ authored window, zero rows), never exact-query match. Phase 3 binding. (§6/§3 `:668`)

## Phase Dependency Map (from design spec §18; audit-adjusted notes)

| Phase | Objective | Depends on | Enables | Reuse | Build new |
|---|---|---|---|---|---|
| 0 | Freeze + audit | — | all | — | audit (DONE) |
| 1 | Work Item + state foundation | 0 + spec corrections | 2–7 | EventInstance, serializer, availability | lifecycle states, WorkItem view, contract sketches |
| 2 | Structured records + query engine | 1 | 3,4 | artifact/observe | query engine + dataset schemas (biggest lift) |
| 3 | Evidence discovery + notebook | 2 | 4 | observedArtifactIds, source-quote pattern | Evidence Facts + discovery rules |
| 4 | Structured ticket/case | 3 | 7 | ticketNotes key | ticket state + attach legality; handoff builder |
| 5 | Stateful decisions + consequences | 1 (scheduler) | 7 | scheduler, ConsequenceEntry | predicate/cancel/typed-op; **un-gate decisions (quick win)** |
| 6 | NPC/workplace interaction runtime | 1 (intent sketch) | 7 | Morgan boundary, Jules replies | availability/intents/pending; generalize ask_manager |
| 7 | Full shift content migration | 2–6 | 8 | prose corpus | greenfield phishing + false-positive; delete quiz path |
| 8 | Renderer parity + UX | 7 | 9 | parity shell | per-action parity tests; queue pressure |
| 9 | Hardening | 8 | ship | replay/validation | orphaned-action detector; AI-off test |

## Migration Warning (critical)
Legacy WorkTasks are NOT just quiz UI. `applyAction` throws `TaskRequiredError` (`reducer.ts:44-50`)
when an offered action's bound task is incomplete — so **canonical actions are BLOCKED until the quiz
passes.** Hiding old task UI is INSUFFICIENT: any action migrated to a new mechanic MUST also release
its task gate, or the new loop stays blocked. Keep the WorkTask schema only during migration; never
expand it for new content.

## Hidden-State Warning
Serializer (`serializer.ts`) currently emits `templateId` per event and full `relatedArtifactIds` per
observed artifact + task view — these pre-answer "which records matter." Future workers must NOT add
new leaks: no answer keys, no undiscovered facts/provenance, no future-consequence definitions, no
"found N/M" counters. Evidence discovery must expose related records PER QUERY RESULT, not per artifact.
Extend the observed-gating mechanism; keep golden-path/serializer no-leak assertions green.

## Worker Rules
Implement assigned scope only; read the relevant canonical spec section for the task; do not reinterpret
architecture; use RED-GREEN TDD; preserve deterministic replay; preserve 3-renderer parity; never add
scores/correctness UI or movement-based evidence; report deviations/discrepancies to the lead rather than
silently redesigning; keep the legacy WorkTask engine green until its path is migrated.

## Review Rules
Independent review where practical (prefer a reviewer that did not implement the work). High-risk
(core/schema/consequences/serializer/migration) → senior review + full suite + replay/parity/hidden-state
checks before merge. Worker "done" is evidence, not acceptance.

## Current Next Step
**Reconciliation complete and verified (commit `a82a02b`).** Canonical spec now incorporates C1–C9 +
the four §24 decisions (Appendix R) and defines an explicit Phase 1 Boundary. Verdict: **READY FOR
PHASE 1 PLANNING.** Next approved step (on user instruction only): convert the spec's Phase 1 Boundary
into the Phase 1 engineering DAG. Phase 1 is FOUNDATION ONLY (extend `EventInstance`, `WorkItem`
serializer projection, hidden-metadata cleanup, validation, gate-release mechanism, schema-only
sketches) — it must NOT include the query engine, discovery runtime, ticket restructure, consequence
predicates, NPC behavior, or content re-author. Do NOT dispatch implementation workers until instructed.
