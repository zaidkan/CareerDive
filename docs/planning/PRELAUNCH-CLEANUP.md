# Pre-launch cleanup review

Branch: `feat/prelaunch-cleanup`, based on `feat/arrival-handoff-v2` at `a526e31`. No merge or live deployment is part of this change.

## Room, sound and public capture

- The entry/exit door now spans its opening with opaque geometry and a solid recess behind the leaf. Frame overlaps close the side gaps; the EXIT plaque sits clear of the leaf to prevent overlapping surfaces. A Chromium render of the current room confirms the door is solid and EXIT is readable. The two owner screenshots were not attached to this session; verification used the current scene.
- Removed the complete Employee-of-the-Month prop from the break room, including its portrait, caption and nameplate. Removed the unused component/export rather than substituting a new employee.
- Interaction sound waits for the gesture-triggered AudioContext resume to finish. Only the latest pending cue can play; mute cancels pending cues and stops active voices. Break-room controls now unlock audio synchronously before their asynchronous write. Reduced-motion preference no longer silently disables sound.
- Arrival MP4 starts with the persisted simulation sound preference. If audible playback is refused, it retries muted without resetting the existing thirty-second watchdog or scene-readiness/dissolve timing. Existing explicit-entry fallback remains if muted playback is also refused. Late failures after skip/unmount cannot restart playback. Changing sound preference updates the video mute state.
- Lunchbox joke now names Reed, both in the canvas texture and its accessible description. Company floor and remaining stylesheet references now say Floor 4; room signage remains `04`.
- Replaced `a-11-desktop-dark.webp` with a genuine capture of this branch's new SOC room. Existing `capture:product-media a-11` harness, Chromium/SwiftShader, 1366 × 900, seed 7. Updated only that capture's provenance; historical captures retain their original pack hashes. Homepage and career detail already reference this shared asset.

## R10: new migration, unchanged history

`0008_session_lookup_indexes.sql` adds `(session_id, owner_id)` indexes on `evidence_signals` and `reflections`, plus `(owner_id, expires_at) WHERE revoked_at IS NULL` on sharing grants. The expiration condition stays in the query; time-dependent `now()` does not belong in an index predicate.

Apply migrations before opening traffic or during a maintenance window. This repository's runner applies migrations in a transaction, so these are ordinary index builds. They can block writes while building; a five-second lock timeout fails and rolls back if locks cannot be acquired promptly. The existing migration command also has a thirty-second statement timeout. For populated production tables that need online index construction, an owner-reviewed concurrent rollout remains necessary; do not run this blindly against busy tables or modify existing checksum history. PostgreSQL documents both the blocking behavior and the prohibition on concurrent builds inside a transaction. [PostgreSQL CREATE INDEX](https://www.postgresql.org/docs/17/sql-createindex.html).

Tests inspect the resulting indexes and verify that the actual session/active-grant predicates can use them. They force index eligibility on a small disposable dataset; they do not claim production latency improvements or substitute for live EXPLAIN measurements.

## R12: durable, bounded writes

`0009_session_write_budgets.sql` adds one private counter row per verified owner and operation. Fixed windows last one hour from the first accepted write. Limits are:

| Operation | Budget |
| --- | --- |
| New sessions | 10 per owner per hour |
| New reflections | 60 per owner per hour |
| Reflections retained in a session | 64 |

These caps apply to all verified owners, including anonymous Supabase identities. They do not require trusting a browser-supplied anonymous flag. The endpoint cannot restrict Supabase's separate anonymous sign-up API; CAPTCHA, upstream signup quotas and distributed public analytics abuse remain deployment/owner work.

Session creation uses the existing owner/request ID for deduplication, checks it before charging, and serializes that check with a transaction-scoped owner advisory lock. An atomic counter UPSERT enforces the budget across requests, replicas and restarts. Session deletion does not refund quota. Account deletion removes its counters with other private data; a new identity receives its own budget.

Reflection submission deduplicates exact content within an owner/session: event, enjoyment, confidence and note. Repeating that content returns the original ID/time even at the limit. Different content is retained separately. This deliberately provides basic retry idempotency without a new client protocol; submitting the same content twice intentionally is also treated as one reflection.

Reflection writes lock the owned session row, check the session cap, consume the owner budget, insert the reflection and advance the storage revision in one transaction. Rejected writes roll back without advancing revisions or charging quota. A gameplay save fetched before a reflection now conflicts rather than erasing it. This is confined to reflection submission; authoritative gameplay's existing save/history path, scoring, evidence generation and deterministic reducers remain unchanged. The development repository mirrors the limits and deduplication.

Real database coverage exercises separate repository/router instances, concurrent creation/reflection bursts, owner isolation, free retries at capacity, expired windows, deletion, private-table permissions, and stale-save rejection. It also caught an existing reflection timestamp read bug: JSON timestamps used `+00:00`, while the schema requires UTC `Z`. Session reads now normalize this serialization without changing timestamps or content.

## Other bounded audit fixes

- R1: all three postgres.js connection factories disable prepared statements and statement pipelining (`prepare: false`, `max_pipeline: 1`). Supabase transaction poolers do not support those connection features. [Supabase connection guidance](https://supabase.com/docs/guides/database/connecting-to-postgres).
- R4: concurrent readiness checks share one in-flight check and a one-second success/failure cache. Liveness remains independent; readiness includes the new budget table.
- R9 admission sizing/deadlines remain deferred. A request hook that frees a slot on disconnect could admit new work while abandoned SQL continues, and a timeout race does not cancel that SQL. Choosing a complete admission/cancellation policy without a measured deployment ceiling is broader than this bounded pass. Existing pool limits, request size, rate limits and SQL timeouts remain in place.
- R11 history rewrite and R13 RLS architecture remain deferred as requested. No Render/Supabase configuration or other owner-verification findings were changed.

## Validation and owner playtest

- `pnpm lint`, `pnpm typecheck`, and `pnpm build`: passed. Server schema additions also passed lint/typecheck/build after synchronization with the new migrations.
- Two consecutive complete `pnpm test` passes with all PostgreSQL URLs enabled: **158 files passed; 1,077 tests passed and six pre-existing tests skipped per run**. Seven database scenarios ran without database-gated skips. Fresh migration-test databases were used for each pass.
- SOC reachability: all 23 layout tests passed in both complete runs. Core/scoring/evidence sources, career content and the seven historical SQL migrations have no diff from the arrival branch base.
- `db:plan` and `db:verify`: nine migrations discovered, applied and checksum-verified locally; no pending SQL.
- Real Chromium click-driven arrival playback: unmuted, advancing video time, AAC bytes decoded; skip/dissolve completed. Real AudioContext smoke check started all three world cues; a subsequent muted click started no new voice. MP4 contains H.264 video and AAC audio tracks. Refusal/late-rejection/StrictMode/mute behavior covered by the presentation tests.
- New room capture and door render inspected; mechanical visual detector reported no findings on the changed presentation targets. Existing Vite large-chunk warning remains.

Only disposable local PostgreSQL databases were used; no live service configuration changed.

For the final playtest: inspect the entry door from the front and both sides; confirm no Employee-of-the-Month poster remains; enter SOC with sound on/off, test chair/break-door/fridge sounds, and skip/revisit the arrival film. Confirm Floor 4 in map, lock screen, shell and public start page. Browser autoplay fallback can legitimately keep film audio muted where audible playback is denied.
