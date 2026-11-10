# Cold-load test stability

Base: `714afec` (`worker/blind-audit-remediation-final`). Branch: `fix/test-flake-final`.

## Diagnosis

Six cold full runs before the change passed: three at normal load, two with six CPU-pressure workers, and one with eight. Normal runs took 61–62 seconds; pressured runs took 94–108 seconds. The reported spontaneous flake was not reproduced in these runs, so an exact match to the owner's previous failure cannot be claimed. [Baseline records](../qa/test-flake-final/baseline-runs.json) retain every result.

There is nevertheless a reproducible cold-import timing defect in three named suites. Vitest's 15-second test timeout does not extend Testing Library's default 1-second `findBy*`/`waitFor` timeout. `SpatialShell` loads `RoomCanvas` through an actual `React.lazy` import and Suspense boundary, even when that module is mocked. The tests allowed six seconds for this boundary in some suites, but only one second in others. A valid delayed mount could therefore fail its inner assertion before the enclosing test's budget expired.

For a controlled reproduction, the existing `RoomCanvas` mock factories in the three files temporarily became asynchronous and waited 1,200 ms before returning their original mock exports. No product code or assertions changed. Those temporary mock edits were restored after each probe. The pre-fix run produced exactly these failures:

| File | Test | Failure while import was still pending |
| --- | --- | --- |
| `break-room.test.tsx` | `hides energy UI without starting a wall-clock drain` | `Unable to find role="button" and name "Approach fridge"` |
| `sim-runtime-performance.test.tsx` | `defers scene creation until entry, then retains it while pausing on map return` | `Unable to find an element by: [data-testid="scene"]` |
| `arrival-room-entry.test.tsx` | `mounts the room under the film, waits for a ready frame, and retains the same fullscreen target throughout` | `expected undefined to be defined` (`reportReady`) |

The other 14 tests passed. Repeating the same slow-import probe after the fix passed all 17 tests. [Before failure excerpts](../qa/test-flake-final/slow-import-before.log), [after trace](../qa/test-flake-final/slow-import-after.log), and compact JSON summaries are retained alongside them. This establishes the inner-timeout mechanism; it does not establish that every historical intermittent failure had this cause.

The reproduction can be repeated by temporarily wrapping each existing `vi.mock("../src/world/RoomCanvas.js", ...)` factory as follows, preserving its original returned exports:

```ts
vi.mock("../src/world/RoomCanvas.js", async () => {
  await new Promise((resolve) => setTimeout(resolve, 1200));
  return { /* original mock exports, unchanged */ };
});
```

Then run `pnpm test apps/web/test/break-room.test.tsx apps/web/test/sim-runtime-performance.test.tsx apps/web/test/arrival-room-entry.test.tsx` and restore the temporary factory wrappers. These artificial delays are not part of the committed tests.

## Fix

Only startup waits in those three test files now use the already-established six-second spatial cold-start budget: initial room controls/readiness, the lazy StartPage floor map, and the first lazy workstation tool. They still wait for the real DOM/readiness signal. Existing assertions about fullscreen ordering, scene retention, render counts, mute controls, canonical interactions, and absence of replay remain intact. Subsequent scene transitions, fullscreen exit, film completion, and mutation waits retain their shorter deadlines.

`vitest.config.ts` is unchanged: two workers, normal fork/file isolation, 15-second enclosing timeout, no retries, and the original include/exclude patterns. There are no product changes, added skips, removed tests, or changes to RED-test exclusion. The fix does not add fixed sleeps or a new scheduling abstraction.

## Verification

`pnpm lint`, `pnpm typecheck`, and `pnpm build` passed. Five consecutive final cold full runs passed with six CPU-pressure workers on this host exposing eight CPUs to Node and the unchanged two-worker test config.

Cold here means a new Vitest process with this worktree's `node_modules/.vite` and `node_modules/.vite-temp` removed before each invocation. Operating-system disk caches were not flushed. Each run invokes `pnpm test` with the default reporter plus a JSON reporter for evidence; worker counts, timeouts, test selection, and retry settings are not overridden. CPU pressure uses independent local worker threads repeatedly running synchronous PBKDF2, is bounded to three minutes per invocation, and is stopped when the test process exits.

| Final run | Result | Passed | Existing skips | Wall time |
| --- | --- | --- | --- | --- |
| 1 | PASS | 1,074 | 13 | 105.58 s |
| 2 | PASS | 1,074 | 13 | 100.47 s |
| 3 | PASS | 1,074 | 13 | 96.18 s |
| 4 | PASS | 1,074 | 13 | 90.93 s |
| 5 | PASS | 1,074 | 13 | 95.50 s |

The baseline has 1,074 passing tests and 13 existing skips across 159 files. Database-gated integration tests were not enabled because no test database URLs were configured. All five final JSON reports match the baseline exactly on all 1,087 test identifiers and statuses, including the same 13 skipped identifiers and the same 159 files. See [final records](../qa/test-flake-final/final-runs.json) for start times, results, environment versions, and the common inventory hash.
