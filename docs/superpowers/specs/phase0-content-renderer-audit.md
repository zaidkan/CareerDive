# Phase 0 — Content & Renderer Audit (READ-ONLY)

**Status:** Audit only. No implementation. No edits to canonical spec.
**Canonical target:** `docs/superpowers/specs/interactivity-and-content-depth-design.md`
**Pack audited:** `content/packs/cybersecurity-analyst/pack.yaml` (1362 lines)
**Date:** 2026-09-17
**Method:** pack read in full; engine/UI grep + file reads; two parallel read-only subaudits (backend core, frontend renderers); spot-verified symbols below.

Central question: **how much of the target simulation is already partially built, and where does the experience still collapse back into quiz-like `requiredOptionIds` behavior?**

Short answer:

- The **deterministic state machine, progression gating, delayed consequences, artifact observation, notebook/ticket/KB plumbing, three-renderer parity shell, Morgan boundary, Jules peer system, and interruption/queue/break-room scaffolding are all real and partially stateful**. Much of the *architecture the target spec needs* exists as a strong reusable foundation.
- But **every primary player verb that advances the shift is still gated behind a `WorkTask` quiz step evaluated by exact `requiredOptionIds` match** (`packages/core/src/tasks.ts:applyTaskAttempt`, `:exactRequiredSelection`). There is **no query engine, no evidence-fact store, no discovery rules, no structured ticket assembly**. Investigation = open artifact (stateful) → answer quiz about artifact (quiz) → unlock next action (stateful gating over quiz logic). That is **presentation over legacy quiz logic** at the core loop.
- The **phishing workflow (`open_phishing_report`, `inspect_email_headers`, `check_link_destination`, `quarantine_message`, `notify_reporter`) is fully dead**: actions defined, zero progression references, zero artifacts, never offered. Only trace is a stale guidance hint.
- The target beat sheet's **phishing item, Jules status interaction, false-positive review, end-of-shift handoff work product, and auth/VPN/device query tools do not exist as mechanics**. Scanner and login cases exist as content-rich quiz chains with good prose worth preserving, not as queryable datasets.

---

## Classification legend

| Label | Meaning |
|---|---|
| REAL | Real stateful simulation mechanic |
| PARTIAL | Partially stateful (state + persistence exist, core verb still quiz/manual) |
| QUIZ-SHELL | Presentation over legacy quiz logic |
| STATIC | Static artifact (rich text, no mechanic) |
| DEAD | Unused/dead (defined, never reachable) |
| FOUNDATION | Strong reusable foundation (infra ready for target mechanic) |

## Tool/workflow classification summary

| Tool / workflow | Verdict | One-line reason |
|---|---|---|
| SOC shift flow / progression gating | PARTIAL | `availability.ts:actionsForEvent`, linear + stages + `alsoOffer`/`utilityActions` are real; every step gated on quiz completion via `reducer.ts:TaskRequiredError` |
| Handoff tasks | QUIZ-SHELL | `select_clues` + `choose_response` exact-match; artifacts real, evaluation quiz |
| Login alert compare/context/history | QUIZ-SHELL | Rich artifacts + `observeArtifactIds`; all 4 task groups require exact `requiredOptionIds` |
| Device inventory match | QUIZ-SHELL | Exact `lookupKeys` match exists (`InventoryLookup.tsx`) but task still `match_reference` quiz; side-effect employee reply is PARTIAL |
| VPN / route cross-check | QUIZ-SHELL | Best content in pack (`vpn-cross-check` 3-record comparison); still a 3-of-3 quiz selection |
| Ticket summary (`login-ticket-summary`, 5 steps) | QUIZ-SHELL | `build_summary` synthesizes freeText from labels; no structured entity/evidence references |
| Scanner triage + window match + closure | QUIZ-SHELL | Three-step quiz chain; `scanner-run-log` corroboration content excellent but quiz-evaluated |
| Phishing workflow (5 actions) | DEAD | Defined `pack.yaml:818-865`; no progression ref; `phishing-email-1`/`phishing-headers-1`/`phishing-link-1` artifacts do not exist |
| `update_ticket_notes` / `update_notebook` | PARTIAL | Real free-text canonical state (`effects.ts:117-125`, `world.ts:126-128`), 0-cost, `tracksCompletion:false`; surfaced via `NotesEditor`; no discovery/attach legality |
| `search_knowledge_base` | PARTIAL | Canonical action with time/energy + `observeArtifactIds` per-event override; but `setKbQueryFromFreeText` never evaluated — no search engine |
| KB local filter + InventoryLookup | FOUNDATION | `GuideSearch.tsx` local filter + `filterKnowledgeBase`; exact-key device lookup; UI pattern reusable for real query engine |
| Artifact observation / serializer redaction | FOUNDATION | `observedArtifactIds` dual-write (`effects.ts:108-115`, `workplace.ts:observeArtifact`), preview-vs-body redaction (`serializer.ts:119-162`), source-quote gate (`tasks.ts:71-78`) |
| Stateful decisions (`escalate`/`dismiss`) | PARTIAL | Real `resolve:true`, `hidden` mutations, immediate + delayed consequences; but reachable only after full quiz chain; labels already workplace-style (good) |
| Delayed consequence scheduler | PARTIAL | Real `delayMinutes`/`dueAt`/`escalateOnApply` (`scheduler.ts:49-84`); only one delayed rule exists (dismiss → +40m reopen) |
| Interruptions / queue / pacing | PARTIAL | `triggerAt:25` routine arrival, `snoozeMinutes:15`, deadlines, `initialTaskBacklog`; only 1 notification; no 3-item queue pressure |
| Desk OS architecture | FOUNDATION | `DeskOs.tsx`, `OpsConsole.tsx`, `SystemApp.tsx` + `workstation.ts:deriveSystemState` shared by all renderers; needs query/record UI, not chrome |
| Team Chat / Morgan channel | PARTIAL | Real thread artifacts + `ask_manager` ledger effect; no free-text input in UI (server route only) |
| Morgan | PARTIAL | Pack-authored NPC, fact-scoped (`speakerMayKnow`), per-template `managerGuidance`, deterministic fallback; single-shot `managerConsulted`, no pending/delayed replies |
| Jules | PARTIAL (peer, not manager) | Not in pack; deterministic `jules.ts` state-derived replies + `JulesDialogue.tsx` topics; all renderers; defers decisions to Morgan; no canonical facts/intents |
| AI dialogue boundary | FOUNDATION | `LlmProvider`, `validateNpcOutput`, `SessionBudget`, `deterministicInputSafety`, fallback; Morgan-only server path; Jules deliberately LLM-free |
| 3D workplace | FOUNDATION | `socLayout.ts`, `collision.ts`, props, `LaptopOverlay`, hotspots; only `desk_player`/`jules`/`break` produce canonical effects; alert-wall/Morgan-station flavor-only |
| Desk-only | FOUNDATION | `WorkSurface.tsx` same `deriveSystemState`, same action IDs; needs tool-depth, not layout |
| Accessible / simple-list | FOUNDATION | `AccessibleMode.tsx` same handlers, same `data-action-id/event-id/task-id`; genuine parity shell |
| Break-room / energy / snacks / coffee | PARTIAL | Real `workplace.ts` controls + `BreakRoomPanel.tsx`; atmosphere + pacing texture; correctly not evidence |
| Content validation | PARTIAL | `CareerPackSchema.superRefine:61-222` checks refs + source-quote inclusion; misses orphaned actions, missing artifacts, unknown fields, unreachable content |
| Evidence signals (server) | FOUNDATION | Per-action/per-task evidence push (`router.ts:145-153,245-257`); assessment-layer, not in-sim discovery |

