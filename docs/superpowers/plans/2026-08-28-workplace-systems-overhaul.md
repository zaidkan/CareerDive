# Workplace Systems Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace quiz-like workstation and decorative break-room mechanics with deterministic energy, finite resources, purposeful dialogue, reliable Desk OS interactions, and recoverable 3D navigation.

**Architecture:** Add canonical workplace state and interactions to schemas/core/server, then render that state through focused React tools and Three.js props. Existing pack tasks remain server-validated; specialized UI maps visible workplace interactions to current task option IDs. Every canonical mutation is logged and replayable.

**Tech Stack:** Node 24, pnpm, TypeScript strict mode, Zod, Fastify, tRPC, React 19, React Three Fiber, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-28-workplace-systems-overhaul-design.md`

## Global Constraints

- Deterministic backend remains sole authority over time, resources, task completion, consequences, and evidence.
- Same seed plus same interaction log must produce identical canonical state.
- Walking speed, pointer skill, real-world response speed, tutorial attempts, and accessibility mode never affect career evidence.
- AI cannot control Jules, resources, professional procedures, task validation, or outcomes.
- Work-surface and structured modes must expose identical canonical interaction IDs and outcomes.
- No new 3D engine, pathfinding dependency, broad inventory system, second NPC, or additional career.
- Use RED-GREEN-REFACTOR for every behavior change.
- Preserve hidden-state isolation and existing debrief/privacy invariants.

---

### Task 1: Workplace schemas and pack contracts

**Files:**
- Create: `packages/schemas/src/workplace.ts`
- Modify: `packages/schemas/src/world.ts`
- Modify: `packages/schemas/src/client-view.ts`
- Modify: `packages/schemas/src/actions.ts`
- Modify: `packages/schemas/src/turn.ts`
- Modify: `packages/schemas/src/index.ts`
- Modify: `packages/schemas/src/career-pack.ts`
- Test: `packages/career-packs/test/task-contract.test.ts`

**Interfaces:**
- Produces: `WorkplaceState`, `ClientWorkplaceState`, `WorkplaceInteraction`, `WorkplaceInteractionOutcome`.
- Produces: `ActionDefinition.energyCost: number` with nonnegative integer default.
- Produces: `PackWorkplaceDefaults` at `CareerPack.scenario.workplaceDefaults` so stock and energy limits are content-validated.
- Produces: logged interaction variant `{ type: "workplace_interaction"; interaction: WorkplaceInteraction }`.

- [ ] **Step 1: Write failing public-contract tests**

```ts
expect(WorkplaceStateSchema.parse({
  energy: { current: 100, max: 100 },
  carriedSnackBites: 0,
  fridgeSnackBars: 2,
  fridgeOpen: false,
  coffeeServings: 2,
  coffeeStage: "idle",
  julesTopicsSeen: [],
  emergencyRecoveryUsed: false,
})).toBeDefined();

