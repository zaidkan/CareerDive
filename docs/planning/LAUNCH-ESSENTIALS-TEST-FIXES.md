# Launch essentials test fixes

Branch/worktree: `feat/launch-essentials` (continued in the original worktree)  
Parent: `05081e8`  
Commit: `50cea07097f44ea0b3b2e440508291ebd4bb1b61`  
Status: clean, committed, unmerged. No product source or deployment changes.

## Classification and root cause

Both reported failures reproduce under the host's Node `25.9.0`: assessed entry cannot find Security Operations, and the career request remains disabled. They are stale/incomplete **test fixtures**, not production flow or hydration regressions.

In this jsdom/Vitest environment, Node's experimental `localStorage` placeholder is an ordinary object with **no `getItem` or `setItem` methods**. The anonymous identity code correctly rejects it with `Persistent identity storage unavailable` before calling fetch. The assessed test consequently reaches the connection error screen rather than the floor map; the career test catches the failed hydration and correctly leaves `loaded` false. Neither issue is fixed by changing selectors or increasing waits.

Pass A was verified under Node 24; it lacked a browser storage fixture for these two integration tests. The correction supplies independent, browser-shaped `Storage` objects per test and restores environment/global overrides in teardown. The real auth and fetch paths are still exercised; no identity checks or persistence requirements were weakened.

## Assessed entry coverage

`apps/web/test/assessed-entry.test.tsx` now explicitly verifies this sequence:

1. Direct Start entry shows the 13+ acknowledgment, with zero session requests, no SOC control, and no film.
2. Clicking Start creates exactly one assessed session and presents the floor map and enabled Security Operations selection, with no film or accessible live-room controls yet.
3. Selecting SOC opens the arrival dialog containing `video[src="/arrival-film.mp4"]`; live-room controls remain inaccessible during the film.
4. Ending the film removes the dialog and exposes the playable simulation.
5. Movement sends its canonical workplace interaction through the real HttpSimulationClient. Sitting at the desk, Desk OS login, opening Email, selecting/confirming the assignment, and sending a simulation action retain the original class-client checks.
6. Session creation remains exactly once throughout, and every recorded mutation uses the same persisted anonymous development UUID.

The flow already contained the consent click in Pass A; this update makes all intermediate state boundaries explicit and fixes the missing durable storage fixture. Room, film, arrival logic, scoring, reducers, and determinism were not edited.

## Career hydration and persistence coverage

`apps/web/test/careers.test.tsx` keeps `disabled={pending || !loaded}` and all product code unchanged. Its integration test now verifies that hydration really posts to `/api/career-requests/state` using the persisted owner UUID, enables the initially disabled button, and restores the server's requested state. Clicking undo posts the exact desired `requested: false` state to `/api/career-requests` with the same owner, receives server confirmation, and removes the requested state without an alert. Unmount/remount fetches the saved server state again, with the same owner and exactly three API calls in total.

Responses are fresh one-shot fixtures, and fetch/environment cleanup runs even if an assertion fails. `apps/web/test/helpers/browserStorage.ts` is the only new file; it implements the full typed Storage surface used by these tests.

## Verification

Final full verification used the machine's **default Node 25.9.0**, where both original failures reproduced. pnpm `11.5.3`.

- `pnpm lint`: passed, 10 tasks.
- `pnpm typecheck`: passed, 10 tasks.
- Full `pnpm test`, run 1: **1,076 passed, zero failures, 13 existing skips**; 158 passed / 4 skipped files, 162 total; 59.97 seconds.
- Full `pnpm test`, run 2: **1,076 passed, zero failures, 13 existing skips**; same file counts; 60.35 seconds.
- `pnpm build`: passed, 9 tasks; existing large-chunk advisory unchanged.
- Targeted suites also pass on documented/CI Node `24.21.0`: **25 tests passed, zero failures**.
- `git diff --check`: clean for this correction.

No retries, timeout increases, skipped tests, assertion weakening, test configuration edits, or product behavior changes. Test inventory and existing skip counts are unchanged. Pass A's AI removal, analytics-off configuration, anonymous owner isolation, consent, legal pages, and repository cleanup remain intact.

Evidence: `docs/qa/launch-essentials/followup-*.log`. The baseline and auth diagnostic logs show the reproduced failures and missing Storage methods; final logs show the corrected checks.