---

## A. Actual shift beat map

Derived from `pack.yaml` triggers, progressions, notifications, and UI guidance. Simulated clock starts 08:00 (`systems.ts:formatShiftClock`). All times are simulated minutes (action `simulatedMinutes` advance the clock), not wall-clock.

| Beat | Sim condition | What player sees | Backend effect | Evidence |
|---|---|---|---|---|
| A0 Briefing + queue | Session start, `initialTaskBacklog:3` | Briefing text; 2 active events (`suspicious-login-1`, `handoff-1`); tutorial steps (`guidance.ts:TUTORIAL_STEPS`) | `world.ts` builds events/artifacts; `availableActions` offers `read_handoff` + `review_alert` | `pack.yaml:47-57`, `guidance.ts:48-68` |
| A1 Handoff read | `incomplete_handoff` linear step 0 | `EmailTool` → Open message → `handoff-email` body | `read_handoff` observes `handoff-email` (5m, 2 energy) | `pack.yaml:698-705` |
| A2 Handoff quiz x2 | Task-bound `read_handoff` | `TaskInteraction` → `handoff-open-items` (2 `select_clues` steps, 1-of-1 each) | `tasks.ts:applyTaskAttempt` exact-match; `coachOnFailure`/`successText` | `pack.yaml:59-130` |
| A3 Handoff reply quiz | Linear step 1 | `TeamChatTool` → `handoff-priority-message` (`choose_response`) | Completion resolves event, `taskBacklog:-1` | `pack.yaml:132-156,706-718` |
| B1 Alert triage | `suspicious_login` stage 0 | `AlertTool` → Open alert → `suspicious-login-alert` (A-1042) | `review_alert` observes alert + `cognitiveLoad:1` | `pack.yaml:719-727,962-965` |
| B2 Alert quiz x2 | Task-bound `review_alert` | `login-alert-compare` (`compare_records`: sequence + uncertainty) | Exact-match; must pick `failures-then-success`, `geo-hint` | `pack.yaml:158-200` |
| B3 Context inspection | Stage 1 | `inspect_login_context` → `login-context-1` (unknown-laptop-17, residential ASN) | Observe + `accuracy:1`; task `login-context-clues` 2-of-2 | `pack.yaml:202-228,728-737` |
| B4 History + device (parallel) | Stage 2 `mode:all_remaining` | `inspect_account_history` → `account-history-1`; `check_device_inventory` → `device-inventory-1` + auto employee reply | Device override `pack.yaml:966-969` emits `J. Patel replied...` consequence; tasks `account-pattern-compare` (3 steps) + `device-owner-match` (3 steps) | `pack.yaml:230-405,738-757` |
| B5 Ticket quiz (5 steps) | Stage 3 `document_ticket` | `Tickets` → `login-ticket-summary` (`build_summary` × 5: evidence, uncertainty, route, limits, next step) | Synthesizes freeText from labels; sets `ticketNotes[suspicious-login-1]` | `pack.yaml:407-516,789-799` |
| B6 Decision | Stage 4 `escalate_alert` (+ `dismiss_alert`/`search_knowledge_base` alsoOffer) | `CaseReview` → Escalate with evidence / Dismiss as false positive / Check procedure | `escalate_alert` resolves with rich resolution; `dismiss_alert` resolves + schedules +40m reopen (`escalateOnApply:true`) | `pack.yaml:919-988` |
| C1 Routine interruption | `triggerAt:25`, `initialStatus:pending` | `NotificationBanner` "New low-priority scanner alert" → Handle now / Snooze 15m / Continue | `scheduler.ts:activatePendingEvents` + ledger entry; `snoozeMinutes:15` | `pack.yaml:670-677,1009-1017` |
| C2 Scanner chain | `routine_alert_review` linear 4-step | `review_alert` → `search_knowledge_base` → `document_ticket` → `dismiss_alert`; tasks `scanner-alert-compare`, `scanner-window-match` (incl. run-log cross-check), `scanner-ticket-summary` (3 steps) | Routine overrides observe `scanner-alert`/`scanner-window`; dismiss resolves with `taskBacklog:-1` | `pack.yaml:518-668,1025-1054` |
| C3 Morgan consult (any) | `allowManager:true` all templates | Team chat `ask_manager` button (once per event) | `effects.ts:127-138`: `managerConsulted=true`, ledger `managerGuidance`; no state transition | `pack.yaml:866-872`, `availability.ts:53-55` |
| C4 Free notes (any) | `utilityActions:[update_ticket_notes]` + global `update_notebook` | `NotesEditor` Save buttons (`data-action-id`) | 0m/0-energy freeText writes; never gate progression | `pack.yaml:800-817`, `availability.ts:48-52,154-164` |
| D1 Dismiss fallout (only branch) | +40m after suspicious `dismiss_alert` | Escalation notice; `escalateResolution: Related activity appeared...` | `scheduler.ts:applyDueConsequences` reopens as escalated | `pack.yaml:970-988` |
| D2 Wrap-up | All events `resolved/escalated/expired` | Guidance "Wrap up your shift"; Team chat `complete_shift` (`eventId:"shift"`) | No effect; terminal action | `pack.yaml:873-879`, `availability.ts:128-150`, `guidance.ts:17-25` |

What is **missing vs target beat sheet** (T+00–T+65): no T+02/T+05 scanner-before-signal ordering (scanner arrives at +25 regardless); no T+11/T+12/T+13 auth/VPN/device query tools (all collapsed into staged action buttons + quiz); no T+17 delayed Morgan response (instant ledger); no T+20 phishing item (dead); no T+25 Jules status interaction as canonical action (Jules is ambient peer dialogue); no T+28 multi-legal decisions (single linear path to escalate); no T+30–40 resume-before-fallout (fallout only on dismiss path); no T+43 false-positive review as distinct item (dismiss doubles as closer); no T+55 stabilization / T+60 handoff work product (only `complete_shift` button).

---

## B. Current task/workflow inventory

All 10 tasks use `requiredOptionIds` exact-match (`packages/core/src/tasks.ts:59-63`). `minSelections`/`maxSelections` always equal `requiredOptionIds.length` — every step is single-correct-answer quiz by construction.

| Task (`actionId` / `kind`) | Steps | Player experience | Underlying mechanic |
|---|---|---|---|
| `handoff-open-items` (`read_handoff` / `select_clues`) | 2 | Mark passages in handoff email: unfinished check + missing schedule ref | QUIZ-SHELL; `relatedArtifactIds:[handoff-email]`, source-quote gate, 1-of-1 exact match |
| `handoff-priority-message` (`acknowledge_handoff` / `choose_response`) | 1 | Pick 1-of-3 Morgan reply | QUIZ-SHELL; correct = `login-first-watch-routine` |
| `login-alert-compare` (`review_alert` / `compare_records`) | 2 | Reconstruct sequence; mark uncertainty | QUIZ-SHELL; `failures-then-success` + `geo-hint` |
| `login-context-clues` (`inspect_login_context` / `select_clues`) | 1 | Mark 2 device/network clues | QUIZ-SHELL; 2-of-2 exact |
| `account-pattern-compare` (`inspect_account_history` / `compare_records`) | 3 | Baseline (2 picks) → difference (1 pick) → VPN cross-check (3 picks across 3 records) | QUIZ-SHELL; strongest content, still exact-match incl. 3-of-3 |
| `device-owner-match` (`check_device_inventory` / `match_reference`) | 3 | Inventory match → employee reply → travel-record limits (2 picks) | QUIZ-SHELL + PARTIAL side-effect (employee reply auto-delivered) |
| `login-ticket-summary` (`document_ticket` / `build_summary`) | 5 | Choose evidence/uncertainty/route/limits/next-step wordings | QUIZ-SHELL; labels synthesized into `ticketNotes` freeText |
| `scanner-alert-compare` (`review_alert` / `compare_records`) | 1 | Pick scanner name + network (2-of-2) | QUIZ-SHELL |
| `scanner-window-match` (`search_knowledge_base` / `match_reference`) | 2 | Match window (1 pick) → run-log cross-check (2 picks, event-time vs delivery-time trap) | QUIZ-SHELL; best routine content |
| `scanner-ticket-summary` (`document_ticket` / `build_summary`) | 3 | Record match (2 picks) → coverage limit (1) → closure reason (1) | QUIZ-SHELL |

