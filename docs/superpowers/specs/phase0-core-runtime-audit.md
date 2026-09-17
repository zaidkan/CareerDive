# Phase 0 — Core Runtime Audit (deterministic backend foundations)

**Date:** 2026-09-17
**Scope:** read-only audit of the deterministic backend: `packages/schemas`, `packages/core`, `packages/evidence`, `packages/career-packs`, server dispatch (`apps/server/src/trpc/router.ts`), and the canonical content pack (`content/packs/cybersecurity-analyst/pack.yaml`).
**Target spec:** `docs/superpowers/specs/interactivity-and-content-depth-design.md` (not modified).
**Method:** every capability traced end-to-end as `schema/content -> availability -> dispatch -> reducer/effect -> canonical state -> serializer/client view -> tests`. No code was changed.

**Headline verdict:** the deterministic skeleton the spec needs (action lifecycle, time-driven scheduler, hidden-state boundary, replay, content validation) already exists and is functional. The spec's "missing engine" list is half right: **delayed consequences already work from YAML today** (only *conditional* ones are missing), and **the `EventInstance` already is a proto–Work Item**. Genuinely greenfield: query engine, evidence-fact/discovery rules, structured ticket, NPC availability/knowledge model. The WorkTask quiz engine is fully functional and actively gates canonical progress — migration must unwind `TaskRequiredError`, not just stop authoring tasks.

---

## A. Core architecture map

```
content/packs/cybersecurity-analyst/pack.yaml
        │  loadCareerPack (packages/career-packs/src/loader.ts:8-17)
        ▼  CareerPackSchema (packages/schemas/src/career-pack.ts:24-223)
createInitialWorldState (packages/core/src/world.ts:9-121)
        │  embeds pack content into WorldState.rules (snapshot per session)
        ▼
WorldState (packages/schemas/src/world.ts:109-133)
        │
        ├── availableActions (packages/core/src/availability.ts:128-166)
        ├── applyAction (packages/core/src/reducer.ts:32-89)
        │     ├── resolveActionEffect + applyResolvedEffect (packages/core/src/effects.ts)
        │     └── scheduler: activate/wake/expire/applyDue (packages/core/src/scheduler.ts)
        ├── applyTaskAttempt (packages/core/src/tasks.ts:66-137)
        ├── applyWorkplaceInteraction (packages/core/src/workplace.ts:66-194)
        ├── respondToNotification (packages/core/src/notifications.ts:58-89)
        └── toClientView (packages/core/src/serializer.ts:7-170)
                ▼
        ClientView (packages/schemas/src/client-view.ts:44-60)
                │
        server dispatch (apps/server/src/trpc/router.ts:100-298)
        persists state + actionLog, appends assessment evidence (assessed only)
                │
        foldActionLog (packages/core/src/replay.ts:7-26) — test-time replay
```

Dependency rule holds: `packages/core` imports only `@sim/schemas` types plus its own modules. The reducer is pure (`structuredClone` in, validated `WorldStateSchema.parse` out, `packages/core/src/reducer.ts:62,88`). All randomness is absent from the turn path; `rngState` is initialized and never advanced (see §J).

---

## B. WorkTask reality

**Status: fully functional quiz engine, and it actively gates canonical progress.**

