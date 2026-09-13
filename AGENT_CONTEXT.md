# Career Expo — Agent Context, Technical Handoff, and Implementation Roadmap

**Document date:** 2026-08-06  
**Product:** Career Expo career-simulation platform  
**First simulation:** Junior Cybersecurity Analyst  
**Development branch:** `experimental`

**Stable branch:** `main`

**Latest September 12 checkpoint:** Added opt-in development graphics diagnostics (`?graphics=1`), batched chair bases and cubicle panels/rails. Chair entrance samples decreased from 824 to 776 calls at DPR 1/effects on; no meaningful FPS gain established. Cubicle run used reduced quality and cannot be compared to that baseline. Verified 290 tests plus web lint/build. See `docs/2026-09-12-render-diagnostics.md`, `docs/2026-09-12-chair-batching.md`, and `docs/2026-09-12-cubicle-batching.md`. Next: matching-quality performance comparison and close-up checks, not more unmeasured batching.

**September 12 graphics checkpoint:** Experimental includes the September 11 adaptive rendering/texture-lifecycle pass and September 12 furniture refinement. Desks and cubicles no longer double-tint textures; matte rails and lighter furniture improve material separation. Wheel geometry saves 920 triangles per OfficeChair, not a measured FPS gain. Verified 283 tests, web lint/build, and an entrance-view browser check. Whole-scene frame-time profiling and close-up checks remain. See `docs/2026-09-12-furniture-refinement.md`.

**Existing local development worktree:** `/Users/zaid/personal-projects/Careerexpo/.worktrees/experimental` (new clones use their own checkout path)

**September 11 workflow update:** The full application was promoted to `main` at `2216d5d` on September 10; `experimental` is now the development branch. Earlier branch/path references below are historical. The optional paid AI workflow requires explicit opt-in, an API key, and actual evaluation files. The paid evaluation suite is still unimplemented.

**September 8 update:** Account-pattern comparison now uses opened record passages, source citations, and plain-language terms. Guides have local search in both desktop and Simple list. Added surface-mounted workplace details, a modular four-light office/break-area rig, and readable mode controls. Verified 273 tests across 39 files, lint, types, and production build; the large 3D chunk warning remains. Task 7 is still partial: reference matching and ticket composition remain. See [checkpoint and limits](docs/2026-09-08-comparison-search-and-room-polish.md). No arrival cutscene implemented.