Task-evaluation pipeline (all quiz): `availability.ts:target:25-28` binds task → `reducer.ts:44-52` throws `TaskRequiredError` until `progress.completed` → `tasks.ts:applyTaskAttempt` checks source-observed gate → `exactRequiredSelection` → fail = `coachOnFailure` + `attempts+=1` only; final success dispatches underlying action. Schema guard `tasks.ts:PackTaskStepSchema.superRefine` enforces answer-key integrity but nothing else.

---

## C. Phishing workflow audit — DEAD

**Verdict: DEAD / unused.** Strongest "looks built, is not" case in repo.

- Actions defined with real costs and effects (`pack.yaml:818-865`): `open_phishing_report` (observe `phishing-email-1`), `inspect_email_headers` (observe `phishing-headers-1` + accuracy), `check_link_destination` (observe `phishing-link-1` + accuracy), `quarantine_message` (consequence), `notify_reporter` (consequence).
- **Zero progression references**: no `sequence`/`offer`/`alsoOffer`/`utilityActions` mentions them in any of the 3 event templates. `availableActions` (`availability.ts`) can therefore never offer them.
- **Zero artifacts**: `pack.yaml:artifacts` contains 16 records (`login-session-timeline` → `ticket-suspicious-login`); no `phishing-*` IDs exist. Following the default effects would observe nonexistent IDs.
- **Zero UI**: grep over `apps/web/src` finds no component referencing these 5 IDs. Only hit in repo UI layer is a stale hint string `guidance.ts:32-33` (`open_phishing_report: "Open the employee report..."`) which can never trigger because the action is never offered.
- Prior docs already flag this: `docs/2026-09-06-workspace-audit.md:72` (orphaned phishing debt, per subaudit).
- Target spec Phase C (T+20 phishing report with open → inspect → KB → document/route/close) has **no counterpart**. Migration = author from scratch; only the 5 action shells + 2 consequence wordings are reusable.

`update_notebook` shares the "defined but unlisted" pattern partially: no progression ref, but rescued by global append (`availability.ts:154-164`). Phishing actions have no such rescue.

---

## D. Central login-case audit (A-1042)

**Verdict: QUIZ-SHELL over PARTIAL foundation. Best content, wrong mechanic.**

Content worth preserving (genuinely good — cautious, anti-overclaim prose):

- `suspicious-login-alert` (A-1042): 6 failed MFA + 1 password success, device/network/geo-hint with explicit "estimate, not identity" framing.
- `login-session-timeline`: S-0731 vs S-0741 separation, collection-ends-07:45 limit, "A-1042 and login-context-1 summarize the same source" anti-double-counting rule.
- `prior-session-1` + `vpn-context-1` (V-218 → 198.51.100.20; 203.0.113.44 not approved exit): route-not-city comparison.
- `device-inventory-1` (`lookupKeys: unknown-laptop-17`), `employee-login-reply` (denial framed as report, not proof), `travel-status-1` (coverage limit), `login-follow-up-guide` (procedure leaves case open).
- Dismiss/escalate resolutions explicitly refuse identity findings ("suspected, not proven").

Mechanics reality:

- Investigation path is **6 staged action buttons** (`review_alert` → `inspect_login_context` → `inspect_account_history` + `check_device_inventory` → `document_ticket` → `escalate_alert`), each observing 1–2 artifacts (PARTIAL) but each **locked behind its quiz task** (QUIZ-SHELL). `dismiss_alert` is `alsoOffer`ed throughout; `search_knowledge_base` only at final stage as `alsoOffer` (utility, observes `login-follow-up-guide` + "remains open" consequence — the single most target-aligned touch).
- No filtering by user/time/session/IP; no record opening beyond whole-artifact observe; no comparison besides picking passages; no evidence facts; query order irrelevant because progression order is fixed.
- Decisions: `escalate_alert` (real resolve + handoff-quality resolution) and `dismiss_alert` (real resolve + 40m delayed reopen — the **only delayed conditional consequence** in the shift). Both already use workplace labels, satisfying target §5.4 UI rule. But both require completing the entire quiz chain first; there is no "early monitor / investigate-then-decide" freedom.
- `check_device_inventory` auto-delivers the employee reply as an immediate consequence (`pack.yaml:966-969`) — a real cross-record emission, but instant and unmissable rather than a separate message to triage.

---

## E. Scanner and false-positive audit

**Scanner: QUIZ-SHELL, good routine-work content. False-positive as distinct item: ABSENT.**

- `routine_alert_review` (`triggerAt:25`, linear 4-step) is the only interruption. Arrival via `NotificationBanner` (Handle now / Snooze 15m / Continue) is PARTIAL pacing UI over a single event.
- `scanner-window-match` step 2 (`scanner-run-cross-check`) is the best routine mechanic sketch: run identity/scope (`RUN-FIN-031`, `SCAN-FIN-MON`) + recorded event time 10:18 vs delivery-time trap + schedule-owner distractor. `scanner-ticket-summary` step 2 enforces coverage-limit honesty ("discovery connections only"). Both worth direct migration into query + evidence rules.
- Closure (`dismiss_alert` routine override) resolves with a precise, bounded resolution — target-aligned language.
- **No false-positive review item exists.** Target T+43 (suspicious-looking but benign contrast case) has no counterpart; `dismiss_alert` on the login case doubles as the only "close" verb. Scanner content *teaches* expected-activity closure but never tests benign-vs-malicious discrimination under uncertainty.
- Handoff's `scanner-window` missing-reference step foreshadows the scanner item (nice dependency), but the link is quiz-answer (`requiredOptionIds:[scanner-window]`) rather than a discovered evidence attachment.

---

## F. Notebook / ticket / KB UX audit

**Verdict: PARTIAL throughout — real canonical persistence, quiz or stub interaction.**

