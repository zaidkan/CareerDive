# Production environment contract

The intended Render topology is two Docker web services: an API service and an Nginx static SPA service. The browser calls the API's public HTTPS origin directly. CORS permits exactly `WEB_ORIGIN`. Every API call, including career requests, support reports, readiness and first-party events, uses the same `VITE_SERVER_URL`. No production localhost fallback is compiled. Nginx returns JSON 404 for `/api/*` and `/trpc*` on the web service rather than returning the SPA.

## Server only — API runtime / controlled migration shell

| Variable            | Required | Value / placement                                                                                                                                                             |
| ------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`          | yes      | `production` in Render API environment                                                                                                                                        |
| `DATABASE_URL`      | yes      | Supabase database session-pooler URL, TLS enabled, with database password. API environment only; also a private local migration shell tomorrow. Not a browser build argument. |
| `SUPABASE_URL`      | yes      | Project API URL, `https://<project-ref>.supabase.co`                                                                                                                          |
| `SUPABASE_ANON_KEY` | yes      | Public publishable key (`sb_publishable_…`) or legacy **anon** key. Used by `auth.getUser(bearerToken)` and auth health check. No service-role key or JWT secret required.    |
| `WEB_ORIGIN`        | yes      | Exact HTTPS origin of the web service; no path or trailing slash                                                                                                              |
| `PORT`              | managed  | Render-provided runtime port; defaults to `3001` locally. Server binds `0.0.0.0`.                                                                                             |

The database connection is privileged and must stay on the API. Browser access to product tables is revoked; verified API owner checks protect all product operations. Keep these services in a private operator account; do not paste credentials into chat, source, terminal history, logs, or screenshots.

## Public web — build time, safe to expose

| Variable                 | Required for Docker web build | Value                                                                                                                |
| ------------------------ | ----------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `VITE_SERVER_URL`        | yes                           | Public API HTTPS origin, no trailing slash; e.g. `https://career-sim-api.onrender.com`. Rebuild web when it changes. |
| `VITE_SUPABASE_URL`      | yes                           | Same project URL as API `SUPABASE_URL`                                                                               |
| `VITE_SUPABASE_ANON_KEY` | yes                           | Same **public publishable/anon** key as API. Anonymous sign-in must be enabled.                                      |

Only these public Supabase values enter the browser. Never use a `sb_secret_…` key, legacy `service_role` key, database password, or signing secret here. Anonymous users receive verified UUID identities; they have the Supabase `authenticated` role, while direct table privileges remain denied.

## Build time

| Variable      | Placement / meaning                                                                                                                                                                                                                             |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SITE_ORIGIN` | Render web build argument / local web build environment. Exact public web HTTPS origin. Vite maps it to the public canonical origin used by SEO. No credentials.                                                                                |
| `BUILD_SHA`   | Render web build argument. Set to the full commit SHA approved for deployment. Local Vite falls back to `RENDER_GIT_COMMIT`, then Git, then `unknown` if `.git` is absent. Docker accepts `unknown`, but launch approval requires an exact SHA. |
| `PORT` (web)  | Runtime Nginx template variable, set to `8080` by Docker/blueprint; Render may override with its assigned port. Separate from API port.                                                                                                         |

Render Docker environment values must be available as build arguments matching the `ARG` names in `Dockerfile.web`. Verify the build settings tomorrow before the first approved build. Changing a runtime public variable without rebuilding will not alter the static bundle. The blueprint is a template; applying it creates/deploys services and therefore needs deployment approval.

## Optional

| Variable                           | Scope / default                                                                                                                                                           |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_LAUNCH_ANALYTICS_ENABLED`    | Public build boolean string; only `true` enables first-party launch events. Docker default `false`, blueprint launch template `false`. Product functions with it disabled. |
| `INSTITUTIONAL_DEPLOYMENT_ENABLED` | Keep `false`; institutional launch is outside this scope                                                                                                                  |
| `TEST_DATABASE_URL`                | Test runner only; disposable migrated local DB. Never point tests at production.                                                                                          |
| `TEST_MIGRATION_DATABASE_URL`      | Test runner only; fresh disposable DB with auth test fixture. Migration concurrency test requires a fresh database on each run.                                           |
| `TEST_DATABASE_URL_WITHOUT_REVIEW` | Existing degradation test only; separate disposable DB deliberately lacking review tables                                                                                 |

No PostHog variables or SDK are required or installed by this change. First-party schemas in `packages/schemas/src/launch.ts` are canonical if an optional downstream analytics provider is added later.

## Local development

With no DB or Supabase values, the API uses in-memory repositories and the browser stores a random local development UUID per browser profile. It is not persistent across API restarts. Production startup rejects missing DB/auth/origin configuration; production browser auth rejects missing Supabase public values. A supplied invalid bearer token never falls back to a development identity. Persistent browser storage is required before creating an anonymous identity or a retryable shift, preventing duplicate owners/starts when storage is blocked.

Anonymous identity belongs to this browser profile. Clearing its site storage loses that identity; this launch contract has no email/account recovery flow. Keep the same profile for reload/refresh smoke. A missing or foreign owner cannot resume an old session by supplying its ID.
