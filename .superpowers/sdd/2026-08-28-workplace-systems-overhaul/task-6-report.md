# Task 6 Report: Mutation Coordination and Desk OS Reliability

## Outcome

Implemented Task 6 only. All canonical action, task, notification, note/utility, and workplace mutations now pass through one App-boundary coordinator. The coordinator deduplicates rapid activation, blocks concurrent canonical changes, guards canonical view replacement with a monotonic sequence, owns pending/error/success state, and safely retries the exact failed operation.

Desk OS now derives relative deadlines and active work correctly, separates closed history, preserves scoped drafts/selections and task feedback, waits for canonical notification state before focusing linked work, and uses a stable responsive viewport with one `Expand workstation` control.

Base: `62ee131aea65aeec1700780c41e4a40fd57d686c`

Implementation commit: `0f3bf42e1296f97fb8c2317e1d43948fea3ef8a0` (`fix: stabilize desk operating system`)

## RED-GREEN-REFACTOR record

### RED

Focused Desk OS race/state tests were written before production edits. The brief's package-local command resolved correctly, so no root-relative fallback was needed:

```text
pnpm --filter @sim/web exec vitest run test/desk-os.test.tsx
```

After correcting only test-harness selectors, the decisive RED run exited 1 with 11/11 failures. It proved that a rapid duplicate called `performAction` twice, an older tutorial response could replace a newer assessed-session view, and the remaining required mutation state, retry, deadline/history, notes, notification focus, task feedback, selection, task-routing, and workstation-label behavior was absent.

Self-review added two narrower regressions before their production refactors:

- Dashboard navigation from the post-login home state failed to move focus to the opened app heading.
- A task-bearing utility-class action failed to render its task interaction.

Each focused test failed alone before the corresponding shared navigation and task-routing fix.

### GREEN

The exact focused command now passes 12/12 tests in `apps/web/test/desk-os.test.tsx`.

The coordinator applies a returned `ClientView` only for the current sequence, stores one in-flight promise per mutation key, rejects a different concurrent mutation, preserves an exact failed-operation closure for one safe retry, and invalidates old requests when starting the assessed session. Every successful mutation clears the coordinator error; utility and task success remains visible in the Desk OS status strip.

### REFACTOR

- Centralized deadline and active/closed-case derivation in `workstation.ts` and removed the obsolete visible-event selector.
- Routed every task-bearing action by `taskId`, including utility-class actions, while leaving non-task note/search utilities in their dedicated controls.
- Reused one app-opening path for tabs, Dashboard tiles, Calendar, and active-case resume so semantic focus is consistent.
- Kept Task 4's queued fridge-close logic as an ordering adapter around the single App authority; no second canonical coordinator or nested lock was added.
- Removed dead maximize/fill-screen control styling while preserving the optional native fullscreen implementation and keyboard behavior.

## Verification

- Exact focused Desk OS command — PASS; 12/12 tests in 1 file.
- Focused Desk OS + Task 4 break-room + Task 5 Jules + world preservation run — PASS; 37/37 tests across 4 files.
- `pnpm --filter @sim/web test` — PASS; 140/140 web tests across 15 files.
- `pnpm test` — PASS; 238/238 repository tests across 29 files.
- `pnpm typecheck` — PASS; 10/10 package tasks.
- `pnpm lint` — PASS; 10/10 package tasks.
- Prettier check for all 19 touched web source/test files — PASS.
- `git diff --check` and staged diff check — PASS.
- Scope audit — PASS; no ledger, schema, core, server, pack, Task 7 tool, or Task 8 tool-suite file changed.

## Files

