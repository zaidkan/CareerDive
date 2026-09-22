# Career Simulation Platform

Bounded career-exploration beta centered on ordinary Junior Cybersecurity Analyst work. Deterministic TypeScript core owns state, time, rules, consequences, evidence, and NPC knowledge. AI may generate validated dialogue only.

## Local development

Requires Node 24 and pnpm 11.

```bash
cp .env.example .env
pnpm install
pnpm dev
```

Web: `http://localhost:5173`
API health: `http://localhost:3001/health`

## Current playable shift

**Career Expo simulates actually doing ordinary career work, not answering questions about work.**

Start an assessed shift, enter the workstation, and work through the same deterministic state in **Desk only**, **Walk the office**, or **Simple list** (keyboard) — all three renderers expose identical canonical action IDs and outcomes.

Canonical systems: **Alert Dashboard · Email · Ticket Queue · Knowledge Base · Team Chat**. Canonical events on `zaidkan/product-experimental` (pack `cybersecurity_analyst@1.0.0`):

- **Incomplete shift handoff** (`handoff-1`, Email + Team Chat) — read the handoff email, identify the unfinished device check and missing scanner reference, confirm priority with Morgan.
- **Suspicious-login investigation** (`suspicious-login-1`, A-1042) — review the alert timeline, isolate device/network clues, compare the account baseline (HQ Wi-Fi + enrolled MacBook vs. unknown Windows laptop + residential ISP), test the VPN route explanation (S-0731/V-218 at `198.51.100.20` vs. S-0741 at `203.0.113.44` without a VPN ID), match `unknown-laptop-17` in inventory, incorporate the employee reply and travel-record coverage limit, then build the ticket (evidence → uncertainty → route comparison → collection limits → next step) and escalate.
- **Routine scanner interruption** (`routine-alert-1`, A-1180, arrives ~25m in) — triage the new low-priority alert, match it to the approved scanner window (`vuln-scan-03`, finance, Mon 10:00–12:00) and recorded run (`RUN-FIN-031`, `SCAN-FIN-MON`), distinguish recorded event time (Mon 10:18) from queue-arrival time, document scope/coverage, and close as expected.

Work is deterministic and replayable (same seed + same interaction log = same state). Dismissing the login without escalation can create a **delayed consequence** (`delayMinutes: 40`, `escalateOnApply`) while later work is underway; break-room work and idle time never change evidence. Manager guidance is procedural only and cannot change canonical outcomes.

The break-room loop is also deterministic: the fridge has finite snack bars (2), each carried bar has three bites, and coffee follows start → finish → pour → drink (2 servings). Energy changes only through canonical work and these finite resources; it never drains while idle and there is no automatic collapse or refill loop. If energy is exhausted, the one-time manager recovery is the only fallback (and it does not create a refill loop).

> **Not live on this branch:** employee phishing report, quarantine/message actions, and other phishing artifacts remain quarantined (Phase 1 R1) and are not offered by any progression; calm false-positive review beyond the current `routine_alert_review` scanner path is not a live scenario. Those remain future content and must not be presented as playable.

## Manual acceptance route

After `pnpm dev`, open the Web URL above and start an assessed shift. Complete
onboarding and desk login, read and acknowledge the handoff, investigate the
suspicious login, handle the optional routine scanner interruption, take one
break (snack or coffee and Jules), document the ticket, escalate, and wrap up.
Repeat the same route with **Simple list** using the keyboard; it exposes the
same canonical actions and outcomes as **Desk only** and **Walk the office**.

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

- Reflection access defaults to owner-only RLS.
- Sharing requires explicit, expiring grant.
- Institutional deployment remains disabled.
- Apply `apps/server/drizzle/0001_initial.sql` to Supabase before production.
- Render blueprint lives in `render.yaml`.

See `docs/validation-gate.md` before any 3D or second-career work.
