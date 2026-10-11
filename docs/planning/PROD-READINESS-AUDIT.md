# CareerDive production and multi-user readiness audit

Audited 2026-10-11. Base: `worker/blind-audit-remediation-final` at `c6955f6`. Review branch: `audit/prod-readiness`.

## Launch decision

**Conditional NO-GO for unrestricted public/concurrent launch.** Four clear robustness defects are fixed here. No cross-owner session collision or lost-update vulnerability was found in the PostgreSQL paths tested. Launch still needs owner decisions on shared-IP traffic, anonymous-signup abuse controls, optional AI, and the actual Render/Supabase configuration. Green local tests establish correctness of the tested paths; they do not establish a production concurrency ceiling.

No cloud project was selected, accessed, migrated, or deployed. Simulation rules, scoring, evidence, prepared dialogue, arrival flow, and canonical reducers are unchanged. No existing migration checksum is changed. See the existing [activation runbook](../ops/supabase-render-activation.md) for separately authorized cloud operations.

Severity meanings: **launch-blocker** must be fixed or its stated condition explicitly excluded before admitting traffic; **should-fix** needs scheduled engineering work; **monitor** needs operational verification/alerts. Fixed findings retain their original severity so reviewers can see what was remediated.

## Prioritized findings

| ID  | Severity                                                  | Status                                   | Risk                                                                                 |
| --- | --------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------ |
| R1  | launch-blocker, if transaction pooling is selected        | Fixed; live pooler smoke remains         | Prepared statements/query pipelining incompatible with Supavisor transaction pooling |
| R2  | launch-blocker                                            | Fixed network/lock waits                 | Hung browser authentication stalls all owner-bound requests                          |
| R3  | launch-blocker                                            | Fixed                                    | Lost create response prevents safe idempotent retry                                  |
| R4  | launch-blocker under synchronized startup/probe traffic   | Fixed amplification; capacity remains R9 | Readiness checks compete with sessions for the same pool                             |
| R5  | launch-blocker for shared-IP concurrent cohorts           | Owner decision                           | API quotas group different users behind the same NAT                                 |
| R6  | launch-blocker for public/signup bursts                   | Owner decision                           | Anonymous signup limits and CAPTCHA compatibility                                    |
| R7  | launch-blocker if optional AI is enabled                  | Owner decision                           | AI “session budget” resets each call; long upstream waits                            |
| R8  | launch-blocker before activation                          | Owner verification                       | Production env, migration history, pool mode/TLS and project alignment               |
| R9  | should-fix; capacity test required before launch          | Owner sizing/design                      | Unbounded DB waiting work and missing end-to-end deadlines                           |
| R10 | should-fix                                                | Owner rollout                            | Session reads/deletes scan unindexed child tables                                    |
| R11 | should-fix                                                | Owner implementation                     | History rewrites and unbounded profile/export fan-out                                |
| R12 | should-fix                                                | Owner abuse policy                       | Reflection/session creation spam and public analytics writes                         |
| R13 | should-fix hardening; architecture sign-off before launch | Owner decision                           | API owner isolation is application-enforced, not per-user SQL RLS                    |
| R14 | should-fix                                                | Owner recovery design                    | Resume/action outages can leave UI waiting or create ambiguous retries               |
| R15 | should-fix                                                | Owner operations                         | Persistent anonymous/report/analytics data has no scheduled retention                |
| R16 | monitor; blocker if deployed assumptions fail             | Live Render verification                 | One-hop proxy boundary and exact-origin CORS                                         |
| R17 | monitor                                                   | Documented limits                        | Client storage growth, development-only mutable repositories, process lifecycle      |

### R1 — Transaction-pool driver compatibility

