# Career Expo — Request Persistence + PostHog Implementation Handoff

**Status:** implementation plan only — nothing in this document is implemented.
**Goal:** make this sentence true and defensible:

> "Requests are one signal we use when deciding which careers to prioritize."

…while preserving the locked CHAT08 privacy doctrine (ephemeral `visit_id`, `journey_id`, no persistent person identity, no `identify()`, no replay/heatmaps/autocapture/keystroke capture, no fingerprinting, no advertising profiles, allowlisted meaningful events only, analytics failure never affects product behavior).

**Verified repo facts this plan is built on** (all paths verified present):

- Monorepo: `apps/web` (React + Vite SPA: public site `SiteApp` + simulation `App` in `apps/web/src/index.tsx`), `apps/server` (Fastify + tRPC + `postgres` tagged templates), `packages/schemas` (`@sim/schemas`, zod).
- DB: Postgres (Supabase). Handwritten SQL migrations in `apps/server/drizzle/` (`0001_initial.sql`), drizzle schema source of truth `apps/server/src/db/schema.ts` (used only by `drizzle-kit generate`; app queries via `db/repository.ts`). Every table gets `ALTER TABLE … ENABLE ROW LEVEL SECURITY`. `apps/server/test/migrations.test.ts` asserts `CREATE TABLE IF NOT EXISTS` + RLS for each table and forbids `school_admin`.
- Requests today are **local-only**: `apps/web/src/site/careers/CareerRequestToggle.tsx` keeps `useState(false)`, calls an optional `setCareerRequest` callback (never wired by any page), and `WorkshopShelf.tsx` truthfully says "requests stay on this page and aren't collected yet."
- Honest-copy surfaces that must transition together: `WorkshopShelf.tsx`, `LandingPage.tsx` (inline FAQ "Do my requests change what you build?"), `FaqPage.tsx` (FAQS array + FAQPage JSON-LD), `TrustPage.tsx` ("What we actually keep" + "WHO SEES WHAT" strip).
- Workshop careers (requestable): `registered-nurse`, `mechanical-engineer`, `electrician`, `lawyer-attorney` (`apps/web/src/careers/careers.ts`). `cybersecurity-analyst` is `ready_now`, `requestable: false`.
- Existing private-aggregate convention: `apps/server/sql/telemetry-dashboard.sql` (SQL the product owner runs; no admin API).
- Global rate limit already registered: `@fastify/rate-limit` max 120/min (`apps/server/src/main.ts`). Pino logger with a redact list exists in `main.ts`.
- `.env.example` / `render.yaml` are the env-var registries (`sync: false` for secrets).

---

## 1. Architecture

Two independent launch systems that **share no code and no identifiers**:

```
(A) REQUESTS                                    (B) ANALYTICS (CHAT08)
WorkshopShelf / CareerRequestToggle             Site/sim UI event hooks
  → useCareerRequests() hook                      → typed track()  [fire-and-forget]
  → POST/GET /api/career-requests               → POST /api/analytics/track
  → CareerRequestStore                          → server: zod allowlist parse
     (Postgres | in-memory)                        (strip unknown props)
  → career_requests table                       → POST $POSTHOG_HOST/i/v0/e/
  → private SQL dashboard                       → PostHog (anonymous events,
    (product owner only)                            no person profiles)
```

Rules that fall out of the doctrine:

1. **No PostHog SDK in the browser. Ever.** No `posthog-js`, no snippet, no proxy. Autocapture, session replay, heatmaps, and keystroke capture are then *impossible by construction*, not merely disabled. (There is currently zero analytics code in the repo — verified.)
2. **Requests never call analytics and analytics never calls the request store.** `career_requested` is emitted *after* a successful save, best-effort, from the UI layer. A PostHog outage changes nothing about requests and vice versa.
3. **New code lives in new files.** Only small, well-defined hunks are edited in existing files (copy strings, one hook call site, one `main.ts` registration block). This is also the branch-conflict strategy (§13).
4. **Anonymous by design:** no account, no name/email, no auth on either API. The tRPC surface (`apps/server/src/trpc/router.ts`) is untouched — both new APIs are plain Fastify routes. Rationale: the sim tRPC client (`apps/web/src/client.ts`) validates every response with zod and sends a dev `x-user-id` header; analytics must never ride that path, and anonymous request routes must not pretend to be user-scoped procedures.

Transport choice: plain REST (not tRPC) for both APIs — beacon-friendly (`fetch` + `keepalive`), zero merge surface with `trpc/router.ts`/`client.ts`, and no risk that response parsing throws into product code. PostHog forwarding is a raw `fetch` to the capture API (~30 lines, no new dependency; `posthog-node` only if we later need batching/shutdown flush — not now).

---

## 2. Database / request schema

New file `apps/server/drizzle/0002_career_requests.sql` (handwritten SQL matching `0001_initial.sql` style; see §13 for the `0002_` numbering caveat with `worker/decision-debrief`):

