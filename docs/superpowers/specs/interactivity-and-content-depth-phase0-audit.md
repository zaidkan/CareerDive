# Interactivity & Content-Depth — Phase 0 Audit (Canonical)

**Status:** Read-only architectural audit. No code changed, no schemas changed, canonical spec unmodified.
**Canonical target spec:** `docs/superpowers/specs/interactivity-and-content-depth-design.md`
**Baseline:** `main` @ `a42fdec` (36 web test files / 238 tests green at audit time).
**Sources synthesized:** `phase0-core-runtime-audit.md` (deterministic backend) + `phase0-content-renderer-audit.md` (pack + renderers). Both treated as investigator input, not truth.
**Kiro verification:** load-bearing claims independently re-verified against the repo (see §0). Where the two reports diverged, the contradiction was traced to source and resolved.

---

## 0. Verification log (Kiro, against repo)

| Claim | Report(s) | Verified result | Evidence |
|---|---|---|---|
| `TaskRequiredError` gates canonical actions until task complete | both | **TRUE** | `packages/core/src/reducer.ts:24-50` (throws when `allowedAction.taskId` progress `!completed`) |
| Delayed *unconditional* consequences already ship from YAML | core | **TRUE** | pack `:984-986` `dismiss_alert` → `delayMinutes:40, escalateOnApply:true`; scheduler fires on `simClock >= dueAt` only (`scheduler.ts:56-57`) — no predicate |
| Phishing workflow is DEAD | both | **TRUE (contradiction resolved)** | 5 actions defined; the 3 `phishing-*` IDs appear ONLY in `observeArtifactIds` effects (`:825,833,843`), are **not** defined as `artifacts:` entries, and no progression references the actions. My initial grep matched the effect refs, not definitions — reconfirmed they are undefined artifacts + unreachable actions. |
| `escalateOnApply` consumed in scheduler, not effects | core | **TRUE** | `escalateOnApply` count: `scheduler.ts`=1, `effects.ts`=0 |
| Serializer leaks `templateId` + full `relatedArtifactIds` | core | **TRUE** | `serializer.ts:41,90,103,152` |
| No query/discovery/evidence-fact engine exists | both | **TRUE** | grep for `queryRecords/queryHistory/discoveryRule/evidenceFact/DiscoverableFact/filterArtifact` in `packages/core|schemas` = **0 hits** |

The two reports are mutually consistent and consistent with the repo. Core-runtime report is authoritative on backend execution; content-renderer report is authoritative on pack/UI. No unresolved conflicts remain.

---

## 1. Executive Summary

**The canonical spec is broadly compatible with the current architecture — and the repo is materially further along than the spec assumes.** The deterministic skeleton the redesign needs already exists and is functional: single action lifecycle, action-driven simulated clock, event scheduler (activation/expiry/delayed consequences), hidden-state serializer boundary, replay harness, three-renderer parity shell, artifact-observation provenance substrate, free-text note/notebook/KB-query plumbing, Morgan NPC boundary + Jules deterministic peer system, and interruption/notification scaffolding.

**Largest confirmed strengths (build on these):**
- Pure, replayable reducer + `foldActionLog` (release-blocking determinism already enforced).
- `observeArtifactIds` dual-tracking + observed-gated serializer = a ready provenance substrate for evidence discovery.
- Consequence scheduler already fires delayed branches from YAML (only *conditional/cancellable* logic is missing).
- Architectural renderer parity (shared `deriveSystemState` + canonical `data-action-id` contracts across 3D / desk-only / accessible).

**Largest discrepancies (spec assumes less-built than reality):**
- Spec §16.2 implies delayed branches need engine work — half already ship from YAML.
- Spec §15.1 undersells legacy coupling: WorkTasks don't just render quiz UI, they **block canonical actions** via `TaskRequiredError`. Migration must release gates, not just stop authoring.
- Spec treats notebook/ticket/KB/decision actions as new — they are **shipped, canonical, replayed, UI-exposed** (as string stores / quiz-gated). These are mechanic *upgrades*, not greenfield.
- Spec §6.10 hidden-state assumed strict — two live leaks (`templateId`, `relatedArtifactIds`) pre-answer "what should I open".

**Largest implementation risks:** (1) the `TaskRequiredError` gate coupling (Critical); (2) `build_summary` is the *only* documentation path and is quiz-driven (High); (3) `ask_manager` is a hardcoded effect branch, not an authored-intent pattern (High for §11); (4) genuinely greenfield engine: query engine, evidence facts, structured ticket, conditional consequences, NPC runtime model.

