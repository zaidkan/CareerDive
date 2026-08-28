# Task 2 Report: Deterministic Energy, Resources, and Replay

## Outcome

Implemented Task 2 only. The deterministic core now owns workplace energy, finite snacks and coffee, emergency recovery, artifact authorization/observation, action energy costs, client-safe workplace serialization, and replay of workplace interactions.

Implementation commit: `ef26db2d20a1322123f00bc66a56e6c1e058bf51` (`feat: add replayable workplace resources`)

## RED-GREEN-REFACTOR record

### RED

The brief's filtered command was run first:

```text
pnpm --filter @sim/core exec vitest run test/workplace.test.ts
```

It exited 1 with `No test files found` because the package run inherited the repository-level Vitest include paths.

The equivalent root-relative command was then run:

```text
pnpm exec vitest run packages/core/test/workplace.test.ts
```

It exited 1 with 9 failed and 1 passed test. Decisive failures included `applyWorkplaceInteraction is not a function`, `canOpenArtifact is not a function`, unaffordable work not throwing, workplace replay being unavailable, and the pending `scanner-alert` leaking into the client artifact list. The one already-green invariant was that failed task attempts cost no energy or simulated time.

### GREEN

After the minimal core/content implementation:

```text
pnpm exec vitest run packages/core/test/workplace.test.ts packages/core/test/core.test.ts
```

Passed 25/25 tests across 2 files.

The brief's package test scripts were also attempted:

```text
pnpm --filter @sim/core test
pnpm --filter @sim/career-packs test
```

Both exited 1 with `No test files found` for the same inherited include-path issue. Their root-relative equivalent passed:

```text
pnpm exec vitest run packages/core/test packages/career-packs/test
```

Passed 53/53 tests across 5 files.

### REFACTOR and final verification

- `pnpm exec vitest run packages/core/test/workplace.test.ts packages/core/test/core.test.ts` — 25/25 passed.
- `pnpm test` — 202/202 tests passed across 27 files.
- `pnpm typecheck` — 10/10 package tasks passed.
- `pnpm lint` — 10/10 package tasks passed.
- Prettier check for every changed implementation/content/test file — passed.
- `git diff --check` — passed.

## Files

- `packages/core/src/workplace.ts` — added the deterministic interaction reducer, transition errors, finite resource state machines, emergency recovery, and artifact authorization/observation.
- `packages/core/src/reducer.ts` — made action energy affordability and accepted action cost atomic with simulated time.
- `packages/core/src/replay.ts` — folds logged workplace interactions through the same reducer.
- `packages/core/src/serializer.ts` — exposes an isolated workplace copy, hides pending-event artifacts, and redacts unopened artifact details.
- `packages/core/src/index.ts` — exports the Task 2 public core interfaces.
- `content/packs/cybersecurity-analyst/pack.yaml` — adds explicit 0–5 energy costs to every current action.
- `packages/core/test/workplace.test.ts` — adds focused energy, resource, error immutability, authorization/privacy, and replay coverage.
- `packages/core/test/core.test.ts` — verifies pack-derived workplace initialization and client-copy isolation.

`packages/core/src/world.ts` required no Task 2 edit because the Task 1 base already initializes the complete workplace slice from validated `workplaceDefaults`.

## Self-review

- Energy changes only through accepted effort-bearing actions, accepted five-meter movement buckets, finite consumables, and the one-time emergency recovery; no wall-clock mechanism was added.
- Failed task attempts retain their existing zero-energy, zero-time behavior.
- Insufficient-energy actions reject before cloning/mutation; accepted energy and time changes occur in the same cloned turn.
- Snack stock is two bars from pack defaults, each take creates exactly three carried bites, and stock/bites cannot underflow or refill.
- Coffee follows `idle -> brewing -> ready -> poured`, consumes exactly one serving on pour, returns to `ready` while a serving remains, and returns to `idle` after the second drink.
- Emergency recovery requires zero energy and no carried bites, fridge bars, coffee servings, or staged coffee; the used flag prevents a later refill after energy returns to zero.
- Invalid workplace transitions throw `WorkplaceInteractionError` and never mutate the supplied state.
- Artifact authorization uses only public artifact/event state: non-KB artifacts require a non-pending event, KB documents are approved pack documents, unauthorized IDs reject, and unopened/pending details are absent from `ClientView`.
- Workplace log replay uses the canonical reducer and preserves energy, resources, Jules topic memory, and artifact observations for the same seed and ordered log.
- Existing repository tests covering hidden state, debrief, privacy, accessibility, safety, evidence, task validation, and web/server behavior remain green.
- No Task 3 API, server mutation procedure, frontend workplace behavior, AI authority, subagent/reviewer work, or SDD ledger edit was added.

## Concerns

- Package-local Vitest commands currently inherit root-relative include globs and therefore report no tests. Root-relative equivalents were used and are recorded above.
- The full web suite still prints its pre-existing `THREE.WARNING: Multiple instances of Three.js being imported` warning, but all affected tests pass.
- Task 2 provides replay support for logged workplace entries; persistence/appending through the server remains intentionally deferred to Task 3.
