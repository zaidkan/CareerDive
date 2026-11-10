# CareerDive: pending session recovery handoff

## Completion update — October 28, 2026

The user resumed work, tested the local preview successfully, and requested that the fix be pushed. The recovery fix is now committed as `17f252a2cfec6d8645f928a3d64c9471cb5747c0` and merged through PR #5 (https://github.com/zaidkan/CareerDive/pull/5). Release commit on `main`: `44d6e9ac906367a075cb931b6ce62f1320be7db3`.

Full Vitest completed: **1,096 passed, 15 skipped**. Final PR CI passed lint, type checking, tests, and build. The two changed browser regressions had already passed. No manual Render deployment was performed. The user must rebuild/deploy the web service to publish this release. Local development services were left running for the user's preview.

This document remains a local, untracked handoff file. The pause and unfinished-work sections below describe the historical October 24 state and are superseded by this completion update.

Paused at the user's explicit request on October 24, 2026. Do not resume implementation, tests, commits, merges, or deployment until the user asks to resume.

## Current state

- Workspace: `/Users/zaid/orca/workspaces/Career-Expo/chore-repo-presentation`.
- Branch: `fix/recover-pending-session`, based on `origin/main` at `895591cc8006670c0f92f926ed4855f2bb9b5b2e`.
- Repository: https://github.com/zaidkan/CareerDive (the existing origin URL uses Career-Expo and redirects).
- Current fix is **uncommitted**. No PR exists for this fix. No Render deployment or dashboard change was performed.
- The full Vitest run was stopped when the user requested the pause. Other checks had already finished. Local ports 5173 and 3001 were free when checked during shutdown.
- User prefers terse conversational prose through the caveman skill. Keep code, commands, commits, and PR descriptions normally written. Ponytail skill is active for minimal implementation. Do not spawn agents without explicit authorization.

## Previous completed work

PR #3 fixed the README/demo presentation and original CI legal-content assertion. PR #4 added a 90-second API-readiness waiting budget and fixed the arrival film being suppressed after refresh. PR #4 was merged as `895591cc8006670c0f92f926ed4855f2bb9b5b2e` after CI passed. Its verification was 1,092 tests passed, 15 skipped, and all 13 runnable browser checks passed across a full run and targeted reruns.

User redeployed, then reported failure again while trying to show a friend. Screenshot showed `/start` with:

> We couldn't confirm whether your shift started. To avoid starting it twice, we've paused here. Report the problem for help.

## Findings verified this turn

1. Live web and API readiness both returned HTTP 200 quickly (about 0.35s and 0.52s).
2. A fresh headless browser successfully performed anonymous sign-in and `session.create`, both HTTP 200, and reached **Head to Security Operations**. This establishes that a fresh start worked during inspection; it does not establish why the user's original request failed.
3. Served JavaScript contains the 90-second startup fix and diagnostic build label `895591cc8006670c0f92f926ed4855f2bb9b5b2e`. No Render dashboard/history was inspected; a diagnostic label is not independent proof of Render's selected commit.
4. Reproduced the exact screenshot on the live site in a separate test browser: let `session.create` commit on the server, then discard its response with Playwright `route.abort`. The client saved `career-expo-start-pending=true`, then its own pending guard blocked retry. Reload stayed locked without making another creation POST.
5. Retrying that same captured request with the same authenticated owner returned HTTP 200 and the **same session ID**. The live API supports the owner/request deduplication needed for safe recovery.

Root cause: `HttpSimulationClient.createSession` rejects any default-client call when the pending flag is true, including the original durable request. A lost response or an authentication/network failure during creation therefore locks the tab indefinitely. The previous fix addressed readiness and film playback but left this separate recovery bug.

Initial loss/failure cause in the user's browser remains unknown. Do not claim it was definitely Render cold start or Supabase failure.

For an immediate demo, the user was advised to open https://careerdive.onrender.com/start in Incognito, which bypasses the tab state without deleting existing work. An asynchronous question asking whether Incognito works was pending when the user paused; no answer had arrived.

