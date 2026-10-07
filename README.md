# CareerDive

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

CareerDive local dev is intentionally **strict** about ports:

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

**CareerDive simulates actually doing ordinary career work, not answering questions about work.**

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

Without `DATABASE_URL`, server uses in-memory repository for local development. Production requires Supabase URL, anon key, and Postgres connection string.

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

- The database migration defines owner-scoped RLS for reflections. Live enforcement depends on deployed roles and configuration.
- Sharing grants require a recipient and expiry in the API; no public self-service sharing control is wired.
- Default policy data marks institutional use unavailable; the current entry path does not enforce a school-use gate.
- Apply `apps/server/drizzle/0001_initial.sql`, `0002_decision_reviews.sql`, then `0003_decision_option_set.sql` to the deployment database before production.
- `0002_decision_reviews.sql` is repeatable; `0003_decision_option_set.sql` depends on it. Missing review storage leaves core shift completion intact and hides community comparison.
- Debrief browser QA uses `apps/server/test/debrief-browser-server.ts` to seed prior shift work, then performs the real final completion in Chromium. Start that server with `PORT=3008 pnpm --filter @sim/server exec tsx test/debrief-browser-server.ts`, start Vite with `VITE_SERVER_URL=http://127.0.0.1:3008 pnpm --filter @sim/web exec vite --host 127.0.0.1 --port 5178 --strictPort`, then run `DEBRIEF_BROWSER_FIXTURE=1 WEB_ORIGIN=http://127.0.0.1:5178 pnpm exec playwright test apps/web/e2e/debrief.spec.ts`.
- For assessed-entry browser QA when port 5173 is occupied, start the same test router unseeded with `ASSESSED_BROWSER_FIXTURE=1 PORT=3018 pnpm --filter @sim/server exec tsx test/debrief-browser-server.ts`, start Vite with `VITE_SERVER_URL=http://127.0.0.1:3018 pnpm --filter @sim/web exec vite --host 127.0.0.1 --port 5218 --strictPort`, then run `WEB_ORIGIN=http://127.0.0.1:5218 API_ORIGIN=http://127.0.0.1:3018 pnpm exec playwright test apps/web/e2e/golden-path.spec.ts`.
- Render blueprint lives in `render.yaml`.

See `docs/validation-gate.md` before any 3D or second-career work.

## Brand and repository activation

The platform is **CareerDive**. **Verdaly** remains the fictional workplace
inside the Cybersecurity Analyst simulation.

The GitHub repository is `https://github.com/zaidkan/CareerDive`.
The local checkout directory and registered git remote still use `Career-Expo`.
The owner can update the remote URL and rename the local checkout separately,
after accounting for its registered worktrees. This change does not rename
GitHub repositories, rewrite git remotes, or move any local directories.

`https://careerdive.example.com` is a placeholder, not a production domain.
Set `SITE_ORIGIN` to the real origin when building for deployment.
Existing `career-expo-*`, `career-expo.*`, and `career-expo:*` browser-storage
keys remain stable so saved shifts, pending requests, preferences, and support
drafts survive the rebrand. Package namespaces (`@sim/*`) also remain stable.
