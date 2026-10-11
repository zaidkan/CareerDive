# Simulation data retention

Database-backed CareerDive servers automatically delete simulation sessions **strictly older than 90 days**, measured from the session's database creation timestamp (application writes do not update it) using database time. A session exactly at the cutoff, and every newer session, is preserved. Updating, completing, or resuming a shift does not extend this period.

The existing foreign-key cascades remove the expired session's action log, state snapshots, evidence/observations, reflections, telemetry, and decision-review rows. Current state embedded in the session row is deleted too. This routine does not delete Supabase authentication users, career requests, support reports, provider logs, or other owner-level records. Those categories have separate handling in the Privacy Policy.

## Automatic production trigger

The API starts the cleanup runner immediately, verifies migration history before its first deletion, and repeats every hour whenever `DATABASE_URL` is configured. No new Supabase extension, public endpoint, secret, or cloud service is required. Render's existing API start command launches this runner in production; deploying this code enables it. No live Render/Supabase setting was changed by this implementation.

Each statement selects at most 100 expired parents with `FOR UPDATE SKIP LOCKED`, deletes them atomically with cascading children, and uses the existing pooler-compatible connection. Concurrent gameplay writes and cleanup replicas cannot delete a locked parent together. A run drains at most 100 batches (10,000 sessions) so a backlog cannot create an unbounded maintenance loop. Locked rows and excess backlog are retried on the next run. Per-process runs cannot overlap. Shutdown cancels future ticks, stops between batches, waits for the current statement, and then closes the database pool.

Cleanup logs contain aggregate deletion counts and backlog status; they do not print session IDs, user content, or credentials. A database failure logs a cleanup failure and retries on the next hourly run. It does not crash the API or create replacement user identities. Service outages, active locks, or a large backlog can delay cleanup; review those logs and run the command below when needed.

## Operator command and external schedules

Run against the intended private API database URL:

```sh
pnpm --filter @sim/server db:purge
```

The command requires `DATABASE_URL`, verifies the existing migration ledger, uses one connection with a five-second statement timeout, reports `{ deleted, more }`, and exits nonzero on failure or remaining backlog. It never targets an implicit/local database and accepts no caller-supplied age/cutoff that could delete newer data.

For an external production schedule, run that same command hourly in an operator-managed scheduled process with the API's server-only database environment and this repository checkout. For a Render Cron Job, use the existing server image and the `pnpm --filter @sim/server db:purge` command on `0 * * * *`. This external job is optional while the API's built-in hourly runner is continuously running; it can keep cleanup active when the API is paused. Provisioning that job is a separate deployment action and was not performed here. No unauthenticated HTTP cron endpoint is exposed.

## Verification

`apps/server/test/retention.test.ts` covers bounded draining, startup/hourly execution, overlap prevention, error recovery, and safe shutdown. `apps/server/test/retention-postgres.test.ts` exercises the actual SQL and cascades on a disposable migrated PostgreSQL database, including the exact 90-day boundary, multiple owners, child records, non-simulation data, idempotency, and an active writer lock. Set `TEST_RETENTION_DATABASE_URL` only to that disposable database to run it. Never use a production database for tests.