**Phase ordering:** Section 18's 1→9 order is sound with corrections (see §20). Highest-leverage first move is **un-gating decisions from quiz completion** (small, uses existing scheduler, removes the most-felt quiz collapse), then the query engine (Phase 2, biggest lift).

**Phase 1 readiness: `READY WITH SPEC CORRECTIONS`** (see §22, §25).

---

## 2. Repository Architecture Map

```
content/packs/cybersecurity-analyst/pack.yaml
  → loadCareerPack (packages/career-packs/src/loader.ts) → CareerPackSchema.superRefine (schemas/career-pack.ts:61-222)
  → createInitialWorldState (core/world.ts) embeds pack into WorldState.rules (per-session snapshot)

WorldState (schemas/world.ts:109-133)
  ├ availableActions (core/availability.ts)         legality: linear/staged completion + task gate + energy + event-active
  ├ applyAction (core/reducer.ts:32-89)             energy→clock→completed→resolveActionEffect→applyResolvedEffect
  │   ├ effects.ts (resolve/consequence/observe/hidden/ask_manager-hardcode)
  │   └ scheduler.ts (activate pending / wake snoozed / expire overdue / applyDueConsequences)
  ├ applyTaskAttempt (core/tasks.ts:66-137)         EXACT requiredOptionIds match = quiz
  ├ applyWorkplaceInteraction (core/workplace.ts)   Jules talk, break-room, observe
  ├ respondToNotification (core/notifications.ts)
  └ toClientView (core/serializer.ts:7-170)         hidden-state stripping boundary
        → ClientView (schemas/client-view.ts)
        → server dispatch (apps/server/src/trpc/router.ts) persists state+actionLog, assessment evidence (assessed only)
        → foldActionLog (core/replay.ts) test-time replay

Renderers (all consume shared apps/web/src/workstation.ts:deriveSystemState + canonical action IDs):
  3D:        world/SpatialShell + deskOs/LaptopOverlay (desk work via overlay)
  desk-only: components/WorkSurface
  accessible:components/AccessibleMode
Dialogue/AI: packages/ai (Morgan, bounded) + core/jules.ts (Jules, deterministic, LLM-free)
Tests: packages/core/test/*, apps/web/**/*.test.tsx (golden-path, parity, serializer, replay)
```
Dependency rule holds: `packages/core` imports only `@sim/schemas` + its own modules. Reducer pure (`structuredClone` in, `WorldStateSchema.parse` out). Zero RNG on the turn path.

## 3. Current Shift Reality (fact, not interpretation)

Single SOC shift, sim clock starts 08:00, advanced only by action `simulatedMinutes`. **Actual beat flow** (from pack triggers/progressions):
- **Arrival:** 2 active events (`suspicious-login-1`, `handoff-1`), `initialTaskBacklog:3`, tutorial steps. Read handoff → 2 quiz steps → reply quiz.
- **Central login case (A-1042):** staged action chain `review_alert → inspect_login_context → inspect_account_history + check_device_inventory → document_ticket → escalate_alert`; each action **gated behind a `requiredOptionIds` quiz**; `dismiss_alert` also-offered throughout; `search_knowledge_base` at final stage.
- **Routine scanner interruption:** one event at `triggerAt:25`, notification with Snooze 15m; 4-step quiz chain (triage → KB window match incl. run-log cross-check → document → dismiss).
- **Decisions:** `escalate_alert` (resolve + rich resolution) and `dismiss_alert` (resolve + **the only delayed conditional-ish consequence**: +40m reopen). Both use workplace-style labels already.
- **NPC:** Morgan via `ask_manager` (once/event, hardcoded ledger guidance); Jules ambient peer dialogue (deterministic, non-canonical `talk_to_jules` workplace interaction).
- **Utility:** `update_ticket_notes`/`update_notebook` (0-cost free-text), break-room (energy/snacks/coffee, non-evidence).
- **Wrap-up:** `complete_shift` terminal button (no work product).

**10 WorkTasks, all `requiredOptionIds` exact-match** (min==max==required length ⇒ single-correct-answer by construction): handoff-open-items, handoff-priority-message, login-alert-compare, login-context-clues, account-pattern-compare, device-owner-match, login-ticket-summary, scanner-alert-compare, scanner-window-match, scanner-ticket-summary.

**Missing vs target beat sheet:** no auth/VPN/device *query tools* (collapsed into staged buttons + quiz), no delayed Morgan reply, no phishing item (DEAD), no Jules status *canonical* interaction, no distinct false-positive review, no resume-before-fallout except dismiss path, no handoff work product.

## 4. Spec Assumption Verification Matrix