expect(WorkplaceInteractionSchema.parse({
  type: "movement_exertion",
  distanceMeters: 5,
})).toEqual({ type: "movement_exertion", distanceMeters: 5 });
```

- [ ] **Step 2: Run contract test and verify missing-schema failure**

Run: `pnpm --filter @sim/career-packs exec vitest run test/task-contract.test.ts`

Expected: FAIL because workplace schemas are not exported.

- [ ] **Step 3: Add exact schemas**

```ts
export const CoffeeStageSchema = z.enum(["idle", "brewing", "ready", "poured"]);
export const JulesTopicSchema = z.enum([
  "first_day",
  "current_work",
  "break_room",
  "team_context",
]);
export const WorkplaceStateSchema = z.object({
  energy: z.object({ current: z.number().int().min(0), max: z.number().int().positive() }),
  carriedSnackBites: z.number().int().min(0).max(3),
  fridgeSnackBars: z.number().int().min(0),
  fridgeOpen: z.boolean(),
  coffeeServings: z.number().int().min(0),
  coffeeStage: CoffeeStageSchema,
  julesTopicsSeen: z.array(JulesTopicSchema),
  emergencyRecoveryUsed: z.boolean(),
});
export const WorkplaceInteractionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("movement_exertion"), distanceMeters: z.literal(5) }),
  z.object({ type: z.literal("open_fridge") }),
  z.object({ type: z.literal("close_fridge") }),
  z.object({ type: z.literal("take_snack") }),
  z.object({ type: z.literal("eat_snack_bite") }),
  z.object({ type: z.literal("start_coffee") }),
  z.object({ type: z.literal("finish_coffee") }),
  z.object({ type: z.literal("pour_coffee") }),
  z.object({ type: z.literal("drink_coffee") }),
  z.object({ type: z.literal("talk_to_jules"), topic: JulesTopicSchema }),
  z.object({ type: z.literal("open_artifact"), artifactId: z.string().min(1) }),
  z.object({ type: z.literal("emergency_recovery") }),
]);
export const PackWorkplaceDefaultsSchema = z.object({
  energyMax: z.number().int().positive(),
  fridgeSnackBars: z.number().int().min(0).max(10),
  snackBitesPerBar: z.literal(3),
  coffeeServings: z.number().int().min(0).max(10),
});
export const WorkplaceFeedbackCodeSchema = z.enum([
  "movement_recorded",
  "fridge_opened",
  "fridge_closed",
  "snack_taken",
  "snack_bite_eaten",
  "coffee_started",
  "coffee_ready",
  "coffee_poured",
  "coffee_drunk",
  "jules_replied",
  "artifact_opened",
  "energy_recovered",
]);
export const WorkplaceInteractionOutcomeSchema = z.object({
  feedbackCode: WorkplaceFeedbackCodeSchema,
});
export const ClientWorkplaceStateSchema = WorkplaceStateSchema;
```

Add `workplace` to `WorldStateSchema` and `ClientViewSchema`; add `workplaceDefaults` to pack scenario schema; add `energyCost: z.number().int().nonnegative().default(0)` to `ActionDefinitionSchema`. Extend `WorkplaceInteractionOutcomeSchema` in `turn.ts` with `state: WorldStateSchema` and `effects: z.array(DomainEffectSchema)` to export `WorkplaceInteractionTurn`. Add loader test rejecting zero energy maximum, negative stock, or any bite count other than three.

- [ ] **Step 4: Run schema and pack tests**

Run: `pnpm --filter @sim/schemas typecheck && pnpm --filter @sim/career-packs test`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/schemas packages/career-packs/test/task-contract.test.ts
git commit -m "feat: define deterministic workplace contracts"
```

### Task 2: Deterministic energy, resources, and replay

**Files:**
- Create: `packages/core/src/workplace.ts`
- Modify: `packages/core/src/world.ts`
- Modify: `packages/core/src/reducer.ts`
- Modify: `packages/core/src/replay.ts`
- Modify: `packages/core/src/serializer.ts`
- Modify: `packages/core/src/index.ts`
- Modify: `content/packs/cybersecurity-analyst/pack.yaml`
- Test: `packages/core/test/workplace.test.ts`
- Test: `packages/core/test/core.test.ts`

**Interfaces:**
- Consumes: schemas from Task 1.
- Produces: `applyWorkplaceInteraction(state, interaction): WorkplaceInteractionTurn`.
- Produces: `canOpenArtifact(state, artifactId): boolean`.

- [ ] **Step 1: Write failing reducer tests**

