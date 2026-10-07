# Owner activation: Supabase → verified smoke → approved Render deployment

This file is tomorrow's controlled runbook. Preparation was offline: no final Supabase project, cloud connection, production migration, Render deployment, DNS change, or merge has been performed. Dashboard labels may vary; confirm labels in the live UI tomorrow. Follow the sequence in order.

## STEP 1 — Owner creates the project

**Owner clicks/types:** Sign in to Supabase, choose the intended organization, click **New project**, enter `Career Expo` (or your chosen production name), and generate a strong database password in your password manager. Keep the password there. Do not paste it into chat or commit it.

**Worker can do:** Review this branch and migration plan offline. The worker must not create or connect to a project without a new owner instruction.

## STEP 2 — Owner chooses the region before creation

**Owner clicks:** Select the region closest to the launch audience and intended Render API region. For a primarily eastern-US audience, choose an available eastern-US region and a nearby Render region. Compare the actual choices shown in both dashboards; do not assume identical region names. Changing region later requires a separate migration plan. Finish creating the project and wait until it is ready.

**Worker can do:** Explain the choices after you provide nonsensitive region names. No automatic external changes.

## STEP 3 — Owner enables anonymous authentication

**Owner clicks:** Open **Authentication → Sign In / Providers** (or the current providers/settings page), open **Anonymous Sign-Ins**, enable anonymous sign-in, and save. In **Authentication → URL Configuration**, set the Site URL to the chosen public web origin once known. Redirect-based login is not used by this implementation.

Anonymous sign-in creates an `auth.users` row and issues a bearer token; it does not require the visitor to enter an email or password. Do not enable public database table write policies. Before public launch, review Supabase anonymous-user abuse controls, signup limits, and whether CAPTCHA is required for your traffic. If you enable mandatory CAPTCHA, stop activation: this branch has no CAPTCHA token UI yet. This is a real compatibility gate, not a reason to disable RLS.

## STEP 4 — Owner obtains exactly three Supabase values

1. **Project URL:** Copy from project API settings / Connect dialog: `https://<project-ref>.supabase.co`.
2. **Public publishable key**, or legacy **anon key:** Copy from API keys. Choose `sb_publishable_…` or the key explicitly labeled `anon`. Do **not** choose `sb_secret_…`, `service_role`, or a JWT signing secret.
3. **Database connection URL:** Open **Connect**, choose the PostgreSQL **Session pooler** connection (normally port `5432`, IPv4-compatible). Copy its full connection URL, fill its database-password placeholder privately, and enable TLS (`sslmode=require` or the TLS setting required by the copied connection instructions). URL-encode password characters if needed. The pooler username usually includes the project reference; keep the dashboard's exact username/host/database. Use session pooling, not the transaction-pooler URL, for this runbook.

No service-role key, JWT secret, manual table definitions, or manual SQL pasted from chat is needed.

## STEP 5 — Owner puts each value in the exact place

Use [environment-contract.md](environment-contract.md). Do not put secrets in the root `.env.example`; it is committed documentation. For a local connected smoke tomorrow, create private ignored files `apps/server/.env.production.local` and `apps/web/.env.production.local` using your editor/password manager. The server does not auto-load dotenv; use Node's explicit env-file support below. Never print these files.

**API private file / later Render API Environment:**

```dotenv
NODE_ENV=production
PORT=3001
DATABASE_URL=<private session-pooler connection URL>
SUPABASE_URL=<project URL>
SUPABASE_ANON_KEY=<public publishable or anon key>
WEB_ORIGIN=http://localhost:5173
INSTITUTIONAL_DEPLOYMENT_ENABLED=false
```

The local smoke uses the local web origin. Replace `WEB_ORIGIN` with the exact Render web HTTPS origin before deployment.

**Web private local file / later Render web build arguments:**

```dotenv
VITE_SERVER_URL=http://localhost:3001
VITE_SUPABASE_URL=<same project URL>
VITE_SUPABASE_ANON_KEY=<same public key>
SITE_ORIGIN=http://localhost:5173
BUILD_SHA=<approved full commit SHA>
VITE_LAUNCH_ANALYTICS_ENABLED=true
```

For Render replace `VITE_SERVER_URL` with the API HTTPS origin and `SITE_ORIGIN` with the web HTTPS origin. These web values are public. Add no DB credentials or service-role credentials to this file or any `VITE_*` variable.

**Worker can do after new authorization:** Validate variable names/placement without printing values; run commands using private files. No credentials need to be pasted to the worker.

## STEP 6 — Verify migration plan, then authorize and apply migrations

**Owner/tool can run offline now:**

```sh
pnpm --filter @sim/server db:plan
```

Expected: ordered checksums for `0001` through `0007` (plus any later reviewed migrations). No DB connection occurs.

**Owner must explicitly approve the production migration before either owner/tool runs this next command.** From repository root, with the ignored server file already saved:

```sh
node --env-file=apps/server/.env.production.local --import tsx apps/server/scripts/migrate.ts
```

Expected on a new project: all seven migrations applied once. The runner uses one transaction and an advisory lock. It discovers SQL files, records SHA-256 checksums in private `public.app_migrations`, rejects changed/reordered history, and rolls back all pending SQL if any migration fails. No handwritten journal is used. Application startup never runs migrations.

Then verify, without writing:

```sh
node --env-file=apps/server/.env.production.local --import tsx apps/server/scripts/migrate.ts --verify
```

Expected: `Migration history verified; no pending SQL`. A second approved apply reports an empty applied list. If a schema exists without this ledger, stop and audit/reconcile it; do not insert ledger rows or rerun old SQL blindly. No manual table creation in the Supabase Dashboard is required.

`0001` requires Supabase-owned `auth.users`, `auth.uid()` and `authenticated`; later hardening also requires `anon`. Ordinary PostgreSQL lacks these. The disposable test-only fixture is documented in [offline-verification.md](offline-verification.md); never run that fixture on Supabase.

## STEP 7 — Connected production-mode smoke, before Render deployment

**Owner authorizes connection/tests; worker can execute locally:**

```sh
node --env-file=apps/server/.env.production.local --import tsx apps/server/src/main.ts
```

In another terminal, build and preview the production web bundle with the private public values (do not start a second stack):

```sh
node --env-file=apps/web/.env.production.local apps/web/node_modules/vite/bin/vite.js build apps/web
node --env-file=apps/web/.env.production.local apps/web/node_modules/vite/bin/vite.js preview apps/web --host 127.0.0.1 --port 5173 --strictPort
```

Open `http://localhost:5173`. This is a local UI using a production-mode API against the new cloud project. It will create test identities, sessions, requests, reports and events; it therefore needs explicit owner authorization. Record the nonsensitive test result, not tokens or passwords.

Check all of these:

- `/health` returns alive; `/ready` returns ready only when migration history, DB schema and Supabase auth health pass.
- Start first day. Supabase Authentication Users shows an anonymous user. Browser API requests carry `Authorization: Bearer …`; the production API receives no dependency on `x-user-id`.
- Double-click/retry/reload around start. There is one session for the owner/create-request key. Reload restores the same shift. Retrying a key with different seed/kind/pacing returns conflict.
- Expired-token refresh retains the identity. Missing/invalid bearer is unauthorized even if `x-user-id` or `x-requester-key` is forged.
- In a second private browser identity, attempts to fetch, decide, hand off, or get debrief for the first identity's session fail. Do not share tokens between identities.
- Request a Workshop career. State survives reload, duplicate request remains one row, unrequest persists, failed writes do not claim success. Public page shows **Request this career** and no public counts.
- Send a support report without diagnostics/contact, then one with opt-in bounded diagnostics. Confirm private DB rows, deduped retry and appropriate rate limits. Keep report contents nonsensitive. The UI keeps drafts when delivery fails.
- Browser direct database writes to simulation state fail. Direct browser reads of reports, career rows and raw cohort decisions fail. Check both `anon` and an anonymous user's `authenticated` token.
- Complete the shift and debrief. First-party launch rows contain only event ID/name, optional allowlisted career ID, and server time. No text, token, owner/session ID, full URL, IP, or user agent is stored in launch events.

Do not set `TEST_DATABASE_URL` to this production project; test suites assume disposable DBs and can delete test records. Use manual connected smoke or a separately approved staging project. Stop on any failed gate. No deployment approval is implied by successful smoke.

## STEP 8 — Owner prepares Render settings

**Owner clicks/types:** Select the intended repository, this approved branch/SHA, and the two Dockerfiles. Disable automatic deploys. Reserve/select the API/web service names and regional placement. Put API runtime variables and web build variables exactly as STEP 5 describes, using the selected HTTPS origins. API health path: `/ready`; web health path: `/health`. Web runtime `PORT=8080` unless Render supplies another port. Build context is repository root.

**Do not submit Create/Apply Blueprint/Deploy yet:** Those buttons can trigger immediate builds/deployment. If Render's current UI cannot save a service without deploying, record the proposed names, origins, region, env names and settings in a private owner worksheet and wait for STEP 9 approval. `render.yaml` is a reviewable template, not authorization to apply it.

The web bundle uses the API's public origin; no Nginx proxy target is required. API CORS must exactly match the web origin. Render must pass the matching web env names as Docker build arguments. There are no migration commands in container startup or automatic Render hooks: migration approval remains separate and explicit.

**Worker can do:** Review settings and build args, locally build reviewed Dockerfiles, compare artifact SHA, prepare deployment commands. No Render action is authorized by this preparation task.

## STEP 9 — Deploy only after explicit owner approval

**Owner explicitly approves:** The exact SHA, production migration results, smoke results, target Render services/region/origins, public web build values, and the deployment itself. Only then may owner/tool create/apply services or trigger deployment. This branch must not be merged without a separate instruction.

After approval, deploy API first, verify `/ready`, then build/deploy web with final origins and exact SHA. Repeat STEP 7 smoke against Render. Verify server CORS/forwarded client-IP behavior (API trusts exactly one platform proxy hop), deep-link SPA reload, API JSON error routing, and browser storage/auth refresh. Keep deployment closed to launch traffic until these pass. Do not change DNS/domain as part of this sequence without a separate owner instruction.

Before admitting public launch traffic, the owner must assign private support access and retention operations. Suggested launch ceiling: delete support reports and launch events older than 30 days; this branch does not schedule a cloud deletion job. Approve a retention schedule or documented operator procedure; never imply an automatic purge exists. Review infrastructure access logs separately—product tables do not store IPs or tokens, but hosting platforms may retain access logs under their own settings. Optional AI and PostHog are not required.