- `apps/web/src/useMutationCoordinator.ts` — adds mutation keys, single-pending deduplication, monotonic application sequence, retry capture, invalidation, and shared mutation state.
- `apps/web/src/components/MutationStatus.tsx` — renders focusable in-OS pending, inline error/retry, persistent success, and ready state.
- `apps/web/src/index.tsx` — routes action, task, notification, note/utility, and workplace calls through the coordinator and applies no mutation response directly.
- `apps/web/src/components/shared.tsx` — threads mutation state and retry through shared surface props.
- `apps/web/src/components/NotificationBanner.tsx` — disables notification choices during canonical work and labels the pending response.
- `apps/web/src/components/CaseRail.tsx` — renders collapsible active/escalated work and collapsed resolved/expired history.
- `apps/web/src/components/artifacts.tsx` — scopes artifact focus and note drafts by system event/action without overwriting dirty typing.
- `apps/web/src/components/WorkTaskPanel.tsx` — keys feedback by task and completed step, preserves accepted feedback across transitions, and joins the global pending gate.
- `apps/web/src/components/SystemToolPanel.tsx` — scopes artifact selection and guarantees every task-bearing action renders a task interaction.
- `apps/web/src/components/WorkSurface.tsx` and `apps/web/src/components/AccessibleMode.tsx` — consume the same active/deadline selectors and coordinator pending state for parity.
- `apps/web/src/workstation.ts` — adds `remainingMinutes`, active/escalated selectors, closed history, and corrected system counts.
- `apps/web/src/world/deskOs/DeskOs.tsx` — adds the compact status strip, canonical notification focus handoff, shared app-opening focus path, and one expansion control.
- `apps/web/src/world/deskOs/SystemApp.tsx` — scopes selected events per system, moves focus to selected headings, uses relative deadlines, and supports bounded queue/detail scrolling.
- `apps/web/src/world/deskOs/LaptopOverlay.tsx` — threads mutation state while preserving native workstation fullscreen.
- `apps/web/src/world/SpatialShell.tsx` — joins Desk OS and Task 4/5 controls to the global pending gate without replacing the queued-close adapter.
- `apps/web/src/styles.css` — adds scoped status/error/history/viewport styles and responsive bounded scrolling without new motion.
- `apps/web/test/desk-os.test.tsx` — covers duplicate/stale races, failure/retry, utility confirmation, state derivation, drafts, focus, task feedback/routing, scoped selection, and expansion wording.
- `apps/web/test/world.test.tsx` — preserves spatial flow while asserting one visible `Expand workstation` control.

`DashboardHome.tsx` required no direct edit: it already consumes `systemOpenCounts`, whose corrected active/escalated implementation updates its tiles, and its existing `onOpenTab` interface now receives the shared focus-aware opener from `DeskOs`.

## Self-review

- Only `useMutationCoordinator` calls the canonical `setView` path for covered mutations. Session creation remains a separate lifecycle operation, and starting an assessed session invalidates every older mutation sequence first.
- Rapid same-key activation shares one promise and produces one client call. Different controls are disabled while pending, with coordinator rejection as defense in depth.
- A rejected request never applies its returned/local candidate state. Retry clears the stored failure before starting and cannot double-submit while pending.
- Notes retain dirty text across canonical rerenders and event switches, but clean drafts refresh when canonical values change or catch up to a save.
- Active counts include only `active` and `escalated`; pending work remains hidden, and resolved/expired work has no active action button.
- Notification focus waits until the returned canonical notification is no longer unread. App tabs, Dashboard tiles, Calendar, case resume, artifact selection, task feedback, and inline errors all have semantic focus targets.
- Task success is keyed to the submitted task ID and step index, survives the next-step transition, and final completion remains explicit after the task panel unmounts.
- Task 4 finite resources, queued fridge close, and Task 5 Jules dismissal/reply behavior retain their local ordering semantics while all canonical workplace calls use the App coordinator.
- CSS remains under existing Desk OS/workplace classes, is responsive, and adds no animation; existing reduced-motion behavior is unchanged.
- No Task 7 artifact body-opening/specialized Email/Alert behavior or Task 8 tool suite was implemented. Hidden-state isolation, deterministic backend authority, tutorial/evidence behavior, finite resources, and Jules safety were not broadened or bypassed.
- The SDD ledger was not edited, and no subagent or reviewer was used.

## Concerns

- Full web/repository tests continue to emit the pre-existing `THREE.WARNING: Multiple instances of Three.js being imported` warning from spatial test files; all affected tests pass.
- No Task 6 implementation concern remains after the focused self-review regressions and full verification.
