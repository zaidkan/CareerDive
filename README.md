# CareerDive

**Try a shift, don't just read a job description.** CareerDive is a browser-based career-exploration
simulator where you *do* selected tasks from a real job instead of reading about it. The current
playable experience is a Junior Cybersecurity Analyst shift inside a fictional company, Verdaly
Technologies — walk a 3D office, sit at a workstation, investigate a suspicious-login alert using
desk tools, weigh evidence, and hand off your findings.

<!-- TODO(owner): add the live URL + a screenshot or short GIF of the SOC office here before sharing.
     Example:
     🔗 Live: https://<your>.onrender.com
     ![CareerDive — Security Operations office](docs/media/soc-office.png)
-->

> It's a short, honest slice of selected tasks — not a complete account of a career, and not a
> "career-fit score." The goal is to let someone *feel* what a kind of work is like before committing to it.

---

## Why I built it

Most career advice for students is reading: job descriptions, "day in the life" articles, quizzes
that spit out a personality label. None of that lets you actually *try the work*. CareerDive is my
attempt to close that gap for middle- and high-schoolers (13+): a free, no-signup, anonymous
simulation of real on-the-job tasks, so you can decide if a path interests you by doing a piece of
it — not by taking a test about yourself.

## What it does

- **A playable first shift.** Enter a 3D office, reach your desk, and work a real cybersecurity case
  through an in-sim "Desk OS" (email, alerts, record search, inventory, tickets, team chat).
- **Reason about evidence, not trivia.** You review signals, work within approval boundaries,
  document what's still uncertain, and write a handoff for the next analyst. There's no quiz score —
  the debrief reflects *how you reasoned*.
- **An honest debrief.** It describes what you did and what you observed, explicitly not a hiring
  decision, certification, or aptitude diagnosis.

## Engineering highlights (what's interesting under the hood)

- **Deterministic simulation core.** All state, time, consequences, and evidence live in a pure
  TypeScript core (`packages/core`). Replaying the same seed + interaction log reproduces the exact
  same state — which makes the whole thing testable and the debrief trustworthy.
- **Typed client/server boundary.** The browser renders an *authorized projection* of state and
  submits typed actions over tRPC; the server owns the truth. Shared Zod schemas (`packages/schemas`)
  keep the contract honest end to end.
- **Real-time 3D in React.** The workplace is Three.js / React Three Fiber with adaptive quality
  tiers and reduced-motion support, including a depth-parallax city skyline behind glass curtain walls.
- **Privacy by design.** Anonymous sessions (no accounts), closed-ended inputs only, analytics off,
  90-day auto-deletion, no third-party AI in the runtime. See [Privacy](docs/planning/PRIVACY-POLICY.md).
- **Tested like production.** ~1,080 passing tests across unit, integration, renderer-parity, and
  Playwright browser checks; a checksummed, lock-serialized database migration runner; owner-scoped
  data isolation verified against real PostgreSQL.

## Tech stack

TypeScript monorepo (pnpm workspaces + Turborepo) · **Web:** React 19, Vite, Three.js / R3F ·
**API:** Fastify + tRPC · **Data:** PostgreSQL via Drizzle, Supabase (anonymous auth) ·
**Testing:** Vitest + Playwright · **Deploy:** Docker on Render.

---

## Local development

Requires **Node.js 24+** and **pnpm 11** (version pinned in `package.json`).

```bash
pnpm install --frozen-lockfile
pnpm dev
```

| Service | Address |
| --- | --- |
| Web client | `http://localhost:5173` |
| API health | `http://localhost:3001/health` |
| tRPC API | `http://localhost:3001/trpc` |

After startup, verify local services with `pnpm check:dev`, open the web client, choose the
Cybersecurity Analyst room, and enter the workplace. Local dev runs without `DATABASE_URL` (uses a
process-local in-memory repository). Production requires PostgreSQL + Supabase config; see the
[environment contract](docs/ops/environment-contract.md). Ports 5173 and 3001 must be free (Vite uses
a strict port):

```bash
lsof -nP -iTCP:5173 -sTCP:LISTEN
lsof -nP -iTCP:3001 -sTCP:LISTEN
```

## Architecture

TypeScript monorepo managed by pnpm workspaces and Turborepo.

| Location | Responsibility |
| --- | --- |
| `apps/web` | React 19 + Vite web client; Three.js / R3F workplace rendering; public career pages and accessible recovery workspace |
| `apps/server` | Fastify + tRPC API; authenticated session ownership, PostgreSQL persistence through Drizzle, Supabase Auth integration |
| `packages/core` | Deterministic state transitions, task rules, scheduling, queries, and replay |
| `packages/schemas` | Shared Zod schemas and typed contracts |
| `packages/career-packs` | Loading and validation of authored career packs |
| `packages/safety` | Validation of user-facing text and exploration guardrails |
| `packages/evidence`, `packages/pathways` | Evidence records and career pathway data |
| `packages/testing` | Shared simulation verification and renderer parity contracts |
| `packages/video` | Remotion compositions rendered to media files separately from the web runtime |
| `content/packs` | Authored career scenarios, records, tasks, and review metadata |

The deterministic core owns simulation state, time, consequences, evidence, and available knowledge;
replaying the same seed + interaction log produces the same state. Workplace dialogue is prewritten
and selected by deterministic rules. The browser renders the authorized client projection and submits
typed actions.

## Scripts and verification

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the web and API development services |
| `pnpm check:dev` | Check local ports and API connectivity |
| `pnpm test` | Run the default Vitest regression suite |
| `pnpm test:golden-path` | Start local services and run Playwright browser checks |
| `pnpm build` | Build workspace packages and the production web client |

Browser checks and media capture require Playwright's browsers (media capture also needs `cwebp`).
Ordinary development and the default tests do not require cloud credentials.

## Deployment

Production uses the Docker services in `render.yaml` (Render), with PostgreSQL + anonymous auth via
Supabase. Database migrations use a checksummed runner — inspect the plan before applying:

```bash
pnpm --filter @sim/server db:plan     # offline, does not connect
pnpm --filter @sim/server db:verify   # verify applied history
pnpm --filter @sim/server db:migrate  # apply pending (requires DATABASE_URL)
```

See the [environment contract](docs/ops/environment-contract.md) for build-time origins, runtime
configuration, and the web/API boundary (web `VITE_*`/`SITE_ORIGIN`/`BUILD_SHA` are **build args**).

## Privacy

Anonymous use (no accounts), closed-ended inputs, analytics off at launch, 90-day data retention, no
runtime AI. Intended for ages 13+. Full policy: [Privacy Policy](docs/planning/PRIVACY-POLICY.md) ·
[Terms](docs/planning/TERMS.md).

## Documentation

- [Contributing](CONTRIBUTING.md) — setup, conventions, verification
- [Public career content](docs/content/public-career-content-packet.md)
- [First-shift content map](docs/content/cybersecurity-first-shift-map.md)
- [Art direction](docs/ui-1-art-direction.md)

## License

MIT. See [LICENSE](LICENSE).
