# Contributing to CareerDive

CareerDive is a pnpm workspace with a deterministic simulation core, a web
client, and a server API. Read the [README](README.md) for the product scope
and architecture before making changes.

## Development setup

Use Node.js 24 or newer and pnpm 11 (the exact pnpm version is pinned in
`package.json`). From the repository root:

```bash
pnpm install --frozen-lockfile
pnpm dev
```

The web client uses port 5173 and the API uses port 3001. Both ports must be
available. Run `pnpm check:dev` after startup to verify the local stack.
Local development can use the in-memory repository without credentials.
See the [environment contract](docs/ops/environment-contract.md) for
database-backed configuration; keep credentials out of commits and reports.

## Conventions

- Keep changes focused and describe the problem, resulting behavior, and validation in the pull request.
- Use TypeScript and existing shared Zod contracts at client/server boundaries.
- Keep simulation rules, state transitions, and evidence authoritative on the server. Presentation changes must not invent facts or alter outcomes.
- Keep authored career data in `content/packs/` and public career copy aligned with the [content packet](docs/content/public-career-content-packet.md).
- Preserve keyboard access, reduced-motion preferences, and accessible recovery paths when changing the interface.
- Add regression coverage for behavior changes. Do not weaken assertions or add retries to hide failures.
- Add new database migrations rather than editing previously applied migrations.

## Verification

Run these commands before submitting a change:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

`pnpm test` is the default regression suite. The separate `pnpm test:red`
command runs development contracts for capabilities that may still be
unimplemented; those files are intentionally excluded from the default suite.
Browser checks require Playwright's browser installation and the appropriate
local services or fixtures.
