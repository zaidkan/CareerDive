# Offline production preparation

Goal: prepare the supplied base for owner-controlled Supabase activation and Render deployment. No external services, secrets, production migrations, deployment, or merge during preparation.

1. Discover numbered SQL files; replace Drizzle migration execution with an advisory-locked transactional checksum ledger. Verify pending/drift without mutation. Preserve historical SQL; tighten privileges in a new migration. Test ordering, changed-history rejection, rollback and repeated execution on disposable local Postgres if available.
2. Share server bearer verification across simulation, career requests, reports and post-start launch events. Landing/career/start observations remain public and IP-limited. Add browser Supabase anonymous identity/refresh through the installed SDK, retaining local development without production header fallback.
3. Add owner/create-request uniqueness to session creation, return canonical persisted state on conflict, reject changed request inputs. Add snapshot reads and revision CAS to reject concurrent stale state writes. Retain browser request key and seed across reload and unknown outcomes.
4. Wire career state hydration and confirmed request/unrequest persistence. Add private, validated, idempotent support records and bounded first-party launch events, with per-IP and per-owner limits.
5. Separate liveness/readiness; verify migration checksums and required schema with bounded DB queries. Repair Docker workspace/content inputs, no-git build revision, cross-origin web/API transport, and Render configuration.
6. Document exact environment placement and owner steps, run typecheck/lint/build/tests/product contract/diff checks plus local Docker checks. Record unverified cloud-dependent checks honestly.

Review focus: failed/forged auth never falls back; concurrent starts dedupe; changed inputs conflict; direct database writes denied; failed persistence never reports success; unavailable DB fails readiness; SPA routes never swallow API failures; browser bundles contain public values only.
