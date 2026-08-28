# Workplace Systems Overhaul Design

**Date:** 2026-08-28  
**Status:** Approved  
**Audience:** Direct-to-user beta, age 13+, no cybersecurity background required

## Outcome

Turn current office, break room, energy meter, and Desk OS into one coherent deterministic simulation. Player movement and workplace tools must feel interactive, while canonical backend remains sole authority over time, resources, task completion, consequences, and evidence.

This iteration fixes current defects and replaces quiz-like workstation shortcuts with beginner-friendly job interactions. Scope stays one Junior Cybersecurity Analyst shift, one speaking coworker in break room, one main suspicious-login case, and one routine interruption.

## Locked principles

- Same seed plus same interaction log produces same canonical state.
- Energy, consumables, workstation observations, and task outcomes are replayable.
- Walking speed, pointer skill, and real-world response speed never affect career evidence.
- AI does not control Jules, resources, professional procedures, or outcomes.
- Work-surface and structured modes expose same canonical interactions and outcomes.
- Beginner UI explains purpose before terminology and never assumes cybersecurity knowledge.
- No numeric career score, compatibility meter, diagnosis, or recommendation ranking.
- No broad engine rewrite, inventory system, crafting system, or additional NPC.

## Architecture

Add a small deterministic workplace-state slice to `WorldState`. Core reducer owns energy, carried snack, fridge stock, coffee state, artifact observation, and interaction log effects. Web renders state and submits bounded workplace interactions through server procedures. Movement is converted into fixed distance buckets before submission, preventing frame rate and real-time duration from changing canonical outcomes.

Desk OS continues to consume `ClientView`, but generic task rendering becomes a dispatcher for focused workplace tools. Existing pack tasks and answer requirements remain server-owned. Specialized UI translates task kinds into realistic beginner interactions without changing canonical task IDs or validation.

## Canonical workplace state

Add safe schemas and inferred types:

```ts
type EnergyState = {
  current: number;
  max: number;
};

type BreakResources = {
  carriedSnackBites: number;
  fridgeSnackBars: number;
  coffeeServings: number;
  coffeeStage: "idle" | "brewing" | "ready" | "poured";
};

type WorkplaceInteraction =
  | { type: "movement_exertion"; distanceMeters: 5 }
  | { type: "open_fridge" }
  | { type: "close_fridge" }
  | { type: "take_snack" }
  | { type: "eat_snack_bite" }
  | { type: "start_coffee" }
  | { type: "finish_coffee" }
  | { type: "pour_coffee" }
  | { type: "drink_coffee" }
  | { type: "talk_to_jules"; topic: JulesTopic }
  | { type: "open_artifact"; artifactId: string };
```

Initial assessed and tutorial state:

- Energy: 100/100.
- Carried snack: none.
- Fridge: two snack bars.
- Each bar: three bites.
- Coffee: two servings.
- Coffee stage: idle.
- Fridge door: closed presentation state derived from last interaction.

Tutorial interactions mutate tutorial state but emit no evidence.

## Energy behavior

Energy no longer drains from wall-clock animation frames.

- Every completed work action applies pack-defined effort cost. Default costs remain small enough for full golden path with one optional break.
- Every validated five-meter movement bucket costs one energy point.
- Standing still, reading, pausing, reduced motion, and slower navigation cost nothing.
- Failed task attempts cost no energy or simulated time.
- Energy never changes evidence interpretation directly.
- Energy at zero blocks new effort-bearing actions and movement-exertion submissions, but never destroys progress. UI directs player to available break resources.
- No automatic collapse/refill loop. Player recovers only through finite snack or coffee interactions.
- Snack bite and coffee drink restore bounded values without exceeding maximum.
- Energy changes appear in replay log and restored sessions.

Movement distance is measured locally from accepted player positions, accumulated, and submitted only in exact five-meter buckets. Server accepts only the fixed bucket value, rate-limits consecutive submissions, and logs each accepted interaction. Unsubmitted remainder is presentation-only and resets when leaving room.

## Break-room loop

Remove main-aisle snack hotspot. Break-room snack basket remains visual support, while fridge becomes source of finite bars.

Fridge flow:

1. Player approaches fridge and opens door.
2. Open interior shows remaining bars.
3. Player may take one bar only when carrying none and stock remains.
4. Door can close manually and closes when leaving room.
5. Carried bar can be eaten one bite at a time from break-room HUD or office HUD.
6. After three bites, bar is gone. Getting another requires returning to fridge.

Coffee flow:

1. `Start coffee` moves idle to brewing.
2. Deterministic completion interaction moves brewing to ready; no real-time wait controls outcome.
3. `Pour coffee` consumes one serving and moves ready to poured.
4. `Drink coffee` restores energy and returns to ready while servings remain, otherwise idle.
5. Visual steam and hotplate state follow canonical coffee stage.

Every unavailable interaction returns clear reason: hands full, fridge empty, coffee brewing, no cup poured, or energy already full.

## Jules purpose and dialogue

Jules becomes deterministic coworker, not outcome authority. Dialogue topics:

- `first_day`: explains realistic rhythm of monitoring, interruptions, notes, and asking for help.
- `current_work`: gives stage-aware reminder based only on public observed facts and current available action.
- `break_room`: explains why analysts take short breaks and return with a written next step.
- `team_context`: shares role perspective and points player back to Morgan for decisions.

Dialogue UI presents two or three short topic choices. Jules remembers topics already discussed within session and changes follow-up wording. She never reveals restricted facts, answer keys, correct final decision, hidden assessment state, or unsupported career claims. Dialogue does not advance simulated time or emit evidence.

## Desk OS reliability

Add one request coordinator at App/OS boundary:

- Only one canonical mutation may be pending at a time.
- Action, task, notification, note, and artifact controls show pending state and disable duplicate submission.
- Responses apply in request sequence; stale responses cannot replace newer `ClientView`.
- Errors render inside Desk OS near failed control and remain visible in fullscreen.
- Successful utility saves show persistent confirmation.
- Global error clears after next successful mutation.

Correct current state defects:

- Deadline label uses `max(0, deadlineAt - simClock)`.
- “Open” counts include active/escalated work only.
- Resolved/expired cases move to collapsed history, not active rail.
- Notes draft resets when event or canonical value changes, without overwriting active typing.
- Notification controls have pending state and focus linked event after updated view renders.
- Task success feedback remains visible while next step loads and final completion receives explicit confirmation.
- Selected event and artifact state are scoped per system/event.
- All task-bearing actions render their task interaction; none fall through as ordinary action buttons.

## Desk OS information architecture

Keep top application tabs, but use one stable viewport:

- Compact status strip: shift time, energy, current objective, mutation status.
- Collapsible active-case rail beneath status strip.
- Left queue scrolls independently only when needed.
- Main workspace owns primary vertical scroll.
- Notifications overlay workspace header instead of pushing entire application downward.
- One `Expand workstation` control replaces overlapping maximize/fill-screen language. Native fullscreen remains optional under same control.
- Keyboard focus moves to selected app heading, opened artifact, task feedback, or inline error.

## Specialized workplace tools

### Email

- Queue shows sender, subject, timestamp, and unread/read state.
- Message body stays hidden until player opens message.
- Opening message submits `open_artifact`, records observation, then exposes body.
- Handoff task asks player to highlight relevant sentence fragments from opened message instead of choosing detached answer cards.
- Team reply task uses short message choices in chat composer presentation.

### Alerts

- Alert dashboard presents timeline, device, network, location-confidence, and account fields in inspectable rows.
- Player marks relevant rows directly.
- Comparison tasks place known baseline and flagged session side by side.
- Selected rows map to existing safe option IDs; backend task validation stays unchanged.

### Guides and inventory

- Search box always remains available.
- Player enters beginner-friendly query, receives matching approved documents, and opens one.
- Device inventory task uses exact device lookup and record matching.
- Task source content is not duplicated above answer controls.
- No answer key or restricted fact enters query results.

### Tickets

- Persistent notes editor saves explicit drafts with status feedback.
- Summary task becomes three-section composer: verified evidence, uncertainty, next step.
- Selected chips map to existing task option IDs.
- Final canonical ticket preview shows generated summary before escalation decision.

### Team chat