- **Notebook** (`update_notebook`, `ticket_queue`, 0m/0-energy, `tracksCompletion:false`): global `world.ts:notebook:string`, set only when `freeText !== undefined` (`effects.ts:123`). UI: `NotesEditor` textarea + Save (`data-action-id="update_notebook"`), also in `AccessibleMode`. OS `Notes.tsx` scratch explicitly never assessed (correct boundary). Missing: evidence attach, provenance, per-case linkage. Never gates anything — correctly utility.
- **Ticket** (`document_ticket` + `update_ticket_notes`): per-event `ticketNotes:record<eventId,string>`. Two parallel systems: (1) free-text `NotesEditor` (PARTIAL, real, editable, replayed via `serializer.ts:163-165`); (2) `build_summary` quiz (`WorkTaskPanel.tsx:79` evidence/uncertainty/next-step groups + generated preview) which **overwrites** the same `ticketNotes` key with synthesized labels on completion. Free composition exists but the golden path teaches quiz-composition. No structured fields (status/entity refs/evidence attachments/disposition), no legality checks beyond quiz. Target §5.3 acceptance ("without answering multiple-choice summary") fails.
- **KB** (`search_knowledge_base`): canonical action (10m/3-energy) with per-event observe override (login guide vs scanner window) + `setKbQueryFromFreeText`. `GuideSearch.tsx` exposes **two** searches: local client filter (`filterKnowledgeBase`, zero cost, genuinely useful) and canonical Search guides form (`performAction` freeText → stored `kbQuery`, never evaluated). No index, no record ranking, no query-history state. `InventoryLookup.tsx` exact-`lookupKeys` match is the closest to a real query and should become the pattern.
- **Artifacts**: `ArtifactList` + `ArtifactDetail` + `ArtifactOpenButton` (`open_artifact` workplace mutation, never optimistic) with preview-before-open redaction is FOUNDATION-quality. `relatedArtifactIds` wiring through `TaskInteraction`/`RecordComparison`/`SourceEvidence` passage buttons is the presentation pattern to keep, with evaluation replaced by discovery rules.

---

## G. Desk OS / tool audit

**Verdict: FOUNDATION (shell + routing) with STATIC/QUIZ-SHELL tools.**

- Architecture (`apps/web/src/world/deskOs/`): `DeskOs.tsx` single-active-window, `OpsConsole.tsx` tab chrome + address bar + time/energy/objective strip + `NotificationBanner` + `CaseRail`, `BrowserApp.tsx` cosmetic browser at `verdaly://ops`, `tabs.ts:APP_TABS` (home, alert_dashboard, email, ticket_queue, knowledge_base, team_chat, calendar), OS apps (desktop, browser, files, notes). `LaptopOverlay.tsx` mounts real DOM over canvas with fullscreen. Verdict: FOUNDATION — windowing adds no mechanics and should not block beta, but routing is sound.
- Shared derivation (`workstation.ts:deriveSystemState` filtering `availableActions` by `systemId` + event/shift/notebook) used by 3D `SystemApp.tsx` and 2D `WorkSurface.tsx`. Queue-left/detail-right/tool-below layout consistent. `systems.ts` utility/wrap-up partitioning keeps guidance from pointing at `complete_shift`. Verdict: FOUNDATION.
- Per-system tools: `EmailTool` (queue + detail, observe-gated body), `AlertTool` (timeline + metadata, observe-gated), `GuideSearch` + `InventoryLookup`, `TeamChatTool` (thread + Morgan guidance, **no free-text input**), ticket split (list/detail/`NotesEditor`), `CalendarPanel`, `DashboardHome`. All render `SystemToolPanel:ActionButtons` (primary highlight + `data-action-id/event-id`) then `TaskInteraction`/`WorkTaskPanel`. Verdict: tools are **artifact viewers + action cards** — STATIC display + QUIZ-SHELL verbs. No tool supports distinct work verb beyond observe-then-answer.
- Cross-tool linking: only via `relatedArtifactIds` passage buttons and Jules `nextSystemId` hints. No "open linked session / search same IP / attach to case" actions. Target §12.3 missing.
- Auth/VPN/device/alert dedicated tools: **absent**. Device via KB action button + exact lookup; VPN via 3-record quiz; auth via staged buttons; alert rows not selectable (selection lives in task passages). Target §12.1 (Authentication Records, VPN Records, Device Inventory as query tools) unbuilt.
- Queue prominence: `CaseRail` + per-system queues + `remainingMinutes` display exist; with max 2 concurrent actives and 1 interruption, "always determine open/waiting/follow-up/resolved" is trivially true but untested under target's ~3-item pressure.

---

## H. Morgan / Jules / AI audit

### Morgan — PARTIAL (pack-authored, fact-scoped, single-shot)

- Pack: sole NPC `pack.yaml:691-696` (`manager`/Morgan/Security Operations Manager/`memoryFactIds:[alert-visible]`). Facts: `alert-visible` (public, `knownBy:[manager,user]`), `employee-private-travel` (private, `notKnownBy:[manager,user]`) — correctly excluded from Morgan via `packages/ai/src/index.ts:speakerMayKnow/buildNpcContext:167-190`.
- Interaction: `ask_manager` (`team_chat`, `tracksCompletion:false`) injected once per event until `managerConsulted` (`availability.ts:53-55`). Effect is special-cased ledger push (`effects.ts:127-138`), **not** a generic consequence: returns that event's `managerGuidance` string, sets `managerConsulted=true`, emits `consequence_recorded`. Fallback exists when guidance empty.
- UI: `TeamChatTool` thread + `operationalMessages` (Morgan-prefixed procedure reminders derived from tasks/decisions), `shell.tsx:ManagerContext/ShiftBriefing`, `systems.ts:40` "Talk to Morgan" hint. No dedicated dialogue component; no pending/delayed replies (target T+17/T+48 missing); no availability states beyond one-shot flag.
- Free-text: server-only `router.ts:submitFreeText` (`npcId: manager`) with `deterministicInputSafety` → `buildNpcContext(manager)` → `SessionBudget(0.05)` → `validateNpcOutput` (fact-ID + prohibited-text) → fallback sentence. No frontend input (`TeamChatTool` has none). Deterministic actions unaffected by LLM failure — boundary holds.

### Jules — PARTIAL (deterministic peer, deliberately non-canonical)

Jules is **represented differently than Morgan in every layer**, by design:

| Layer | Morgan | Jules |
|---|---|---|
| Pack | Authored NPC (`npcs:[manager]`) | **No pack entry** |
| Facts/knowledge | `memoryFactIds`, `knownBy`, per-template `managerGuidance` | No facts; `julesDialogueFromClientView` reads **public client view only** (`jules.ts:15-27`) |
| Code | Server AI path + `effects.ts` ledger | Pure function `packages/core/src/jules.ts:resolveDialogue/currentWorkReply` + `JulesDialogue.tsx:TOPICS` (`first_day/current_work/break_room/team_context`) |
| Action contract | Canonical `ask_manager` (time/energy, logged, replayed) | `talk_to_jules` **workplace interaction** (`schemas/src/workplace.ts:42`, `workplace.ts:154`), `mutationKey` includes topic; explicitly not evidence |
| UI | Team chat button | 3D hotspot (`socLayout.ts:128`, `Hotspot:33`), `SocRoom` figure, `GlassBreakNook`, `SpatialShell:handleJulesTopic`, desk/list `ExperienceShell:NonspatialResources` button — same dialog everywhere |
| Effect | Ledger guidance, `managerConsulted` | Reply computed locally **before** workplace mutation; break-room advice references energy state; defers decisions ("ask Morgan", "I cannot confirm who signed in") |

Jules is therefore **supported by shared dialogue code only + deterministic state-derived text** — neither "future/unused" nor "second NPC." It satisfies target §11.2 tone (status/bounded guidance/documentation nudge, no grading) but **not** the letter: no canonical intents, no availability/precondition model, no ticket-state-dependent dialogue (it *reads* available actions to pick hints, which mimics state-dependence without canonical intent contracts), no escalation contact. Migration path: author Jules intents + knowledge in pack, route through the same intent/availability/fallback pipeline as Morgan, keep the LLM-free deterministic replies as fallback text.