## Uncommitted changes

### `apps/web/src/client.ts`

Read the default-client pending flag before recording request evidence. If pending, allow retry only when the existing durable record at `career-expo-create:${createRequestId}` exactly matches the serialized input. The API then returns the original owner/request session.

Keep the guard for missing request IDs, missing evidence, or changed inputs. Do not write new evidence before rejecting these cases: otherwise a second reload could manufacture permission to create a different shift. Storage failures still fail closed. Readiness polling, the eight-second mutation timeout, and App's bounded automatic retry are unchanged.

Successful App startup already clears the pending flag; no App source change was needed.

### `apps/web/test/pending-session-recovery.test.ts` (new)

Four cases: recover a lost creation response with the same stored request and owner; preserve the pending guard with missing, changed, or legacy request evidence. Repeating a blocked attempt must not manufacture evidence or send network requests.

### `apps/web/e2e/recovery-support.spec.ts`

Replace the old assertion that ambiguous creation never retries with the current idempotent contract: two automatic attempts use identical request bodies, then a focused manual Retry recovers using the same body.

### `apps/web/e2e/runtime-performance.spec.ts`

Replace permanent-pause-on-reload expectation with a real server-backed regression: the server commits but both creation responses are lost; reload retries the original request and recovers the original session ID. Three POSTs have identical bodies and only one session identity.

No backend, schema, authentication-source, or hosting configuration changes.

## Verification already completed for this uncommitted fix

- Targeted Vitest: **17 passed** across `pending-session-recovery.test.ts`, `recovery-support.test.tsx`, and `apps/server/test/anonymous-isolation.test.ts`.
- `pnpm lint`: passed.
- `pnpm typecheck`: passed.
- `pnpm build`: passed.
- Two changed Playwright regressions: **2 passed** in 9.4s against the real local in-memory API.
- `git diff --check`: passed before the pause.
- Full `pnpm test`: **interrupted at the user's request**, so no full-suite result is available for this fix. Do not claim every test passed.

Logs and temporary artifacts (may disappear):

- `/tmp/careerdive-pending-targeted.log`
- `/tmp/careerdive-pending-lint.log`
- `/tmp/careerdive-pending-typecheck.log`
- `/tmp/careerdive-pending-build.log`
- `/tmp/careerdive-pending-browser.log`
- `/tmp/careerdive-pending-test.log` (interrupted)
- `/tmp/careerdive-pending-browser-check.mjs` (local stack runner restricted to the two changed browser tests)
- `/tmp/careerdive-live-fresh-start.png`

## Resume steps, only after user asks

1. Inspect `git status` and the four changed implementation/test files. Preserve any new user edits.
2. Run the full `pnpm test`, since the previous full run was interrupted. The successful lint/typecheck/build results above cover the current changes; repeat only if implementation changes or new concerns require it.
3. If browser reruns are needed, use the temporary runner if present, or start an isolated local web/API stack and run the two changed specs. Do not use production database credentials for local checks. The earlier runner command was:

   ```bash
   env -u DATABASE_URL -u SUPABASE_URL -u SUPABASE_ANON_KEY \
     -u VITE_SUPABASE_URL -u VITE_SUPABASE_ANON_KEY \
     NODE_ENV=development node /tmp/careerdive-pending-browser-check.mjs
   ```

4. After verification, commit the focused fix, open a PR, wait for final-commit CI, and follow the user's resumed instructions about merging. There is no new PR yet.
5. Publishing the fix requires rebuilding/deploying the **web service**. The live API's idempotency was already verified, so this fix does not require an API redeploy. No Render deployment has been authorized/performed for this new change. Supply exact final release SHA and dashboard instructions when appropriate; do not confuse `BUILD_SHA` with Render's selected source revision.
6. Verify a fresh start and a simulated lost-response/reload recovery after deployment. Do not clear the user's storage or assume the original failed shift was never created.