- Schema: `PackTaskDefinitionSchema` (`packages/schemas/src/tasks.ts:80-90`) binds one task to exactly one `(eventTemplateId, actionId)` pair; `PackTaskStepSchema` (`tasks.ts:27-78`) **requires** `requiredOptionIds` (min 1), `coachOnFailure`, `successText`, ≥2 options, with cross-checks (min/max fit, duplicate IDs, required IDs must exist).
- Runtime: `applyTaskAttempt` (`packages/core/src/tasks.ts:66-137`) enforces exact-answer matching in `exactRequiredSelection` (`tasks.ts:50-64`) — selection must equal the required set exactly, no partial credit. Wrong answers return `accepted: false` with `coachOnFailure`; attempts increment even on failure. Final-step success delegates to `applyAction` on the bound action, and `build_summary` tasks synthesize `freeText` from selected option labels (`tasks.ts:111-129`) — this is the current ticket-writing path.
- Gating: `applyAction` throws `TaskRequiredError` (`packages/core/src/reducer.ts:44-52`) when the offered action carries a `taskId` whose progress is incomplete. Canonical actions are unreachable until the quiz step passes.
- Client boundary: the serializer **does** strip answer keys — `ClientTaskView` (`tasks.ts:112-129`) omits `requiredOptionIds`, `coachOnFailure`, `successText`; option `source.quote` is revealed only when the artifact is observed **and** openable (`packages/core/src/serializer.ts:44-57`). The golden-path test asserts the serialized view never matches `/requiredOptionIds|coachOnFailure|successText|notKnownBy/`.
- Pack reality: the current pack is heavily quiz-invested — tasks `handoff-open-items`, `handoff-priority-message`, `login-alert-compare`, `login-context-clues`, `account-pattern-compare`, `device-owner-match`, `login-ticket-summary`, `scanner-alert-compare`, others (`pack.yaml:59-690`).
- Quota check against spec §2: the engine **is** `prompt -> options -> required answer -> success/failure` by construction. Migration Phase 7 must delete/re-author these, and — critically — must remove or bypass the `TaskRequiredError` gate for migrated actions, or legacy tasks keep blocking the new loop even when unlisted in UI.

---

## C. Action lifecycle

Single canonical path, `apps/server/src/trpc/router.ts:110-160` → `applyAction` (`packages/core/src/reducer.ts:32-89`):

1. **Availability:** action must appear in `availableActions(state)` for the exact `(id, eventId)`; otherwise `ActionUnavailableError`.
2. **Task gate:** bound task must be `completed`, else `TaskRequiredError`.
3. **Resource gate:** `workplace.energy.current >= definition.energyCost`.
4. **Mutation (all on a clone):** deduct energy, advance `simClock` by `simulatedMinutes`, append `completedActionIds` (global + per-event when `tracksCompletion`), resolve effect via `resolveActionEffect` (per-event-template override wins over action default, field-by-field; `packages/core/src/effects.ts:11-46`), `applyResolvedEffect`.
5. **Scheduling pass:** `activatePendingEvents` (clock ≥ `triggeredAt` → active + arrival ledger entry), `wakeSnoozedNotifications`, `expireOverdueEvents` (clock > `deadlineAt` → expired + fixed resolution text + backlog decrement), `applyDueConsequences`.
6. **Commit:** `WorldStateSchema.parse`, persist state + sequenced `actionLog` entry, append assessment evidence only when `sessionKind === "assessed"` (`router.ts:145-153`).
7. Parallel turn types reuse the same commit shape: `applyTaskAttempt`, `applyWorkplaceInteraction`, `respondToNotification` — all replayable via `foldActionLog` (`packages/core/src/replay.ts:7-26`) and all logged (`turn.ts:56-80`).

**Legality model today:** completion-derived (linear `next_incomplete` / staged `after`/`offer`/`alsoOffer`/`all_remaining`), task-completion-gated, energy-gated, event-active-gated. There is **no** per-state precondition language beyond "these actions completed" — spec §5.4's "preconditions" and §3.1's "prerequisite state for some actions" need a new (small) predicate construct.

---

## D. Consequence capability matrix