| Spec assumption | Verdict | Repository evidence | Impact |
|---|---|---|---|
| Shift is a quiz (`requiredOptionIds`) at its core | **Verified** | `tasks.ts:exactRequiredSelection`; 10/10 tasks | Confirms redesign premise |
| Consequence surface is shallow / delayed branches need engine | **Partially false** | delayed unconditional ships from YAML (pack `:984-986`); only conditional/cancellable missing | Phase 5 smaller than written |
| Notebook/ticket/KB are new work | **False** | shipped canonical actions + state (`world.ts` notebook/ticketNotes/kbQuery; `effects.ts:117-125`) | Reframe as upgrades; avoid double-counting |
| Hidden-state stripping strict/complete | **Partially true** | strips answer keys/hidden/rules/facts; **leaks** `templateId` + `relatedArtifactIds` (`serializer.ts:41,90,152`) | Phase 1 must scope these |
| NPC availability is content work | **False** | no availability/intent/pending fields; `ask_manager` hardcoded (`effects.ts:127-138`) | Phase 6 = engine+schema |
| Legacy WorkTasks are inert during migration | **False** | `TaskRequiredError` blocks canonical actions (`reducer.ts:44-50`) | Migration must release gates |
| Phishing is re-author work | **False** | DEAD: undefined artifacts + unreferenced actions | Greenfield content |
| Renderer parity must be built | **Mostly false** | architectural parity via shared derivation + IDs | Phase 8 → parity *tests* for new mechanics |
| Determinism/replay testable | **Verified** | `foldActionLog` + golden-path equality assertion | Strong foundation |

## 5. WorkTask / Quiz Architecture (schema → core → renderer)

- **Schema:** `PackTaskStepSchema` (`schemas/tasks.ts:27-78`) requires `requiredOptionIds`(≥1), `coachOnFailure`, `successText`, ≥2 options; `superRefine` enforces answer-key integrity. `PackTaskDefinitionSchema` binds task ↔ exactly one `(eventTemplateId, actionId)`.
- **Core:** `applyTaskAttempt` (`tasks.ts:66-137`) → `exactRequiredSelection` (`:50-64`): selection must equal required set exactly (no partial). Fail → `accepted:false` + `coachOnFailure`, attempts++. Final success → dispatches the bound `applyAction`; `build_summary` synthesizes `freeText` from selected labels (the current ticket-writing path).
- **Gate:** `applyAction` throws `TaskRequiredError` when the offered action's `taskId` progress `!completed` (`reducer.ts:44-50`). **Canonical actions are unreachable until the quiz passes.**
- **Renderer:** serializer strips answer keys; `ClientTaskView` omits `requiredOptionIds/coachOnFailure/successText`; option `source.quote` revealed only when artifact observed+openable. UI (`TaskInteraction`/`WorkTaskPanel`) renders prompt+options across all three renderers.

## 6. Action & Availability Architecture

Single path: `availableActions(state)` → `applyAction`. Legality today = completion-derived (linear `next_incomplete` / staged `after`/`offer`/`alsoOffer`/`all_remaining`) + task-completion gate + energy gate + event-active gate. **No per-state predicate language** beyond "these actions completed" — spec §5.4/§3.1 preconditions need a small new predicate construct. Effect resolution merges per-event-template override over action default field-by-field (`effects.ts:11-46`). Reusable as-is for Work Items.

## 7. World / Session State vs Target §6

`WorldStateSchema` (`schemas/world.ts:109-133`): session identity, `rules` (pack snapshot), `events[]` (status machine + per-event completed/observed/resolution/managerConsulted), `locations`, `facts` (content-inert), `npcs` (mood+memoryFactIds, inert), `artifacts`+`observedArtifactIds`, `ticketNotes` (per-event string), `notebook` (global string), `kbQuery` (global string), `taskProgress`, `notifications`, `ledger`, `completedActionIds`, `workplace`, `hidden` (8 numeric). 

| Target §6 domain | Status |
|---|---|
| Session | exists |
| Queue | partial (events lack acknowledged/priority/linked-ticket/follow-up) |
| Datasets | partial (artifacts are prose blobs, not structured rows) |
| Discovery/evidence facts | missing (only `observedArtifactIds`) |
| Decision record | partial (actions+timestamps logged; no scheduled-consequence IDs on deciding side) |
| NPC runtime | missing (no availability/intents/pending) |
| Documentation | partial (strings only) |
| Resources | exists |
| Scheduler | partial (ledger without predicates) |
| Derived view | exists |

## 8. Effects & Consequences — Capability Matrix