```ts
it("charges work and movement but never idle time", () => {
  const moved = applyWorkplaceInteraction(world(), {
    type: "movement_exertion",
    distanceMeters: 5,
  }).state;
  expect(moved.workplace.energy.current).toBe(99);

  const ready = structuredClone(moved);
  ready.taskProgress["suspicious-login-1:login-alert-compare"] = {
    currentStep: 1,
    attempts: 2,
    completed: true,
    selectedOptionIdsByStep: {},
  };
  const worked = applyAction(ready, {
    id: "review_alert",
    eventId: "suspicious-login-1",
    actorId: "user",
  }).state;
  expect(worked.workplace.energy.current).toBe(95);
});

it("uses finite three-bite bars", () => {
  let state = world();
  state = applyWorkplaceInteraction(state, { type: "open_fridge" }).state;
  state = applyWorkplaceInteraction(state, { type: "take_snack" }).state;
  expect(state.workplace).toMatchObject({ fridgeSnackBars: 1, carriedSnackBites: 3 });
  for (let index = 0; index < 3; index += 1) {
    state = applyWorkplaceInteraction(state, { type: "eat_snack_bite" }).state;
  }
  expect(state.workplace.carriedSnackBites).toBe(0);
  expect(() => applyWorkplaceInteraction(state, { type: "eat_snack_bite" })).toThrow();
});
```

Also test coffee transition order, one-time emergency recovery, artifact authorization, failed task attempts costing zero energy, and replay equality.

- [ ] **Step 2: Run focused tests and verify reducer is missing**

Run: `pnpm --filter @sim/core exec vitest run test/workplace.test.ts`

Expected: FAIL importing `applyWorkplaceInteraction`.

- [ ] **Step 3: Implement workplace reducer**

Use constants:

```ts
const MOVEMENT_COST = 1;
const SNACK_BITE_RESTORE = 12;
const COFFEE_RESTORE = 28;
const EMERGENCY_RECOVERY = 20;
```

Clone state before mutation, reject invalid transitions with `WorkplaceInteractionError`, clamp energy, return deterministic feedback code plus state. `open_artifact` may observe artifacts tied to visible events or knowledge-base documents only.

- [ ] **Step 4: Apply action energy cost atomically**

In `applyAction`, reject effort-bearing action when energy is below `definition.energyCost`; subtract cost in same cloned turn that advances simulated time. Add explicit costs to current pack actions: 2–5 for investigation, 1 for communication, 0 for utility saves and wrap-up.

- [ ] **Step 5: Initialize, serialize, and replay workplace state**

Initialize state from validated `pack.scenario.workplaceDefaults`. Add exact defaults to cybersecurity pack. Expose client-safe workplace state. Add workplace interaction handling to `foldActionLog`.

- [ ] **Step 6: Run focused and full core tests**

Run: `pnpm --filter @sim/core test && pnpm --filter @sim/career-packs test`

Expected: PASS with replay equality.

- [ ] **Step 7: Commit**

```bash
git add packages/core content/packs/cybersecurity-analyst/pack.yaml
git commit -m "feat: add replayable workplace resources"
```

### Task 3: Server and web workplace mutation API

**Files:**
- Modify: `apps/server/src/trpc/router.ts`
- Modify: `apps/web/src/client.ts`
- Modify: `apps/web/src/components/shared.tsx`
- Test: `apps/server/test/router.test.ts`

**Interfaces:**
- Consumes: `applyWorkplaceInteraction` from Task 2.
- Produces: tRPC `simulation.performWorkplaceInteraction`.
- Produces: `SimulationClient.performWorkplaceInteraction(sessionId, interaction)`.

- [ ] **Step 1: Write failing router tests**

```ts
const { caller, repository } = setup();
const created = await caller.session.create({
  seed: 42,
  sessionKind: "assessed",
  pacingMode: "standard",
});
const opened = await caller.simulation.performWorkplaceInteraction({
  sessionId: created.sessionId,
  interaction: { type: "open_fridge" },
});
expect(opened.view.workplace.fridgeOpen).toBe(true);
expect(opened.sequence).toBeGreaterThan(0);
const stored = await repository.getSession("user-1", created.sessionId);
expect(stored.actionLog.at(-1)?.interaction.type).toBe("workplace_interaction");
```

Test owner isolation, invalid transition rejection, no evidence row for Jules/tutorial interactions, and a maximum of two accepted movement submissions per second per session.

- [ ] **Step 2: Run server test and verify missing procedure**

Run: `pnpm --filter @sim/server exec vitest run test/router.test.ts -t workplace`

Expected: FAIL because procedure does not exist.

- [ ] **Step 3: Implement authenticated procedure and client method**