**What breaks / when:** `main.ts`, `createPostgresRepository()` and the migration script used Postgres.js defaults: named prepared statements and `max_pipeline: 100`. Selecting a Supabase transaction-pool URL can produce prepare errors, hung queries or mismatched results when the pooler reassigns connections. A successful localhost/direct-Postgres run does not exercise that intermediary. Supabase documents both limitations in its [connection guide](https://supabase.com/docs/guides/database/connecting-to-postgres#transaction-mode-limitations).

**Fix applied:** All three production connection constructors share `poolerCompatibleOptions` (`prepare: false`, `max_pipeline: 1`). Pool sizes and SQL/transaction semantics are preserved. Concurrent repository and migration tests now exercise that configuration. Separate pool connections still execute concurrently; queries on an individual connection are serialized.

**Remaining gate:** The activation runbook already selects the IPv4 session pooler, which remains the preferred persistent-Render connection. Verify the exact deployed endpoint, encryption, connection budget and effective statement timeout. Direct PostgreSQL tests do not prove live Supavisor behavior; do not assume startup/session settings persist through transaction pooling.

Evidence: [connection options](../../apps/server/src/db/connection.ts), [server bootstrap](../../apps/server/src/main.ts), [repository factory](../../apps/server/src/db/repository.ts), [migration command](../../apps/server/scripts/migrate.ts).

### R2 — Unbounded browser auth network and lock waits

**What breaks / when:** Browser `authHeaders()` shares one in-flight promise. Previously Supabase used an unbounded default fetch, and the explicit cross-tab identity Web Lock had no acquisition deadline. A stalled auth request or another tab holding the lock could keep startup, career requests, support and authenticated analytics waiting indefinitely. The API request deadlines begin after some auth work or cannot cancel the asynchronous headers provider.

**Fix applied:** Supabase browser fetch has a five-second per-request deadline, combined with any caller cancellation signal. Waiting to acquire the app's identity Web Lock is bounded to eight seconds. Rejection releases the app's single-flight promise, allowing a later retry; refresh failure still never creates a replacement owner.

**Limits:** This is not an eight-second total authentication guarantee. The installed Supabase auth SDK can retry refresh requests with backoff within its refresh tick (30 seconds). The lock signal cancels acquisition, not work already granted. Tests cover stalled transport cancellation, original caller cancellation, failed lock acquisition, concurrent failure settlement and recovery with the original token. No abandoned identity operation is retried in parallel via an uncancelled `Promise.race`.

Evidence: [transport](../../apps/web/src/transport.ts), [auth tests](../../apps/web/test/production-auth.test.ts).

### R3 — Safe create retry was blocked by the pending-start guard

**What breaks / when:** After `session.create` commits but its response is lost, the client correctly marks a stable `createRequestId` as retryable. The default client's pending-start guard nevertheless rejected the retry, including after reload. Users could remain stuck despite the database's owner/request unique key.

**Fix applied:** Before sending creation, persist the original pending request ID. A pending start can be retried only with that exact ID. Missing/different IDs and legacy pending starts without a recorded ID still fail closed. The server continues to verify the owner and reject differing seed/pacing inputs. No simulation mutation is replayed automatically.

**Tests:** Lost-response/reload retry uses the same request ID; different/missing IDs send no new write; a legacy ambiguous start remains blocked. Real PostgreSQL tests separately prove that concurrent identical requests commit one session per owner and that the same request ID across 16 different owners yields 16 distinct sessions.

**Limit:** Request IDs are owner-scoped, not global. Recovery after the browser loses or changes its anonymous identity needs an explicit owner-binding/reset policy (R14); this fix addresses retries while the original identity remains available.

Evidence: [HTTP client](../../apps/web/src/client.ts), [retry tests](../../apps/web/test/session-create-retry.test.ts), [multi-user database tests](../../apps/server/test/multi-user-postgres.test.ts).

### R4 — Readiness probe amplification

**What breaks / when:** Every `/ready` request discovers and hashes seven migration files, queries the ledger and checks six table projections, then calls Supabase auth health in production. The browser calls this on each create attempt; Render also probes it. Twenty simultaneous starts previously caused twenty complete check sequences against the same ten-connection pool used for shifts. During an outage this adds work precisely when capacity is scarce.

**Fix applied:** Per Fastify instance, readiness shares one in-flight dependency check and caches its success or failure for one second after settlement. `/health` remains independent. A twenty-request burst is covered by tests: one check, sanitized 503s on failure, recovery after expiry, and subsequent outage detection. At most one second of settled readiness staleness is intentional.

**Limits:** This prevents amplification, not indefinitely hung SQL/network work; total probe and database queue bounds remain R9. The cache is process-local and contains no user state.

Evidence: [health routes](../../apps/server/src/routes/health.ts), [health tests](../../apps/server/test/support-health-launch.test.ts), `main.ts: checkReady`.

### R5 — IP quotas are not multi-user quotas

**What breaks / when:** The global limit is 120 requests/minute per IP across routes using the global store, including tRPC and health routes. Twenty users behind one NAT have an average of six such requests each per minute before the combined quota is exhausted. Route overrides have separate counters: support is ten/hour/IP, career request and state routes thirty/minute/IP each, launch events sixty/minute/IP. Eleven people reporting one problem behind the same NAT can hit 429 even though the durable per-owner support quota allows five/hour each.

**Evidence:** A Fastify injection test sends 120 requests with twenty distinct bearer header values from one address, then receives 429; another address succeeds. This demonstrates the quota's IP key, not token validation. In the installed rate-limit 10.3.0 source, route overrides create separate local stores; they do not also consume the global 120 counter. Default stores are bounded LRU caches (5,000 keys per store), process-local and reset on restart. Multiple replicas multiply the effective HTTP quota; durable owner quotas for support/authenticated launch events do survive replicas. See the [plugin documentation](https://github.com/fastify/fastify-rate-limit) and [network tests](../../apps/server/test/production-network.test.ts).

**Owner fix:** Choose cohort size and a two-layer policy: edge/IP abuse limits plus limits keyed to the **verified** owner for authenticated operations, with shared counters if replicas are allowed. Reserve or separate platform health checks. Do not key limits to an unverified `x-user-id`, arbitrary bearer text or client-supplied forwarding headers, and do not blindly raise all limits. Repeat a full shift/report workflow behind one shared IP before admitting a cohort.

### R6 — Anonymous signup burst and CAPTCHA compatibility

**What breaks / when:** The app calls `signInAnonymously()` without a CAPTCHA token. Supabase's documented default is thirty anonymous sign-ins/hour/IP. A classroom/event or shared egress exceeding that encounters auth errors; enabling mandatory CAPTCHA without matching client integration prevents first-time owner-bound use. Coming-soon career request hydration also creates an identity, so this limit is not confined to starting a shift. Bot-created identities can grow the database even without valid gameplay.

**Owner fix:** Confirm anonymous auth is enabled, the actual project quota and expected shared-IP cohort, and a compatible CAPTCHA/Turnstile integration or explicitly bounded initial rollout. Coordinate auth controls with R5; changing Fastify limits cannot fix a Supabase signup quota. No dashboard settings were inspected or changed. [Supabase anonymous sign-in documentation](https://supabase.com/docs/guides/auth/auth-anonymous#abuse-prevention-and-rate-limits).

**Isolation status:** Single-flight prevents duplicate signup within a tab. Web Locks serialize identity creation across supported same-origin tabs. Separate visitors receive distinct Supabase UUID owners. Browsers without Web Locks still have a possible cross-tab initial-signup/storage race; do not describe cross-tab identity as guaranteed everywhere. Existing tokens refresh instead of replacing their owners on transient error.

### R7 — Optional AI is not protected by a durable session budget

**What breaks / when:** If `ANTHROPIC_API_KEY` is set, every `generateSafeNpcReply()` constructs a new `SessionBudget` and records cost **after** generation. There is no accumulated per-session spend reservation or durable per-owner AI quota. Concurrent requests/replicas can spend repeatedly. `main.ts` constructs an Anthropic client per request with installed SDK defaults: ten-minute timeout and two retries. Slow upstream calls can retain requests and delay shutdown even though eventual exceptions fall back safely.

**Owner fix:** Leave optional AI disabled for initial launch, or separately implement atomic durable spend reservations, a verified-owner quota, a short provider deadline, bounded retries and cancellation. Validate budget env values. This requires an explicit cost/latency policy; the audit does not change dialogue/safety/canonical behavior blindly.

Evidence: [NPC dialogue adapter](../../apps/server/src/ai/npc-dialogue.ts), `main.ts: llmProvider`, `trpc/router.ts: simulation.submitFreeText`; installed `@anthropic-ai/sdk/src/client.ts` defines `DEFAULT_TIMEOUT = 600000` and `maxRetries = 2`.

### R8 — Production activation assumptions are still gates

**What breaks / when:** A wrong/missing web API origin sends production requests to Nginx, where `/api` and `/trpc` intentionally return JSON 404. Web/server auth project mismatch yields failed bearer verification; a database belonging to a different project can fail the `auth.users` foreign key even if bearer verification succeeds. Wrong `WEB_ORIGIN` prevents browser access; stale build args persist until web rebuild. Missing/mismatched migrations make `/ready` unavailable. A wrong database role or absent TLS can undermine the intended security/availability model.

**Current protections:** Production bootstrap requires `DATABASE_URL` and Supabase public credentials; an unavailable DB does not trigger an in-memory fallback. Docker sets `NODE_ENV=production`. Public key schemas reject service-role/secret keys in server config and Vite build config. Docker web build requires nonempty API/auth/site values. `.dockerignore` excludes private env files. `render.yaml` deliberately does not run migrations automatically.

**Owner fix / verification:** Use the approved activation sequence: exact HTTPS web/API origins, matching auth/database project, reviewed database role, TLS enabled and verified, migration plan/apply/verify, API readiness, then a rebuilt web bundle and a two-identity connected smoke. Keep `NODE_ENV=production`; the dev constant owner/in-memory repository are reachable when production mode is misconfigured. Plain `pnpm build` without cloud env is an offline bundle, not a usable production deployment.

Render translates Docker service env vars into declared build arguments, so the template's mechanism is supported; updating runtime variables alone does not rewrite Vite's compiled values. [Render Docker documentation](https://render.com/docs/docker#environment-variable-translation). No cloud environment values were read during this audit.

**Migration assessment:** The checksum ledger and one transaction/advisory lock make the runner repeatable and serialize concurrent applies. Old SQL is not independently rerunnable (some policies/columns have ordinary CREATE/ADD); use the runner. Drift, skipped history, legacy schema without a ledger and failed SQL fail closed. Existing migration checksums remain untouched.

### R9 — Pool capacity and outstanding requests are not bounded together

**What breaks / when:** One API replica shares a ten-connection pool across shifts, career requests, support, analytics and readiness. Rolling deployment/replicas multiply connections; add migration/operator/Auth/other Supabase workloads to the budget. `connect_timeout: 5` and server `statement_timeout: 5000` bound connection establishment and individual statements, not queue wait, an entire transaction, a blackholed established socket or total request work. Fastify has no application concurrency admission limit. Pending database requests retain promises/request state and can consume memory or wait beyond the client's deadlines.

**Owner fix:** Declare expected simultaneous users/replicas, size pool and Supabase capacity with headroom, measure queue wait and transaction duration, and add bounded admission/overload responses and cancellable deadlines. Avoid merely racing a timeout against SQL: uncancelled work would continue and retries could worsen overload. Confirm timeout behavior on the selected live pool mode. Start below the measured ceiling and alert on queue/pool saturation, 429/5xx, p95/p99 latency and RSS.

**Evidence / scope:** Local database tests cover sixteen owners through two connections and a row-lock timeout rolling back one owner's write while another commits. They are correctness tests, not Render network/load benchmarks. A single failed user write does not poison another owner's stored state; global pool saturation can still degrade everyone.

### R10 — Missing indexes on hot session-child predicates

**What breaks / when:** Every `getSession` selects and every `saveSession` deletes evidence/reflections with `(session_id, owner_id)`. Migrations define UUID primary keys but no session lookup indexes on those two tables. As unrelated users accumulate rows, these paths scan growing shared tables. Foreign-key cascade deletes also need session lookup. `action_log` already has a `(session_id, sequence)` unique index; the session owner/request unique index supports owner lookup. Active sharing-grant owner queries lack a matching index too.

**Owner fix:** Add a new reviewed migration for evidence/reflection session-owner indexes and an appropriate active-grant owner index. Inspect real row counts and EXPLAIN plans first; choose a rollout that avoids blocking live writes. `CREATE INDEX CONCURRENTLY` cannot run inside this runner's all-migrations transaction, so rollout strategy needs a decision rather than an untested SQL edit. Do not change old checksum-tracked migrations. No missing-index latency numbers are invented here.

Evidence: [initial schema](../../apps/server/drizzle/0001_initial.sql), `PostgresRepository.getSession/saveSession/listGrants`.

### R11 — History write amplification and profile fan-out

**What breaks / when:** Each accepted save deletes and reinserts **all** action, evidence and reflection history, using one awaited INSERT per row. The revision compare-and-swap and transaction preserve correctness, but database round trips grow with history; cumulative work across a growing shift is quadratic in its history length. `listSessions` selects every session for an owner and uses unbounded `Promise.all(getSession(...))`. Profile, annotate/reset and export paths consume that full result; one heavy account can monopolize the shared pool and allocate a large response. Body limits do not bound stored history or response size.

**Owner fix:** Preserve revision semantics while introducing bounded pagination/fan-out and batched or incremental persistence. Validate rollback, action ordering, evidence and debrief parity before changing persistence. Define export/session-history limits with product owners. These are broader repository changes, deferred rather than risking canonical storage behavior.

Evidence: `PostgresRepository.saveSession/listSessions`, `trpc/router.ts: profile.get/annotateEvidence/reset and privacy.exportData`.

### R12 — Spam paths share authoritative capacity

**What breaks / when:** `reflection.submit` appends a new UUID row on every accepted request, with no per-session count quota or idempotency key. Notes are capped at 2,000 characters, and Fastify body size is 64 KiB, but repeated valid submissions enlarge the history rewritten by R11. Anonymous owners can also create sessions with fresh request IDs indefinitely. Public `landing/career_viewed/start_initiated` analytics intentionally skip auth and the durable owner quota, yet write transactions through the same database pool. Distributed sources/replicas bypass a purely per-process IP ceiling.

**Owner fix:** Set verified-owner/session write budgets, retry/idempotency policy for reflections, anonymous-session creation budgets and an edge limit/isolated capacity budget for public events. If analytics is not launch-critical, owner can disable its web flag for the initial rollout; that alone does not disable the public server endpoint. Preserve meaningful reflection content and canonical behavior. Do not replace safeguards with fake client-only quotas.

**Existing defenses:** Reports are capped/allowlisted, require a verified owner, use owner/request idempotency, and have a transaction-scoped advisory lock plus a durable five/hour owner quota. Authenticated launch events enforce sixty/minute/owner atomically; quota failure rolls back the inserted event. These concurrent paths passed database tests. Event payloads exclude private text/owner/session IDs. Anonymous public events remain an intentional separate exposure.

Evidence: [support store](../../apps/server/src/repository/support.ts), [launch store](../../apps/server/src/repository/launch.ts), [routes](../../apps/server/src/routes/launch.ts), `trpc/router.ts: reflection.submit`.

### R13 — API isolation is not SQL JWT-context RLS

**What breaks / when:** The API verifies a bearer, then uses one privileged `DATABASE_URL` SQL connection. It never sets transaction-local JWT claims or changes to the user's database role. With the usual table-owner/BYPASSRLS connection, RLS does **not** restrict those API queries per visitor. A future missing owner predicate would therefore be a security defect, even though policies exist. Merely switching the API to the authenticated role would break authoritative writes and cohort queries because browser privileges are deliberately revoked.

**Current result:** API owner predicates are present on session/child/grant/private request/report paths inspected. Recorded decision lookup is reached only after owner-checked session access; aggregate cohort counts intentionally span owners. PostgreSQL tests prove foreign-owner reads/actions/debriefs fail and writes use revision CAS. Direct `anon` and `authenticated` browser roles are denied private table access and authoritative writes. With temporary SELECT grants inside a test transaction, the session RLS policy returns the owner's row and hides it from another JWT subject; even a temporary UPDATE grant cannot modify authoritative state. Grants are restored before commit.

**Owner fix / decision:** Explicitly sign off this server-authoritative trust boundary. Prefer a narrowly granted API role separate from migration credentials; if per-user API RLS is required, design transaction-local verified identity/policies and a separate safe aggregate path, then test reused pooled connections for context leakage. Never set session-wide user claims on a shared pool. Consider composite child/session owner integrity constraints as additional defense. This architecture change is not applied blindly.

[PostgreSQL RLS documentation](https://www.postgresql.org/docs/17/ddl-rowsecurity.html) explains role/table-owner bypass. Local fixture roles establish the tested policy behavior; actual Supabase grants, role membership, default privileges and Data API exposure still require live verification.

### R14 — Resume and ordinary mutation recovery needs a policy

**What breaks / when:** Outside creation, `HttpSimulationClient` session/debrief reads and ordinary mutations have no transport deadline. A hung response leaves the coordinator's single pending operation blocking later work; resume can wait indefinitely. A mutation that commits before a response failure may be offered for manual retry without a general idempotency contract. Cross-tab writes are protected by database revision CAS, but one tab receives CONFLICT and needs a fresh view. Losing local anonymous credentials means a saved tab session belongs to another owner and resume correctly fails, rather than leaking it; retry alone cannot recover that identity. If an unresolved create is retried after a different owner has already been established, the same request key can create a separate session for that new owner. Bind pending intents to the original owner if cross-identity recovery is supported.

**Owner fix:** Add bounded read requests and design write reconciliation around server revision/request IDs: read committed state before retrying an ambiguous operation. Define explicit lost-identity/reset behavior and stale-tab refresh. Do not add automatic gameplay retries or silently create a replacement owner. R3 only changes the already-idempotent creation path.

**Graceful paths found:** Database/auth failures fail closed; tRPC internal errors are sanitized. REST persistence errors return generic 503 and the support UI retains drafts. Optional cohort persistence/queries do not prevent authoritative completion/personal debrief. Analytics catches failures and never blocks gameplay or signs up identities for public events. An analytics service outage can still contend with shared server resources, covered by R9/R12.

Evidence: [client](../../apps/web/src/client.ts), [mutation coordinator](../../apps/web/src/useMutationCoordinator.ts), [resume/cache](../../apps/web/src/index.tsx), [analytics](../../apps/web/src/analytics.ts), [tRPC errors](../../apps/server/src/trpc/core.ts).

### R15 — Persistent data growth and retention

**What breaks / when:** No scheduled purge exists for anonymous identities, incomplete sessions, reports or launch events. Public events have no owner link, so account deletion does not remove them; `deleteAccount` deletes application data but not the Supabase `auth.users` identity. Supabase does not automatically clean anonymous accounts. Over time this increases storage, scans, index maintenance and costs. Deleting an auth user cascades owned tables, so a naive age-only purge can destroy a returning visitor's retained work. [Supabase cleanup documentation](https://supabase.com/docs/guides/auth/auth-anonymous#automatic-cleanup).

**Owner fix:** Assign retention operations, define inactivity/retention rules and authorized deletion semantics, estimate daily storage growth, then schedule and observe bounded deletion jobs. The activation runbook suggests a thirty-day ceiling for reports/events but implements no schedule. Review hosting access-log retention separately. No purge or account behavior is changed in this audit.

### R16 — CORS/proxy behavior must be checked on the real platform

**What breaks / when:** Production CORS permits one exact `WEB_ORIGIN`, with no slash/path. `www`, preview or custom domains fail unless they match the deployed value. Wrong API/web scheme produces mixed-content failure. Trusting exactly the immediate proxy hop is correct only if Render's actual forwarding chain and header sanitization match that boundary. Extra hops may group all visitors under a proxy IP; a wrongly trusted direct ingress can permit spoofed client keys. That affects R5 and abuse attribution.

**Local result / owner fix:** Injection tests prove exact-origin POST bearer/content-type preflight works and a two-value X-Forwarded-For chain trusts only the nearest forwarded address, not the farther supplied value. Keep that boundary. On Render, inspect nonsensitive observed `request.ip` for two independent clients and verify preflight/POST from the final HTTPS web origin; test a spoofed extra forwarded value. Do not widen CORS or `trustProxy` to hide an unexplained platform mismatch. CORS is a browser access mechanism, not endpoint authentication.

Evidence: [config](../../apps/server/src/config.ts), [network tests](../../apps/server/test/production-network.test.ts), [Render template](../../render.yaml), [Nginx](../../apps/web/nginx.conf).

### R17 — Memory/lifecycle findings and operational signals

**What breaks / when:** Development in-memory session/support maps have no TTL; creation-dedupe keys are retained after deletion, session objects are returned by reference and saves have no PostgreSQL revision CAS. This can mask races in localhost tests and grow memory in a long dev process. It is not the production repository when the guarded Docker configuration is used. Browser occurrence/event/create-intent storage grows with visit history until tab storage quota; analytics catches quota errors, while required identity/create persistence fails closed. Supabase auto-refresh and auth state are long-lived singletons per tab, not server-global user identities.

**Assessment / fix:** The production server has one bounded connection pool, not an in-memory per-user session cache. The client `liveSessions` WeakMap caches one promise per client and removes failures; old clients are collectible. Inspected route/media-query/storage listeners and view timers have cleanup, and generation guards prevent stale UI application. No unbounded per-request event-listener accumulation was found in the inspected session/resume/analytics paths. Pending operations and large histories remain R9/R11/R14, not an all-clear for arbitrary long-session memory.

The unused `createPostgresRepository()` helper owns a private pool without an exposed close handle; do not instantiate it per request or adopt it in production without an explicit lifecycle. The active bootstrap instead injects one shared SQL client and closes it.

Server signals call Fastify close and the SQL close hook uses a five-second pool-end bound. Long outstanding requests can delay reaching that hook; forceful drain policy should be tested with Render shutdown timing, especially if AI is enabled. Monitor RSS, outstanding requests, active/idle connections, auth latency/error rates, 409s and data growth. Static public media is served with no-cache and missing media can fall through to SPA HTML; measure repeated media bandwidth and consider explicit media 404/cache rules in a separate deployment pass.

## Verification and limits

The checks below are local and disposable. Ordinary PostgreSQL uses the repository's test-only Supabase auth fixture; it is never an instruction to run that fixture on a Supabase project. No production credentials are required or printed.

- New cancellation/recovery, twenty-way readiness burst, owner-auth failure isolation, CORS/proxy and shared-IP quota tests.
- Real PostgreSQL: sixteen owners / thirty-two concurrent creates through a two-connection pool and a shared router; unique owner/request sessions, independent saves and foreign-owner denial.
- Real PostgreSQL: revision conflicts, row-lock timeout rollback and unrelated-owner success, concurrent report dedupe/quota, durable launch quota rollback, browser role denial and executable owner-select RLS.
- Real PostgreSQL: concurrent migration runners, repeat apply, checksum drift rejection and failed migration rollback; optional review-table absence does not prevent completion/debrief.
- Required repository commands: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`: all passed.

| Check                                                  | Result                                                                                                         |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `pnpm lint`                                            | PASS, all 11 packages                                                                                          |
| `pnpm typecheck`                                       | PASS, all 11 packages                                                                                          |
| `pnpm test`                                            | PASS, 1,056 tests; 13 skipped (seven database-gated scenarios, six pre-existing skipped specs)                 |
| `pnpm build`                                           | PASS, all 10 build tasks; existing large-chunk advisory remains                                                |
| Database-gated suite with all three disposable DB URLs | PASS, eight tests across five files, zero skipped: seven database scenarios plus migration-discovery unit test |
| `db:plan` / `db:verify`                                | PASS, all seven unchanged migration checksums; no pending SQL                                                  |

Database verification finished against native PostgreSQL 17.11 using three fresh loopback-only disposable databases: fully migrated, auth-fixture-only for the migration runner, and migrated with the optional review table removed. An earlier Docker run passed existing concurrency tests but the local Docker database later stopped with a filesystem I/O error. The final native run re-executed all database scenarios successfully; that local machine failure is not evidence about Render/Supabase reliability.

Actual Render proxy topology, Supavisor behavior, Supabase auth/CAPTCHA/quota settings, database role/TLS/grants, region/network latency and full-shift production throughput were not verified. Approve a staging capacity test with target cohort/replica counts, shared-NAT clients, expiry/resume, dependency latency/outage, analytics failure and graceful shutdown. Observe p95/p99 latency, successful/failed starts, 409/429/5xx, pool utilization/queue wait and memory; compare with an owner-approved launch ceiling. Do not claim a concurrency number from local correctness tests.

### Owner launch-gate closure

1. Review and accept these four fixes; keep optional AI unset or close R7 separately.
2. Resolve shared-IP API and anonymous-auth quotas/CAPTCHA for the intended cohort (R5/R6).
3. Confirm final env/project/role/TLS/migration settings and real Render preflight/IP behavior (R8/R13/R16).
4. Run authorized staging load/outage tests, choose initial concurrency/replica ceiling, and define overload/recovery response (R9/R14).
5. Assign retention/support operations and monitor the deferred indexes/history/abuse work (R10–R12/R15/R17).

This branch is for review only. No merge or deployment is performed.
