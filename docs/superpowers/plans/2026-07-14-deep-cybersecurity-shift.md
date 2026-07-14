# Deep Cybersecurity Shift Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the three-button prototype with a deterministic 20–25 minute Junior Cybersecurity Analyst shift containing guided onboarding, overlapping routine and investigative work, realistic workplace systems, and delayed consequences from earlier decisions.

**Architecture:** Keep `@sim/core` authoritative and pure. Actions gain event/system targets, events keep generic progress state, time activates pending work and applies delayed consequences, and `ClientView` exposes only public workplace artifacts. React renders contextual alert, email, ticket, knowledge-base, and team-chat tools over the same action contract used by structured mode.

**Tech Stack:** Node 24+, TypeScript strict mode, Zod, Vitest, Fastify/tRPC, React DOM, YAML career pack content.

## Global Constraints

- Backend owns world, time, rules, consequences, facts, NPC knowledge, and evidence.
- AI may phrase bounded dialogue only; deterministic fallback keeps shift playable.
- No hidden state or numeric assessment output may enter `ClientView`.
- Work-surface and structured adapters expose identical action IDs and targets.
- Time advances through actions, never required wall-clock reaction speed.
- Represent routine monitoring and quiet investigation; avoid dramatic-hacking bias.
- Navigation/interface speed produces no career evidence.
- No 2D/3D renderer in this slice.

---

### Task 1: Targeted workplace contracts

**Files:**
- Modify: `packages/schemas/src/index.ts`
- Modify: `packages/core/test/core.test.ts`
- Modify: `apps/server/test/router.test.ts`

**Interfaces:**
- Produces: `WorkSystemId`, targeted `SimulationAction.eventId`, targeted `AvailableAction.eventId/systemId`, generic event progress, public event summary/priority/system data.
- Consumes: existing `SimulationActionId`, `WorldState`, and `ClientView` contracts.

- [ ] **Step 1: Write failing contract tests**

```ts
const view = toClientView(createInitialWorldState("session-1", 42));
expect(view.events.length).toBeGreaterThan(2);
expect(view.availableActions.every((action) => action.eventId)).toBe(true);
expect(view.availableActions.every((action) => action.systemId)).toBe(true);
```

- [ ] **Step 2: Run RED test**

Run: `pnpm exec vitest run packages/core/test/core.test.ts apps/server/test/router.test.ts`
Expected: FAIL because actions and events are not targeted.

- [ ] **Step 3: Add schemas**

Add exact public fields:

```ts
type WorkSystemId =
  | "alert_dashboard"
  | "ticket_queue"
  | "email"
  | "knowledge_base"
  | "team_chat";

type SimulationAction = {
  id: SimulationActionId;
  actorId: string;
  eventId?: string;
  freeText?: string;
};

type AvailableAction = {
  id: SimulationActionId;
  eventId: string;
  systemId: WorkSystemId;
  label: string;
  description: string;
  simulatedMinutes: number;
};
```

Replace event-specific progress as the engine migrates with `completedActionIds`, `managerConsulted`, `priority`, `summary`, and `systemId`. Client events expose those public presentation fields, never `hidden`.

- [ ] **Step 4: Run GREEN contract tests**

Run: `pnpm exec vitest run packages/core/test/core.test.ts apps/server/test/router.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/schemas/src/index.ts packages/core/test/core.test.ts apps/server/test/router.test.ts
git commit -m "feat: add targeted workplace action contracts"
```

### Task 2: Deterministic multi-event shift

**Files:**
- Modify: `packages/core/src/index.ts`
- Modify: `packages/core/test/core.test.ts`
- Modify: `content/packs/cybersecurity-analyst/pack.yaml`

**Interfaces:**
- Consumes: targeted actions from Task 1.
- Produces: `availableActions(state)` across active events and `applyAction(state, action)` with event scheduling, prerequisite enforcement, resolution, expiry, and delayed consequences.

- [ ] **Step 1: Write failing scheduler and golden-path tests**

```ts
it("activates routine work while an investigation remains open", () => {
  const state = run(initial, suspiciousLoginActionsThroughMinute25);
  expect(state.events.find((event) => event.templateId === "routine_alert_review")?.status).toBe("active");
  expect(state.events.find((event) => event.templateId === "suspicious_login")?.status).toBe("active");
});

it("applies a delayed consequence from an earlier dismissal", () => {
  const state = run(initial, dismissThenContinueOtherWork);
  expect(state.events.find((event) => event.templateId === "suspicious_login")?.status).toBe("escalated");
});

it("completes the full expected shift and replays identically", () => {
  const direct = run(initial, EXPECTED_SHIFT_ACTIONS);
  expect(availableActions(direct).map(({ id }) => id)).toContain("complete_shift");
  expect(foldActionLog(initial, log(EXPECTED_SHIFT_ACTIONS))).toEqual(direct);
});
```

- [ ] **Step 2: Run RED core test**

Run: `pnpm exec vitest run packages/core/test/core.test.ts`
Expected: FAIL because one hard-coded event exists.