| Capability | Exists | Partial | Missing | Files | Notes |
|---|---|---|---|---|---|
| Immediate world message | ✓ | | | `effects.ts`→ledger→`operationalMessages` | escalate/quarantine/notify/document use it |
| Delayed consequence (unconditional) | ✓ | | | `scheduler.ts:49-84` | `dismiss_alert` +40m reopen |
| `escalateOnApply/escalateResolution` | | ✓ | | `scheduler.ts:68-81` | forces event→escalated; narrow, no other mutation |
| Conditional consequence (predicate at fire) | | | ✗ | — | genuine gap (spec §8.2-8.3) |
| Cancellation / supersession | | | ✗ | — | genuine gap |
| `resolve`/`resolution` | ✓ | | | `effects.ts:156-161` | templated fill |
| `emitEventResolved` | | ✓ | | `effects.ts:162-164` | log signal only, no mutation |
| `observeArtifactIds` | ✓ | | | `effects.ts:108-115` | **reuse as provenance input** |
| Hidden deltas | ✓ | | | `effects.ts:48-69` | assessment-flavored, keep as-is |
| `ask_manager` | | ✓ | | `effects.ts:127-138` | **hardcoded branch**, content-hostile — generalize for §11 |
| Typed op (update work item / emit record / send message) | | | ✗ | — | needed for §8 |

`ConsequenceEntry` carries only `{id,eventId,actionId,description,createdAt,dueAt?,applied}` — no condition/typed-op/target/NPC hook. Phase 5 = extend this entry + firing loop (already the right home), not a new scheduler.

## 9. Simulated Time & Event Scheduling

Integer-minute `simClock`, advanced only by action `simulatedMinutes` (no ticking/idle/wall-clock). `activatePendingEvents` (pending→active at `triggeredAt`), `expireOverdueEvents` (→expired past `deadlineAt`), `applyDueConsequences` (fires when `simClock >= dueAt`, evaluated once per action turn ⇒ fires late-never-early, only as side effect of another action). Snooze `snoozedUntil = simClock + snoozeMinutes`. Beat-sheet timings map cleanly onto `triggerAt`/`delayMinutes`. **Missing:** conditional timing ("respond N min later, cancel if Y first") and a time-advancing "wait" verb. Time parity note: movement costs energy, **0 minutes**; investigations cost minutes — acceptable under "presentation-only" but explicit asymmetry.

## 10. Serializer & Hidden-State Boundary (release-critical)

Centralized in `toClientView` (`serializer.ts:7-170`); manual (not schema-driven), reinforced by `client-view.ts` `.omit(body/metadata/searchableText/relatedArtifactIds→optional, requiredOptionIds/etc.)`.
- **Correctly stripped:** `hidden`, `rules`, `facts`, `npcs`, `taskProgress` internals, `locations`, `rngState`, `seed`, answer keys. Option quotes gated on observed+openable (`:44-57`). Artifact body/metadata withheld until observed (`:147-162`). Golden-path asserts absence of `requiredOptionIds|coachOnFailure|successText|hidden|rules`.
- **Borderline leak 1 — `templateId`** emitted per event (`:90,103`): lets client join events→pack defs.
- **Borderline leak 2 — full `relatedArtifactIds`** emitted per observed artifact and per task view (`:41,152`): authoring metadata that pre-answers "which records matter" — tension with §6.10 + "no correct-answer state".
- **Borderline 3 — `resolution` prose** client-visible (acceptable as feedback; current pack non-evaluative).
- **Verdict:** the observed-gating mechanism is the correct substrate for Evidence Facts (`lookupKeys` allowlist at `:123-131` is the do-not-infer precedent). Phase 1 must scope/strip leaks 1 & 2; discovery must expose related records **per query result**, not per artifact.

## 11. Existing Tool / Desk OS Capabilities

Desk OS (`world/deskOs/`): single-active-window shell, `OpsConsole` tab chrome/address bar/status strip/notification banner/case rail, cosmetic `BrowserApp` at `verdaly://ops`, tabs = canonical `systemId`s, `FileExplorer`/`Notes` OS apps. **FOUNDATION** — windowing adds no mechanics; routing sound. Shared `deriveSystemState` drives 3D/desk-only. Per-system tools are **artifact viewers + action cards** (STATIC display + QUIZ-SHELL verbs): Email/Alert/Guide/Inventory/TeamChat/Ticket/Calendar. No tool supports a work verb beyond observe-then-answer. No cross-tool linking ("search same IP / attach to case"). No dedicated auth/VPN/device query tools.

## 12. Structured Record Readiness

