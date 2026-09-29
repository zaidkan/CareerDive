# Career requests API

Anonymous REST routes. No account, name, email, analytics call, public counts, or build-order promise.

Client generates one cryptographically random UUID v4 as a requester key and sends it in `X-Requester-Key`. Treat it as a bearer secret: never put it in a URL. Reuse the same key to restore state and unrequest. Losing the key loses access to that request state. Server does not issue or derive the key from IP, device, or browser details.

| Method | Path | JSON body | 200 response |
| --- | --- | --- | --- |
| POST | `/api/career-requests/state` | `{}` or omitted | `{ "requestedCareerIds": ["registered-nurse"] }` |
| POST | `/api/career-requests` | `{ "careerId": "registered-nurse", "requested": true }` | `{ "careerId": "registered-nurse", "requested": true, "saved": true }` |

`requested: false` unrequests. Allowed IDs: `registered-nurse`, `mechanical-engineer`, `electrician`, `lawyer-attorney`. Invalid key/body/career returns 400. Store failure returns `503 { "error": "unavailable" }`; caller must not treat that as saved. Each route allows 30 requests per minute per IP via the existing in-process Fastify rate limiter. A 429 is retryable after the rate window.

Primary key `(requester_key, career_id)` dedupes repeat requests. A duplicate request or unrequest leaves state unchanged. Unrequest of an absent row succeeds without creating one. Re-request restores the original row. Concurrent same-action requests converge. Opposite actions can race, especially before a row exists; final state depends on database execution order. A delayed retry of an older opposite action can change state again. Callers should avoid overlapping toggles for one career.

Migration: `drizzle/0004_career_requests.sql`. Production needs a privileged `DATABASE_URL` with access to this RLS-protected table. No RLS client policies exist. Without `DATABASE_URL`, local development uses process memory and loses state on restart. Operators run `sql/career-requests-dashboard.sql` using private database access. No aggregate API exists.