### AI boundary — FOUNDATION, holds

`LlmProvider` → `AnthropicLlmProvider` (`emit_npc_turn`) / `FakeLlmProvider`; `npc-dialogue.ts:generateSafeNpcReply` fallback; `safety/src:deterministicInputSafety/validateNpcOutput/SessionBudget`; `router.ts:submitFreeText:299-339`. No evidence of AI-authored facts/procedures/deadlines/outcomes. Jules tests (`core/test/jules.test.ts:114,154-162`) assert serialization never leaks `requiredOptionIds`/private facts/answer keys. Target §11.3 satisfiable without rework.

---

## I. 3D audit — FOUNDATION, presentation-only (correctly)

- Floor plan `world/rooms/socLayout.ts:BASE_HOTSPOTS` (desk_player, alert_wall, morgan_station, break_door, storage, door_exit) + `BREAK_INTERIOR_HOTSPOTS` (jules, coffee, fridge); colliders `socLayout.ts:cubicleCollider/socColliders` + `collision.ts:collidesAt/isStandable` (radius 0.32, clamp x10.2/z6.9).
- `SpatialShell.tsx:230 handleInteract`: desk_player sit → `LaptopOverlay` Desk OS; door_exit leave; break_door transition + flavor; jules dialog; fridge/coffee → control interactions; storage event; **alert_wall/morgan_station flavor-only** (no canonical action — correct parity posture, no 3D-exclusive evidence).
- Props barrel (`props/index.ts`: building/atmosphere/decor/floor/furniture/kitchen/lighting/signage/tech), `Workstation.tsx` set dressing, `SocLighting`, `SceneEffects`, `useAdaptiveQuality`, `FloorMap`, `Wayfinder`, `PlayerController`, `useMovementExertion` (Walk 5m costs energy, not evidence — correct).
- Desk OS in-world via `LaptopOverlay` (F/fullscreen, disabled blur); seated phases (`worldTypes.ts:SpatialPhase`).
- Gap vs target §13: parity holds by construction (same `deriveSystemState` + handlers), but there are **no 3D interaction wrappers for canonical record work** — 3D *is* desk work via overlay. That is acceptable for beta; do not add movement-gated evidence.

---

## J. Accessible-mode audit — FOUNDATION, genuine shell

- `AccessibleMode.tsx`: structured per-system sections reusing `TaskInteraction`, `GuideSearch`, `InventoryLookup`, `CaseReview`, `TeamChatTool`, `NotesEditor`; canonical search rendered separately when task-bound (`SystemToolPanel.tsx:315` filter); same `data-action-id/event-id/task-id` attributes; same mutation coordinator keys.
- Journey/guidance shared (`journey.ts`, `guidance.ts`); mode switch presentation-only (`docs/2026-09-07-evidence-and-modes.md:5`).
- Missing (as everywhere): query/discovery/composition mechanics — parity of quiz is parity, not target parity. No evidence of simplified scoring or reduced outcomes (correct). Manual keyboard/screen-reader/reduced-motion/zoom pass still outstanding per `AGENT_CONTEXT.md §7.8`.

---

## K. Renderer parity matrix

"Same backend outcome?" = identical canonical action ID + legality + reducer result + replay bytes, verified by shared derivation + handler props (not by per-action manual test — no such test file exists; parity is architectural, not proven per action).

| Canonical action | 3D | Desk-only | Accessible | Same backend outcome? | Notes |
|---|---|---|---|---|---|
| `read_handoff` | Yes (desk overlay → Email) | Yes (`WorkSurface` Email) | Yes | Yes | Same `deriveSystemState`; tutorial-mapped |
| `acknowledge_handoff` | Yes | Yes | Yes | Yes | Team chat button everywhere |
| `review_alert` | Yes | Yes | Yes | Yes | `AlertTool` shared |
| `inspect_login_context` | Yes | Yes | Yes | Yes | Same task gate |
| `inspect_account_history` | Yes | Yes | Yes | Yes | Same task gate |
| `check_device_inventory` | Yes | Yes | Yes | Yes | Same + `InventoryLookup` in all three |
| `search_knowledge_base` | Yes | Yes | Yes (separate canonical form) | Yes | Filtered from primary list when task-bound; canonical form always present |
| `document_ticket` | Yes | Yes | Yes | Yes | Same `build_summary` quiz everywhere |
| `escalate_alert` | Yes | Yes | Yes | Yes | `CaseReview` shared |
| `dismiss_alert` | Yes | Yes | Yes | Yes | Same delayed-consequence scheduling |
| `update_ticket_notes` | Yes (`NotesEditor`) | Yes | Yes (per-event + notebook) | Yes | Utility everywhere |
| `update_notebook` | Yes | Yes | Yes | Yes | Global append; same no-op-if-no-freeText |
| `ask_manager` | Yes (Team chat) | Yes | Yes | Yes | Once-per-event everywhere |
| `complete_shift` | Yes | Yes | Yes | Yes | Gated on all-terminal everywhere |
| `open_phishing_report` | **No** | **No** | **No** | N/A (never offered) | DEAD in all renderers |
| `inspect_email_headers` | **No** | **No** | **No** | N/A | DEAD |
| `check_link_destination` | **No** | **No** | **No** | N/A | DEAD |
| `quarantine_message` | **No** | **No** | **No** | N/A | DEAD |
| `notify_reporter` | **No** | **No** | **No** | N/A | DEAD |
| `talk_to_jules` (workplace) | Yes (hotspot → dialog) | Yes (resources button) | Yes (same button) | Yes (same mutation key) | Non-canonical by design; topic in key |
| Break-room (fridge/coffee/snack) | Yes (hotspots + panel) | Yes (panel) | Yes (panel) | Yes | Energy-only; never evidence |
| `open_artifact` (read gating) | Yes | Yes | Yes | Yes | Server-observed; never optimistic |

No renderer grants time, energy, evidence, or outcome advantage. Movement costs energy but produces no evidence (`useMovementExertion`). No tiny-prop/hidden-area/camera-gated facts exist.

---

## L. Interruptions and pacing readiness — PARTIAL

Ready: `triggerAt`/`deadlineMinutes`/`deadlineAt` + `activatePendingEvents`/`expireOverdueEvents` (`scheduler.ts`, `world.ts:28-42`); `routine-scanner-arrived` notification with `snoozeMinutes:15` + `NotificationBanner` (Handle/Snooze/Continue) + ops-console navigation; `initialTaskBacklog:3` with ±1 on handoff/escalate/scanner-close/expiry; per-action time/energy costs; break-room texture; Morgan one-shot + Jules ambient as pressure valves.

Not ready: exactly **one** interruption at a fixed +25m; no T+23 scanner update / T+40 consequence-while-working / T+43 false-positive / T+48 NPC follow-up; snooze is single 15m; deadlines (35/180/220) rarely bind because linear chains finish early; no "waiting as mechanic" (all consequences instant except dismiss-reopen); queue never exceeds 2 actives. Target §9 rules (≤3 competing items, focused windows, sim-time-not-reflex) are architecturally satisfiable — content must author the overlap.

---

## M. Structured-record readiness — NOT BUILT (content exists, engine does not)

Target §7 datasets vs reality:

| Dataset | Records as artifacts (STATIC, good prose) | Structured rows + query engine | Verdict |
|---|---|---|---|
| Authentication (S-0731/S-0741) | `login-session-timeline`, `prior-session-1`, `login-context-1`, `account-history-1`, `suspicious-login-alert` | None | Content ready; engine missing |
| VPN (V-218) | `vpn-context-1` (route catalogue snapshot) | None; absence-fact rule ("no matching VPN session") unbuilt | Content ready; engine missing |
| Device (`unknown-laptop-17`) | `device-inventory-1` (+ `lookupKeys`) | Exact-key lookup only; no inventory table/filter | Closest to queryable; expand |
| Alert (A-1042, A-1180) | `suspicious-login-alert`, `scanner-alert` + `scanner-run-log` | No alert table/filter/detail query | Engine missing |
| Ticket/case | `ticket-suspicious-login` (guidance text) | `ticketNotes` free strings only | Engine missing |
| Chat/message | `chat-morgan`, `handoff-email`, `employee-login-reply`, `travel-status-1` | Immutable bodies; no message dataset/timing | Content ready |
| KB | `login-follow-up-guide`, `scanner-window`, `vpn-context-1` | Local filter only; `kbQuery` stored, never run | Engine missing |
| Scanner | `scanner-alert`, `scanner-run-log`, `scanner-window` | No scan table | Content ready |

Backend has **no** `queryHistory`, `discoveryRule`, `evidenceFact`, `filterArtifact`, `queryable`, `searchKnowledge` symbols (subaudit grep; spot-confirmed). `kbQuery`/`ticketNotes`/`notebook` persist but are never evaluated. Serializer redaction + source-quote gates are the correct visibility primitives to build on (§16.1 "not content-only" list confirmed: querying, discovery, ticket assembly, multi-state consequences, delayed branches, interaction contracts all need engine work).

---

## N. Migration inventory

Target categories: `QUERYABLE_RECORDS`, `EVIDENCE_DISCOVERY`, `CASE_DOCUMENTATION`, `STATEFUL_DECISION`, `WORKPLACE_INTERACTION`, `MUNDANE_WORK_ITEM`, `KEEP_TEMPORARY_LEGACY`, `REMOVE_REDUNDANT_QUIZ`.

| Current ID / name | Player experience | Underlying mechanic | Target mechanic | Content worth preserving | Dependencies | Migration complexity |
|---|---|---|---|---|---|---|
| `handoff-open-items` / Find what last analyst left open | 2× mark-passage quiz | QUIZ-SHELL (`select_clues`) | `EVIDENCE_DISCOVERY` (2 facts: unfinished-device-check, missing-scanner-ref; discovered by opening handoff + attaching) + `MUNDANE_WORK_ITEM` (read handoff) | Handoff body prose; device-check vs login-watched vs manager-online distractors; scanner-schedule foreshadow | Query/evidence engine (Ph2–3); artifact already exists | Low-Med: rewrite 2 steps as discovery rules; keep options as benign records |
| `handoff-priority-message` / Tell Morgan your plan | 1× reply-picker quiz | QUIZ-SHELL (`choose_response`) | `WORKPLACE_INTERACTION` (Morgan intent `confirm_priority` with structured plan fields, not grading) | `login-first-watch-routine` as good-plan template; `close-everything`/`manager-does-it` as legal-but-consequential plans (not wrong answers) | NPC intent pipeline (Ph6) | Med: replace grading with state transition (ownership flag + Morgan ack message) |
| `login-alert-compare` / Read the alert signal | 2× sequence/uncertainty quiz | QUIZ-SHELL (`compare_records`) | `QUERYABLE_RECORDS` (open A-1042; timeline is the record) + `EVIDENCE_DISCOVERY` (sequence fact; uncertainty fact) | Failed-then-success wording; geo-hint-as-clue-not-proof framing | Alert dataset (Ph2) | Low: first query-engine showcase; keep text verbatim as record body |
| `login-context-clues` / Strongest context clues | 1× 2-of-2 device/network quiz | QUIZ-SHELL (`select_clues`) | `EVIDENCE_DISCOVERY` (device-fact + network-fact via opening `login-context-1`) | Unknown-laptop-17 + 90-day-ASN-novelty pairing; chrome/morning distractors | Evidence attach (Ph3) | Low |
| `account-pattern-compare` / Normal pattern | Baseline 2-pick + difference 1-pick + VPN 3-record 3-pick | QUIZ-SHELL (`compare_records`) | `QUERYABLE_RECORDS` (account-history filter + session search) + `EVIDENCE_DISCOVERY` (baseline fact, difference fact, route-mismatch fact incl. absence rule) | Entire VPN cross-check step (S-0731/V-218/198.51.100.20 vs S-0741/203.0.113.44/no-ID; city-estimate trap); termHelp glosses (HQ/Enrolled/ASN) | Query engine + absence-query semantics (Ph2–3) | Med-High: flagship migration; absence fact needs "query capable of establishing absence" |
| `device-owner-match` / Match device to inventory | Inventory 1-pick + reply 1-pick + travel 2-pick | QUIZ-SHELL (`match_reference`) | `QUERYABLE_RECORDS` (inventory search by exact label) + `EVIDENCE_DISCOVERY` (unenrolled fact; denial-as-report fact; coverage-limit fact) | Exact-label matching discipline; "report ≠ proof" + "no entry ≠ no travel" limits; `lookupKeys` pattern | Inventory dataset (Ph2) | Med: lookup exists; add discovery rules + ticket refs |
| `login-ticket-summary` / Build investigation note (5 steps) | 5× pick-the-note quiz | QUIZ-SHELL (`build_summary`) | `CASE_DOCUMENTATION` (structured ticket: status/entity refs/evidence attach/disposition/notes/free-text never truth) | All 5 step wordings as field templates + trap options as invalid-transition examples; collection-limits + shared-source anti-corroboration rules | Ticket state + attach legality (Ph4) | High: replace evaluation with structural validation; keep prose as help text |
| `scanner-alert-compare` / Triage scanner alert | 1× 2-of-2 source/scope quiz | QUIZ-SHELL (`compare_records`) | `QUERYABLE_RECORDS` + `MUNDANE_WORK_ITEM` (acknowledge routine item) | Scanner-name + finance-network pairing | Alert dataset (Ph2) | Low |
| `scanner-window-match` / Approved window (+ run cross-check) | Window 1-pick + run 2-pick (event-time vs delivery trap) | QUIZ-SHELL (`match_reference`) | `QUERYABLE_RECORDS` (change-calendar + run-log search) + `EVIDENCE_DISCOVERY` (window-match + run-corroboration facts) | RUN-FIN-031/SC A N-FIN-MON chain; 10:18 event vs delivery distinction; owner-is-not-run-ID trap | Same as above | Med |
| `scanner-ticket-summary` / Document routine close (3 steps) | Match 2-pick + coverage 1-pick + closure 1-pick | QUIZ-SHELL (`build_summary`) | `CASE_DOCUMENTATION` (closure reason + coverage limit) + `MUNDANE_WORK_ITEM` | "Discovery connections only" coverage cap; expected-close wording | Ticket state (Ph4) | Med |
| Phishing 5 actions (no task) | Nothing (unreachable) | DEAD | `QUERYABLE_RECORDS` + `EVIDENCE_DISCOVERY` + `STATEFUL_DECISION` + `MUNDANE_WORK_ITEM` (new T+20 item) | Action shells + quarantine/notify consequence wordings + guidance hint | Full Ph2–5 stack + new artifacts | Med (greenfield content on new mechanics) |
| `dismiss_alert` / `escalate_alert` (login + scanner) | Decision buttons after quiz chains | PARTIAL (`STATEFUL_DECISION` shape, quiz-gated) | `STATEFUL_DECISION` (legal-by-state, preconditions, scheduled conditionals) | Resolutions + consequence texts (among best in pack); workplace labels; dismiss→reopen rule | Consequence scheduler expansion (Ph5) | Low-Med: keep effects; remove quiz preconditions; add monitor/defer intents |
| `ask_manager` | One-shot guidance button | PARTIAL (`WORKPLACE_INTERACTION` shape) | `WORKPLACE_INTERACTION` (availability, pending/delayed replies, intent preconditions) | 3 `managerGuidance` texts; consult-without-transfer framing | NPC state machine (Ph6) | Med |
| Jules `talk_to_jules` topics | Ambient peer dialog | PARTIAL (non-canonical) | `WORKPLACE_INTERACTION` (authored intents, availability, fallback = current texts) | All `currentWorkReply` branch texts as fallback payloads; break-room/team-context coaching | Same as above | Med: author pack intents; keep replies |
| `update_ticket_notes` / `update_notebook` | Free-text save | PARTIAL | `CASE_DOCUMENTATION` (notes + attach refs) | Interaction pattern (`NotesEditor`) | Attach contract (Ph4) | Low |
| `search_knowledge_base` (routine) / procedure lookup | Quiz-gated KB open | PARTIAL | `QUERYABLE_RECORDS` (KB search over articles) | `scanner-window`, `login-follow-up-guide` bodies | KB dataset (Ph2) | Low-Med |
| `complete_shift` | Terminal button | `KEEP_TEMPORARY_LEGACY` (correct shape) | Handoff work product (target T+60: summarize state + pending + uncertainty) | — | Ticket/handoff state (Ph4/7) | Med: replace button with work-product builder |
| Quiz evaluation (`coachOnFailure`/`successText`/`requiredOptionIds` on primary path) | Correctness feedback | — | `REMOVE_REDUNDANT_QUIZ` (primary path) | Trap options → benign records; coach texts → KB/procedure help | — | Delete after each item migrates; keep schema temporarily (§15.1) |