Content ready, engine absent. Datasets exist only as prose artifacts:
- Authentication (S-0731/S-0741), VPN (V-218 route catalogue), Device (`unknown-laptop-17` + `lookupKeys` exact-match — closest to queryable), Alert (A-1042/scanner + run-log), Ticket (`ticket-suspicious-login` guidance text), Chat/message, KB, Scanner. No `queryHistory/discoveryRule/evidenceFact/filterArtifact` symbols. `kbQuery`/`ticketNotes`/`notebook` persist but are **never evaluated**.

## 13. Evidence / Ticket Foundations

**Evidence:** no discovery engine. Three adjacent primitives: (1) `observedArtifactIds` = provenance substrate (which records opened, canonical, replay-safe); (2) source-quote gating = provenance-conditioned rule pattern (reuse pattern, not code); (3) assessment `EvidenceSignal` = behavioral signals, **incompatible** with in-sim Evidence Facts (separate domain, keep its non-determinism fenced out of replay). **Ticket:** `ticketNotes` per-event string is the migration anchor; missing status/entity refs/attachments/disposition/transition legality/history; `build_summary` label-synthesis is the only documentation path and must be replaced.

## 14. NPC / AI Boundary

**Morgan:** sole pack NPC, fact-scoped (`knownBy/notKnownBy`, `speakerMayKnow`), per-template `managerGuidance`, single-shot `managerConsulted`; free-text server path (`submitFreeText`) → safety input check → bounded context → `SessionBudget(0.05)` → `validateNpcOutput` (fact-ID + prohibited text) → deterministic fallback. **AI phrases only; no AI-authored facts/outcomes — boundary holds.** **Jules:** not a pack NPC; deterministic LLM-free peer (`jules.ts` reads public client view), `talk_to_jules` workplace interaction (non-canonical by design, never evidence). Satisfies §11.2 tone; not the §5.5/§6.6 letter (no intents/availability/pending). §11.3 satisfiable without rework.

## 15. Renderer Parity Audit

Parity is **architectural** (shared `deriveSystemState` + identical `data-action-id/event-id/task-id` + shared handlers), not per-action tested (no parity test file exists). Every live canonical action (`read_handoff`, `acknowledge_handoff`, `review_alert`, `inspect_login_context`, `inspect_account_history`, `check_device_inventory`, `search_knowledge_base`, `document_ticket`, `escalate_alert`, `dismiss_alert`, `update_ticket_notes`, `update_notebook`, `ask_manager`, `complete_shift`) appears in 3D / desk-only / accessible with the same backend effect. `talk_to_jules` + break-room = energy-only, never evidence. The 5 phishing actions are absent in **all** renderers (DEAD). **No renderer grants time/energy/evidence/outcome advantage; movement never yields evidence** (`useMovementExertion` = energy only). Gap: parity is unproven per-action by tests — add contract tests as new mechanics land.

## 16. Interruptions / Queue / Pacing Readiness

Ready: `triggerAt`/`deadlineMinutes` + activate/expire, one notification with Snooze 15m, `initialTaskBacklog:3` ±1, per-action time/energy costs, break-room texture. Not ready: exactly **one** interruption at fixed +25m; queue rarely exceeds 2 actives; deadlines rarely bind (linear chains finish early); no "waiting as mechanic". Target §9 (≤3 competing items, focused windows, sim-time not reflex) is architecturally satisfiable — content must author the overlap.

## 17. Legacy WorkTask Migration Inventory

Categories: `QUERYABLE_RECORDS`(QR), `EVIDENCE_DISCOVERY`(ED), `CASE_DOCUMENTATION`(CD), `STATEFUL_DECISION`(SD), `WORKPLACE_INTERACTION`(WI), `MUNDANE_WORK_ITEM`(MW), `KEEP_TEMPORARY_LEGACY`(KTL), `REMOVE_REDUNDANT_QUIZ`(RRQ = the evaluation pattern, not whole tasks).