Validate input/output with Zod, derive owner from context, append exactly one action-log entry, save session, return `{ view, sequence, feedback }`. Add transient per-session limiter allowing two `movement_exertion` requests per second; rejected requests do not enter canonical log and other workplace interactions are unaffected.

- [ ] **Step 4: Run server and web typechecks**

Run: `pnpm --filter @sim/server test && pnpm --filter @sim/web typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/server apps/web/src/client.ts apps/web/src/components/shared.tsx
git commit -m "feat: expose workplace interaction API"
```

### Task 4: Finite break-room interaction loop

**Files:**
- Create: `apps/web/src/world/breakRoom.ts`
- Create: `apps/web/src/world/BreakRoomPanel.tsx`
- Modify: `apps/web/src/world/SpatialShell.tsx`
- Modify: `apps/web/src/world/worldTypes.ts`
- Modify: `apps/web/src/world/rooms/socLayout.ts`
- Modify: `apps/web/src/world/rooms/GlassBreakNook.tsx`
- Modify: `apps/web/src/world/props/kitchen.tsx`
- Modify: `apps/web/src/world/RoomCanvas.tsx`
- Modify: `apps/web/src/styles.css`
- Delete: `apps/web/src/world/energy.ts`
- Test: `apps/web/test/break-room.test.tsx`
- Test: `apps/web/test/soc-layout.test.ts`
- Modify: `apps/web/test/world.test.tsx`
- Delete: `apps/web/test/energy.test.ts`
- Delete: `apps/web/test/world-sleep.test.tsx`

**Interfaces:**
- Consumes: canonical `view.workplace` and workplace mutation handler.
- Produces: fridge, carried snack, coffee, and energy HUD interactions.

- [ ] **Step 1: Write failing break-room tests**

```tsx
expect(BASE_HOTSPOTS.some(({ id }) => id === "snack")).toBe(false);
expect(BREAK_INTERIOR_HOTSPOTS.map(({ id }) => id)).toEqual(
  expect.arrayContaining(["fridge", "coffee", "jules"]),
);

await user.click(screen.getByRole("button", { name: "Open fridge" }));
expect(onWorkplaceInteraction).toHaveBeenCalledWith({ type: "open_fridge" });
```

Test three bite labels, empty fridge copy, coffee stage buttons, and no automatic energy timer.

- [ ] **Step 2: Run focused web tests and verify failures**

Run: `pnpm --filter @sim/web exec vitest run test/break-room.test.tsx test/soc-layout.test.ts`

Expected: FAIL because fridge hotspot and canonical controls do not exist.

- [ ] **Step 3: Replace presentation energy loop**

Remove RAF drain, collapse overlay, global energy singleton, infinite `sipOrSnack`, and aisle snack hotspot. Render meter directly from `view.workplace.energy`.

- [ ] **Step 4: Build canonical break controls**

Add `fridge` hotspot. `BreakRoomPanel` maps canonical state to exactly one valid primary action plus unavailable reason. Keep carried snack bite control available after leaving break room.

Close fridge presentation/canonical state when player exits break room or leaves SOC by submitting `close_fridge` once when needed.

- [ ] **Step 5: Animate props from canonical state**

Change signatures:

```ts
Fridge({ position, open }: { position: Vec3; open: boolean })
CoffeePot({ position, stage, animated }: { position: Vec3; stage: CoffeeStage; animated?: boolean })
```

Rotate fridge door with damped animation. Show bars only while open and stock remains. Steam only for `ready` or `poured`.

- [ ] **Step 6: Run web tests**

Run: `pnpm --filter @sim/web test`

Expected: PASS without sleep-loop tests.

- [ ] **Step 7: Commit**

```bash
git add apps/web
git commit -m "feat: build finite break room loop"
```

### Task 5: Purposeful deterministic Jules dialogue