Nothing on the primary path qualifies for `KEEP_TEMPORARY_LEGACY` except `complete_shift` as a terminal placeholder and the `WorkTask` schema itself during migration. No task is removable without replacement (all carry load-bearing content) — hence no `REMOVE_REDUNDANT_QUIZ` rows yet; the category applies to the *evaluation pattern*, not whole tasks.

---

## O. Existing redesign primitives (reuse, don't rebuild)

1. **Progression gating** (`availability.ts:59-126`): linear + stages + `all_remaining` + `alsoOffer` + `utilityActions` + `allowManager` — maps 1:1 to Work Item lifecycle; keep, drive with Work Item states instead of `completedActionIds`.
2. **Artifact observation + redaction** (`effects.ts:108-115`, `workplace.ts:observeArtifact`, `serializer.ts:44-57,119-162`): truth/visibility/discovery separation already partially enforced; add discovered/attached layers on top.
3. **`tracksCompletion:false` utility pattern** (`actions.ts`, `availability.ts:103-109`): correct model for notes/notebook/manager consult; extend to monitor/defer intents.
4. **Consequence scheduler** (`scheduler.ts`, `ActionConsequenceSchema`): `delayMinutes`/`dueAt`/`escalateOnApply`/cancel-supersede shape exists; needs condition predicates + more rules, not a rewrite.
5. **Free-text state plumbing** (`ticketNotes`/`notebook`/`kbQuery` + `NotesEditor` + router `freeText≤2000`): persistence + replay proven; add structural validation + attachment refs.
6. **Fact scoping** (`speakerMayKnow`, `knownBy`/`notKnownBy`, `memoryFactIds`): NPC knowledge boundary proven; extend to Jules intents + dialogue payloads.
7. **Jules state-derived replies** (`jules.ts:currentWorkReply`): availability-driven hint selection is the prototype for intent preconditions; author into pack.
8. **Exact-lookup + local-filter UI** (`InventoryLookup`, `GuideSearch:filterKnowledgeBase`): interaction pattern for query tools; wire to backend query engine.
9. **Passage/source UI** (`RecordComparison`, `SourceEvidence`, `TaskInteraction` source buttons): keep visuals, replace evaluation with discovery/attach.
10. **Parity shell** (`deriveSystemState`, shared handlers, `data-action-id` contracts, three shells): proven; new mechanics inherit parity free if they stay canonical-action-based.
11. **Cautious prose corpus**: the pack's anti-overclaim language (estimates vs proof, reports vs findings, coverage limits, shared-source warnings) is the voice of the target sim — migrate verbatim into records, fallback payloads, and ticket help text.

---

## P. Spec assumptions contradicted by experience/content reality

1. **"Newer phishing actions exist" ≠ phishing workflow exists.** Spec §18/Phase 7 order lists phishing as re-author work; reality is harsher — there is nothing to re-author, only 5 orphaned action shells + missing artifacts. Phishing is greenfield content, not migration. (Evidence: §C.)
2. **Jules is not a second pack NPC.** Target §11.2/§19.1 ("Jules bounded interaction" as MUST-ship) reads as authoring two NPCs; repo has one pack NPC (Morgan) + one deterministic peer system (Jules). The MUST is satisfiable without a second NPC authoring pass, but the spec's NPC-state/intent language (§5.5, §6.6) currently describes Morgan only. Clarify: Jules intents must be authored or the MUST reworded to peer-dialogue.
3. **Scanner already has run-log corroboration content the spec doesn't mention.** Target §7.8 imagines scanner dataset work; `scanner-run-log` (RUN-FIN-031, interval 10:05–10:32, coverage cap) already implements the approved-window-vs-recorded-run distinction. Spec Phase 7 order (routine scanner before A-1042) is fine, but the content is ahead of the spec's mental model — preserve, don't redesign.
4. **Handoff already teaches queue-delay vs event-time.** `handoff-email` ("compare the event time ... not just the time it reaches our queue") + scanner delivery-trap steps anticipate target §8/§9 timing semantics. The scheduler supports it; content needs no new concept here.
5. **Anti-corroboration rules already exist as prose.** Timeline ("A-1042 and login-context-1 summarize the same source") and run-log ("shared alert reference ... does not turn the alert summary into independent measurement") pre-implement target §5.2 provenance thinking. Engine must catch up to content, not vice versa.
6. **`update_notebook`/`update_ticket_notes`/`search_knowledge_base` are not "new actions"** — they are shipped, canonical, replayed, and UI-exposed. Spec phases that list notebook/ticket/KB as new work should be framed as mechanic upgrades (discovery, attachability, query evaluation), not greenfield actions. Prevents double-counting velocity.
7. **Renderer parity is architecturally done; tool depth is the gap.** Spec Phase 8 implies parity audit as late work; the parity shell (same derivation, same IDs, same outcomes) already holds. Risk is not divergence but shared thinness — all three renderers expose the same quiz. Phase 8 should be re-scoped to per-action parity *tests* for new mechanics, not parity construction.
8. **One delayed consequence exists, so the scheduler is proven but lonely.** Spec §8 reads as new architecture; `dismiss_alert` +40m reopen proves `dueAt`/`escalateOnApply`/replay through the same path. Phase 5 should add rules/conditions, not a scheduler.
9. **No false-positive content exists despite the dismiss verb.** Target T+43 assumes contrast-case content; repo has none. Either author it (recommended — teaches "don't always escalate") or cut T+43 from beta MUST.
10. **Energy/snack/coffee/break-room already satisfy "mundane" texture** with correct non-evidence status. Spec §10/§19.2 ("small break-room tie-ins" as SHOULD) undersells shipped state — keep as-is, don't expand before Ph2–5.