| Current task/action | Now | Target | Preserve content | Complexity |
|---|---|---|---|---|
| handoff-open-items | quiz `select_clues` | ED + MW | handoff prose, distractors, scanner foreshadow | Low-Med |
| handoff-priority-message | quiz `choose_response` | WI (Morgan confirm-priority, legal-not-graded) | plan templates as legal-consequential options | Med |
| login-alert-compare | quiz `compare_records` | QR + ED | failed-then-success, geo-hint-not-proof | Low (first query showcase) |
| login-context-clues | quiz `select_clues` | ED | unknown-laptop-17 + ASN-novelty pairing | Low |
| account-pattern-compare | quiz `compare_records` (incl VPN 3-of-3) | QR + ED (incl **absence fact**) | full VPN cross-check, city-estimate trap, term glosses | Med-High (flagship; absence-query semantics) |
| device-owner-match | quiz `match_reference` | QR + ED | exact-label discipline, report≠proof, coverage limits, `lookupKeys` | Med |
| login-ticket-summary (5) | quiz `build_summary` | CD (structured ticket) | 5 step wordings → field help; traps → invalid-transition examples | High (replace only doc path) |
| scanner-alert-compare | quiz `compare_records` | QR + MW | scanner-name/network pairing | Low |
| scanner-window-match (+run cross-check) | quiz `match_reference` | QR + ED | run-log chain, event-vs-delivery-time trap | Med |
| scanner-ticket-summary (3) | quiz `build_summary` | CD + MW | coverage-cap, expected-close wording | Med |
| phishing 5 actions | **DEAD** | QR+ED+SD+MW (**greenfield**) | action shells + quarantine/notify wordings | Med (new content on new mechanics) |
| dismiss/escalate (login+scanner) | PARTIAL (quiz-gated) | SD | resolutions + consequence texts (best in pack); dismiss→reopen rule | Low-Med (remove quiz precondition) |
| ask_manager | PARTIAL (hardcoded) | WI (availability + pending replies) | 3 managerGuidance texts | Med |
| talk_to_jules | PARTIAL (non-canonical) | WI (authored intents; current replies as fallback) | all currentWorkReply branch texts | Med |
| update_ticket_notes / update_notebook | PARTIAL | CD (notes + attach refs) | NotesEditor pattern | Low |
| search_knowledge_base | PARTIAL | QR (KB search) | scanner-window, follow-up-guide bodies | Low-Med |
| complete_shift | terminal button | KTL → handoff work product | — | Med |
| quiz evaluation (primary path) | correctness feedback | RRQ | traps→benign records, coach→KB help | delete per item after migration |

**No task is removable without replacement** (all carry load-bearing content). `complete_shift` + the `WorkTask` schema are the only legitimate KTL during migration.

## 18. Testing & Validation Gap Analysis (vs §17)

| Test category | Coverage | Best file to extend |
|---|---|---|
| Schema | partial | `packages/schemas` (add Work Item/dataset/fact/ticket/decision schemas) |
| Core unit | strong | `packages/core/test/*.test.ts` |
| Deterministic replay | **strong, enforced** | `replay.ts` + golden-path equality |
| Hidden-state serialization | strong | `serializer.test.ts`, `jules.test.ts` (extend for facts/leaks) |
| Renderer parity | **missing (architectural only)** | new per-action contract tests |
| Scenario content | partial | `login-case-depth`, `shift-evidence-depth` |
| E2E branch | partial | `workplace-golden-path`, `shift-lifecycle-recovery` |
| Content validation | partial | `career-pack.ts:superRefine` (gaps: `observeArtifactIds` targets unvalidated, `instanceId` uniqueness, trigger/deadline sanity, consequence templates, unreachable/orphaned actions — would have caught phishing) |

## 19. Dependency / Coupling Risks

- **Critical:** task↔action binding + `TaskRequiredError` (`reducer.ts:44-50`, `availability.ts`). Legacy tasks block canonical actions; any action migrated off quiz must release its gate or the new loop stays blocked.
- **High:** `build_summary`→`ticketNotes` auto-write is the only documentation path (`tasks.ts:110-129`); `ask_manager` hardcode bypasses effect pipeline (`effects.ts:127-138`).
- **Medium:** serializer task-view → `ClientTaskView` UI contract; `templateId`/`relatedArtifactIds` leaks; `taskProgress` keyed `eventId:taskId` (harmless to retain).
- **Low:** observe/notes/notifications/consequences/ledger are decoupled from tasks (the newer mechanics are already independent of the quiz engine). Dead `rng.ts` (wire-or-delete before Phase 2 to prevent a second randomness source).

## 20. Phase 1–9 Reality Check

