# Beginner Interactive Shift Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 10–15 minute beginner-friendly cybersecurity shift where investigative verbs open deterministic mini-tasks, one routine interruption contains a missing-handoff subproblem, and guidance prevents players getting lost.

**Architecture:** Career-pack task definitions keep answer rules server-side. Core evaluates attempts and atomically performs linked actions after final success. `ClientView` exposes safe task/notification projections consumed by a shared React task renderer, guided case rail, Desk OS, and structured mode.

**Tech Stack:** TypeScript, Zod, deterministic `@sim/core`, Fastify/tRPC, React 19, Vitest, YAML career packs.

**Spec:** `docs/superpowers/specs/2026-08-27-beginner-interactive-shift-design.md`

## Global Constraints

- Deterministic server remains sole authority for task validation, sim time, actions, consequences, and evidence.
- Correct option IDs and coaching rules never serialize into `ClientView`.
- Failed/intermediate attempts consume no sim time and create no evidence.
- Final successful task attempt performs linked action exactly once.
- Structured and visual renderers expose identical task/action IDs and outcomes.
- Main copy uses plain language; authentic terms require optional explanations.
- No hard timer, reflex scoring, compatibility meter, or AI answer validation.

---

### Task 1: Task and notification schemas

**Files:** Modify schema contracts and career-pack validation; test parser behavior in schema/career-pack tests.

**Interfaces:** Produce `WorkTaskKind`, `PackTaskDefinition`, `TaskAttempt`, `TaskAttemptFeedback`, `ClientTaskView`, `NotificationResponse`, and safe client notification types. Extend action availability with optional `taskId`; world state with `taskProgress` and `notifications`; scenario rules with task definitions.

- [ ] Write failing parser tests proving valid multi-step tasks parse, duplicate option IDs fail, required IDs must exist, and `ClientTaskView` has no answer fields.
- [ ] Run focused schema and career-pack tests; confirm failures come from missing contracts.
- [ ] Add Zod schemas, inferred types, defaults, and pack cross-reference validation for task/action/template/artifact IDs.
- [ ] Run tests and typecheck; commit `feat(schemas): define interactive work tasks`.

### Task 2: Pure deterministic task engine

**Files:** Add focused core task evaluator, modify world initialization/availability/serializer/reducer, expand core tests.

**Interfaces:** Produce `applyTaskAttempt(state, attempt): TaskAttemptTurn`; `toClientTaskViews(state)`; direct action guard for incomplete required tasks. Failed result keeps clock/action log unchanged; step success updates progress; final success calls existing action application once.

- [ ] Write failing tests for weak coaching, successful step advance, final atomic action completion, duplicate final rejection, direct bypass rejection, and answer-key omission.
- [ ] Run focused core tests and verify red failures.
- [ ] Implement exact set matching with selection cardinality, deterministic feedback, progress keys scoped by event/task, and safe serializer projection.
- [ ] Add notification state derivation on event activation and deterministic handle/snooze/continue reducer with one-snooze limit and 15-minute wake.
- [ ] Run core/replay tests; commit `feat(core): evaluate work tasks deterministically`.

### Task 3: Deep career-pack content

**Files:** Expand cybersecurity pack and golden fixtures/tests.

**Interfaces:** Define tasks for handoff, suspicious login, routine scanner, and ticket summary. Define notification linked to routine alert. Keep current action IDs where semantics match.

- [ ] Write failing loader/golden tests asserting required task IDs, 10–15 minute intended route, routine notification, nested missing-reference step, employee callback, and delayed consequence.
- [ ] Run content tests and verify expected missing definitions.
- [ ] Author plain-language artifact copy, option explanations, deterministic coaching, task steps, notification copy, staged event progression, and callback artifact/message.
- [ ] Ensure main path includes compare records, select clues, device match, guided summary, final decision; interruption includes handoff gap and scanner-window match.
- [ ] Run pack and replay suites; commit `feat(content): author interactive analyst shift`.

### Task 4: Server procedures and evidence boundary

**Files:** Extend tRPC schemas/router/client and server tests.

**Interfaces:** Add `simulation.submitTaskAttempt` and `simulation.respondToNotification`; web client methods return validated results. Only completed attempts append canonical action/evidence records; failed/intermediate attempts persist task progress without evidence.

- [ ] Write failing router tests for authenticated task attempt, coaching retry, completion sequence, stale task rejection, notification response, and no evidence on failed attempt.
- [ ] Run server tests and verify failures.
- [ ] Implement repository updates and outputs through Zod; derive user identity from session context.
- [ ] Run router/RLS/type tests; commit `feat(server): expose task and notification turns`.

### Task 5: Shared task renderer

**Files:** Create focused shared renderer and styles; integrate through System Tool Panel and mode callback contracts; add component tests.

**Interfaces:** `WorkTaskPanel({ task, artifacts, onSubmit })` renders all five kinds using semantic fieldsets and returns selected option IDs. `onSubmit` returns feedback so failed coaching remains visible and successful view updates close/advance task.

- [ ] Write failing tests proving compare artifacts appear, selection limits enforce, coaching announces via live region, retry preserves task, success calls exact task/event/option IDs, and no answer marker exists in DOM.
- [ ] Implement accessible task patterns: record comparison, clue tray, reference match, summary slots, response choice.
- [ ] Replace task-linked generic action execution with “Begin/Resume task”; leave untasked utility controls intact.
- [ ] Run component/accessibility tests; commit `feat(web): add interactive work task renderer`.

### Task 6: Guided case rail and notification UX

**Files:** Add shared case rail and notification banner; integrate WorkSurface, Desk OS, spatial shell, and structured mode; test navigation.

**Interfaces:** Rail derives objective/progress from safe `ClientView`; `onResume(task)` opens correct system/event; notification callbacks accept handle/snooze/continue and open linked work only after server response.

- [ ] Write failing tests for persistent objective, main/interruption labels, one-click resume, notification choices, snooze disappearance/reappearance, and keyboard navigation.
- [ ] Implement compact rail with plain-language “why this matters,” progress labels, term-help disclosure, and no numeric score.
- [ ] Add nonmodal notification banner; Handle opens system, Snooze hides until canonical wake, Continue leaves rail item.
- [ ] Keep guided-first/faded-later behavior from task progress.
- [ ] Run visual/structured parity tests; commit `feat(web): guide players through interrupted casework`.

### Task 7: End-to-end shift and completion audit

**Files:** Expand full-shift fixtures, app/router integration tests, and docs/run notes.

**Interfaces:** Golden log includes handoff → main compare → routine notification → missing reference → scanner close → employee callback → ticket → decision → wrap-up.

- [ ] Write end-to-end test that completes shift through task attempts without generic task bypass.
- [ ] Add weak-attempt recovery path, snooze path, manager-help path, and early-dismiss delayed-consequence replay.
- [ ] Assert exact action/task parity across Desk OS and structured mode; assert tutorial/session evidence boundaries.
- [ ] Run `pnpm test`, `pnpm lint`, `pnpm typecheck`, and `pnpm build`.
- [ ] Manually smoke test full route and record real elapsed time; acceptance target 10–15 minutes, no navigation dead end.
- [ ] Commit `test: verify beginner interactive shift`.

