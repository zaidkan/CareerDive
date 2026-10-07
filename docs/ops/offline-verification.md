# Offline verification and production limits

Preparation uses the requested base `1384a0d266e25f9886634154af7e7e081e3f2aa2` on `worker/production-supabase-prep-final`. No live Supabase or Render connections, production migrations, deployments, DNS changes, or merge occur in these checks.

## Migration audit

Historical SQL `0001`–`0004` remains unchanged. The base used `drizzle-kit migrate` despite having hand-authored SQL and no usable migration journal in this checkout. The replacement discovers every consecutively numbered SQL file; no journal maintenance is required. Applied SQL hashes are immutable. The runner serializes concurrent migration calls with an advisory transaction lock, applies pending SQL and its ledger records in one transaction, and refuses unmanaged existing schemas rather than guessing their history.

- `0001_initial.sql`: original tables, `auth.users` foreign keys, RLS and `auth.uid()` policies.
- `0002_decision_reviews.sql`: private completed-choice aggregate rows.
- `0003_decision_option_set.sql`: exact option-set cohort isolation.
- `0004_career_requests.sql`: unique requester/career state, private table.
- `0005_server_boundaries.sql`: owner/create-request uniqueness; revoke browser table privileges and replace authoritative owner-write policies with SELECT-only policies.
- `0006_support_launch.sql`: private bounded support reports and canonical launch events.
- `0007_state_revision_launch_limits.sql`: state revision CAS and private durable analytics owner quota.

`auth.users`, `auth.uid()`, and `anon`/`authenticated` roles are Supabase prerequisites, not tables or roles this app should create in Supabase. Ordinary PostgreSQL can test SQL only after the disposable fixture in `apps/server/test/fixtures/supabase-auth.sql` provides those contracts. That fixture does not emulate real Supabase token issuance, PostgREST default grants, abuse controls, or the Dashboard. Never run it on a cloud project.

## Reproduce local DB checks

Use an already-cached PostgreSQL image. These commands deliberately target a disposable local container; the password is a throwaway local test value, not a production credential.

```sh
docker run --pull=never --detach --name careerdive-db-test \
  -e POSTGRES_PASSWORD=offline-test -p 127.0.0.1:55432:5432 postgres:17-alpine
```

After `pg_isready` succeeds, create two disposable databases and load the auth fixture into each:

```sh
docker exec careerdive-db-test psql -U postgres -c 'CREATE DATABASE career_sim'
docker exec careerdive-db-test psql -U postgres -c 'CREATE DATABASE migration_test'
docker exec -i careerdive-db-test psql -U postgres -d career_sim \
  < apps/server/test/fixtures/supabase-auth.sql
docker exec -i careerdive-db-test psql -U postgres -d migration_test \
  < apps/server/test/fixtures/supabase-auth.sql
DATABASE_URL=postgres://postgres:offline-test@127.0.0.1:55432/career_sim \
  pnpm --filter @sim/server db:migrate
DATABASE_URL=postgres://postgres:offline-test@127.0.0.1:55432/career_sim \
  pnpm --filter @sim/server db:verify
TEST_DATABASE_URL=postgres://postgres:offline-test@127.0.0.1:55432/career_sim \
TEST_MIGRATION_DATABASE_URL=postgres://postgres:offline-test@127.0.0.1:55432/migration_test \
  pnpm test
```

The migration-runner integration test requires a **fresh** `migration_test` database with only the auth fixture. Recreate that disposable database before rerunning the test. Normal DB integration tests require a migrated database. Without these URLs, DB-dependent tests are explicitly skipped; skipped checks must never be reported as passed. Existing missing-review, paid-AI, and opt-in evaluation tests have their own gates and are outside normal launch requirements.

Real local Postgres checks cover all seven migrations, concurrent first apply, no-op repeat apply, checksum drift rejection, pending verification, SQL failure rollback, eight simultaneous starts creating one owner-bound session, changed-input conflicts, foreign-owner session/debrief/action denial, consistent state snapshots, concurrent revision CAS, report dedupe and five-per-hour owner quota, anonymous/authenticated browser privilege denial, and durable 60-per-minute launch-owner quota including deduped IDs and rollback of over-limit events.

