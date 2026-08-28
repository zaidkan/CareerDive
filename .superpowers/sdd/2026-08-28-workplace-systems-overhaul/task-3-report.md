# Task 3 Report: Server and Web Workplace Mutation API

## Outcome

Implemented Task 3 only. The authenticated `simulation.performWorkplaceInteraction` mutation now validates the public workplace schemas, derives ownership exclusively from authenticated context, applies the canonical reducer, appends one replayable action-log entry, saves one result, and returns the updated client view, sequence, and feedback. The web client and shared handler contract expose the same public interaction/result types for later workplace controls.

Implementation commit: `97dbac0db4496c4da9cac9448d008663199de0ed` (`feat: expose workplace interaction API`)

## RED-GREEN-REFACTOR record

### RED

The brief's filtered package-local command was run first:

```text
pnpm --filter @sim/server exec vitest run test/router.test.ts -t workplace
```

It exited 1 with `No test files found` because this repository's Vitest include globs are root-relative.

The equivalent root-relative command was then run:

```text
pnpm exec vitest run apps/server/test/router.test.ts -t workplace
```

It exited 1 with six new test failures. The decisive failure was `No procedure found on path "simulation,performWorkplaceInteraction"`. The filter also selected one existing workplace-named evidence test, which passed.

### GREEN

After the minimal router/client/shared-contract implementation:

```text
pnpm exec vitest run apps/server/test/router.test.ts -t workplace
```

Passed 7/7 selected tests, covering one canonical log/save result, owner isolation, invalid and unauthorized transition rejection with no save/log, no workplace evidence for assessed or tutorial sessions, movement limiting, and invalid movement not consuming limiter capacity.

### REFACTOR and final verification

- `pnpm exec vitest run apps/server/test` — 23/23 server tests passed.
- `pnpm --filter @sim/server test` — attempted as specified; exited 1 with `No test files found` because of the same root-relative Vitest include-path issue. The root-relative server command above is its recorded equivalent.
- `pnpm --filter @sim/server typecheck` — passed.
- `pnpm --filter @sim/web typecheck` — passed.
- `pnpm --filter @sim/server lint` and `pnpm --filter @sim/web lint` — passed.
- `pnpm exec vitest run` — 208/208 tests passed across 27 files.
- Prettier check for every touched source and test file — passed.
- `git diff --check` — passed.

## Files

- `apps/server/src/trpc/router.ts` — adds the authenticated Zod-validated workplace mutation and a router-factory-scoped in-memory movement limiter.
- `apps/server/test/router.test.ts` — adds focused mutation, isolation, no-evidence, invalid-transition, unauthorized-artifact, and limiter coverage.
- `apps/web/src/client.ts` — adds `SimulationClient.performWorkplaceInteraction` and validates the exact public input/output contract.
- `apps/web/src/components/shared.tsx` — adds the shared workplace interaction handler/result contract for future surfaces.
- `apps/web/test/app.test.tsx` — supplies the new required client method in existing application fixtures.

## Self-review

- The mutation input contains only `sessionId` and `WorkplaceInteraction`; it never accepts an owner ID and calls the repository with `ctx.userId`.
- The canonical reducer runs before rate-limit capacity is recorded, so invalid movement cannot use a limiter slot. Rate-limited movement is rejected before session state, action log, or persistence changes.
- Each accepted interaction writes exactly one `workplace_interaction` log entry and one repository save. The procedure does not generate evidence for any workplace interaction, including Jules dialogue and tutorial sessions.
- The limiter is an in-memory map closed over each `createAppRouter` invocation, so it cannot appear in world state, logs, snapshots, replay, evidence, or client view and cannot leak between independently created test apps.
- The client parses both input and result with exported workplace schemas/types; the shared handler returns the canonical `{ view, sequence, feedback }` result rather than applying a presentation-only update.
- No break-room controls, Task 4 UI behavior, SDD ledger edits, external coordination, or subagent/reviewer work was added.

## Concerns

- Package-local Vitest commands inherit root-relative include globs and report no tests. Root-relative equivalents were used and recorded above.
- The full web suite prints pre-existing `THREE.WARNING: Multiple instances of Three.js being imported` warnings in spatial UI tests, but all affected tests pass.
