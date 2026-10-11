# CareerDive

CareerDive is a career-exploration beta where people try selected workplace
tasks instead of only reading job descriptions. The current playable
experience is a Junior Cybersecurity Analyst shift in Verdaly Technologies,
a fictional workplace. Other careers appear as Workshop previews; they do
not yet have playable simulations.

The shift combines a 3D office with Desk OS tools for email, alerts, record
search, inventory, tickets, and team communication. Players review evidence,
work within approval boundaries, document uncertainty, and hand off findings.
CareerDive is a short exploration of selected tasks, not a complete account
of an occupation or a career-fit score.

## Local development

Requires **Node.js 24 or newer** and **pnpm 11**. The exact pnpm version is
pinned in `package.json`.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

| Service | Address |
| --- | --- |
| Web client | `http://localhost:5173` |
| API health | `http://localhost:3001/health` |
| tRPC API | `http://localhost:3001/trpc` |

After startup, verify the local services with `pnpm check:dev`. Open the web
client, choose the Cybersecurity Analyst room from the start page, and enter
the workplace. The workstation provides the shift's Desk OS tools.

Ports 5173 and 3001 must be free. Vite uses a strict port; development CORS
allows `http://localhost:5173` and `http://127.0.0.1:5173`. A second stack
fails instead of silently choosing another port. To inspect a port holder:

```bash
lsof -nP -iTCP:5173 -sTCP:LISTEN
lsof -nP -iTCP:3001 -sTCP:LISTEN
```

Stop only a process you recognize before restarting the stack.

Local development works without `DATABASE_URL`, using a process-local
in-memory repository. Production requires a PostgreSQL connection and
Supabase authentication configuration. The [environment contract](docs/ops/environment-contract.md)
documents server variables and public web build variables. `.env.example`
is a configuration reference; the root development command does not load
that file automatically. Supply variables through the process environment.

## Architecture

CareerDive is a TypeScript monorepo managed by pnpm workspaces and Turborepo.

| Location | Responsibility |
| --- | --- |
| `apps/web` | React 19 and Vite web client; Three.js and React Three Fiber workplace rendering; public career pages and accessible recovery workspace |
| `apps/server` | Fastify and tRPC API; authenticated session ownership, PostgreSQL persistence through Drizzle, and Supabase Auth integration |
| `packages/core` | Deterministic state transitions, task rules, scheduling, queries, and replay |
| `packages/schemas` | Shared Zod schemas and typed contracts |
| `packages/career-packs` | Loading and validation of authored career packs |
| `packages/ai` and `packages/safety` | Optional dialogue generation, context restrictions, schema validation, and safety checks |
| `packages/evidence` and `packages/pathways` | Evidence records and career pathway data |
| `packages/testing` | Shared simulation verification and renderer parity contracts |
| `packages/video` | Remotion compositions rendered to media files separately from the web runtime |
| `content/packs` | Authored career scenarios, records, tasks, and review metadata |

The server's deterministic core owns simulation state, time, consequences,
evidence, and available knowledge. Replaying the same seed and interaction
log produces the same state. Optional AI generates validated dialogue within
the allowed context; it does not decide scenario facts or outcomes. The
browser renders the authorized client projection and submits typed actions.

## Scripts and verification

Run the default checks from the repository root:

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
| `pnpm check:product-contract` | Validate the single-experience product contract |
| `pnpm test` | Run the default Vitest regression suite |
| `pnpm test:red` | Run separate development contracts for unimplemented capabilities; failures may be intentional |
| `pnpm test:golden-path` | Start the local web/API services and run Playwright browser checks |
| `pnpm capture:product-media` | Capture product images using the local browser harness |
| `pnpm build` | Build workspace packages and the production web client |

Browser checks and media capture require Playwright's browsers; media capture
also requires `cwebp`. Keep ports 5173 and 3001 free before running
`pnpm test:golden-path`. Ordinary development and the default tests do not require
paid dialogue-provider credentials.

## Privacy and deployment

- The database migration defines owner-scoped RLS for reflections. Live enforcement depends on deployed roles and configuration.
- Sharing grants require a recipient and expiry in the API; no public self-service sharing control is wired.
- Default policy data marks institutional use unavailable; the current entry path does not enforce a school-use gate.

Production deployment uses the Docker services in `render.yaml`. Before
applying migrations to an explicitly selected database, inspect the
checksummed plan:

```bash
pnpm --filter @sim/server db:plan
```

The migration runner provides `db:migrate` and `db:verify` for that selected
database. It requires `DATABASE_URL`; the plan command does not connect.
See the [environment contract](docs/ops/environment-contract.md) for
build-time origins, runtime configuration, and the web/API boundary.

## Documentation and contribution

- [Contributing](CONTRIBUTING.md): setup, conventions, and verification.
- [Public career content](docs/content/public-career-content-packet.md): published career data and source references.
- [First-shift content map](docs/content/cybersecurity-first-shift-map.md): cybersecurity workplace situations and their learning boundaries.
- [Art direction](docs/ui-1-art-direction.md): interface tokens and reusable visual components.
- [Visual verification](docs/ui-visual-freeze-checklist.md): browser and presentation checks.
- [Validation gate](docs/validation-gate.md): criteria for expanding the product.
- [Incident response](docs/incidents.md): operational incident playbooks.

## License

MIT. See [LICENSE](LICENSE).