**Files:**
- Create: `packages/core/src/jules.ts`
- Modify: `packages/core/src/workplace.ts`
- Create: `apps/web/src/world/JulesDialogue.tsx`
- Modify: `apps/web/src/world/SpatialShell.tsx`
- Modify: `apps/web/src/world/rooms/GlassBreakNook.tsx`
- Modify: `apps/web/src/styles.css`
- Test: `packages/core/test/jules.test.ts`
- Test: `apps/web/test/jules.test.tsx`

**Interfaces:**
- Produces: `julesDialogue(state, topic): { speaker: "Jules"; text: string; nextSystemId?: WorkSystemId }`.
- Consumes: only visible event status, observed artifacts, available actions, energy/resource state, and seen topics.

- [ ] **Step 1: Write failing leakage and stage tests**

```ts
expect(julesDialogue(initial, "first_day").text).toMatch(/monitor|notes|interrupt/i);
expect(julesDialogue(afterLoginContext, "current_work").text).toMatch(/device|inventory/i);
expect(JSON.stringify(julesDialogue(afterLoginContext, "current_work"))).not.toMatch(
  /employee-private-travel|requiredOptionIds|correct answer/i,
);
```

- [ ] **Step 2: Run focused tests and verify missing dialogue resolver**

Run: `pnpm --filter @sim/core exec vitest run test/jules.test.ts`

Expected: FAIL importing `julesDialogue`.

- [ ] **Step 3: Implement topic resolver**

Use deterministic lookup keyed by topic and current available action. Return peer context, optional destination, and no action ID answer. Record topic through workplace reducer without time/evidence.

- [ ] **Step 4: Build dialogue panel**

Render Jules name, current reply, two or three topic buttons, previously discussed labels, close control, and optional “Back to Alerts/Guides/Tickets” destination hint.

- [ ] **Step 5: Run core and web tests**

Run: `pnpm --filter @sim/core test && pnpm --filter @sim/web test`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/core apps/web
git commit -m "feat: give Jules stage-aware dialogue"
```

### Task 6: Mutation coordination and Desk OS reliability

**Files:**
- Create: `apps/web/src/useMutationCoordinator.ts`
- Create: `apps/web/src/components/MutationStatus.tsx`
- Modify: `apps/web/src/index.tsx`
- Modify: `apps/web/src/components/shared.tsx`
- Modify: `apps/web/src/components/NotificationBanner.tsx`
- Modify: `apps/web/src/components/CaseRail.tsx`
- Modify: `apps/web/src/components/artifacts.tsx`
- Modify: `apps/web/src/components/WorkTaskPanel.tsx`
- Modify: `apps/web/src/world/deskOs/DeskOs.tsx`
- Modify: `apps/web/src/world/deskOs/SystemApp.tsx`
- Modify: `apps/web/src/world/deskOs/DashboardHome.tsx`
- Modify: `apps/web/src/styles.css`
- Test: `apps/web/test/desk-os.test.tsx`

**Interfaces:**
- Produces: `runMutation(key, operation): Promise<Result>` with monotonic request sequence.
- Produces: shared `MutationState = { pendingKey?: string; error?: string; success?: string }`.
- Produces: `remainingMinutes(deadlineAt, simClock)` and active-case selectors.

- [ ] **Step 1: Write failing race and state tests**

```tsx
await user.dblClick(screen.getByRole("button", { name: /review alert/i }));
expect(client.performAction).toHaveBeenCalledTimes(1);