- Morgan conversation appears as message thread.
- Asking for context opens manager guidance within OS instead of replacing entire simulation surface.
- Guidance may point to next system but cannot choose outcome.
- Complete-shift control appears only after work completion.

### Meetings

- Keep as low-scope contextual tool.
- Remove dead “locked” promises and show only current shift events relevant to experience.
- Calendar remains non-assessed and does not gate progress.

## Artifact observation

Artifact content is serialized only when either:

- artifact is already observed; or
- artifact appears as safe preview metadata required to identify what to open.

Add public preview fields where needed. Full body, detailed metadata, and related content stay unavailable until canonical observation. Opening an artifact validates that it belongs to a visible active event or approved knowledge-base set.

Structured mode uses same `open_artifact` interaction and does not expose unopened body content.

## Navigation reliability

Double-click navigation must target reachable floor positions:

- Raycast target clamps to room bounds and nearest standable point.
- Straight-line movement cancels after repeated blocked frames.
- Collision sliding cannot keep unreachable target active forever.
- HUD reports blocked route and offers `Return to aisle` recovery.
- Recovery moves player to nearest predefined safe anchor without energy cost or evidence.
- Sitting hotspot remains reachable from spawn and every recovery anchor.
- Floor-map exit remains available.

No full navigation mesh or third-party pathfinding dependency in this iteration.

## Content and tone

- Instructions describe workplace purpose before technical term.
- Each tool screen has one primary objective and no more than one paragraph of initial guidance.
- Authentic records remain detailed, but expandable.
- Wrong attempts explain what to compare, never shame player.
- Jules and Morgan use distinct roles: Jules provides peer context; Morgan provides procedural guidance.
- Earlier opened artifacts and selected evidence visibly appear in later ticket and decision steps.
- Player sees consequence of documented escalation or unsupported dismissal.

## Error and fallback behavior

- Server rejection leaves current view untouched and restores enabled controls.
- Network failure produces inline retry action; no optimistic canonical state.
- Resource depletion never creates unwinnable shift. If all energy resources are exhausted, one-time energy-free manager help restores minimum working energy and records limitation telemetry, not evidence. It cannot be repeated or used as an infinite refill.
- Invalid pack resource values fail startup validation.
- Missing specialized renderer falls back to accessible structured task renderer with same task IDs.
- Provider outage does not affect this iteration because Jules and workstation guidance remain deterministic.

## Testing

Required tests:

- Energy changes only from canonical work, movement buckets, and consumables.
- Idle time and failed task attempts do not drain energy.
- Same interaction log replays identical energy/resource/artifact state.
- Snack stock, carried bar, and bite count cannot become negative or refill themselves.
- Coffee state transitions reject invalid order and stop when servings reach zero.
- Jules responses use public stage context and never answer task.
- Unopened artifact body is absent from `ClientView`.
- Opening permitted artifact records observation; opening unrelated artifact rejects.
- Work and structured views expose equal task/action/interaction IDs.
- Deadlines and open counts use current state correctly.
- Duplicate clicks create one mutation.
- Stale responses cannot regress view.
- Notes draft follows event changes and preserves active edits.
- Every task-bearing action has specialized or structured renderer.
- Notification focus occurs after event render.
- Reachable clicks produce reachable targets; blocked navigation cancels and recovery succeeds.
- Complete golden path includes one optional break and finishes with energy above zero.

CI continues lint, typecheck, unit, integration, replay, and accessibility checks. Browser playthrough verifies login, all workstation apps, interruption, break room, recovery, and shift completion.

## Acceptance

- Player can complete full 10–15 minute shift without encountering generic action-card loop.
- Investigation requires opening records, comparing visible fields, searching approved material, composing ticket, and communicating.
- No unread artifact body appears automatically.
- Energy never drains while idle and remains deterministic across replay.
- Player must return to break room after consuming three carried bites.
- Fridge, finite snacks, coffee sequence, and Jules dialogue all have visible purpose.
- Desk OS shows reliable loading, success, error, countdown, and case state.
- Double-click navigation cannot leave player walking forever into dark or blocked geometry.
- Keyboard and structured mode complete same canonical shift.
- Existing privacy, hidden-state, safety, evidence, and debrief invariants remain green.
