# Offline preparation results — 2026-10-04

Branch: `worker/production-supabase-prep-final`.
Base: `1384a0d266e25f9886634154af7e7e081e3f2aa2`.
Final commit: use `git rev-parse HEAD` on this branch after the preparation commit.

## Verified

| Check                                                            | Result                                                                                                                                        |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm typecheck`                                                 | All 11 workspaces pass; migration CLI also checked                                                                                            |
| `pnpm lint`                                                      | All 11 workspaces pass; migration CLI included                                                                                                |
| `pnpm build`                                                     | All 10 build tasks pass; existing large 3D bundle warning remains                                                                             |
| Full tests with disposable local Postgres and fresh migration DB | **128 files pass; 829 tests pass; 7 skip**                                                                                                    |
| Product contract                                                 | Pass                                                                                                                                          |
| `git diff --check`                                               | Pass                                                                                                                                          |
| SQL plan and local verification                                  | All seven discovered in order; history verified                                                                                               |
| Fresh/concurrent migration and rollback tests                    | Pass; checksums detect altered history, failed SQL leaves no partial table/ledger                                                             |
| Start idempotency and state concurrency                          | Pass in real local Postgres; eight starts dedupe, changed inputs conflict, one concurrent state writer succeeds and stale writer fails        |
| RLS/browser boundaries                                           | Pass with `anon`/`authenticated`; private reads and authoritative state writes denied                                                         |
| Career state/recovery                                            | Pass; verified owner overrides forged requester key, duplicate/retry/unrequest/reload persist, failed hydration/write cannot claim success    |
| Support reports                                                  | Pass; real local persistence, duplicate retry, private access, validation, five reports/hour per owner and IP limit                           |
| Launch events                                                    | Pass; strict payloads, protected post-start events, durable owner quota, duplicate event IDs do not charge quota, over-limit events roll back |
| Anonymous auth                                                   | Mocked SDK/server tests pass: anonymous creation sharing, restore/refresh, production failure closed, no header fallback                      |
| API Docker compile/runtime                                       | Pass with cached Linux dependency tree; production-mode API tested only against local auth mock and local Postgres                            |
| Nginx container runtime                                          | Pass with locally built web artifact: deep links, health, API JSON boundaries, missing asset 404                                              |
| Dependency outage readiness                                      | Auth or DB outage returns 503 on `/ready`; `/health` remains alive                                                                            |
| Web build without `.git`                                         | Pass; fallback revision works; explicit `SITE_ORIGIN` replaces HTML/robots/sitemap origins                                                    |
| Independent review                                               | Important findings fixed: stale state overwrite, unauthenticated post-start metrics, retry double counts                                      |

The seven skips are explicit pre-existing gates: one missing-review Postgres degradation test without its separate fixture URL, two proposed false-positive-content cases whose supporting records are absent, and four pending query-accessibility DOM bindings. None is counted as a pass. This task does not claim a full accessibility or live Supabase test.

The first baseline suite had two recovery timing failures; the final complete suite includes those tests and passes. One intermediate DB run used the old dynamically assigned Docker host port after the local outage exercise; it failed connection checks. Updating to the actual published port and using a fresh migration database produced the final passing run. These failures are not hidden or counted as passing evidence.

## Still unverified / owner gates

- **Cold Docker dependency installation/build:** network-disabled clean builds fail because required Corepack/packages/platform cache entries are unavailable. Runtime verification used cached dependencies or a host-built static artifact; it does not prove a fresh install of the checked-in Dockerfiles. Perform clean controlled builds tomorrow before deployment approval.
- **Live Supabase:** project creation, anonymous-auth/provider/abuse settings, real token issuance/refresh, actual cloud TLS/pooler connectivity and PostgREST default privilege smoke.
- **Live Render:** actual build-arg propagation, origins/CORS, region, health behavior, platform proxy client-IP handling, and deployed deep-link smoke.
- **Owner operations:** private support access, approved retention procedure, final build SHA, production migration authorization and explicit deployment approval.

The source repairs the supplied preflight blockers: full workspace/content inputs, Git-optional revision, separate readiness, owner-bound bearer integration, explicit migration lifecycle, cross-origin transport and reserved API routing. Local runtime evidence is documented without representing it as a deployed production system.

No Supabase project was created or connected. No production migration, Render action, deployment, DNS/domain change, push, or merge was performed. All SQL execution targeted disposable local Postgres with the test-only auth fixture.

Use [supabase-render-activation.md](supabase-render-activation.md) in order. The exact required Supabase values are the database session-pooler URL, project API URL, and public publishable/anon key. No service-role key or signing secret is required.