expect(screen.getByText("Due in 170m")).toBeVisible();
expect(screen.getByText("1 open")).toBeVisible();
expect(screen.queryByRole("button", { name: /resolved case/i })).toBeNull();
```

Add deferred-promise test proving older response cannot replace newer state; note draft switching test; inline failure and retry test; notification focus-after-render test.

- [ ] **Step 2: Run Desk OS tests and verify current failures**

Run: `pnpm --filter @sim/web exec vitest run test/desk-os.test.tsx`

Expected: FAIL on duplicate calls, deadline text, and stale notes.

- [ ] **Step 3: Implement request coordinator**

Store sequence in ref. Reject duplicate pending key. Apply result only when sequence equals latest started sequence. Clear error on success. Keep canonical state unchanged on rejection.

- [ ] **Step 4: Fix selectors and local state**

Calculate relative deadlines. Active counts include `active` and `escalated`. Move resolved/expired to closed `<details>`. Key notes state by action/event and synchronize when canonical value changes while field is not dirty.

- [ ] **Step 5: Put feedback inside OS**

Render pending, error, retry, and saved status in OS status strip. Preserve task success feedback during step transition using feedback keyed by task ID plus completed step index.

- [ ] **Step 6: Simplify OS expansion and scrolling**

Use one `Expand workstation` label. Make top chrome/status fixed within overlay, case rail collapsible, queue bounded, and main detail sole primary scroll region.

- [ ] **Step 7: Run web tests**

Run: `pnpm --filter @sim/web test && pnpm --filter @sim/web typecheck`

Expected: PASS with no timing-dependent login test.

- [ ] **Step 8: Commit**

```bash
git add apps/web
git commit -m "fix: stabilize desk operating system"
```

### Task 7: Safe artifact opening and realistic Email/Alert tools

**Files:**
- Modify: `packages/schemas/src/client-view.ts`
- Modify: `packages/core/src/serializer.ts`
- Create: `apps/web/src/components/tools/EmailTool.tsx`
- Create: `apps/web/src/components/tools/AlertTool.tsx`
- Create: `apps/web/src/components/tools/TaskInteraction.tsx`
- Modify: `apps/web/src/components/SystemToolPanel.tsx`
- Modify: `apps/web/src/components/AccessibleMode.tsx`
- Modify: `apps/web/src/styles.css`
- Test: `packages/core/test/serializer.test.ts`
- Test: `apps/web/test/work-tools.test.tsx`

**Interfaces:**
- Produces: redacted `ClientArtifact` with preview fields and optional observed-only `body`/`metadata`.
- Produces: `TaskInteraction` dispatcher keyed by `WorkTaskKind`.

- [ ] **Step 1: Write failing serializer privacy test**

```ts
const client = toClientView(world());
const handoff = client.artifacts.find(({ id }) => id === "handoff-email");
expect(handoff?.observed).toBe(false);
expect(handoff).not.toHaveProperty("body");
```

- [ ] **Step 2: Write failing Email/Alert interaction tests**

Open unread email, verify body absent before server response and visible afterward. Mark alert timeline rows and verify submitted option IDs equal row IDs.

- [ ] **Step 3: Run focused tests and verify failures**

Run: `pnpm --filter @sim/core exec vitest run test/serializer.test.ts && pnpm --filter @sim/web exec vitest run test/work-tools.test.tsx`

- [ ] **Step 4: Redact unopened artifacts**

Change client schema so `body`, `metadata`, and `searchableText` are optional. Serializer always sends ID/system/kind/title/summary/event links/observed; sends detailed fields only when observed or approved public knowledge-base preview.

- [ ] **Step 5: Build Email and Alert tools**

Email queue submits `open_artifact` before showing body. Alert tool renders timeline/record fields from observed metadata. Highlight controls use existing task option IDs and submit through current task endpoint.

- [ ] **Step 6: Remove duplicated task sources**

`TaskInteraction` receives opened artifacts but never renders full related-artifact bodies above options. Missing renderer falls back to structured fieldset.

- [ ] **Step 7: Run core/web tests and parity test**

Run: `pnpm --filter @sim/core test && pnpm --filter @sim/web test`

Expected: PASS; unopened body absent in both visual and structured modes.

- [ ] **Step 8: Commit**

```bash
git add packages/schemas packages/core apps/web
git commit -m "feat: make email and alert investigation interactive"
```

### Task 8: Guides, inventory, ticket composer, and team chat

**Files:**
- Create: `apps/web/src/components/tools/KnowledgeTool.tsx`
- Create: `apps/web/src/components/tools/TicketTool.tsx`
- Create: `apps/web/src/components/tools/TeamChatTool.tsx`
- Create: `apps/web/src/components/tools/CalendarTool.tsx`
- Modify: `apps/web/src/components/SystemToolPanel.tsx`
- Modify: `apps/web/src/world/deskOs/DashboardHome.tsx`
- Modify: `apps/web/src/world/deskOs/DeskOs.tsx`
- Modify: `apps/web/src/styles.css`
- Modify: `content/packs/cybersecurity-analyst/pack.yaml`
- Test: `apps/web/test/work-tools.test.tsx`
- Test: `packages/core/test/tasks.test.ts`

**Interfaces:**
- Consumes: `TaskInteraction` and mutation coordinator.
- Produces: specialized match-reference, build-summary, and choose-response renderers.

- [ ] **Step 1: Write failing tool-flow tests**

```tsx
await user.type(screen.getByRole("searchbox", { name: /search guides/i }), "scanner schedule");
await user.click(screen.getByRole("button", { name: /search/i }));
expect(screen.getByRole("button", { name: /approved scanner window/i })).toBeVisible();