**September 7 implementation update:** App now exposes Walk the office, Desk only, and Simple list with shared canonical handlers. Desk/list also expose finite break-room resources and Jules. The two handoff steps now select literal passages inside an opened email; server rejects source-based answers before inspection. Other tasks still use structured choices, now with related records available beside the task. Task 7 remains partial: comparison, reference matching, and ticket composition still need dedicated interactions. Use [the current audit](docs/2026-09-06-workspace-audit.md) and [this slice's handoff](docs/2026-09-07-evidence-and-modes.md). Do not treat component tests as proof of full manual player-path parity. The arrival cutscene is future concept only, not implementation scope.

This document is the shared orientation file for Codex, Cursor, and other agentic coding tools. Read it before changing the project. It distinguishes the product goal, what exists in code, what remains incomplete, and the approved implementation order.

---

## 1. Current repository and branch workflow

The working application now exists on both `main` and `experimental`. A normal GitHub clone starts on `main`; switch to `experimental` before development.

- Stable local checkout: `/Users/zaid/personal-projects/Careerexpo`
- Development worktree: `/Users/zaid/personal-projects/Careerexpo/.worktrees/experimental`
- Historical beta worktree: `/Users/zaid/personal-projects/Careerexpo/.worktrees/career-sim-beta`

Orca and other IDE clones have their own paths. Inspect the current checkout instead of changing to these machine-specific paths automatically. Develop on `experimental`; promote it to `main` only when the user requests a verified stable checkpoint. Commit and push regularly. Before switching branches, commit or safely stash local work. If `main` is already checked out in another worktree, use that existing checkout to inspect the stable version. Preserve previous stable commits through history; never force-reset newer work as a routine rollback.

Before editing, run:

```bash
git rev-parse --show-toplevel
git branch --show-current
git status --short
```

Do not overwrite unrelated user changes. Do not reset the worktree destructively.

---

## 2. Product mission

Career Expo is a simulation-based career-exploration platform for users age 13 and older. It should let a person experience the ordinary work, uncertainty, communication, trade-offs, and consequences of a career before making education or career decisions.

The first vertical slice is a Junior Cybersecurity Analyst shift.

The product must feel like a lightweight indie workplace game, not a quiz with decorative buttons. The user should:

- Arrive for a shift and receive a believable handoff.
- Open workplace systems such as email, alerts, tickets, a knowledge base, and team chat.
- Investigate incomplete information rather than select an obviously correct answer.
- Handle routine work and quiet investigation, not only dramatic emergencies.
- Receive guidance from people whose knowledge and availability are bounded by world state.
- See later events and consequences caused by earlier choices.
- Complete a meaningful 20–25 minute experience.
- Reflect on the experience and receive a cautious, evidence-linked debrief.
- Be able to finish the same simulation through an accessible structured interface.

The long-term visual goal is a small, polished, low-poly workplace with lightweight 2D and eventually 3D navigation. Graphics are a renderer over the simulation; they must never become the authority for rules or assessment.

---

## 3. Source-of-truth order

When documents conflict, use this priority:

1. `career-sim-build-spec.md` — canonical technical and governance specification.
2. `Architecture and Governance Requirements.pdf` — product governance, privacy, assessment, and architectural rationale.
3. `Career Simulation Platform Overview.pdf` — product vision and rationale.
4. `docs/superpowers/specs/2026-07-14-simulation-progression-design.md` — approved progression from tool-based simulation to 2D and later 3D.
5. `docs/superpowers/plans/2026-07-14-deep-cybersecurity-shift.md` — implementation plan for the multi-event shift already built in this branch.
6. This document — current implementation handoff and status summary.

The technical build specification overrides the two PDFs. Existing code does not override a safety, privacy, determinism, or accessibility rule in the canonical specification.

---

## 4. Locked product and architecture decisions

These decisions should not be casually reopened:

- Initial audience: direct-to-user beta for mixed users age 13+.
- First career: Junior Cybersecurity Analyst.
- Institutional and school-managed deployments remain disabled.
- Hosting target: Render for application services and Supabase for authentication/Postgres.
- Runtime target: Node 24 LTS and pnpm 11.
- Core simulation is deterministic and server-owned.
- AI is allowed to phrase bounded NPC dialogue only.
- AI cannot create facts, actions, professional procedures, deadlines, evidence, or outcomes.
- No numeric career compatibility score, ranking, diagnosis, personality label, or recommendation such as “you should become...”
- Competence, enjoyment, stress, and engagement stay separate.
- User reflection does not rewrite behavioral evidence.
- Accessibility is a peer renderer, not a simplified or differently scored mode.
- Navigation speed and gaming skill produce no career evidence.
- No Redis, multiplayer, avatars, character creator, authoring app, multi-NPC scene, second career, or recommendation ranking in the initial beta.
- 3D is deferred until the simulation depth and validation gate pass.

---

## 5. Non-negotiable simulation rule

The deterministic backend owns:

- Canonical world state.
- Hidden state and restricted facts.
- Simulated time.
- Event activation and deadlines.
- Action legality and prerequisites.
- Immediate and delayed consequences.
- NPC knowledge, availability, and memory.
- Evidence capture.
- Session budgets and safety decisions.

The client renders a safe public projection and submits typed action intents. It cannot mutate canonical state directly.

AI may produce validated dialogue after deterministic intent resolution. Provider failure must never prevent deterministic workplace actions from continuing.

Conceptual data flow:

```text
Approved career pack
        ↓
Deterministic core reducer
        ↓
Server-owned WorldState + HiddenState
        ↓
Safe ClientView / future ClientWorldView
        ↓
work tools | structured mode | future 2D | future 3D
        ↓
typed SimulationAction(eventId, systemId, target)
        ↓
server validation → reducer → log/snapshot/evidence → next public view
```

---

## 6. Current user experience

The current branch is a functioning beta foundation, not yet the finished indie-game experience.

The playable shift currently provides:

- A welcome/shift briefing and workstation entry.
- Persistent workplace system navigation.
- Alert Dashboard.
- Email.
- Ticket Queue.
- Knowledge Base.
- Team Chat.
- Three reachable peer renderers over one simulation, switchable from the header: "Walk the office" (3D), "Desk only" (2D workstation, no WebGL required), and "Simple list" (structured accessible mode). All three submit the same action targets.
- More than twenty targeted actions in the expected complete path.
- An incomplete handoff at shift start.
- A suspicious-login investigation.
- Routine monitoring that overlaps the investigation.
- A phishing report later in the shift.
- A calm false-positive review.
- Simulated time advancement.
- Delayed consequences from earlier choices.
- One manager, Morgan, with bounded guidance.
- A full deterministic shift and basic debrief foundations.

The manager-context looping bug was fixed. Manager consultation is now actionable and limited per event rather than repeatedly adding five minutes without changing the interaction.

The experience is deeper than the original three-button prototype, but it remains visually and mechanically closer to a contextual web work surface than a game. Its workplace systems mostly expose contextual action buttons; they do not yet provide enough artifact-level interaction, editing, searching, or visual-world presence.

---

## 6a. Where the code lives

```text
packages/schemas/src/     one domain module per concern, re-exported by index.ts:
                          session, actions, events, world, turn, client-view,
                          career-pack, assessment, pathway, npc, safety.
                          extension-points.ts holds the spec's declared seams
                          (SystemModule, ViewAdapter, SafetyCheck,
                          EvidenceInterpreter, Cache) — none implemented yet.
packages/core/src/        world (pack -> initial state), availability, effects,
                          scheduler, reducer, replay, serializer, rng.
                          Depends only on @sim/schemas.
apps/server/src/
  domain/                 session types + transport-agnostic errors
  policy/                 jurisdiction and consent rules
  repository/             SimulationRepository interface + in-memory impl
  db/                     Postgres impl; schema.ts is the drizzle migration
                          source and is intentionally imported by nothing
  ai/                     bounded NPC dialogue generation
  trpc/                   core (context + error mapping), schemas, router
  index.ts                barrel; tests and main.ts import from here
apps/web/src/
  systems.ts              work-system catalog + action filters
  guidance.ts             next-action guidance from simulation state
  journey.ts              spatial + simulation progression, built on guidance.ts
  workstation.ts          shared ClientView derivation for every view adapter
  components/             work surface, accessible mode, debrief, shell
  world/                  3D shell: collision.ts owns movement rules,
                          rooms/socLayout.ts owns the floor plan,
                          props/ holds prop modules by domain,
                          deskOs/ holds the in-world desk operating system
```

Content lives in `content/packs/cybersecurity-analyst/pack.yaml` and drives the
engine; adding or changing an event is a pack edit, not an engine edit.

---

## 7. Current implementation status by area

Status legend:

- **Implemented:** working foundation exists and is covered by tests.
- **Partial:** meaningful code exists, but the intended product requirement is not complete.
- **Not started:** no substantial implementation yet.

### 7.1 Foundation and deterministic engine — Implemented

Working now:

- pnpm workspace and Turborepo monorepo.
- Strict TypeScript, ESLint, Prettier, and Vitest.
- Seeded deterministic pseudo-random behavior.
- Pure `applyAction(state, action)` reducer contract.
- Simulated time advancement.
- Event activation, resolution, escalation, expiry, and delayed consequences.
- Action logging and replay/folding.
- Hidden-state separation.
- Public `ClientView` serializer.
- Targeted action contracts with `eventId` and workplace `systemId`.
- Unauthorized or unavailable action rejection.
- Multi-event full-shift replay fixtures.

Resolved since this document was first written:

The core is now career-agnostic. `packages/core` was split into `world.ts`, `availability.ts`, `effects.ts`, `scheduler.ts`, `reducer.ts`, `replay.ts` and `serializer.ts` behind a thin `index.ts` barrel, and `createInitialWorldState` builds every location, fact, NPC, artifact, action and event from `pack.scenario`. No cybersecurity event definitions remain in the engine, so adding or changing an event is a career-pack edit rather than an engine edit. What was previously recorded here as "the highest-priority architectural debt" no longer applies.

Remaining gap: the seeded PRNG in `packages/core/src/rng.ts` is not yet wired in. `WorldState.rngState` is initialized to the seed and never advanced, and `createSeededRandom` has no callers. Nothing is non-deterministic today, but any future randomness must flow through it (see the determinism rule in the build spec).

### 7.2 Career pack — Partial

Working now:

- YAML content at `content/packs/cybersecurity-analyst/pack.yaml`.
- Zod-backed loading and basic career metadata validation.
- Version/review/source-oriented foundations.

Working now (added since first writing):

- The scenario body in `pack.yaml` is the authoritative source of core behavior. Events, actions, artifacts, facts, NPCs and the location all come from the pack.
- `CareerPackSchema.superRefine` cross-validates references between actions, events and artifacts, so a pack that points at a missing id fails to load.

Missing:

- The current `CareerPackSchema` validates only part of the intended pack contract.
- Startup does not yet comprehensively reject every unknown, stale, incomplete, or unapproved scenario field.

### 7.3 Server and API — Implemented foundation

Working now:

- Fastify server.
- tRPC router.
- Zod inputs and outputs.
- Identity derived from authenticated request context rather than owner IDs supplied by client procedures.
- In-memory repository for local development.
- Postgres repository foundations.
- Session ownership checks.
- Safe free-text route with deterministic fallback.

Current tRPC surface:

```text
session.create
session.get
session.resume
simulation.availableActions
simulation.performAction
simulation.submitFreeText
reflection.submit
debrief.get
profile.get
profile.annotateEvidence
profile.reset
sharing.list
sharing.grant
sharing.revoke
privacy.exportData
privacy.deleteSession
privacy.deleteAccount
```

Missing or incomplete:

- Robust concurrent/serial turn processing for production load.
- Stale-client conflict handling with explicit refresh semantics.
- Full production authentication/onboarding integration.
- Persistent telemetry for every AI validation path and cost.
- Production-grade rate limiting and operational alerts.

### 7.4 React web interface — Implemented foundation, product depth partial

Working now:

- React work surface.
- Welcome/briefing flow.
- Workplace-system navigation.
- Contextual event selection and actions.
- Structured mode with action-target parity helpers.
- Shift time and event updates.
- Manager context screen.
- Basic tutorial and debrief routes/components.

Missing:

- Tools need independent components and richer professional interactions.
- No editable ticket investigation notes.
- No real knowledge-base search or document reading flow.
- No detailed email-header, link, device, or login artifacts.
- No persistent player notebook/notes.
- No richer chat thread or conversational manager UI.
- No spatial 2D office.
- No 3D renderer.
- No low-poly art, animation, ambient sound, or visual consequence cues.

### 7.5 AI dialogue and safety — Partial foundation

Working now:

- `LlmProvider` interface.
- `FakeLlmProvider` for deterministic tests.
- Anthropic provider adapter.
- Central model-role registry.
- Current configured roles:
  - Classifier: `claude-haiku-4-5`.
  - Primary dialogue: `claude-sonnet-4-6`.
  - Deep validation: `claude-opus-4-8`.
- Forced structured NPC output schema.
- Per-speaker fact projection.
- Restricted-fact filtering before prompt creation.
- Referenced-fact validation.
- Deterministic prompt-injection check.
- Prohibited user-facing phrase checks.
- Session budget primitive.
- Deterministic fallback dialogue.

Important deployment note:

Model identifiers are centrally configured but must be revalidated against provider metadata before deployment. Never scatter model IDs around the codebase.

Missing:

- Fully integrated multi-stage classifier → intent → generation → deep-validation pipeline.
- Persistent per-session budget across multiple requests.
- Full contradiction and unsupported-claim evaluation.
- Model metadata deployment check.
- Rich in-product free-text chat UI.
- Complete AI-call telemetry: role, model, tokens, latency, validation route, fallback reason, and cost.
- Nightly multi-sample reliability evaluation automation.

### 7.6 Evidence, reflection, and debrief — Partial foundation

Working now:

- Evidence signals linked to session, event, rhythm, pacing mode, category, and timestamp.
- Optional reflection schema and server submission.
- Reflection mismatch helper that describes uncertainty rather than correcting the user.
- Evidence annotation API.
- Four confidence labels:
  - `insufficient_evidence`
  - `early_signal`
  - `repeated_signal`
  - `strong_repeated_pattern`
- Eight-section debrief schema/foundation.
- Validator against percentages, ranking, compatibility language, and directive career claims.

Missing:

- Full event-specific reflection UI.
- Clear user-facing annotation flow for disability, language, interface, or prerequisite confounds.
- Rich evidence interpretation across multiple sessions.
- Stronger provenance and interpretation trace display.
- Contradiction/mismatch presentation in the debrief.
- Fully sourced pathway records integrated into debrief.
- Staleness warnings and official-source links in user experience.
- Research/psychometric review of interpretation language.

### 7.7 Supabase, authentication, and privacy — Partial foundation

Working now:

- Drizzle schema and initial SQL migration.
- Repository abstraction with in-memory local mode and Postgres implementation foundations.
- Tables for profiles, guardian relationships, sessions, logs, snapshots, evidence, reflections, interpretations, sharing, pathways, telemetry, consent, and deletion jobs.
- Owner checks.
- RLS policy foundations.
- Explicit sharing grants with expiry/revocation API.
- Export, session deletion, profile reset, and account deletion API foundations.
- Jurisdiction policy configuration in server code.
- Institutional deployment feature flag defaulting to false.

Missing:

- User-visible Supabase Auth flow.
- Complete birth-date/age-band and jurisdiction onboarding.
- Versioned consent recording UI.
- Guardian-consent flow where jurisdiction configuration requires it.
- Fully exercised production RLS against real Supabase staging.
- Retention and deletion job runner.
- Category-specific retention, especially short raw-dialogue retention.
- End-to-end recipient access based on active grants.

Local development defaults to in-memory sessions when `DATABASE_URL` is absent. Refreshing or restarting the server can therefore lose local sessions.

### 7.8 Accessibility and tutorial — Partial foundation

Working now:

- Structured mode.
- Shared targeted action mapping.
- Basic keyboard-compatible web controls.
- Separate tutorial session concept so tutorial actions can remain non-assessed.
- Pacing mode contracts.

Missing:

- Complete neutral tutorial teaching every system and accessibility setting.
- Full focus-management and live-region audit.
- Screen-reader descriptions across all changing state.
- Complete reduced-motion, contrast, zoom, and scalable-text verification.
- User-facing controls for every pacing mode.
- Manual keyboard-only and screen-reader test pass.
- Formal WCAG 2.2 AA audit.

### 7.9 Reliability, operations, and deployment — Partial foundation

Working now:

- Unit/integration/replay-oriented Vitest suite.
- Separate paid-AI Vitest configuration.
- Dockerfiles for server and web.
- Render blueprint.
- Health endpoint.
- Structured logging foundations.
- Incident and validation-gate documents.

Missing:

- Real Render staging and production deployment completion.
- Supabase staging and production configuration rehearsal.
- Automated nightly AI reliability suite.
- Defined release thresholds wired to CI.
- Sentry-compatible reporting after sensitive-field redaction.
- Budget/safety alerting.
- Backup and restore rehearsal.
- Secret rotation automation/instructions validation.
- Incident drills.

### 7.10 Visual world — Not started

Not implemented:

- 2D top-down or isometric office.
- Spatial NPC schedules/locations rendered in a scene.
- Low-poly 3D office.
- 3D navigation.
- Models, animation, lighting, sound, or graphical consequence effects.

This is intentional. The approved progression is simulation depth → professional tool interactions → renderer-independent contract → lightweight 2D → validation → one lightweight 3D vertical slice.

---

## 8. Repository architecture

```text
apps/
  server/       Fastify, tRPC, orchestration, auth context, persistence
  web/          React work surface, structured mode, tutorial, debrief

packages/
  schemas/      Zod contracts and inferred TypeScript domain types
  core/         Pure deterministic simulation engine
  career-packs/ Career-pack YAML loading and validation
  ai/           LLM provider, model roles, speaker context isolation
  safety/       Input/output checks, budgets, prohibited claims, fallbacks
  evidence/     Evidence recording, mismatch logic, debrief generation
  pathways/     Jurisdiction-specific pathway records and staleness logic
  testing/      Fixtures, replay helpers, adapter parity, AI harnesses

content/
  packs/cybersecurity-analyst/
  pathways/cybersecurity-analyst/

docs/
  superpowers/specs/     approved progression design
  superpowers/plans/     detailed implemented-shift plan
  incidents.md           operational incident guidance
  validation-gate.md     gate before 3D/expansion
```

Dependency rule:

- Dependencies point inward.
- `core` should depend only on `schemas`.
- No app imports code from another app.
- Renderer code cannot become a rule engine.
- Career-specific IDs and behavior must move out of generic core code.

---

## 9. Technology stack

### Runtime and workspace

- Node.js 24+
- pnpm 11.5.3
- Turborepo 2.x
- TypeScript 5.8 in strict mode
- ESLint 9
- Prettier 3
- Vitest 3

### Backend

- Fastify
- tRPC
- Zod
- Drizzle/PostgreSQL
- Supabase Auth/Postgres target
- Pino-style structured logging foundations

### Frontend

- React
- Vite
- DOM-based accessible work surfaces
- Future 2D renderer: choose only after tool depth is stable
- Future 3D renderer: likely React Three Fiber, only after validation gate

### Content and AI

- YAML career packs
- Anthropic provider adapter behind `LlmProvider`
- Forced structured tool output
- Fake provider for deterministic tests

### Hosting

- Render web and API services
- Supabase staging and production projects

---

## 10. Important domain contracts

The schemas package defines or is intended to define:

- `WorldState`
- `HiddenState`
- `ClientView` and future `ClientWorldView`
- `SimulationAction`
- `AvailableAction`
- `TurnResult`
- `ActionLogEntry`
- `ConsequenceEntry`
- `EventInstance`
- `Fact`
- `NpcState`
- `NpcKnowledgeView`
- `CareerPack`
- `EventTemplate`
- `ScenarioRhythm`
- `EvidenceSignal`
- `ConfidenceLevel`
- `Reflection`
- `Debrief`
- `PathwayRecord`
- `NpcTurnOutput`
- `SafetyResult`
- `TokenUsage`

Current workplace systems:

```text
alert_dashboard
ticket_queue
email
knowledge_base
team_chat
```

Current action IDs:

```text
read_handoff
acknowledge_handoff
review_alert
inspect_login_context
inspect_account_history
check_device_inventory
search_knowledge_base
dismiss_alert
escalate_alert
document_ticket
open_phishing_report
inspect_email_headers
check_link_destination
quarantine_message
notify_reporter
ask_manager
complete_shift
```

Current event states:

```text
pending
active
resolved
escalated
expired
```

Target extension interfaces:

```ts
interface SystemModule {}
interface ViewAdapter {}
interface LlmProvider {}
interface SafetyCheck {}
interface EvidenceInterpreter {}
interface Cache {}
```

The project currently uses generic `completedActionIds`, but `EventInstance` still retains some event-specific fields such as `reviewed` and `contextInspected`. Those should be removed as the pack-driven event state is completed.

---

## 11. Persistence model

The intended Supabase/Postgres tables are:

- `profiles`
- `guardian_relationships`
- `simulation_sessions`
- `action_log`
- `state_snapshots`
- `evidence_signals`
- `reflections`
- `interpretations`
- `sharing_grants`
- `pathway_records`
- `telemetry`
- `consent_records`
- `deletion_jobs`

Privacy rules:

- RLS defaults deny.
- A user cannot read another user’s sessions or reflections.
- Reflections remain owner-only unless an explicit active sharing grant permits access.
- Guardian access comes from jurisdiction policy plus recorded consent, not broad account linkage.
- Server derives the owner identity from the authenticated session.
- Client procedures never accept an authoritative owner ID.
- Exports and deletion must cover every user-owned table.
- Institutional/school mode cannot be enabled through client input.

---

## 12. Original eight-plan implementation program and current state

The original implementation program remains the master roadmap.

### Plan 1 — Foundation and walking skeleton

**State: substantially complete.**

Delivered:

- Workspace/tooling.
- Core schemas and deterministic reducer.
- Seeded replay.
- Simulated time and delayed consequences.
- Safe client projection.
- Fastify/tRPC server.
- React work surface and structured mode.
- Docker/Render foundations.

Remaining cleanup:

- Remove core monolith and cybersecurity-specific branches.
- Tighten production deployment and CI configuration.

### Plan 2 — Supabase, authentication, and mixed-age privacy

**State: infrastructure partial; user journey incomplete.**

Next work:

1. Connect actual Supabase Auth to server context and React.
2. Implement sign-up/sign-in/session refresh.
3. Build age-band, jurisdiction, and consent-version onboarding.
4. Implement guardian flow only where configuration requires it.
5. Exercise RLS directly against Supabase staging.
6. Finish grants, recipient views, export, deletion, and retention jobs end to end.
7. Keep institutional deployment disabled in every environment.

### Plan 3 — Career pack and complete deterministic shift

**State: playable multi-event shift complete; architecture only partial.**

Delivered:

- Multiple overlapping events.
- Two rhythms: routine monitoring and quiet investigation.
- Deadlines, escalation, help-seeking, documentation, incomplete outcomes, and delayed consequences.
- Full expected path with more than twenty actions.

Next work:

1. Expand `CareerPackSchema` to validate the full scenario.
2. Move event templates, artifacts, prerequisites, timing, legal transitions, and consequences into YAML.
3. Make the core generic and career-independent.
4. Fail startup for unknown, incomplete, stale, or unapproved content.
5. Add expected, delayed, incorrect, help-seeking, and off-script golden paths driven entirely by pack content.

### Plan 4 — Bounded single-NPC AI and safety

**State: core safety/provider primitives exist; production pipeline incomplete.**

Next work:

1. Add explicit intent resolution before generation.
2. Implement classifier and conditional deep-validation stages.
3. Add contradiction, unsupported-claim, leakage, and prohibited-procedure checks.
4. Persist cumulative per-session token/cost usage.
5. Add comprehensive telemetry without storing prompts or restricted facts in logs.
6. Build adversarial reliability fixtures and nightly multi-sample tests.
7. Keep all deterministic actions usable during provider failure.

### Plan 5 — Evidence, reflection, and debrief

**State: schema and server foundations exist; product experience incomplete.**

Next work:

1. Add event-specific optional reflection screens.
2. Keep observed behavior, outcomes, and reflections as distinct evidence categories.
3. Complete a swappable interpretation layer.
4. Display confidence and limitations clearly.
5. Display contradictions rather than collapsing them.
6. Let users annotate potential disability, language, prior-knowledge, or interface confounds.
7. Complete all eight debrief sections with evidence provenance.
8. Integrate jurisdiction-specific pathway records with authority/source/review/staleness metadata.
9. Block stale pathway data from strong guidance.

### Plan 6 — Tutorial and accessibility

**State: basic foundation; verification incomplete.**

Next work:

1. Build a neutral, non-assessed tutorial for every major system.
2. Guarantee tutorial sessions produce zero evidence rows.
3. Implement and expose Standard, Extended, Pause-compatible, No-hard-timer, and Practice pacing modes.
4. Never compare speed across incompatible pacing modes.
5. Complete semantic headings, focus management, live regions, screen-reader descriptions, reduced motion, contrast, and scalable text.
6. Expand adapter parity tests.
7. Run manual keyboard, screen-reader, reduced-motion, and zoom checks.

### Plan 7 — Reliability, observability, and beta operations

**State: test/deployment foundation; operational readiness incomplete.**

Next work:

1. Separate unit, integration, replay, RLS, accessibility, and paid-AI projects clearly in CI.
2. Run deterministic suites on every pull request.
3. Run multi-sample AI reliability nightly only.
4. Measure leakage, contradiction, unsupported claims, false blocks, and fallback rates.
5. Predefine release thresholds before reading evaluation results.
6. Add request/session/turn/trace IDs with sensitive-field redaction.
7. Add latency, cost, cache, deep-validation, safety, and blocked-valid-response metrics.
8. Add rate and request-size limits.
9. Complete Render and Supabase staging/production environments.
10. Rehearse migrations, backup restore, secret rotation, and incidents.

### Plan 8 — Validation gate and 3D decision

**State: not started; intentionally gated.**

Before public expansion or 3D investment:

1. Cybersecurity practitioners review realism and stereotype risk.
2. Compare the simulation with strong static career material.
3. Measure career understanding, decision usefulness, confidence calibration, accessibility parity, authoring effort, and session cost.
4. Test gaming/interface-skill confounds.
5. Have research and psychometric advisors review debrief claims.
6. Choose a predefined outcome: proceed, proceed with narrower claims, redesign/retest, pivot, or halt.
7. Do not treat enjoyment alone as success.
8. Build 3D only after a proceed decision.

If approved, 3D remains presentation-only:

- One small low-poly office.
- Walk or click-to-approach navigation.
- Workstations open the existing accessible DOM work surfaces.
- No new actions, evidence, consequences, or scoring exclusive to 3D.

---

## 13. Approved progression toward the visual indie-game goal

The team does not need to jump directly from the current web work surface to 3D. Use this progression.

### Stage A — Make the current simulation genuinely deep

Goal: the complete 20–25 minute shift feels like work even without visual navigation.

Required work:

- Convert event logic to pack-driven data.
- Add persistent work artifacts: alerts, email messages, tickets, KB documents, chat threads, login context, account history, and device records.
- Let the user inspect evidence in multiple places and decide what is relevant.
- Add user-created notes and editable ticket documentation.
- Add overlapping tasks, interruptions, deadlines, and delayed consequences.
- Make NPC availability and guidance depend on canonical state.
- Expand the complete-shift golden paths.

Exit gate:

- A user can spend 20–25 minutes investigating rather than repeatedly selecting obvious buttons.
- The complete shift works without AI.
- The same seed and action log reproduce identical canonical state.

### Stage B — Turn each workplace system into an actual tool

Goal: remove the remaining quiz feeling.

Build modular interfaces:

- Alert table, filtering, alert detail, and related event evidence.
- Email inbox, thread/message viewer, and header inspection.
- Ticket queue, status, notes, escalation, and handoff history.
- Searchable knowledge base with realistic procedures.
- Team chat with bounded manager interaction and visible availability.
- Player notebook or case notes.

Actions still map to stable server action IDs. UI details do not create rules.

Exit gate:

- Normal mode can be completed without a generic answer-card list.
- Structured mode exposes the same legal action targets and consequences.

### Stage C — Formalize the renderer boundary

Introduce a safe `ClientWorldView` containing only public presentation state:

- Locations.
- Visible interactables.
- Visible work artifacts.
- NPC presentation state and location.
- Notifications.
- Simulated time.
- Contextual available actions.

Each renderer implements `ViewAdapter` and submits typed action intents. Add parity and cross-renderer replay tests.

Exit gate:

- No renderer can access hidden state.
- All renderers can produce the same canonical action log.

### Stage D — Add a lightweight 2D office

Goal: introduce place, movement, atmosphere, and human presence at manageable cost.

Scope:

- Small top-down or isometric security operations floor.
- Workstation, manager desk, and pause area.
- Click-to-move or hotspot navigation.
- Existing DOM tools open from scene locations.
- One NPC moves on a deterministic schedule.
- Notifications, lighting, and ambient sound reflect public world state.
- Reduced-motion and no-spatial-navigation options remain available.

Do not add collision-heavy gameplay, reflex scoring, inventory, crafting, or navigation evidence.

### Stage E — Validate the 2D/tool vertical slice

Test:

- Career understanding.
- Realism.
- Decision usefulness.
- Accessibility parity.
- Gaming-skill confounds.
- Performance on low-end laptops.
- Content-authoring effort.
- Cost per session.

### Stage F — Build one lightweight 3D vertical slice only after approval

Likely rendering technology: React Three Fiber, reusing the same React application and public world contract.

Scope:

- One low-poly office.
- One navigation method chosen after 2D testing.
- Workstation and manager as scene interactables.
- Existing DOM tool panels remain accessible overlays.
- NPC position/animation follows deterministic server state.
- Public consequences can change lighting, notifications, and animations.

No physics-owned rules, open world, multiplayer, character creator, or new assessment signal.

### Stage G — Polish only after the vertical slice proves useful

- Improve models, animation, lighting, sound, transitions, and performance.
- Expand deterministic NPC routines and shift variants.
- Run accessibility, realism, bias, and confound studies again.
- Add another career only after cybersecurity clears the quality gate.

---

## 14. Recommended next implementation sequence

The next coding agent should not begin with 2D or 3D. The recommended next milestone is **Pack-Driven Deep Work Systems**.

### Milestone 1 — Extract career content from core — DONE

Steps 1, 4, 5, 6, 7 and 8 are complete: the scenario loads from YAML, `createInitialWorldState` is a generic pack-driven builder, event-specific reducer branches are gone, and the replay fixtures still pass. Remaining from this milestone:

2. Expand Zod schemas for event templates, artifacts, prerequisites, triggers, deadlines, transitions, consequences, NPC knowledge, and tool placement.
3. Make unknown fields and invalid references fail with precise paths. (Cross-reference validation exists in `CareerPackSchema.superRefine`; strict unknown-field rejection does not.)

### Milestone 2 — Modularize the core and UI

1. Split scheduler, availability, reducer, replay, and serializer into focused core modules.
2. Split the React monolith into session shell, system navigator, alert dashboard, email, tickets, KB, chat, structured renderer, tutorial, and debrief.
3. Keep one session controller responsible for API data and action submission.
4. Ensure renderers receive data/callbacks and do not call APIs independently.

### Milestone 3 — Add real work artifacts and tool interactions

1. Define `WorkArtifact`, artifact visibility, artifact relationships, and selected artifact state.
2. Add realistic but fictional login records, device inventory, employee/account history, email headers, URLs, tickets, and procedures.
3. Add searchable/filterable tool interactions.
4. Add editable investigation notes and ticket updates.
5. Convert interactions into stable deterministic actions.
6. Track what the user has actually opened/observed without inferring knowledge from hidden state.
7. Add consequences for incomplete documentation and missed handoffs.

### Milestone 4 — Deepen event and NPC behavior

1. Add explicit task ownership, interruption, deadline, and notification state.
2. Add deterministic manager location/availability/schedule.
3. Give Morgan a bounded fact view and public scene memory.
4. Resolve user intent deterministically before optional AI phrasing.
5. Add validated fallback responses for every interaction class.
6. Add adversarial leakage and contradiction tests.

### Milestone 5 — Finish reflection and debrief experience

1. Add optional event reflections.
2. Add annotations for confounds.
3. Show raw behavior, consequences, reflection, and interpretation separately.
4. Complete the eight debrief sections with traceable evidence IDs.
5. Add pathway freshness and official-source display.

### Milestone 6 — Complete auth/privacy and beta operations

1. Add Supabase Auth and onboarding.
2. Run RLS tests against staging.
3. Complete consent, guardian, grant, export, retention, and deletion flows.
4. Add redacted observability and rate limits.
5. Rehearse deploy, migration, backup, restore, and provider outage.

### Milestone 7 — Accessibility and validation

1. Finish neutral tutorial and all pacing controls.
2. Complete structured-mode parity.
3. Run keyboard/screen-reader/reduced-motion/zoom tests.
4. Run practitioner, user, research, and confound validation.

### Milestone 8 — 2D, then gated 3D

Only after Milestones 1–7 produce a believable, validated simulation should the team build the lightweight 2D office and then consider the 3D vertical slice.

---

## 15. Required invariants and tests

Every agent must preserve these invariants:

- `ClientView`/`ClientWorldView` never contains `hidden`.
- No restricted fact is serialized to the wrong user or NPC.
- No numeric assessment value appears in rendered output.
- Same seed plus same action log produces the same canonical state.
- An unauthorized, stale, mismatched, or unavailable action cannot mutate state.
- An action targets the exact event and workplace system where it is valid.
- NPC dialogue cannot change professional procedure or canonical outcomes.
- AI output cannot reference facts outside the speaker’s permitted context.
- Invalid or unvalidated AI output never reaches the user.
- Provider failure falls back safely.
- AI session budget cannot be exceeded.
- Tutorial sessions emit zero evidence.
- View adapters expose equal canonical action targets.
- Navigation speed produces no evidence.
- Reflection stays private without an active grant.
- User annotation does not rewrite raw evidence.
- No ranking or compatibility API exists.
- Stale pathway facts cannot produce strong guidance.
- School/institution mode cannot be activated by a client request.

Expected CI gates:

```text
Pull request:
  lint + typecheck + unit + integration + replay + RLS + accessibility

Nightly:
  multi-sample AI reliability + dependency/security scan

Release:
  full regression + policy checks + SME-approved pack + migration rehearsal
```

Use RED–GREEN–REFACTOR:

1. Write the failing test.
2. Run the focused test and confirm it fails for the expected reason.
3. Add the smallest correct implementation.
4. Run the focused test.
5. Refactor while green.
6. Run affected suites and full verification proportional to risk.
7. Commit one coherent change.

Do not use `Math.random()` inside `packages/core`.

---

## 16. Local setup and test run

### Prerequisites

- Node 24 or newer.
- pnpm 11.5.3.

### macOS setup when `pnpm` is missing or Corepack cannot write `/usr/local/bin`

The machine previously encountered an `EACCES` error when Corepack tried to create `/usr/local/bin/pnpm`. Use a user-owned binary directory:

```bash
mkdir -p "$HOME/.local/bin"
corepack enable --install-directory "$HOME/.local/bin"
export PATH="$HOME/.local/bin:$PATH"
```

To persist the path for zsh:

```bash
echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.zshrc"
source "$HOME/.zshrc"
```

For the existing local development worktree, run the commands below. For a new Orca clone, use that clone's folder instead and select `experimental` after saving any local edits.

```bash
cd /Users/zaid/personal-projects/Careerexpo/.worktrees/experimental
cp .env.example .env
pnpm install
pnpm dev
```

Open:

- Web application: `http://localhost:5173`
- API health: `http://localhost:3001/health`

Without `DATABASE_URL`, local development uses in-memory storage.

### Verification commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Paid AI reliability tests are intentionally separate:

```bash
pnpm vitest run --config vitest.ai.config.ts
```

Do not run paid AI tests automatically on every local edit or pull request.

### Last known verified state

Before this handoff document was added, the feature branch was verified with:

- 11 test files passing.
- 54 tests passing.
- Lint passing.
- Typecheck passing.
- Build passing.
- Browser smoke flow through briefing, workstation, handoff, team chat, alert investigation, and overlapping routine work.

Agents should rerun verification after any code change rather than relying on this historical result.

---

## 17. Environment configuration

`.env.example` currently includes:

```dotenv
NODE_ENV=development
PORT=3001
WEB_ORIGIN=http://localhost:5173
VITE_SERVER_URL=http://localhost:3001
DATABASE_URL=
SUPABASE_URL=
SUPABASE_ANON_KEY=
ANTHROPIC_API_KEY=
AI_SESSION_BUDGET_USD=0.05
INSTITUTIONAL_DEPLOYMENT_ENABLED=false
```

Rules:

- Never commit real secrets.
- Keep `INSTITUTIONAL_DEPLOYMENT_ENABLED=false` for the beta.
- Do not log prompts, raw reflections, restricted facts, auth tokens, or private user content.
- Production requires Supabase URL, anon key, Postgres connection, and correctly restricted server secrets.
- Apply and rehearse `apps/server/drizzle/0001_initial.sql` before production.

---

## 18. Current commits that explain the implementation

Recent feature-branch history, newest first:

```text
a35388e test: verify complete cybersecurity shift
558cb45 feat: add contextual cybersecurity work systems
3603b73 feat: route actions to exact workplace events
1d1a13b feat: build deterministic multi-event cybersecurity shift
04c60ba feat: add targeted workplace action contracts
97122da docs: plan deep cybersecurity shift
4f03d87 fix: make manager consultation actionable
ae96d1f docs: design simulation progression
9f71759 feat: build bounded career simulation beta
09a45bb chore: establish career simulation specification baseline
```

Use these commits to understand why contracts and UI behavior changed. Do not assume every item in the original eight-plan roadmap was completed by the initial beta commit.

---

## 19. Known technical debt and likely traps

### Career pack appears more complete than it is

The scenario body is now authoritative for events, actions, artifacts, facts and NPCs, but the schema still does not reject every unknown or stale field. Verify which fields are parsed before assuming a new pack key takes effect.

### UI tools are still shallow

The system shell looks more like a workplace, but many interactions remain action cards inside system panels. Add artifacts and manipulation before adding visual navigation.

### Monolithic files will slow parallel development

The core and React entry files should be decomposed along stable module boundaries before multiple agents make overlapping changes.

### Local persistence can disappear

Without a database connection, server restart loses sessions. This is expected local behavior, not evidence that persistence is fully production-ready.

### AI foundations are not a license to add autonomous world generation

The provider can phrase dialogue only. Never let model output define facts, actions, correct procedures, event results, evidence, or recommendations.

### Visual work can accidentally create assessment bias

Do not record movement time, mouse precision, camera control, or navigation efficiency as career evidence. Structured and spatial experiences must remain equivalent.

### Privacy foundations are not completed legal compliance

Configuration, RLS, and consent structures still require jurisdiction-specific legal review and end-to-end testing. Do not present the current implementation as fully compliant production software.

---

## 20. Definition of the next successful milestone

The next milestone is complete when:

- The full cybersecurity shift is constructed from a validated career pack.
- Core imports no cybersecurity-specific event identifiers or rules.
- Five workplace systems contain persistent, inspectable artifacts.
- Ticket notes and documentation are editable and canonical.
- Knowledge-base search and artifact inspection influence available deterministic actions.
- Multiple events overlap and earlier decisions cause later visible effects.
- Morgan’s knowledge and availability derive from world state.
- Normal mode does not rely on a generic answer-card list.
- Structured mode exposes identical action targets and consequences.
- Full expected, delayed, incorrect, help-seeking, and off-script replays pass.
- A realistic playthrough takes approximately 20–25 minutes.
- No 2D/3D code is required to meet this milestone.

---

## 21. Instructions for another coding agent

When taking over:

1. Open the implementation worktree, not main.
2. Read `career-sim-build-spec.md` first.
3. Read the progression design and deep-shift plan.
4. Run `git status --short` and preserve existing changes.
5. Run the focused tests around the area to be changed.
6. State whether the task addresses a current implementation, a known gap, or a future-stage goal.
7. Keep core deterministic and renderer-independent.
8. Keep AI bounded to validated dialogue.
9. Use Zod at every public/content boundary.
10. Start feature and bug work with a failing test.
11. Do not begin 3D work unless the validation gate has explicitly passed.
12. Update this document if architecture, branch location, verified status, or roadmap state materially changes.

Suggested initial prompt for a new agent:

> Inspect this checkout's location and Git status. Work on `experimental` or a task branch based on it; preserve local changes. Treat `main` as the stable checkpoint and promote changes only when requested after verification. Read `AGENTS.md`, `AGENT_CONTEXT.md`, `career-sim-build-spec.md`, and the applicable approved plan. Inspect current code and tests before proposing changes. Preserve deterministic server authority, hidden-state isolation, accessibility parity, privacy boundaries, and bounded AI. The existing 3D office is presentation over public simulation state. Distinguish current implementation from historical plans and unfinished milestones. Commit and push coherent checkpoints.

---

## 22. Short product summary for external collaborators

Career Expo is building a direct-to-user, age-13+ career-exploration platform where people experience realistic work rather than complete a personality quiz. The first simulation is a 20–25 minute Junior Cybersecurity Analyst shift involving handoff review, alert investigation, routine monitoring, phishing response, documentation, help-seeking, and delayed consequences. A deterministic TypeScript backend owns the world and evidence; AI can only write bounded dialogue. The current beta has a functioning multi-event React work surface, structured mode, server/API, replayable core, privacy/database foundations, and basic evidence/debrief support. The immediate goal is to make the career pack authoritative and deepen each workplace system with persistent artifacts and realistic interactions. A lightweight 2D office comes after that; one low-poly 3D slice is considered only after realism, accessibility, usefulness, cost, and gaming-skill-confound validation.
