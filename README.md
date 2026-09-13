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

Start an assessed shift, enter the workstation, and move between Alerts,
Email, Tickets, Knowledge Base, and Team Chat. The expected path contains more
than twenty targeted workplace actions across:

- An incomplete shift handoff.
- A suspicious-login investigation.
- Overlapping routine monitoring.
- An employee phishing report.
- A calm false-positive review.

Events arrive as simulated time advances. Earlier dismissal choices can create
delayed consequences while later work is underway. Actions are deterministic
and replayable; manager guidance cannot change canonical outcomes.

The break-room loop is also deterministic: the fridge has finite snack bars,
each carried bar has three bites, and coffee follows start, finish, pour, and
drink controls. Energy changes only through canonical work and these finite
resources; it never drains while idle and there is no automatic collapse or
refill loop.

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