| Spec §8 need | Current primitive | Verdict |
|---|---|---|
| Immediate world event (text) | `ActionConsequence.description` → ledger entry `applied: true` → surfaced as `operationalMessages` (`serializer.ts:12-14`) | **Fully functional.** Used by `escalate_alert`, `quarantine_message`, `notify_reporter`, `document_ticket` (`pack.yaml:782-865`). |
| Delayed consequence | `delayMinutes` → `dueAt = simClock + delay` → `applyDueConsequences` fires when clock passes it (`scheduler.ts:49-84`) | **Fully functional, unconditional only.** Live example: `dismiss_alert` → `delayMinutes: 40, escalateOnApply: true` reopens the case (`pack.yaml:970-988`). Spec §16.2 overclaims here: delayed branches already ship from YAML. |
| `escalateOnApply` / `escalateResolution` | Declared in `ActionConsequenceSchema` (`schemas/src/actions.ts:55-61`); **consumed in `scheduler.ts:68-81`, not in `effects.ts`** | **Partially implemented, narrow semantics.** On delayed fire, a non-`escalated` event is forced to `escalated` with the authored resolution (default: `"Related activity appeared after the alert was dismissed."`). No other state change accompanies it. There is no `UpdateWorkItemState`/`EmitRecord`/`SendMessage` equivalent. |
| Conditional consequence (state predicate at fire time) | None — `applyDueConsequences` checks only `!applied && dueAt !== undefined && simClock >= dueAt` | **Missing (genuine).** This is the actual gap behind spec §8.2–8.3. |
| Cancellation / supersession | None — no cancel/supersede fields, no revocation path | **Missing (genuine).** |
| `resolve` / `resolution` | `effects.ts:156-161` sets `status = "resolved"` + templated text (`{{eventTitle}}`/`{{event.title}}` fill, `effects.ts:92-96`) | **Fully functional.** Note: `escalate_alert` resolves with status `"resolved"`, not `"escalated"` (`pack.yaml:945-947`) — "escalated" status today comes only from the delayed path. |
| `emitEventResolved` | Pushes `DomainEffect` only (`effects.ts:162-164`); zero state mutation | **Weak/vestigial.** Usable as a log signal, not a transition. |
| `observeArtifactIds` | Dual-track observe (event + global) in `effects.ts:108-115` | **Fully functional; suitable for direct reuse** as provenance input for discovery rules. |
| Hidden deltas | `applyHiddenDelta` (`effects.ts:48-69`): additive cognitiveLoad/accuracy/riskExposure, floored backlog | **Functional but assessment-flavored**, not world-state-flavored. Fine to keep; not a consequence engine. |
| `ask_manager` handling | **Hardcoded branch** in `effects.ts:127-138` (sets `managerConsulted`, writes guidance text as ledger entry, early return) | **Functional but content-hostile.** Bypasses the effect pipeline; spec §11 wants authored NPC intents — this must be generalized, not extended. |
| Consequence identity | `consequence()` (`effects.ts:71-90`): id = `${sessionId}-${ledger.length+1}`, deterministic | **Reusable** for replay-stable IDs. |

`ConsequenceEntry` (`schemas/src/world.ts:86-95`) carries only `{id, eventId, actionId, description, createdAt, dueAt?, applied}` — no condition, no typed mutation, no target system, no NPC hook. Extending it (predicate + typed op + cancel ref) is the Phase 5 core task; the firing loop in the scheduler is already the right home.

---

## E. Simulated-time architecture

**Status: functional, coarse, action-driven.**

- `simClock`: integer minutes, `world.ts:114`. Advanced **only** by `definition.simulatedMinutes` inside `applyAction` (`reducer.ts:67`). No ticking, no idle advance, no wall clock in core.
- Activation: `triggerAt`/`triggeredAt` per template; `activatePendingEvents` flips `pending → active` once `simClock >= triggeredAt` and emits the arrival message (`scheduler.ts:8-33`). Live use: `routine_alert_review` at `triggerAt: 25` (`pack.yaml:1015`).
- Deadlines: `deadlineAt` (= `deadlineMinutes`, absolute, cf. `world.ts:37`); `expireOverdueEvents` flips to `expired` with fixed text when `simClock > deadlineAt` (`scheduler.ts:35-47`). Expiry never escalates and offers no reopen path except a later delayed consequence.
- Delayed firing: evaluated once per action turn; a consequence whose `dueAt` passed fires on the next turn — it can fire **late, never early, and only as a side effect of another action**. There is no exact-time execution and no "wait" action that advances the clock without other effects (`update_ticket_notes`/`update_notebook` cost 0 minutes).
- Snooze: `snoozedUntil = simClock + snoozeMinutes`, woken per turn (`notifications.ts:45-56,75-87`) — deterministic, replay-safe.
- Spec fit: beat-sheet timings (T+00…T+65) map cleanly onto `triggerAt`/`delayMinutes`. What does **not** exist: conditional timing ("when the player does X, respond N minutes later, cancel if Y happens first") — needs predicate + cancel fields. Time parity (§13.3): movement costs 1 energy and 0 minutes while investigative actions cost minutes — movement is effectively time-free; acceptable under "presentation-only" but worth stating explicitly.