RLS is never disabled. Tests use a privileged connection to mimic the server and explicitly `SET LOCAL ROLE anon/authenticated` to prove browser restrictions. Even when a transaction temporarily grants UPDATE for the test, RLS still denies state mutation; the test revokes that temporary grant before committing.

## Container evidence

Cold network-disabled Docker installs cannot complete with the locally available package cache: initial Corepack acquisition needs registry access; after preloading caches, package/platform cache gaps remain. No registry access is permitted for this offline task. A clean install/build of both checked-in Dockerfiles remains an activation gate tomorrow; it is not claimed as verified.

The API container was independently built with **the checked-in source, workspace packages, content packs and actual compile/start commands**, using a pre-existing local Linux dependency tree instead of a fresh dependency install. `.git` is excluded. The API ran in production mode on an internal Docker network with disposable Postgres and a local HTTP Supabase-auth mock, not Supabase Cloud. Its smoke checks verified liveness/readiness, verified bearer identity, rejection of `x-user-id` without bearer, concurrent start dedupe, career state, report persistence/dedupe, protected analytics, and exact CORS.

The Nginx runtime image was built from the checked-in configuration plus the locally produced web build. Smoke checks verified `/health`, deep-link SPA reload, JSON 404s for misplaced `/api/*` and `/trpc*`, and real 404s for missing assets. Auth and DB were each stopped temporarily: `/health` stayed 200 and `/ready` became 503. This proves runtime behavior, not a cold web dependency install inside Docker.

The final activation must build the reviewed Dockerfiles with dependency access, real public values and the approved SHA. API startup invokes Node/tsx directly, so it cannot silently invoke pnpm installation or supply-chain metadata checks. The migration is a separate owner-controlled command.

## Analytics semantics and privacy

First-party event schemas in `packages/schemas/src/launch.ts` are canonical. Events are best-effort observations, not authoritative simulation records; decisions/debriefs remain server-owned. Landing, career viewed and start initiated are intentionally public, IP-limited, and do not create an identity solely for viewing. Later events require verified bearer identity plus a durable server owner quota. The event table stores no owner ID; the separate private quota table stores only owner UUID/window/count.

- `landing`: home route viewed.
- `career_viewed`: allowlisted career detail viewed.
- `start_initiated`: durable start request attempted; request-key reuse dedupes retries.
- `shift_started`: confirmed session; tab-local occurrence key dedupes reload/resume.
- `meaningful_investigation`: accepted artifact open or source/query investigation, once per shift.
- `decision`: successful decision mutation, keyed by shift/event/choice.
- `handoff`: successful structured handoff, once per shift.
- `shift_completed`: confirmed completion, once per shift.
- `debrief_viewed`: successfully loaded debrief, once per shift.
- `feedback_report`: confirmed persisted support report, keyed by returned report ID.

Only event UUID, allowlisted event name/career ID and server timestamp enter launch rows. No session/owner ID, notes, report description/contact, token, IP, fingerprint, user agent, or full URL enters those rows. Support descriptions and optional contact are intentionally user-supplied private records; diagnostics are opt-in and strictly allowlisted/bounded. Product tables do not prove that hosting access logs have the same retention policy.

Analytics is disabled unless `VITE_LAUNCH_ANALYTICS_ENABLED=true`; product behavior does not depend on event delivery. PostHog is not needed. Browser event observations can be omitted or manipulated by authenticated visitors, so launch reporting must not treat them as verified completion evidence. Use authoritative simulation records for completion counts.

## Owner-only activation gates

Final Supabase project, anonymous-auth setting, three Supabase values, production migration approval/application/verification, connected token-refresh and PostgREST smoke, clean Docker builds, real Render origins/CORS/proxy-IP verification, support access/retention procedure, exact build SHA, explicit deployment approval and post-deployment smoke remain owner-controlled. CAPTCHA requires additional UI if made mandatory. No cloud retention schedule is installed by this offline work.