---

## Q. Recommended effect on implementation phases

- **Phase 0 (this audit): COMPLETE on acceptance.** Migration matrix for every task exists (§N); canonical actions inventoried (§B/C/K); effect/consequence behavior inventoried (§D/E/L); tools/renderers inventoried (§G/I/J/K); record-candidates identified (§M); Morgan/Jules roles confirmed (§H); serialization boundaries mapped (observation redaction + `jules.test.ts` leak assertions). No beta behavior unclassified except break-room tuning minutiae (out of scope).
- **Phase 1 (Work Item + state): PROCEED, narrowed.** Keep `availability.ts` gating shape; swap `completedActionIds` progression keys for Work Item lifecycle states. Do not rebuild scheduler/validation shell. Add the 8 consequence types (§8.1) as data, not engine rewrite. RED tests: lifecycle transitions, illegal-transition rejection, replay, hidden-field stripping — all extend existing suites (`core/test/*`, `serializer.test.ts`).
- **Phase 2 (Records + query): PROCEED as next load-bearing phase.** Highest leverage: turns §D/E content into mechanics without touching prose. Start with alert + device-inventory tables (smallest schemas, `lookupKeys` pattern exists), then auth/VPN.ouse `GuideSearch` local-filter + `InventoryLookup` as UI shells; add canonical query action evaluation behind `setKbQueryFromFreeText`-style plumbing. The VPN absence-fact is the hard case — schedule it explicitly.
- **Phase 3 (Evidence + notebook): PROCEED immediately after Ph2.** Discovery rules map 1:1 from `requiredOptionIds` steps (§N); provenance from `relatedArtifactIds` + source quotes. Keep `update_notebook` free-text; add attach/unattach. Hard rule: no clue counters, no required-clue metadata in client view (serializer tests already assert this shape).
- **Phase 4 (Ticket work product): PROCEED, highest content value.** `login-ticket-summary` 5-step content becomes field help + validation examples. Structural legality only (discovered-only attach, legal transitions). `complete_shift` → handoff builder here, not earlier.
- **Phase 5 (Decisions + scheduler): LIGHTEN.** Scheduler exists; author monitor/escalate/dismiss/defer preconditions + 3+ distinct delayed branches (monitor→follow-up alert; escalate→docs request; dismiss→reopen) + cancellation. Remove quiz-gating on decisions first — biggest single anti-quiz win.
- **Phase 6 (Workplace interactions): PROCEED, Morgan first.** Author Morgan intents/availability/pending replies in pack; keep fallback texts = current `managerGuidance`. Jules: author intents *or* formally accept peer-dialogue as satisfying the MUST — decide before costing. No 3D-exclusive evidence, ever.
- **Phase 7 (Re-author shift): RESCOPE.** Order stands (handoff → scanner → A-1042 → datasets → Morgan → phishing → Jules → decision → delayed → false-positive → handoff), but: phishing and false-positive are greenfield, not re-author; scanner run-log and timeline prose are preserve-verbatim; primary-path `requiredOptionIds` deletion is the acceptance gate.
- **Phase 8 (Parity + polish): RESCOPE to tests.** Parity shell done; write per-action parity contract tests for each new mechanic (spec §17.5) rather than building parity. Polish = notification/queue pressure tuning (2→3 concurrent items) + removing quiz chrome.
- **Phase 9 (Hardening): UNCHANGED**, with two additions from this audit: (a) orphaned-action detector (fail build on progression-unreferenced non-utility actions + effect-referenced missing artifacts — would have caught phishing); (b) AI-off test already feasible (Jules is LLM-free; Morgan fallback exists).

**Suggested build order after Phase 0:** Ph5-decision-ungating (quick win: legal decisions without quiz completion, behind existing scheduler) → Ph2 device/alert query → Ph3 discovery for login-context/device → Ph4 ticket-attach → Ph6 Morgan intents → greenfield phishing → false-positive → handoff builder → parity tests. This front-loads "collapse back into quiz" removal where players feel it first.

---

## File/symbol index (load-bearing claims)

- Pack: `content/packs/cybersecurity-analyst/pack.yaml` — tasks `:58-668`, actions `:697-879`, events `:881-1055`, artifacts `:1056-1362`, facts/npcs `:678-696`, notification `:670-677`.
- Quiz core: `packages/core/src/tasks.ts:applyTaskAttempt/exactRequiredSelection`, `packages/core/src/reducer.ts:44-52 (TaskRequiredError)`, `packages/schemas/src/tasks.ts:PackTaskStepSchema`.
- Availability: `packages/core/src/availability.ts:target/withManagerAndUtility/nextLinearAction/actionsForEvent/availableActions`.
- Effects/state: `packages/core/src/effects.ts:resolveActionEffect/applyResolvedEffect:108-138`, `packages/core/src/world.ts`, `packages/core/src/scheduler.ts:activatePendingEvents/applyDueConsequences/expireOverdueEvents`, `packages/core/src/workplace.ts:observeArtifact/canOpenArtifact`, `packages/core/src/serializer.ts:toClientView`, `packages/core/src/jules.ts:julesDialogueFromClientView`.
- Schemas: `packages/schemas/src/actions.ts:SimulationActionIdSchema/ActionDefinitionSchema`, `packages/schemas/src/events.ts:EventProgressionSchema`, `packages/schemas/src/career-pack.ts:CareerPackSchema.superRefine:61-222`, `packages/schemas/src/workplace.ts:42 (talk_to_jules)`.
- Server: `apps/server/src/trpc/router.ts:performAction/submitTaskAttempt/submitFreeText`, `apps/server/src/ai/npc-dialogue.ts:generateSafeNpcReply`, `packages/ai/src/index.ts:speakerMayKnow/buildNpcContext`, `packages/safety/src:deterministicInputSafety/validateNpcOutput/SessionBudget`.
- Web: `apps/web/src/workstation.ts:deriveSystemState`, `apps/web/src/systems.ts`, `apps/web/src/guidance.ts`, `apps/web/src/journey.ts`, `apps/web/src/components/SystemToolPanel.tsx`, `apps/web/src/components/tools/{TaskInteraction,RecordComparison,SourceEvidence,GuideSearch,InventoryLookup,EmailTool,AlertTool,TeamChatTool,CaseReview,ArtifactOpenButton}.tsx`, `apps/web/src/components/{WorkTaskPanel,AccessibleMode,WorkSurface,NotificationBanner}.tsx`, `apps/web/src/components/artifacts.tsx:filterKnowledgeBase/NotesEditor`, `apps/web/src/world/{SpatialShell,Workstation,collision,breakRoom,BreakRoomPanel,JulesDialogue}.tsx`, `apps/web/src/world/rooms/socLayout.ts`, `apps/web/src/world/deskOs/{DeskOs,OpsConsole,SystemApp,tabs}.ts*`, `apps/web/src/world/deskOs/os/{BrowserApp,Notes}.tsx`, `apps/web/src/experience/ExperienceShell.tsx:NonspatialResources`.
- Tests proving boundaries: `packages/core/test/{tasks,serializer,login-case-depth,shift-evidence-depth,jules}.test.ts`, `apps/web/src/components/tools/login-case-depth.test.tsx`.