---

## F. Canonical-state map

`WorldStateSchema` (`packages/schemas/src/world.ts:109-133`):

- **Identity/session:** `sessionId`, `sessionKind` (`tutorial`|`assessed`), `seed`, `rngState` (dead — see §J), `simClock`, `pacingMode`.
- **World truth + content snapshot:** `rules` embeds the full pack-derived `{actions, eventTemplates, tasks, notifications}` per session — good for replay/versioning; any Work Item/fact/dataset extension must decide whether it lives in `rules` (content snapshot) or instance state.
- **Instance state:** `events[]` (status machine + per-event `completedActionIds`/`observedArtifactIds`/`resolution`/`managerConsulted`), `locations` + `currentLocationId`, `facts` (content-owned, core-inert), `npcs` (mood + `memoryFactIds`, core-inert), `artifacts` + global `observedArtifactIds`, `ticketNotes` (per-event free text), `notebook` (global free text), `kbQuery` (global free text), `taskProgress`, `notifications`, `ledger`, `completedActionIds`, `workplace` (energy/fridge/coffee/Jules topics/recovery), `hidden` (8 numeric fields).
- **Spec §6 coverage:** session ✓, queue ~ (events lack acknowledged/priority/linked-ticket/follow-up refs), datasets ~ (artifacts exist but are prose blobs, not structured records), discovery ✗ (only `observedArtifactIds`), decision ~ (actions+timestamps logged; no scheduled-consequence IDs on the deciding side), NPC ✗ (no availability/intents/pending), documentation ~ (strings only), resources ✓, scheduler ~ (ledger without predicates), derived view ✓.

---

## G. Hidden-state boundary

**Status: functional with three borderline leaks to adjudicate.**

- Stripped: `hidden`, `rules`, `facts`, `npcs`, `taskProgress` internals, `locations` map, `rngState`, `seed`. Answer keys (`requiredOptionIds`, `coachOnFailure`, `successText`) never serialize; task option quotes are gated on observed-and-openable (`serializer.ts:44-57`). The golden-path test asserts the absence of `hidden|rules|evidence|reflections` keys and answer-key strings.
- **Borderline 1 — `templateId` per event** (`client-view.ts:31-43`, emitted `serializer.ts:85-115`). Content key visible to any client; lets UI (or a curious player) join events to pack definitions. Recommend omitting or namespacing in Phase 1.
- **Borderline 2 — full `relatedArtifactIds`** emitted for observed artifacts (`serializer.ts:152-154`) and task views (`serializer.ts:41`). This is authoring metadata that tells the player which records matter — in tension with spec §6.10 and the "no correct-answer state" rule. Discovery design should scope related-record exposure per query result, not per artifact.
- **Borderline 3 — `resolution` text** is client-visible and sometimes carries guidance prose (e.g. dismiss/escalate resolutions). Acceptable as world feedback, but consequence descriptions must stay non-evaluative per §8.4 — current pack complies.
- Own-data exposure (`ticketNotes`, `notebook`, `kbQuery`, full `workplace`) is correct. `lookupKeys` allowlist carries an explicit do-not-infer comment (`serializer.ts:123-131`) — good precedent for the visibility-metadata pattern spec §14.5 wants validated.

---

## H. Existing notebook/ticket/KB primitives

**Status: fully functional as dumb string stores; structurally incompatible with spec §5.3 as-is.**