expect(screen.getByRole("group", { name: "Verified evidence" })).toBeVisible();
expect(screen.getByRole("group", { name: "Uncertainty" })).toBeVisible();
expect(screen.getByRole("group", { name: "Next step" })).toBeVisible();
```

Test exact inventory lookup, saved note confirmation, final ticket preview, Morgan thread, manager guidance remaining inside OS, and calendar containing only current events.

- [ ] **Step 2: Run tool tests and verify missing specialized controls**

Run: `pnpm --filter @sim/web exec vitest run test/work-tools.test.tsx`

Expected: FAIL on search results, composer groups, and in-OS manager thread.

- [ ] **Step 3: Build Knowledge/Inventory tool**

Keep search input visible. Submit search query, filter approved records, require exact device lookup for inventory task, and open chosen record canonically.

- [ ] **Step 4: Build Ticket composer**

Group current task options using step IDs and labels. Show generated bullet preview from accepted selections. Keep free-text investigation notes separate and saveable.

- [ ] **Step 5: Build Team Chat and Calendar tools**

Render Morgan message thread and manager guidance inline. Remove App-level manager surface transition. Calendar shows onboarding, buddy check, and optional break only; no locked links.

- [ ] **Step 6: Refine pack content**

Keep answer IDs unchanged. Rewrite prompts as workplace instructions, ensure earlier observed evidence appears in later composer, and remove wording that exposes answer shape.

- [ ] **Step 7: Run task, web, and accessibility tests**

Run: `pnpm --filter @sim/core test && pnpm --filter @sim/web test`

Expected: PASS with equal canonical task IDs across views.

- [ ] **Step 8: Commit**

```bash
git add apps/web content/packs/cybersecurity-analyst/pack.yaml packages/core/test/tasks.test.ts
git commit -m "feat: complete interactive workstation tools"
```

### Task 9: Reachable click navigation and recovery

**Files:**
- Modify: `apps/web/src/world/collision.ts`
- Create: `apps/web/src/world/navigation.ts`
- Modify: `apps/web/src/world/PlayerController.tsx`
- Modify: `apps/web/src/world/RoomCanvas.tsx`
- Modify: `apps/web/src/world/SpatialShell.tsx`
- Modify: `apps/web/src/world/rooms/socLayout.ts`
- Test: `apps/web/test/navigation.test.ts`
- Modify: `apps/web/test/player-motion.test.ts`
- Modify: `apps/web/test/soc-layout.test.ts`

**Interfaces:**
- Produces: `nearestStandableTarget(target, colliders, anchors): Vec2`.
- Produces: `blockedWalkDetector` that cancels after 20 blocked frames.
- Produces: `SAFE_ANCHORS` and `Return to aisle` presentation event.

- [ ] **Step 1: Write failing reachability tests**

```ts
expect(isStandable(nearestStandableTarget(insideDesk, colliders, SAFE_ANCHORS), colliders)).toBe(true);
expect(blockedWalkDetector(blockedFrames(20)).status).toBe("stuck");
expect(isStandable(SAFE_ANCHORS.aisle, colliders)).toBe(true);
```

- [ ] **Step 2: Run navigation tests and verify missing helpers**

Run: `pnpm --filter @sim/web exec vitest run test/navigation.test.ts`

- [ ] **Step 3: Clamp click targets and cancel stuck movement**

Resolve raycast point to nearest standable candidate. Track attempted versus accepted displacement. Cancel target after 20 blocked frames and emit `onWalkBlocked` once.

- [ ] **Step 4: Add recovery control**

When blocked, show route message plus `Return to aisle`. Recovery moves presentation position to nearest safe anchor, clears velocity/target, costs no energy, and emits no evidence.

- [ ] **Step 5: Run navigation and full web tests**

Run: `pnpm --filter @sim/web test`

Expected: PASS; spawn, desk, break room, and recovery anchors reachable.

- [ ] **Step 6: Commit**

```bash
git add apps/web
git commit -m "fix: make office navigation recoverable"
```

### Task 10: Accessibility parity, acceptance, and documentation

**Files:**
- Modify: `apps/web/src/components/AccessibleMode.tsx`
- Modify: `apps/web/src/components/WorkSurface.tsx`
- Modify: `apps/web/test/app.test.tsx`
- Modify: `apps/web/test/world.test.tsx`
- Create: `apps/web/test/workplace-golden-path.test.tsx`
- Modify: `packages/core/test/core.test.ts`
- Modify: `README.md`

**Interfaces:**
- Consumes: all previous tasks.
- Produces: verified complete beginner shift through visual and structured paths.

- [ ] **Step 1: Write failing parity and golden-path tests**

Assert visual and structured modes expose same canonical action, task, and workplace interaction IDs. Complete handoff, login investigation, optional scanner interruption, one break, ticket, escalation, and wrap-up. Assert energy above zero and tutorial evidence empty.

- [ ] **Step 2: Run golden-path tests and verify parity gaps**

Run: `pnpm --filter @sim/web exec vitest run test/workplace-golden-path.test.tsx test/app.test.tsx`

- [ ] **Step 3: Complete structured-mode controls**

Add artifact-open buttons, finite snack/coffee controls, Jules topic fieldset, grouped task renderers, inline mutation status, focus transitions, and equivalent labels. No 3D-only canonical interaction.

- [ ] **Step 4: Update run and test documentation**

Document `pnpm install`, `pnpm dev`, local URLs, full test command, and manual acceptance route. Remove obsolete infinite energy/collapse descriptions.

- [ ] **Step 5: Run repository verification**

Run:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Expected: all commands pass from clean install state; no prompts, reflections, hidden facts, or answer keys in logs/client payloads.

- [ ] **Step 6: Run browser acceptance**

Verify assessed shift manually: onboarding → desk login → handoff → main alert → optional interruption → break-room fridge/snack/coffee/Jules → ticket → escalation → debrief. Verify keyboard-only structured route and navigation recovery.

- [ ] **Step 7: Commit**

```bash
git add apps/web packages/core/test README.md
git commit -m "test: verify complete workplace simulation overhaul"
```

### Task 11: Final review and branch verification

**Files:**
- Review: all files changed since `d715d2c`
- Modify only when review finds a demonstrated defect.

**Interfaces:**
- Produces: review-ready commit series with clean worktree.

- [ ] **Step 1: Review spec coverage**

Map every acceptance requirement in `docs/superpowers/specs/2026-08-28-workplace-systems-overhaul-design.md` to passing test or browser observation.

- [ ] **Step 2: Inspect diff for hidden-state and race regressions**

Run: `git diff d715d2c...HEAD -- packages/schemas packages/core apps/server apps/web content`

Check no hidden values, required option IDs, or unopened artifact bodies enter `ClientView`; no mutation bypasses coordinator/server validation.

- [ ] **Step 3: Run final verification from repository root**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build && git status --short`

Expected: all commands pass and status is empty.

- [ ] **Step 4: Record final commit range**

Run: `git log --oneline d715d2c..HEAD`

Return commit hashes, acceptance evidence, and any deliberately deferred items. Do not claim complete while any required check fails.
