# Career Simulation Platform

Bounded career-exploration beta centered on ordinary Junior Cybersecurity Analyst work. Deterministic TypeScript core owns state, time, rules, consequences, evidence, and NPC knowledge. AI may generate validated dialogue only.

## Local development

Requires Node 24 and pnpm 11.

```bash
cp .env.example .env
pnpm install
pnpm dev
```

Exact start command: **`pnpm dev`**.

| Service | URL |
|---|---|
| Web | `http://localhost:5173` |
| API health | `http://localhost:3001/health` |
| Session/tRPC | `http://localhost:3001/trpc` |

After both processes are up, optionally verify:

```bash
pnpm check:dev
```

### Port collisions (fail fast)

Career Expo local dev is intentionally **strict** about ports:

- Web must bind **5173** (`strictPort`). Vite will **not** silently fall back to 5174/5175.
- API must bind **3001**. A second stack or stale process fails with `EADDRINUSE` and a recovery hint.
- Development CORS only allows `http://localhost:5173` and `http://127.0.0.1:5173` — a jumped web port cannot create sessions.

**How to recognize a collision**

- Vite exits immediately with a port-in-use error for 5173 (instead of printing a different port).
- Server logs `API port 3001 is already in use (EADDRINUSE)` and exits non-zero.
- Do not start a second `pnpm dev` while one is already running.

**Inspect a holder (do not auto-kill):**

```bash
lsof -nP -iTCP:5173 -sTCP:LISTEN
lsof -nP -iTCP:3001 -sTCP:LISTEN
```

Stop only the process you recognize (stale Vite/tsx from a previous session).

## Current playable shift

**Career Expo simulates actually doing ordinary career work, not answering questions about work.**

One assessed session per run: landing → arrival film → **Begin your first day** → 3D workplace → walk to your workstation → Desk OS. There are no practice/tutorial shifts and no user-facing product modes; an in-experience accessibility recovery path exists only for navigation/WebGL failure.

Canonical systems: **Alert Dashboard · Email · Ticket Queue · Knowledge Base · Team Chat**. Canonical events on `zaidkan/product-experimental` (pack `cybersecurity_analyst@1.0.0`):

- **Incomplete shift handoff** (`handoff-1`, Email + Team Chat) — read the handoff email, identify the unfinished device check and missing scanner reference, confirm priority with Morgan.
- **Suspicious-login investigation** (`suspicious-login-1`, A-1042) — review the alert timeline, isolate device/network clues, compare the account baseline (HQ Wi-Fi + enrolled MacBook vs. unknown Windows laptop + residential ISP), test the VPN route explanation (S-0731/V-218 at `198.51.100.20` vs. S-0741 at `203.0.113.44` without a VPN ID), match `unknown-laptop-17` in inventory, incorporate the employee reply and travel-record coverage limit, then build the ticket (evidence → uncertainty → route comparison → collection limits → next step) and escalate.
- **Routine scanner interruption** (`routine-alert-1`, A-1180, arrives ~25m in) — triage the new low-priority alert, match it to the approved scanner window (`vuln-scan-03`, finance, Mon 10:00–12:00) and recorded run (`RUN-FIN-031`, `SCAN-FIN-MON`), distinguish recorded event time (Mon 10:18) from queue-arrival time, document scope/coverage, and close as expected.

Work is deterministic and replayable (same seed + same interaction log = same state). Dismissing the login without escalation can create a **delayed consequence** (`delayMinutes: 40`, `escalateOnApply`) while later work is underway; break-room work and idle time never change evidence. Manager guidance is procedural only and cannot change canonical outcomes.

The break-room loop is also deterministic: the fridge has finite snack bars (2), each carried bar has three bites, and coffee follows start → finish → pour → drink (2 servings). Energy changes only through canonical work and these finite resources; it never drains while idle and there is no automatic collapse or refill loop. If energy is exhausted, the one-time manager recovery is the only fallback (and it does not create a refill loop).

> **Not live on this branch:** employee phishing report, quarantine/message actions, and other phishing artifacts remain quarantined (Phase 1 R1) and are not offered by any progression; calm false-positive review beyond the current `routine_alert_review` scanner path is not a live scenario. Those remain future content and must not be presented as playable.

## Manual acceptance route

After `pnpm dev`, open `http://localhost:5173`, play the arrival film, begin
your first day (one assessed session), walk the 3D office to your workstation,
log in to Desk OS, then read and acknowledge the handoff, investigate the
suspicious login, handle the optional routine scanner interruption, take one
break (snack or coffee and Jules), document the ticket, escalate, and wrap up.

Without `DATABASE_URL`, server uses in-memory repository for local development. Production requires Supabase URL, anon key, Postgres connection string, and the public web origin.

## Verification

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Paid AI reliability tests use separate config and do not run through normal test command:

```bash
pnpm vitest run --config vitest.ai.config.ts
```

## Privacy and deployment

- Reflection access defaults to owner-only RLS.
- Sharing requires explicit, expiring grant.
- Institutional deployment remains disabled.
- The API container runs `pnpm --filter @sim/server db:migrate` before it starts. Migration `0001_initial` runs once in a transaction with an advisory lock. A database where that SQL was previously applied manually is recorded only when every expected table and policy exists. Partial existing schemas stop deployment for inspection.
- Render blueprint lives in `render.yaml`.
- Web container requires `SITE_ORIGIN` at runtime: public HTTPS origin only, no trailing slash (for example `https://expo.example.org`). Startup fails when unset or malformed. Render web service must set this variable. Container fills prerendered canonical/OG URLs, sitemap, robots, and JSON-LD before Nginx starts.
- Local static builds require `STATIC_SITE_ORIGIN`, for example `STATIC_SITE_ORIGIN=http://localhost:5173 pnpm build`. Standalone public builds must use their public HTTPS origin. Docker builds use a runtime placeholder and require `SITE_ORIGIN` when started.

### Production deployment

Set API `DATABASE_URL` to a writable Supabase Postgres connection (direct or session pooler), `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `WEB_ORIGIN` to the exact public web origin, without a trailing slash. `ANTHROPIC_API_KEY` is optional. Set web `VITE_SERVER_URL` to the exact public API origin, without a trailing slash, and web `SITE_ORIGIN` to the public HTTPS web origin. Render passes `VITE_SERVER_URL` as a Docker build argument; web image build rejects a missing or malformed value. Web container refuses to start without `SITE_ORIGIN`. Do not use a local `.env` file as a Docker build input.

From a clean checkout, build and start using the same Dockerfiles as Render:

```bash
docker build -f Dockerfile.server -t career-expo-api .
docker build -f Dockerfile.web --build-arg VITE_SERVER_URL=https://api.example.com -t career-expo-web .
docker run --rm --env-file production-api.env -p 3001:3001 career-expo-api
docker run --rm -e SITE_ORIGIN=https://expo.example.org -p 8080:80 career-expo-web
```

`production-api.env` must contain `NODE_ENV=production` and the four required API variables above. Replace example URLs with deployment URLs. API `/health` returns 200 only when Postgres is reachable and `simulation_sessions` exists; it returns 503 on DB failure. Web public routes serve prerendered HTML through Nginx, `/start` loads directly with `noindex`, and unknown routes return HTTP 404. Render checks API `/health` and web `/`. If migration fails, API process exits before listening; inspect the error and database rather than bypassing migration.

See `docs/validation-gate.md` before any 3D or second-career work.
