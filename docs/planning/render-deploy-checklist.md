# CareerDive — Render Deploy Checklist

> STATUS: Config validated (real Docker build + prod-mode boot against live Supabase: /health 200, /ready {"status":"ready"}).
> DB migrations already applied (7/7) + RLS/anon-isolation verified. Supabase env files filled + validated.
> DO NOT DEPLOY until the Desk OS overhaul + remaining fixes are integrated into the launch commit AND the owner explicitly approves.
> Services do not exist yet. Workspace "CareerDive" created, GitHub connected. Initial testing on *.onrender.com.

## 0. Prerequisites (done)
- [x] Supabase project live, anonymous sign-in enabled, migrations 0001–0007 applied, RLS on all tables, anon isolation verified.
- [x] Env values known (in local git-ignored apps/server/.env.production.local + apps/web/.env.production.local — NOT committed).
- [x] render.yaml validated against Dockerfiles (health paths, build args, ports all match).
- [ ] Final launch commit chosen (after Desk OS overhaul merges). Record its full SHA → used as BUILD_SHA.

## 1. Create the API service (do FIRST — web needs its URL)
- New > Web Service > from the connected CareerDive GitHub repo.
- Name: `careerdive-api`
- Runtime: **Docker**; Dockerfile path: `./Dockerfile.server`; build context: repo root.
- Branch: the approved launch branch/commit.
- Health Check Path: **`/ready`**
- Auto-Deploy: **Off** (deploy manually on approval).
- Instance: free tier OK for testing (note: free sleeps after inactivity → cold start ~30-60s; upgrade to always-on for public launch).
- RUNTIME Environment Variables (API) — set these in the dashboard (mark secrets):
  | Key | Value | Secret? |
  |---|---|---|
  | `NODE_ENV` | `production` | no |
  | `DATABASE_URL` | session-pooler URI ending `?sslmode=require` (with db password) | YES |
  | `SUPABASE_URL` | `https://<ref>.supabase.co` | no |
  | `SUPABASE_ANON_KEY` | `sb_publishable_…` | treat as config |
  | `WEB_ORIGIN` | **the web service HTTPS origin** (fill AFTER step 2 gives you the web URL) — exact, NO trailing slash | no |
  | `INSTITUTIONAL_DEPLOYMENT_ENABLED` | `false` | no |
- Note the API URL Render assigns, e.g. `https://careerdive-api.onrender.com`.

## 2. Create the web service
- New > Web Service > same repo.
- Name: `careerdive-web`
- Runtime: **Docker**; Dockerfile path: `./Dockerfile.web`; build context: repo root.
- Health Check Path: **`/health`**
- Auto-Deploy: **Off**.
- ⚠️ CRITICAL — these go in **"Build Arguments" / Docker build args**, NOT just runtime env. The Dockerfile has `ARG` for each and a `RUN test -n` that FAILS the build if any is empty. (render.yaml lists them under envVars with sync:false; for a manually-created Docker service you must set them as BUILD ARGS.)
  | Build Arg | Value |
  |---|---|
  | `VITE_SERVER_URL` | the API URL from step 1, e.g. `https://careerdive-api.onrender.com` (no trailing slash) |
  | `VITE_SUPABASE_URL` | same `https://<ref>.supabase.co` as API |
  | `VITE_SUPABASE_ANON_KEY` | same `sb_publishable_…` as API |
  | `SITE_ORIGIN` | the web service HTTPS origin (its own URL for testing) |
  | `BUILD_SHA` | the approved full commit SHA |
  | `VITE_LAUNCH_ANALYTICS_ENABLED` | `true` (or `false` to launch without analytics) |
- RUNTIME env (web): `PORT=8080` (matches Dockerfile EXPOSE 8080; Render may override).
- Note the web URL, e.g. `https://careerdive-web.onrender.com`.

## 3. Close the URL loop (chicken-and-egg)
- API `WEB_ORIGIN` ← web URL (step 2). Set it, redeploy API.
- Web `VITE_SERVER_URL` build arg ← API URL (step 1). (Already set if API was created first.)
- CORS is EXACT-MATCH to `WEB_ORIGIN` (apps/server config). Any mismatch (trailing slash, http vs https, wrong subdomain) → browser can't create sessions. Triple-check.
- Changing a web build arg requires a REBUILD (static bundle); runtime env change alone won't update the browser bundle.

## 4. Deploy order (on approval only)
1. Deploy API. Wait for `/ready` green.
2. Deploy web (with build args). Wait for `/health` green.
3. If you set WEB_ORIGIN/VITE_SERVER_URL after first build, redeploy the affected service.

## 5. Verification (live smoke, after deploy)
- [ ] `GET https://<api>/health` → 200 (liveness)
- [ ] `GET https://<api>/ready` → 200 `{"status":"ready"}` (DB + Supabase auth healthy)
- [ ] Web URL loads; no console errors.
- [ ] Start a shift → a Supabase anonymous user appears in Authentication > Users; browser requests carry `Authorization: Bearer …`; session.create returns 200 (NOT 401).
- [ ] Reload mid-shift → same session resumes (same browser profile).
- [ ] Second private browser profile cannot access the first's session/data (401).
- [ ] Report-a-problem submits (persists to support_reports).
- [ ] `/careers`, `/faq`, `/trust` deep links load (nginx serves SPA; `/api/*` + `/trpc*` return JSON 404, not SPA).
- [ ] Complete a shift → debrief renders.
- [ ] Launch video section loads lazily (no eager download).

## 6. Known gotchas
- Web build FAILS if any of the 6 build args is missing (`RUN test -n`). Most common deploy failure.
- Free tier cold starts; upgrade API+web to always-on before public launch.
- CORS exact-match: WEB_ORIGIN must equal the real web origin precisely.
- Migrations are NOT run on boot (server CMD runs main.ts only). They're already applied; if schema changes later, run the migration step manually before deploying new schema-dependent code.
- Do NOT put DATABASE_URL or any secret into web build args / VITE_ vars (they ship to the browser).

## 7. Custom domain (before public launch)
- Add custom domain to the web service in Render; update DNS.
- Then update: web `SITE_ORIGIN` (rebuild), API `WEB_ORIGIN` (redeploy), and `VITE_SERVER_URL` if the API also gets a custom domain.