| Primitive | Schema | Content | Runtime trace | Verdict |
|---|---|---|---|---|
| `update_ticket_notes` | `ActionDefinitionSchema` | `pack.yaml:800-808`: 0 min, 0 energy, `tracksCompletion: false`, `setTicketNotesFromFreeText: true` | `availability.ts:40-57` (utility), `effects.ts:117-119` writes `state.ticketNotes[event.id] = freeText` | Functional. Reusable as the **free-text note channel**, not as ticket state. |
| `update_notebook` | Same pattern | `pack.yaml:809-817`, global `notebook` string | `availability.ts:154-164` (offered iff ≥1 active event, bound to `activeEvents[0].id`); `effects.ts:123-125` | Functional. Note the binding hack: global notebook gated on first-active-event. |
| `document_ticket` | Staged action | `pack.yaml:789-799` + per-template `setTicketNotesFromFreeText` | Same write path; `build_summary` task completion auto-writes option-label summary (`tasks.ts:110-129`) | Functional. The quiz-to-ticket coupling Phase 4 must cut. |
| `setTicketNotesFromFreeText` / `setNotebookFromFreeText` / `setKbQueryFromFreeText` | `ActionEffectSchema` (`schemas/src/actions.ts:70-72`) | Used in pack defaults + overrides | `effects.ts:117-125` — note `setKbQueryFromFreeText` writes even when `freeText` is undefined (keeps old value); the other two require defined text | Functional. **Directly reusable** as the "player-authored text in, validated slot out" pattern — spec §5.3's "free text never becomes authoritative world truth" already holds structurally (text lands in note slots, never in rules/facts/events). |
| `search_knowledge_base` | Action def only | `pack.yaml:758-765` | Stores query string; **no query engine, no result set, no history** | Schema-only w.r.t. spec §5.1. KB "search" today is client-side filtering over serialized artifacts. |

Missing for §5.3/§7.5: ticket ID/status/attachments/entity refs/disposition, status-transition legality, attach-undiscovered-evidence rejection, authoring history. The per-event `ticketNotes` key is the natural migration anchor for a structured ticket record.

---

## I. Evidence/discovery foundations

**Status: no discovery engine exists. Three adjacent primitives do.**

1. **Record-open tracking** — `observeArtifactIds` (effect) → `observedArtifactIds` (global + per-event) → `canOpenArtifact` gating (`packages/core/src/workplace.ts:41-50`: kb always openable; others require a non-pending linked event) → body/metadata withheld until observed (`serializer.ts:147-162`). Fully functional, deterministic, replay-safe. **This is the provenance substrate**: "which records were opened" is already canonical. What is missing: query history, derived facts, visibility states, attachability.
2. **Source-quote gating** — `applyTaskAttempt` refuses submission when any option source is unobserved (`tasks.ts:71-78`); serializer withholds quotes until observed (`serializer.ts:44-57`); pack validation enforces exact quote match (`career-pack.ts:177-192`). A provenance-conditioned rule with build-time validation — the closest existing shape to a discovery rule. Tied to quiz options, so reuse the *pattern*, not the code path.
3. **Assessment evidence** — `EvidenceSignal` (`schemas/src/assessment.ts:15-36`) + `evidenceFromAction` (`packages/evidence/src/from-action.ts:20-42`) records *behavioral* signals per action (dimension/rhythm/observation), not *discovered facts*. No provenance, no visibility lifecycle, no attachment. **Incompatible with spec §5.2's Evidence Fact** — do not extend it; the discovery store must be a separate canonical domain (spec §6.4). Note its non-determinism (`randomUUID`, wall-clock `occurredAt`) is fenced out of replay equality by behavior-only comparison in tests — keep that fence.

---

## J. Replay/test readiness

**Status: strong; release-blocking invariant already enforced.**