| Phase | Needed | Order OK | Notes / hidden prereqs |
|---|---|---|---|
| 1 Work Item + state | Yes | Yes | **Extend `EventInstance`, don't invent a new table** — it's already a proto-Work-Item (id/type/status/createdAt/linked records/resolution). Add `acknowledgedAt`, priority, `linkedTicketId`, follow-up refs, + `acknowledged/monitoring/waiting` states; project a `WorkItem` view in serializer. Scope/strip `templateId`+`relatedArtifactIds`. Sketch NPC-intent schema here (waiting/follow-up states reference NPC hooks). |
| 2 Records + query | Yes | Yes | **Biggest engine lift** (new query interaction type + dataset schemas + deterministic filter + history). Seed datasets from retiring Investigation tasks' `relatedArtifactIds`+quotes. VPN absence-fact is the hard case — schedule explicitly. |
| 3 Evidence + notebook | Yes | Yes | Greenfield but precedented: model on source-quote gating; provenance = `observedArtifactIds` + query history. No clue counters in client view. |
| 4 Ticket work product | Yes | Yes | **Replaces** `ticketNotes`-as-prose (keep same canonical key for replay); cut `build_summary` synthesis simultaneously; `complete_shift`→handoff builder here. |
| 5 Decisions + consequences | Yes | Yes but **lighten** | Scheduler exists; add predicate+cancel+typed-op to `ConsequenceEntry`; add 3+ distinct delayed branches. **Do the "un-gate decisions from quiz" quick win first.** |
| 6 Workplace interactions | Yes | Move intent-schema **earlier** (Phase 1 sketch) | Generalize `ask_manager` hardcode into authored intents; Morgan first; decide Jules-author-vs-accept-peer. |
| 7 Re-author shift | Yes | Yes, **rescope** | phishing + false-positive are **greenfield**, not re-author; scanner/timeline prose preserve-verbatim; primary-path `requiredOptionIds` deletion is the acceptance gate. |
| 8 Parity + polish | Yes | **rescope to tests** | Parity shell done; write per-action parity contract tests for new mechanics; polish = queue pressure 2→3, remove quiz chrome. |
| 9 Hardening | Yes | Yes | Add orphaned-action/missing-artifact build detector (catches phishing-class bugs); AI-off test feasible (Jules LLM-free, Morgan fallback). |

**Suggested build order after Phase 0:** un-gate decisions (quick win) → Phase 2 device/alert query → Phase 3 discovery (login-context/device) → Phase 4 ticket-attach → Phase 6 Morgan intents → greenfield phishing → false-positive → handoff builder → parity tests. Front-loads removal of the most-felt quiz collapse.

## 21. Beta Cut-Line Reality Check (§19)

| Cut-line item | Status |
|---|---|
| Queryable records (auth/VPN/device) | missing engine; content ready |
| Evidence discovery + notebook | missing engine; provenance substrate ready |
| Structured ticket / handoff work product | partial (string store); needs structure |
| Stateful decision + delayed fallout | mostly exists (one branch proven); needs more branches + un-gating |
| Workplace interactions (Morgan/Jules) | partial; Morgan hardcode + Jules non-canonical need intent model |
| Phishing item | missing (greenfield) |
| False-positive review | missing (greenfield) — flag: consider cutting from MUST if expensive |
| 3-renderer parity | architectural parity exists; needs tests |
| Break-room/mundane texture | exists (correctly non-evidence) — do not expand |

Flag: **false-positive review (T+43)** has no content and is a fresh authoring + discrimination-mechanic cost. Tradeoff: it teaches "don't always escalate" (valuable) but is not required for a coherent shift; recommend keeping only if Phase 5 discrimination is cheap, else defer with a spec note.

## 22. Spec Corrections Required Before Implementation

| # | Current spec statement | Repository reality | Recommended correction | Impact |
|---|---|---|---|---|
| C1 | §16.2 delayed/conditional branches need engine work | delayed *unconditional* branches ship from YAML (pack `:984-986`) | Narrow §8/§16.2 to *conditional + cancellable* consequences | Phase 5 smaller |
| C2 | §15.1 keep WorkTask schema temporarily (framed inert) | `TaskRequiredError` makes legacy tasks canonical **blockers** | Add: migrating an action off quiz MUST release its task gate | Prevents blocked new loop |
| C3 | notebook/ticket/KB/decisions as new | shipped canonical + replayed | Reframe as mechanic upgrades, not greenfield | Velocity accounting |
| C4 | §6.10 strict hidden-state | `templateId` + `relatedArtifactIds` leak | Either grant as presentation metadata or require Phase 1 strip/scope | Discovery integrity |
| C5 | §5.5/§6.6 NPC availability as content | no availability/intent fields; `ask_manager` hardcoded | Reclassify as engine+schema (Phase 6); move intent schema to Phase 1 sketch | Effort + ordering |
| C6 | §18 phishing as re-author | DEAD (undefined artifacts, unreachable actions) | Reclassify phishing as greenfield content | Phase 7 scope |
| C7 | §11 NPC model describes Morgan only; Jules a MUST | Jules is deterministic non-pack peer | Clarify: author Jules intents OR reword MUST to peer-dialogue | Scope clarity |
| C8 | §13 parity as build work | architectural parity done | Rescope Phase 8 to per-action parity **tests** | Effort |
| C9 | time parity implicit | movement 0 min, investigations cost min | State the asymmetry explicitly as acceptable (presentation-only) | Guardrail clarity |