- [ ] **Step 3: Implement generic event progression**

Use pack-documented events and systems:

- `incomplete_handoff`: active at shift start in email/team chat.
- `suspicious_login`: active at shift start in alert dashboard.
- `routine_alert_review`: triggers while suspicious login remains open.
- `phishing_report`: triggers later through email.
- `false_positive`: calm routine alert, resolved through review/document/dismiss.

Each action targets one event. Availability checks prerequisite action IDs. Time activation runs after every action. Dismissing suspicious login schedules related activity; later work advances time and makes that consequence visible. Manager guidance is once per event.

- [ ] **Step 4: Run GREEN core test**

Run: `pnpm exec vitest run packages/core/test/core.test.ts`
Expected: PASS with scheduler, consequence, golden path, and replay tests.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/index.ts packages/core/test/core.test.ts content/packs/cybersecurity-analyst/pack.yaml
git commit -m "feat: build deterministic multi-event cybersecurity shift"
```

### Task 3: Targeted server turns and evidence provenance

**Files:**
- Modify: `apps/server/src/index.ts`
- Modify: `apps/server/test/router.test.ts`
- Modify: `apps/web/src/index.tsx`

**Interfaces:**
- Consumes: `SimulationAction.eventId` and `AvailableAction.eventId`.
- Produces: `simulation.performAction({ sessionId, actionId, eventId })`; evidence records exact event provenance.

- [ ] **Step 1: Write failing API test**

```ts
const action = created.view.availableActions.find(({ eventId }) => eventId === "handoff-1")!;
await caller.simulation.performAction({
  sessionId: created.sessionId,
  actionId: action.id,
  eventId: action.eventId,
});
expect(repository.evidenceFor("user-1", created.sessionId)[0]?.eventId).toBe("handoff-1");
```

- [ ] **Step 2: Run RED server test**

Run: `pnpm exec vitest run apps/server/test/router.test.ts`
Expected: FAIL because API ignores event target.

- [ ] **Step 3: Pass target through API and action log**

Validate `eventId`, pass it into `applyAction`, store it in action log, and use it in `evidenceForAction`. Reject action/event mismatches without mutation.

- [ ] **Step 4: Run GREEN server test**

Run: `pnpm exec vitest run apps/server/test/router.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/index.ts apps/server/test/router.test.ts apps/web/src/index.tsx
git commit -m "feat: route actions to exact workplace events"
```

### Task 4: Contextual workplace-system UI

**Files:**
- Modify: `apps/web/src/index.tsx`
- Modify: `apps/web/src/styles.css`
- Modify: `apps/web/test/app.test.tsx`

**Interfaces:**
- Consumes: public events and targeted available actions.
- Produces: desktop shell with system navigation and contextual event detail; structured mode retains same action target set.

- [ ] **Step 1: Write failing interaction tests**

```ts
expect(screen.getByRole("navigation", { name: "Work systems" })).toBeVisible();
await user.click(screen.getByRole("button", { name: "Email" }));
expect(screen.getByRole("heading", { name: "Shift handoff" })).toBeVisible();
expect(screen.queryByLabelText("Available actions")).toBeNull();
```

Add parity assertion comparing `${action.id}:${action.eventId}` across work and structured adapters.

- [ ] **Step 2: Run RED web test**

Run: `pnpm exec vitest run apps/web/test/app.test.tsx`
Expected: FAIL because current UI is one generic action grid.

- [ ] **Step 3: Build system shell**

Render:

- Welcome/shift briefing panel.
- Persistent Alert Dashboard, Email, Tickets, Knowledge Base, and Team Chat navigation.
- Event list filtered by system.
- Selected-event detail with contextual controls only.
- Notification count and shift time.
- Dedicated manager context screen with return to originating system.
- Structured mode grouped by system, using identical targeted actions.

- [ ] **Step 4: Run GREEN web test**

Run: `pnpm exec vitest run apps/web/test/app.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/index.tsx apps/web/src/styles.css apps/web/test/app.test.tsx
git commit -m "feat: add contextual cybersecurity work systems"
```

### Task 5: Full-shift verification

**Files:**
- Modify: `packages/testing/src/index.ts`
- Modify: `README.md`

**Interfaces:**
- Consumes: completed multi-event engine and renderers.
- Produces: documented expected path and composite action parity helper.

- [ ] **Step 1: Add full replay and adapter parity fixtures**

Assert expected path contains at least fifteen meaningful targeted actions, reaches debrief, reproduces canonical state, and exposes equal composite action targets in both adapters.

- [ ] **Step 2: Run full verification**

Run:

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

Expected: all commands exit 0.

- [ ] **Step 3: Browser smoke test**

Start new assessed shift, open email handoff, move between systems, progress until another event activates, verify earlier decisions remain visible, verify manager consultation cannot loop, and verify debrief loads.

- [ ] **Step 4: Commit**

```bash
git add packages/testing/src/index.ts README.md
git commit -m "test: verify complete cybersecurity shift"
```