```sql
CREATE TABLE IF NOT EXISTS career_requests (
  career_id     text        NOT NULL,
  requester_key uuid        NOT NULL,
  requested_at  timestamptz NOT NULL DEFAULT now(),
  unrequested_at timestamptz,
  last_action_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (career_id, requester_key)
);

CREATE INDEX IF NOT EXISTS career_requests_career_idx ON career_requests (career_id);

ALTER TABLE career_requests ENABLE ROW LEVEL SECURITY;
-- Deliberately NO policies: only the service-role DATABASE_URL connection can
-- read/write. No anon key, no public API exposes this table (aggregates are
-- SQL the product owner runs — see apps/server/sql/career-requests-dashboard.sql).
```

Semantics:

- **Exactly one row per (career_id, requester_key).** Idempotency is structural: a repeated request converges on the same row; a repeated unrequest is a no-op. No idempotency keys needed.
- `requested_at` = *first* request time (never moved). `last_action_at` updated on every action. `unrequested_at = NULL` means active.
- No IP, no user agent, no session id, no analytics ids, no free text — the table cannot be joined to anything personal.
- RLS enabled with zero policies mirrors the privacy posture of the rest of the schema and satisfies the `migrations.test.ts` conventions.

Drizzle source of truth: add `careerRequests` to `apps/server/src/db/schema.ts` (kept in sync per the file's own header comment so `drizzle-kit generate` stays unbroken).

Private aggregation — new file `apps/server/sql/career-requests-dashboard.sql` (same convention as `telemetry-dashboard.sql`; run in the Supabase SQL editor with service credentials; **never** exposed through an API):

```sql
-- Current state per career (the number that informs prioritization)
SELECT
  career_id,
  count(*) FILTER (WHERE unrequested_at IS NULL) AS active_requests,
  count(*)                                       AS ever_requests,
  count(*) FILTER (WHERE unrequested_at IS NOT NULL) AS undone,
  min(requested_at) AS first_request_at,
  max(last_action_at) AS last_action_at
FROM career_requests
GROUP BY career_id
ORDER BY active_requests DESC;

-- Weekly trend
SELECT date_trunc('week', requested_at) AS week, career_id,
       count(*) FILTER (WHERE unrequested_at IS NULL) AS active_requests
FROM career_requests
GROUP BY 1, 2
ORDER BY 1 DESC, 3 DESC;
```

Because one row per (career, requester), `active_requests` **is** distinct requesters — no separate `count(DISTINCT)` needed.

---

## 3. API contracts

Both routes registered in `apps/server/src/main.ts` from two new modules (`apps/server/src/routes/career-requests.ts`, `apps/server/src/routes/analytics.ts`) — `main.ts` gains only two `await server.register(...)` lines.

### 3.1 Requests (`/api/career-requests`)

Identity transport: `X-Requester-Key: <uuid v4>` header on all three routes. **Never in the URL** (pino logs `req.url`) — instead add `"req.headers.x-requester-key"` to the existing pino `redact` list in `main.ts`.

| Route | Method | Body | Success | Errors |
|---|---|---|---|---|
| `/api/career-requests/state` | POST | `{}` | `200 { requestedCareerIds: string[] }` | `503 { error: "unavailable" }` when the store is down |
| `/api/career-requests` | POST | `{ careerId: string, requested: boolean }` | `200 { careerId, requested, saved: true }` | `400` invalid body/career; `503` store down |
| (same route, `requested:false` = unrequest) | | | | |

Validation (zod, shared from `@sim/schemas`):

- `careerId` ∈ `WORKSHOP_REQUESTABLE_CAREER_IDS = ["registered-nurse", "mechanical-engineer", "electrician", "lawyer-attorney"]` (reject `cybersecurity-analyst` and anything else with `400`).
- `X-Requester-Key` must be a UUID; missing/invalid → `400`.
- Body limit inherits the global 64 KB; add per-route rate limits via `@fastify/rate-limit` route config: requests ≈ `30/min` per IP (writes are two clicks per career; 30 tolerates honest use and retry spam).

Store interface (`apps/server/src/repository/career-requests.ts`): `getState(key)`, `setRequested({careerId, requesterKey, requested})` implementing the upsert semantics of §2 with tagged-template SQL (`PostgresCareerRequestStore`) and an in-memory twin (`InMemoryCareerRequestStore`) selected in `main.ts` exactly like `InMemoryRepository` is today (no `DATABASE_URL` → in-memory; the UI then honestly shows dev-mode behavior — see §8).

### 3.2 Analytics (`POST /api/analytics/track`)

Request body (single event; batching is YAGNI at ≤ 20 events/journey):

```jsonc
{
  "event": "career_requested",        // must be in TRACKABLE_EVENTS
  "visitId": "<uuid v4>",             // becomes PostHog distinct_id
  "journeyId": "<uuid v4>",           // optional; property
  "properties": { "career_id": "registered-nurse", "action": "request" }
}
```

Server behavior (in order):

1. Parse envelope with `TrackRequestSchema`; reject non-UUID ids, unknown `event`, oversized body.
2. **Discard the client `properties` object wholesale**, then rebuild properties from the per-event allowlist schema (§7) by parsing `properties` through it (zod strips unknown keys). This kills `$set`, `$identify`-shaped, `$process_person_profile`-tampering, and any free-text smuggling at the door. Client-sent keys starting with `$` are always dropped.
3. Add server-controlled properties: `$process_person_profile: false` (anonymous event → **no person profile ever**), `$geoip_disable: true` (no IP-derived geo; confirm once in the PostHog event debugger during §15 verification), `app: "career-expo"`, `surface`.
4. Forward async to `POST ${POSTHOG_HOST}/i/v0/e/` with `{ api_key, event, distinct_id: visitId, properties }` (top-level `distinct_id`, per current capture API). Timestamp: omit (PostHog stamps ingestion time — no client clocks to fingerprint).
5. **Always respond `204`** — including for invalid events (dropped + counted in a debug log). The client must never be able to branch on analytics outcomes.

Failure policy: forwarding uses a ~2s-timeout `fetch`, `catch` → log + drop. If `POSTHOG_API_KEY` is unset (dev), the endpoint validates and no-ops. The route never throws into the request lifecycle and shares no module with `career-requests.ts`.

Rate limit ≈ `60/min` per IP (generous for one journey, tight enough to blunt spoofed floods).

---

## 4. Anonymous identity strategy

Three unrelated identifiers. **None is ever sent to the other system's API.** None is a fingerprint (all are `crypto.randomUUID()`, first-party, user-clearable, non-derived).

| Id | Minted | Stored | Lifetime | Used by |
|---|---|---|---|---|
| `visit_id` | first `track()` need in a tab | `sessionStorage["career-expo-visit-id"]` | Tab session; dies with the tab | PostHog `distinct_id` only |
| `journey_id` | on "Begin your first day" commit (`ThresholdBrief` → `handleContinueToSim`) | `sessionStorage["career-expo-journey-id"]` | One simulation journey; re-minted per new start; survives in-tab reload | Analytics property only |
| `requester_key` | first request attempt | `localStorage["career-expo-requester-key"]` | Until user clears storage (documented in Trust page) | Request API only |

- `visit_id` is **ephemeral**: sessionStorage, never localStorage, rotates freely, is not stable across days — exactly "no persistent person identity". PostHog receives it as `distinct_id` and, with `$process_person_profile: false` on every event, builds **no person profile**. We never call `identify()`/`alias()`/`group()` (note: PostHog treats a `distinct_id` as identified if it was *ever* used with an identified event — so the hard rule "never identify, never merge ids" is load-bearing).
- `journey_id` lets funnel events correlate within one shift without any cross-visit stitching.
- `requester_key` exists only so request/unrequest is reversible and idempotent across page loads. It is a random marker, disclosed in the Trust page ("a random marker saved on this device"). If localStorage is blocked (hardened private browsing): fall back to `sessionStorage`; if both blocked → requests UI enters the honest disabled state (§8), never a silent local-only mode.
- Dedupe posture ("reasonably, without fingerprinting"): one row per (career, requester_key) + per-IP rate limit + server-side career allowlist. Residual inflation (one person, many browsers/incognito) is **accepted and documented** — do not add IP-hash, UA, or canvas dedupe; that would be fingerprinting.

---

## 5. PostHog transport architecture

```
typed track()  →  fetch POST /api/analytics/track (keepalive, never awaited)
              →  Fastify route: allowlist validate + strip → 204 immediately
              →  background fetch → POST {POSTHOG_HOST}/i/v0/e/
```

- Endpoints (current PostHog capture docs): `https://us.i.posthog.com/i/v0/e/` (US) / `https://eu.i.posthog.com/i/v0/e/` (EU); single-event is all we need (`/batch/` deferred).
- Payload: `{ api_key, event, distinct_id, properties }`; anonymous via `properties["$process_person_profile"] = false`.
- **Do not install `posthog-js` / `posthog-react` / the HTML snippet.** Add a guard test asserting `apps/web/package.json` and `apps/server/package.json` contain no `posthog` dependency and `apps/web/src` contains no `posthog` import (§12).
- Client `track()` (`apps/web/src/analytics/track.ts`): synchronous `void` return, `try/catch` + `.catch(() => {})`, `fetch(..., { keepalive: true })`, no queue, no retry (a lost analytics event is acceptable; retry storms are not), never called from request code.

Environment variables (add to `.env.example` and `render.yaml` under the API service with `sync: false`):

| Var | Where | Required | Meaning |
|---|---|---|---|
| `POSTHOG_API_KEY` | server | no (dev no-ops) | PostHog project token |
| `POSTHOG_HOST` | server | no (default `https://us.i.posthog.com`; EU uses `https://eu.i.posthog.com`) | capture host |

**No `VITE_*` PostHog variables** — nothing PostHog-flavored ships to the browser.

---

## 6. Typed event contract

New `packages/schemas/src/analytics.ts` (exported through the `@sim/schemas` barrel), plus `packages/schemas/src/career-requests.ts` for `WORKSHOP_REQUESTABLE_CAREER_IDS`, `CareerRequestBodySchema`, `CareerRequestStateSchema`, `TrackRequestSchema`. Shared by web (types + client) and server (validation) — one source of truth.

```ts
export const TRACKABLE_EVENTS = [
  "landing_view", "career_selector_view", "career_detail_view",
  "career_selected", "career_requested",
  "simulation_start", "arrival_complete", "workplace_entered", "desk_reached",
  "login_complete", "first_task_complete", "simulation_complete",
  "debrief_complete",
  "feedback_viewed", "feedback_submitted", "feedback_skipped",
  "system_error",
] as const;

export type TrackableEvent = (typeof TRACKABLE_EVENTS)[number];

// Per-event property schemas. Unknown keys are STRIPPED by zod before forwarding.
export const EVENT_PROPERTIES: Record<TrackableEvent, z.ZodType<Record<string, unknown>>> = { /* §7 */ };

export const TrackRequestSchema = z.object({
  event: z.enum(TRACKABLE_EVENTS),
  visitId: z.string().uuid(),
  journeyId: z.string().uuid().optional(),
  properties: z.unknown().optional(),   // real validation happens per-event server-side
});
```

Envelope contract: `track(event, properties?, opts?: { journey?: boolean })` where the client module owns `visit_id`/`journey_id` injection (callers never pass raw ids). Property values are restricted to `string` from closed enums / authored ids (`career_id`, `task_id`) and small booleans — **no free text, no numbers derived from user behavior** (no durations, no counts of user actions).

## 7. Exact allowlist

Common server-added properties on **every** event (client cannot influence): `$process_person_profile: false`, `$geoip_disable: true`, `app: "career-expo"`, plus `visit_id` (as `distinct_id`) and `journey_id` when present.

| Event | Allowed client properties | Fired at (verified hook) |
|---|---|---|
| `landing_view` | *(none)* | `LandingPage` mount (`SiteApp` route `home`) |
| `career_selector_view` | `surface: "landing" \| "careers"` | `CareerExplorer` mount (used by both surfaces) |
| `career_detail_view` | `career_id` | `CareerDetailPage` mount |
| `career_selected` | `career_id`, `source: "detail" \| "start" \| "landing"` | "Begin your first day" CTA commit (`StartPage.handleContinueToSim` / detail CTA) |
| `career_requested` | `career_id`, `action: "request" \| "unrequest"` | `CareerRequestToggle` **after** server confirms save |
| `simulation_start` | `career_id`, `pacing_mode: "standard" \| "extended" \| "pause_compatible" \| "no_hard_timer"` | `apps/web/src/index.tsx` after `createSession` resolves |
| `arrival_complete` | *(none)* | `ArrivalFilm` `onSeen` |
| `workplace_entered` | *(none)* | spatial shell mount (3D floor interactive — `SpatialShell`/`ExperienceShell`) |
| `desk_reached` | *(none)* | `sit_desk` presentation transition (`world/presentation.ts`) |
| `login_complete` | *(none)* | desk-authenticated transition (`deskAuthenticated: true`) |
| `first_task_complete` | `task_id`, `journey_id` | first `submitTaskAttempt` result with `completed: true` (once per journey) |
| `simulation_complete` | *(none)* | wrap-up begins (`loadDebrief` invoked in `index.tsx`) |
| `debrief_complete` | *(none)* | `DebriefView` rendered with data |
| `feedback_viewed` | `surface: "debrief" \| "reflection"` | feedback/reflection prompt shown |
| `feedback_submitted` | `surface: "debrief" \| "reflection"` | prompt submitted — **no content, no rating values, ever** |
| `feedback_skipped` | `surface: "debrief" \| "reflection"` | prompt dismissed / navigated away unsubmitted |
| `system_error` | `surface: "site" \| "sim" \| "desk_os"`, `error_kind: "session_create_failed" \| "debrief_load_failed" \| "renderer_recovery" \| "request_persist_failed"` | existing catch blocks / recovery-workstation path |

`feedback_*` note: the allowlist ships with the schema now; the handlers bind to the first real feedback-soliciting surface (post-debrief prompt or the existing reflection flow). If no such surface ships in this iteration, these three events stay **wired-but-unfired** — never invent phantom events. If bound to reflections: the reflection `note`, `enjoyment`, `confidence` values must **not** be properties (reflections are promised "only you" on the Trust page).

---

## 8. UI integration points

### 8.1 Request states (replace local-only behavior)

New hook `apps/web/src/site/careers/useCareerRequests.ts` (owns hydration + mutations + status), consumed once in `CareerExplorer`; the existing optional `setCareerRequest` prop thread (`CareerExplorer` → `WorkshopShelf`/`CareerCard` → `CareerPreview` → `CareerRequestToggle`) stays as the seam, extended with hydrated state (`initiallyRequested` / `requestedIds`) and a `persistence` status. `CareerRequestToggle` keeps its optimistic-toggle + rollback shape.

| State | Button | Note |
|---|---|---|
| hydrating | disabled | label stays "Request {title}" (no fake state) |
| not-requested | "Request {title}" (`aria-pressed=false`) | — |
| requested | "Requested ✓ · click to undo" (`aria-pressed=true`) | — |
| pending | disabled during round-trip | optimistic toggle, rolled back on failure |
| save-failed | rolled back to prior state | **"Request change failed. Try again. Nothing was saved."** (`role="alert"`) |
| unavailable (hydration/`503`) | all request buttons disabled | shelf-level notice + **Retry** (re-runs hydration): "Requests can't be saved right now — nothing you mark here will be recorded until this clears." |
| storage-blocked | disabled | "Your browser blocks the anonymous marker we use to remember requests, so requests can't be saved here." |
| dev without `DATABASE_URL` (in-memory store) | active | per-session only; one-line dev note may appear — production copy unchanged |

Anti-masquerade rule: **there is no local-only mode anymore.** The old `if (!setCareerRequest) return;` silent path is removed from production wiring (the optional prop remains only for isolated unit tests). A request shown as "Requested ✓" is always server-confirmed or optimistically in-flight; failures roll back visibly. Hydration (`/state`) runs on first shelf render so returning visitors see their persisted requests — never a fresh `useState(false)` that contradicts the server.

Hygiene: `requestedCareerIds` is derived state from the server; the only localStorage value is `career-expo-requester-key`. Existing no-fake-counts guards stay as-is: no counts, no leaderboard, no "most requested" (tests already enforce: `careers.test.tsx`, `site-entry.test.tsx`).

### 8.2 Analytics call sites

| Event | File |
|---|---|
| `landing_view` | `apps/web/src/site/pages/LandingPage.tsx` (mount effect) |
| `career_selector_view` | `apps/web/src/site/careers/CareerExplorer.tsx` (mount effect) |
| `career_detail_view`, `career_selected` | `apps/web/src/site/pages/CareerDetailPage.tsx`, `StartPage.tsx` |
| `career_requested` | `CareerRequestToggle.tsx` (post-success only) |
| `simulation_start`, `first_task_complete`, `simulation_complete` | `apps/web/src/index.tsx` (createSession success / first completed task / `loadDebrief`) |
| `arrival_complete` | `apps/web/src/site/ArrivalFilm.tsx` (`onSeen`) |
| `workplace_entered`, `desk_reached`, `login_complete` | `world/SpatialShell.tsx`, `world/presentation.ts` transitions |
| `debrief_complete` | `apps/web/src/components/DebriefView.tsx` (mount) |
| `feedback_*` | first feedback/reflection surface (see §7 note) |
| `system_error` | existing catch blocks in `index.tsx` (session create, debrief load), renderer-recovery path |

---

## 9. FAQ / copy transition (exact strings)

Four surfaces change **together, in one commit** — the promise flips from "not collected" to "one signal", and nothing overclaims.

**A. `WorkshopShelf.tsx` — `career-request-honesty` paragraph**

- Before: "Preview only: requests stay on this page and aren't collected yet. When we start collecting, they'll guide what we prioritize — they won't guarantee build order."
- After: "Requests are saved anonymously — no account, no email, just a random marker on this device. They're one signal we use when deciding which careers to prioritize, never a guaranteed build order."
- Unchanged: intro "Mark any Workshop role you'd like built next. Change your mind with one click — no account, no email."

**B. `LandingPage.tsx` inline FAQ — "Do my requests change what you build?"**

- Before: "Not yet. Requests currently stay on this page and aren’t collected. When collection is enabled, they’ll help guide what we prioritize without guaranteeing build order."
- After: "They help. Requests are one signal we use when deciding which careers to prioritize — not a promise, and not a build order. We never show counts or rankings, and each request is saved anonymously: no account, no email."

**C. `FaqPage.tsx` — add one entry to `FAQS` (JSON-LD updates automatically)**

- Q: "What happens when I request a Workshop career?"
- A: "It's saved anonymously — no account, no email, just a random marker on this device you can clear anytime. Requests are one signal we use when deciding which careers to prioritize, never a guaranteed build order. We don't show request counts or rankings, and you can undo a request with one click."
- Existing last FAQ ("Is there more after this first day?") stays accurate as written.

**D. `TrustPage.tsx`**

- §01 "What we actually keep" — add bullet: "**Workshop requests** — which careers you marked as wanted next, tied to a random marker on your device (not your name or email). You can undo a request anytime. We look at them only as one signal for what to build next."
- §01 "Quiet numbers" bullet — extend: "…and a small set of plain events, like which career page you opened — tied to a random ID that disappears when you close the tab. No advertising, no third-party trackers, no screen recording."
- "WHO SEES WHAT" strip — append: "· your Workshop requests → anonymous totals only, no names".

Also update `docs/content/public-career-content-packet.md` provenance for the four Workshop careers (its requestable flags/copy), since tests read the packet's ordering contract.

Tests pinning the **old** copy must change in the same commit (see §12): `careers.test.tsx` → "keeps local demo state visibly marked as uncollected" is **retired** and replaced.

---

## 10. Privacy / security constraints

1. No PostHog (or any) tracking SDK in the browser; no `$pageview`, no autocapture — enforced by guard test (§12).
2. `identify()` / `alias()` / `group()` / `$set*` / `$create_alias` are forbidden everywhere; the analytics route drops any client property starting with `$` and rebuilds from the allowlist.
3. `$process_person_profile: false` on **every** event; `$geoip_disable: true` on every event. Person profiles must number zero in PostHog (verify in production, §15).
4. Never collect: name, email, account/user ids (the Supabase `userId` never reaches either new API), auth tokens, IP-derived data, referrers/UTMs, full URLs, free text (ticket text, chat, notes, reflections, search inputs), reflection values (`enjoyment`/`confidence`/`note`), cursor/keystroke/scroll/click coordinates, device or screen metrics, user agents, response times/durations derived from user behavior, anything from the sim action log.
5. Identifier separation: `requester_key` never appears in analytics payloads; `visit_id`/`journey_id` never appear in `career_requests`; no table joins them.
6. `career_requests` RLS enabled with zero policies (service-role only); no public API returns per-user rows; aggregates live only in `apps/server/sql/career-requests-dashboard.sql`.
7. Pino redact: add `req.headers.x-requester-key` to the `redact` list in `main.ts`. No requester keys, visit ids, or journey ids in logs (log event names and drop counts only).
8. Rate limits: global 120/min stays; requests ≈ 30/min; analytics ≈ 60/min per IP. Body limit stays 64 KB. Server validates `careerId` against the closed allowlist (never trusts the client list).
9. Honesty invariants: no public counts/leaderboards ever; the "one signal" sentence must remain true (requests inform, never dictate, prioritization — a product-owner decision log note is enough).
10. Analytics failure must not affect product behavior: `track()` is `void` + swallow-errors; the track endpoint always returns `204`; request code paths import nothing from analytics modules.
11. PostHog project settings (dashboard, one-time): EU vs US host per data-residency decision, sensible retention, no session replay / heatmaps / surveys / flags (none are integrated; confirm they stay off).

---

## 11. Migrations

1. Add `apps/server/drizzle/0002_career_requests.sql` (§2, exact SQL).
2. Add `careerRequests` to `apps/server/src/db/schema.ts` (drizzle-kit source of truth).
3. Extend `apps/server/test/migrations.test.ts`: add `career_requests` to the required-tables list (asserts `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE … ENABLE ROW LEVEL SECURITY`), assert the `(career_id, requester_key)` primary key, assert **no** policies/grants for anon/authenticated roles, and keep the `not.toContain("school_admin")` invariant.
4. Apply order on existing deployments: run `0002_career_requests.sql` against Supabase manually (README convention: "Apply `apps/server/drizzle/0001_initial.sql` …" → extend that line to mention `0002_`). Fresh installs: `0001` then `0002`.
5. **Numbering caveat:** unmerged `worker/decision-debrief` already carries `apps/server/drizzle/0002_decision_reviews.sql`. Different filenames → git merges cleanly and the two tables are independent, so execution order between the two `0002_*` files is harmless — but whichever branch merges **second** must renumber its file to `0003_…` to restore a clean sequence (and update its `migrations.test.ts` reference). Record this in the PR description.

---

## 12. Tests

New / changed, per layer (test commands per repo convention: `pnpm --filter @sim/web exec vitest run test/….test.tsx`, `pnpm --filter @sim/server exec vitest run test/….test.ts`, plus `pnpm lint && pnpm typecheck && pnpm test && pnpm build` at the end):

**`packages/schemas`**
- `test/analytics-schema.test.ts`: `TRACKABLE_EVENTS` matches §7 exactly (name-level snapshot); every event's property schema strips unknown keys; unknown event names are rejected; **no** event schema accepts free-text-ish keys (`note`, `text`, `message`, `query`, `url`, `email`, `name`, `ip`); no property key begins with `$` client-side.
- `test/career-requests-schema.test.ts`: request body validation; `WORKSHOP_REQUESTABLE_CAREER_IDS` excludes `cybersecurity-analyst`; UUID key format.

**`apps/server`**
- `test/career-requests-route.test.ts` (in-memory store): request creates state; **repeat request is idempotent** (single logical state, `requested_at` first-wins); unrequest idempotent; re-request after unrequest restores; unknown/`cybersecurity-analyst` `careerId` → 400; missing/invalid `X-Requester-Key` → 400; store failure → 503 (honest, retryable); aggregate counts match §2 query semantics.
- `test/analytics-route.test.ts` (injected fake capture): forwards allowlisted event with `distinct_id = visitId`, `$process_person_profile: false`, `$geoip_disable: true`; **strips unknown properties** (send junk + `$set` + `$process_person_profile: true` → none forwarded); invalid event name → `204` and **no** forward; capture throws → still `204`; unset `POSTHOG_API_KEY` → validate + no-op; free-text properties never forwarded.
- `test/migrations.test.ts` (extend, §11).
- `test/no-posthog-dep.test.ts` (or web-side): `package.json` files contain no `posthog` dependency; `apps/web/src` contains no `posthog` import; no `VITE_POSTHOG` env key anywhere.

**`apps/web`**
- `test/career-requests.test.tsx` (new; replace the retired test): hydration renders persisted "Requested ✓"; click posts `{careerId, requested:true}` and flips optimistically; failure rolls back with "Nothing was saved." and never leaves a phantom `aria-pressed=true`; `503`/hydration failure disables buttons + honest notice + Retry recovers; storage-blocked path shows its note; **copy assertions** for the new §9 strings.
- `test/careers.test.tsx` changes: retire "keeps local demo state visibly marked as uncollected"; **update** the `"makes no session request"` test — its `expect(fetchSpy).not.toHaveBeenCalled()` will now fail because public pages legitimately call `/api/career-requests/state` and `/api/analytics/track`; re-scope it to "no simulation/session requests" (assert no fetch URL contains `/trpc/session`) while allowing the two `/api/` routes. Keep untouched: the no-counts assertion (`/\b\d+ requests\b/i`) and all ordering/preview tests.
- `test/site-entry.test.tsx`: keep the no-leaderboard guard; add assertion that no public surface shows request counts.
- `test/analytics-track.test.ts` (new): `track()` posts the envelope to `/api/analytics/track` with allowlisted props; swallows fetch rejection; never includes `requester_key`; `journey_id` only when a journey is minted.

**E2E:** `apps/web/e2e/golden-path.spec.ts` keeps passing unmodified (its fetch assertions concern `/trpc/session.create` — new `/api/` traffic must not trip it; verify when running).

---

## 13. Branch / conflict risks

Verified overlap (`git diff --name-only main...<branch>` scoped to relevant paths):

| Branch | Overlapping files | Risk |
|---|---|---|
| `worker/careers-final`, `worker/career-content-data`, `worker/chat11-frontend-wave1` (careers) | `apps/web/src/site/careers/*` (incl. `CareerRequestToggle.tsx`, `WorkshopShelf.tsx`), `pages/FaqPage.tsx`, `pages/LandingPage.tsx`, `careers/careers.ts`, `apps/web/test/*` | **High** for copy/UI hunks — these branches rewrite the same components |
| `integration/platform-hardening` (platform) | `apps/server/src/main.ts`, `Dockerfile.*`, `.env.example`, migrations handling, `site/seo.ts` | **Medium** — `main.ts` registration + env registry hunks; deploy/migration tooling may differ |
| `worker/decision-debrief` (debrief) | `apps/server/drizzle/0002_decision_reviews.sql`, `trpc/router.ts`, debrief UI | **Medium** — migration-number collision (§11.5); debrief UI hooks for `debrief_complete`/`feedback_*` may move |
| current: `feat/homepage-platform-rebalance` | owner of the live copy strings being replaced | merge base for this work |

Mitigations (also the §1 architecture rules):

1. Put **all** new logic in new files: `packages/schemas/src/{analytics,career-requests}.ts`, `apps/server/src/routes/{analytics,career-requests}.ts`, `apps/server/src/repository/career-requests.ts`, `apps/server/sql/career-requests-dashboard.sql`, `apps/web/src/analytics/track.ts`, `apps/web/src/site/careers/useCareerRequests.ts`, `apps/server/drizzle/0002_career_requests.sql`, and their tests.
2. Touch existing files only at small hunks: copy strings (§9), one hook call in `CareerExplorer`, prop extension on `CareerRequestToggle`, two `register()` lines + pino redact entry in `main.ts`, env entries in `.env.example`/`render.yaml`, README lines, test edits in §12. **Never** edit `apps/server/src/trpc/router.ts` or `apps/web/src/client.ts` (every pending branch touches both).
3. Land this on `feat/homepage-platform-rebalance` (or a branch cut from it), and rebase the careers/debrief branches onto it rather than the reverse — the copy in §9 supersedes whatever those branches carry.
4. Re-run the careers test suites on those branches after rebase; the retired test (§12) will need the same replacement wherever it appears.
5. Migration renumbering per §11.5; note it in both PR descriptions.

---

## 14. Implementation order

1. **Contracts first** — `packages/schemas`: `career-requests.ts` + `analytics.ts` + tests (green before anything consumes them).
2. **Migration** — `0002_career_requests.sql` + `db/schema.ts` + `migrations.test.ts` updates.
3. **Server requests** — store (Postgres + in-memory) → `/api/career-requests` routes → `career-requests-route.test.ts`.
4. **Server analytics** — `/api/analytics/track` route with allowlist rebuild + PostHog forwarder (injectable capture) → `analytics-route.test.ts` → guard test (no posthog dep).
5. **Server wiring** — `main.ts` registrations + pino redact + per-route rate limits; `.env.example` + `render.yaml` entries.
6. **Web requests** — `useCareerRequests` + `CareerRequestToggle` state machine + hydration in `CareerExplorer` + `career-requests.test.tsx`.
7. **Copy flip (single commit)** — §9 four surfaces + content packet + test updates (retire/replace old-copy tests, re-scope the fetch-spy test).
8. **Web analytics** — `track.ts` + bind the §8.2 call sites + `analytics-track.test.ts`.
9. **Docs** — README ("Privacy and deployment" section: new migration, new env vars, private dashboard SQL), Trust page already covered in step 7.
10. **Full verification** — `pnpm lint && pnpm typecheck && pnpm test && pnpm build`, e2e golden path, then §15 production checklist.

Each step leaves the tree green; steps 6–8 are the only UI-visible changes and ship after the server can honestly support them.

---

## 15. Acceptance criteria

Truthfulness
- [ ] The sentence "Requests are one signal we use when deciding which careers to prioritize" appears in the UI and is true (requests reach the owner's dashboard and inform, but do not determine, roadmap order).
- [ ] No surface claims requests are uncollected; no surface shows counts, rankings, or build guarantees.

Requests
- [ ] Request → reload → still "Requested ✓" (server-hydrated); unrequest works; repeat clicks never inflate counts (one row per career/requester).
- [ ] DB down (`503`) → honest disabled state + "Nothing was saved." on failed writes + Retry recovers; a "Requested ✓" state is never shown without server truth.
- [ ] `career_requests` in Supabase with RLS on, zero public policies; dashboard SQL returns per-career active/ever/undone totals; no name/email/IP columns exist.
- [ ] Invalid `careerId` (incl. `cybersecurity-analyst`) rejected server-side.

Analytics (verify in PostHog event debugger / live events during a real playthrough)
- [ ] All fired events match §7 names; properties match allowlists exactly (spot-check `career_requested`, `simulation_start`, `system_error`).
- [ ] **Zero person profiles** created; every event shows `$process_person_profile: false`; no geo/IP enrichment (`$geoip_disable` honored).
- [ ] Closing the tab rotates `visit_id` (new `distinct_id` next visit); `journey_id` changes per journey; no `requester_key` appears anywhere in PostHog.
- [ ] No `$pageview`/`$autocapture`/replay/heatmap data exists (nothing to ingest them).
- [ ] Block `POSTHOG_HOST` (or unset key) → product behaves identically; requests still persist; no console noise; endpoint still `204`s.

Guards
- [ ] Guard test proves no `posthog` dependency/imports in web or server; schema tests prove free-text/`$`-prefixed properties can't be forwarded.
- [ ] `careers.test.tsx`/`site-entry.test.tsx` no-count/no-leaderboard assertions still pass; full `pnpm lint && pnpm typecheck && pnpm test && pnpm build` green; golden-path e2e green.
- [ ] `migrations.test.ts` green with `career_requests` included; README documents `0002_` application and env vars.

---

## 16. What NOT to build

- Public request counts, percentages, leaderboards, "most requested", trending — anywhere, ever.
- Accounts, email capture, "notify me when it's built", newsletters.
- Any fingerprinting or cross-device dedupe (IP hashing, UA parsing, canvas/font probes, cookie sync) — the accepted limitation in §4 stands.
- `posthog-js`, the HTML snippet, session replay, heatmaps, autocapture, scroll/click maps, rageclick detection, surveys, feature flags, A/B testing.
- `identify()` / `alias()` / `group()` / person properties / cohorts — person profiles must stay at zero.
- An admin dashboard UI or API for counts (the SQL file is the product; Supabase SQL editor is the console).
- A server-side analytics event table / outbox / queue / batcher / retry machinery (PostHog is the store; dropped events are acceptable).
- Cross-visit journey stitching, user-level funnels, retention graphs keyed to people (journey/visit-scoped funnels only).
- Sending reflection content or values to PostHog; anything from the sim action log; free text of any kind.
- A second analytics vendor, tag manager, or "generic event bus" abstraction — one typed allowlist is the whole system.
- Changes to the tRPC router, the simulation client, auth, or the career content/copy beyond the §9 strings.