- `foldActionLog` (`packages/core/src/replay.ts:7-26`) replays all four interaction types in sequence order. Determinism sources: `structuredClone` everywhere, zero RNG on the turn path, clock advanced only by authored minutes, consequence IDs derived from ledger length, snooze keyed to `simClock`.
- `rng.ts` (`createSeededRandom`) is exported but has **no callers**; `rngState` is write-never. Either wire future randomness through it or delete it before Phase 2 — a second randomness source must never appear.
- Golden-path test asserts `foldActionLog(initial, log)` equals live state exactly, plus evidence stripped to behavior-only fields. Task/notification/workplace recovery paths are covered (`task-recovery`, `shift-lifecycle-recovery`, `workplace-golden-path` tests).
- Content validation (`career-pack.ts:61-222` + `loader.ts:8-17` approval/staleness gate) checks: event↔template listing, action references, artifact related-refs, task bindings/duplicates/system match, source-quote exactness, notification refs. **Gaps** (needed for §14.5): `observeArtifactIds` targets are **not** validated against artifact IDs; `instanceId` uniqueness is unchecked; `triggerAt`/`deadlineMinutes` sanity unchecked; consequence `description` templates unchecked; no unreachable-action detection; no renderer-parity check.
- Server persists live state + full log (in-memory and Postgres paths), so replay is currently test-time rather than resume-time; no re-fold-on-resume was observed.

---

## K. Legacy/new architecture coupling

- **Tight, load-bearing coupling:** task↔action binding (`availability.ts:25-28`, unique per `eventTemplateId:actionId`, enforced `career-pack.ts:159-167`) + `TaskRequiredError` (`reducer.ts:44-52`). Legacy tasks don't just render quiz UI — they **block canonical actions**. Any phase that migrates an action off quiz must also release its gate.
- **Medium coupling:** `build_summary` → ticketNotes auto-write (`tasks.ts:110-129`); serializer task views → `ClientTaskView` UI contracts; `taskProgress` keyed `eventId:taskId` in canonical state (harmless to retain during migration).
- **Loose/no coupling:** observe/notes/notifications/consequences/ledger operate independently of tasks — the newer mechanics the spec wants to grow are already decoupled from the quiz engine. `ask_manager` hardcode (`effects.ts:127-138`) bypasses both task and effect pipelines; generalizing it into authored intents touches neither.
- Migration order implication: convert Investigation-type tasks first (they already have `relatedArtifactIds` + source quotes — the record sets for Phase 2 datasets), `build_summary` last (it owns the only ticket-writing UX).

---

## L. Reusable foundations

Direct reuse, no redesign: `applyAction` lifecycle + error taxonomy; `resolveActionEffect` override-merge; `observeArtifactIds` dual tracking; `set*FromFreeText` slot pattern; `ConsequenceEntry` IDs; notification/snooze state machine; `WorkplaceInteraction` discriminated-union contract (template for the Phase 2 query action); `DomainEffect` log; `toClientView` gating patterns; `CareerPackSchema.superRefine` + loader governance gate; `foldActionLog` replay harness.

Extend (shape right, scope small): `EventStatusSchema` (add acknowledged/monitoring/waiting/follow-up-side states — see §O verdict); staged `progression` (add per-state precondition hooks); `ConsequenceEntry` (add condition predicate + typed op + cancel ref); `WorkArtifact` (add dataset field columns + queryable index — or a sibling `RecordDataset` schema); pack validation (artifact refs, instanceId uniqueness, transition sanity).

Do not reuse: `requiredOptionIds` gating for any new mechanic; `build_summary` label-synthesis as documentation; `emitEventResolved` as anything but a log line; `EvidenceSignal` as discovery state; `ask_manager` hardcode as the NPC pattern.

---

## M. Genuine missing architecture

1. **Query engine**: no query action, dataset schema, filter language, result ordering, query history, or absence-proof semantics (spec §5.1, §7.1–7.4, §7.8).
2. **Evidence facts + discovery rules**: fact store, provenance requirements, visibility lifecycle, attach/detach, absence-via-query (spec §5.2, §6.4).
3. **Structured ticket/case**: fields, status machine, evidence attachments with discovered-only validation, entity refs, handoff derivation (spec §5.3, §7.5, Phase F).
4. **Conditional/cancellable consequences**: predicates over canonical state evaluated at fire time, supersession, NPC/message hooks, typed mutations beyond escalate (spec §8, §6.9).
5. **NPC runtime model**: availability, authored knowledge projection into turns, intent contracts, pending/delayed replies (spec §5.5, §6.6). Current `NpcState`/`Fact` serve only the AI phrasing layer (`packages/ai/src/index.ts:168-184`).
6. **Work Item operational fields**: acknowledged/owner/priority/follow-up refs/linked ticket — if the verdict in §O is "extend events", these are new fields, not new tables.
7. **Authoring validation** for all of the above (§14.5 list).