Do NOT rewrite the canonical spec here — these are the amendments to apply before/with Phase 1.

## 23. Recommended Phase 1 Boundary (smallest safe)

- **Responsibilities:** introduce a renderer-independent **Work Item view** by *extending* `EventInstance` (add `acknowledgedAt`, priority/attention, `linkedTicketId`, follow-up refs; add `acknowledged/monitoring/waiting` to `EventStatusSchema`); project a `WorkItem` in the serializer. Scope/strip `templateId` + `relatedArtifactIds`. Add build-time validation for `observeArtifactIds` targets + `instanceId` uniqueness. Wire-or-delete `rng.ts`. Sketch (schema-only, no behavior) the NPC-intent + Evidence-Fact + dataset + ticket contracts so later phases have frozen types.
- **Explicit non-goals:** no query engine, no discovery logic, no ticket restructure, no consequence predicates, no NPC runtime behavior, no content re-authoring, no quiz deletion.
- **Files/subsystems:** `packages/schemas/{world,events,client-view,tasks}.ts` (+ new contract sketches), `packages/core/{serializer,world,availability}.ts`, `packages/schemas/career-pack.ts` (validation), `packages/core/test/*`.
- **Compatibility:** legacy WorkTask engine untouched and green; new fields additive/optional; replay + golden-path + parity unchanged.
- **Tests that must be RED first:** Work Item projection shape; new lifecycle-state transitions + illegal-transition rejection; serializer no-leak for `templateId`/scoped `relatedArtifactIds`; validation failing on bad `observeArtifactIds`/duplicate `instanceId`; replay equality preserved.
- **Acceptance:** all above GREEN; existing 238 tests still green; no canonical action/outcome/parity/hidden-state guarantee weakened.

## 24. Open Architectural Questions (only what the repo can't answer)

1. Should discovered **Evidence Facts** live in `WorldState.rules` (content snapshot, versioned) or instance state (mutable)? Affects replay/versioning — product+arch decision.
2. **False-positive review (T+43):** author it (new discrimination content) or defer from beta MUST? (§21 tradeoff — product call.)
3. **Jules:** author canonical intents (parity with Morgan) or formally accept peer-dialogue as satisfying §19.1 MUST? (§C7 — product call.)
4. Should the VPN **absence-fact** ("no matching VPN session") be a first-class discovery primitive (query-establishes-absence) or modeled as a normal fact with a special provenance rule? (arch call before Phase 2.)

## 25. Final Audit Verdict

### Confirmed Foundations
Pure replayable reducer + `foldActionLog`; action lifecycle + error taxonomy; action-driven scheduler (activate/expire/**delayed consequences**); `observeArtifactIds` provenance substrate + observed-gated serializer; free-text note/notebook/KB plumbing (canonical, replayed); Morgan bounded-AI boundary + Jules deterministic peer; architectural 3-renderer parity; content-pack governance loader; rich cautious prose corpus worth migrating verbatim. `EventInstance` is already a proto–Work Item.

### Confirmed Gaps
Query engine; evidence-fact/discovery store + rules; structured ticket/case (status/attachments/transitions/handoff); conditional + cancellable consequences with typed ops; NPC runtime model (availability/intents/pending replies); Work Item operational fields; expanded content validation. Phishing workflow is DEAD (greenfield). False-positive review content absent.

### Spec Corrections Needed
C1–C9 (§22): narrow the consequence gap to conditional/cancellable; make gate-release explicit in migration; reframe notebook/ticket/KB/decisions as upgrades; scope the `templateId`/`relatedArtifactIds` leaks; reclassify NPC availability + phishing as engine/greenfield; clarify Jules; rescope parity to tests; state time asymmetry.

### Architecture Risks Before Phase 1
`TaskRequiredError` gate coupling (Critical) — migration must release per-action gates; `build_summary` is the sole doc path (High); `ask_manager` hardcode (High for §11); serializer leaks (Medium); dead `rng.ts` second-randomness risk (Medium).

### Phase 1 Readiness
**`READY WITH SPEC CORRECTIONS`.**
Reason (evidence-based): the deterministic core, serializer boundary, scheduler, and parity shell required by Phase 1 all exist and are green (verified §0). Phase 1 is an *additive extension* of `EventInstance` + serializer scoping + schema contract sketches, with no core rewrite. It is safe to proceed **once corrections C1–C9 are applied to the canonical spec** (especially C2 gate-release and C4 hidden-state scoping, which are correctness-affecting). Do not begin Phase 1 implementation until those corrections are accepted.

**Phase 0 complete. Presented for review. No implementation performed.**