---

## N. Spec assumptions contradicted by core reality

1. **§16.2 "delayed conditional branches cannot be YAML" — half wrong.** Delayed *unconditional* branches already ship from YAML (`dismiss_alert` → +40m escalate, `pack.yaml:970-988`). Only the *conditional/cancellable* half needs engine work. Phase 5 scope is smaller than written.
2. **§6.10 strict hidden-state reading — two live exceptions.** `templateId` (per event) and full `relatedArtifactIds` (per observed artifact and every task view) already serialize. Either the spec grants these as presentation metadata or Phase 1 must strip/scope them; the related-records exposure in particular pre-answers "what should I open".
3. **§15.1 compatibility framing understates the gate.** Legacy WorkTasks are not inert rendering code — `TaskRequiredError` makes them canonical blockers. "Keep schema temporarily" is fine only with per-action gate release during migration.
4. **§5.5/§6.6 "NPC availability" assumed as content work.** No availability/intent/pending-reply fields exist anywhere in schemas or core. This is engine + schema work (Phase 6), not content entry.
5. **§13.3 time parity is untested territory.** Movement costs energy but zero simulated minutes; every investigation costs minutes. If 3D movement ever costs time, desk/accessible equivalents need matching costs — currently moot, but the asymmetry is baked into `MOVEMENT_COST` vs `simulatedMinutes`.
6. **"No answer-key gameplay" (§2.1) vs `build_summary`.** The ticket itself is currently authored through required options. Phase 4 isn't just "add ticket UI" — it must replace the only documentation path while preserving the `ticketNotes` canonical slot tests and debrief depend on.

---

## O. Recommended impact on implementation phases

- **Phase 0 (this report):** accept migration-matrix + conflict-log criteria as met by §§B–N above plus a WorkTask inventory (pack task IDs listed in §B scope; full per-task classification still needs a content pass).
- **Phase 1 — extend, don't invent.** Verdict: **no genuinely new Work Item table is needed yet.** `EventInstance` already carries id/type (`templateId`+`systemId`)/status/createdAt (`triggeredAt`)/linked records (`observedArtifactIds`, `eventIds` on artifacts)/resolution. Add: `acknowledgedAt`, priority/attention metadata, `linkedTicketId`, follow-up refs, and 2–3 lifecycle states (`acknowledged`, `monitoring`, `waiting`) to `EventStatusSchema`; project a `WorkItem` view in the serializer rather than forking state. Revisit a separate abstraction only if branch state outgrows event fields.
- **Phase 2 is the biggest engine lift** (new `query_records`-style interaction type + dataset schemas + deterministic filter + history). Harvest `relatedArtifactIds` and source-quote artifact sets from the Investigation tasks being retired — they are the seed datasets.
- **Phase 3 is greenfield but well-precedented**: model discovery rules on the source-quote gating pattern (build-time exactness checks + runtime observed-set conditions), with `observedArtifactIds` + the new query history as the only provenance inputs.
- **Phase 4 replaces, not augments**: structured ticket supersedes `ticketNotes`-as-prose while keeping the same canonical key for replay continuity; cut the `build_summary` synthesis at the same time.
- **Phase 5 extends the existing firing loop**: add predicate + cancel + typed-op to `ConsequenceEntry`; evaluation point is already `applyDueConsequences`. The dismiss→escalate rule is the regression anchor.
- **Cross-phase guardrails to add early**: strip/scope `templateId` + `relatedArtifactIds` (Phase 1); validate `observeArtifactIds` targets + `instanceId` uniqueness (Phase 1); wire-or-delete `rng.ts` before Phase 2; add renderer-parity contract tests per canonical action (Phase 8 needs them, but the surface is known now).
- **Phase order stands** as written (1→9), with one correction: move NPC intent-contract schema design (currently Phase 6) earlier as a schema-only sketch in Phase 1, since Work Item lifecycle states (`waiting`, `follow-up`) will reference NPC hooks and ticket state.
