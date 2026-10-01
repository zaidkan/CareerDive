# Start, recovery, and first-party support

Branch: `worker/recovery-support-final`
Base: `cb3b8ea479d02871c7c57a7699b23ec97a3987cf`

## Recovery flow

Start uses **About 10–15 minutes.** Redundant score reassurance and badge duration copy are removed.

Startup checks service availability before session creation. A failed check gets one automatic retry after 400 ms. A second failure offers **Retry starting shift** and **Report a problem**. Manual retry starts another bounded attempt. Health checks time out after five seconds; creation times out after eight seconds. The whole startup promise is shared across StrictMode effect replay. Leaving the page cancels the delayed automatic retry.

The current session API has no idempotency contract and creates a new session ID per POST. If a creation response is lost, startup pauses with an honest explanation and reporting. It does not repeat an unconfirmed POST. Safely retrying that case requires a future server idempotency contract.

A failed workplace gets one normal retry, carrying its current presentation through remount. A second failure runs a lightweight compatibility check and offers **Open recovery workstation**. The same canonical view, session ID, actions, and mutation handlers remain owned by App. Accessibility recovery also opens this workstation directly. Recovery never navigates to marketing or recreates a live session.

## Compatibility and privacy

Compatibility shows a plain language result. Technical details contain only:

- WebGL and WebGL2 availability (contexts released; no rendering or pixel reads)
- Browser family/version
- Viewport size
- Reduced-motion preference
- Build commit SHA
- Route pathname (no query string)
- API failure category
- Asset/workplace failure category
- Current recovery phase

No fingerprint, renderer string, hardware identifier, tracking identifier, session ID, cross-site data, or raw error message is collected. Technical details are attached to reports only when the student checks the checkbox.

## Report form and unavailable backend

The in-product form has category, description, optional contact, and an optional technical-details checkbox. No account or GitHub workflow is required. Screenshots are not attached in this implementation.

The form attempts `POST /api/support-reports` and times out after eight seconds. It treats missing endpoints, HTML SPA fallbacks, invalid responses, and network failures as unconfirmed delivery. It retains all text and offers **Copy report details**. Clipboard denial offers a focused, selected report text field for manual copying. Form text remains in sessionStorage for this tab; an in-memory fallback preserves it across component remounts when storage is blocked. Successful submissions also retain the text.

Keyboard focus moves to retry, compatibility, workstation, and the report category field as appropriate. Closing the form restores its trigger. Live regions announce recovery and report delivery. Recovery headings do not steal focus when canonical view updates. New recovery/support UI adds no motion.

## Files

- `apps/web/src/client.ts` — safe startup failure categories, health preflight, creation timeout
- `apps/web/src/index.tsx` — bounded/shared startup retry, focus and startup reporting
- `apps/web/src/site/ThresholdBrief.tsx` — canonical start copy
- `apps/web/src/experience/ExperienceShell.tsx` — workplace retry, compatibility and workstation flow
- `apps/web/src/experience/diagnostics.ts` — allowlisted capability/compatibility checks
- `apps/web/src/experience/ProblemReport.tsx` — report form, draft retention and copying
- `apps/web/src/world/RoomCanvas.tsx` — catchable graphics-availability guard
- `apps/web/src/world/SpatialShell.tsx` — retain presentation for recovery remount
- `apps/web/src/styles.css` — scoped support form styles
- `apps/web/vite.config.ts` — build SHA injection
- `apps/web/test/recovery-support.test.tsx` — recovery, reports, consent, focus, StrictMode and cancellation
- `apps/web/test/shift-lifecycle-recovery.test.tsx` — explicitly safe startup failure fixtures
- `apps/web/test/experience-shell.test.tsx` — updated compatibility-to-workstation flow
- `apps/web/test/assessed-entry.test.tsx` — health preflight fixture; one assessed session remains asserted
- `apps/web/e2e/recovery-support.spec.ts` — real browser API/graphics/report/keyboard/reduced-motion paths
- `docs/qa/start-recovery-support.md` — handoff and validation record

## Validation

- `pnpm typecheck` — passed (11 packages).
- `pnpm lint` — passed (11 packages); final browser/test selectors also checked directly with ESLint.
- `pnpm test` — 798 passed, 9 skipped; 115 passing files, 2 skipped files. Skips include existing Postgres integration and scenario fixtures.
- `pnpm build` — passed; existing large-chunk warning remains. Build rerun after commit so injected SHA identifies the final source commit.
- `pnpm check:product-contract` — passed.
- Existing Chromium golden path — passed: one assessed session, two successful movement calls, Desk OS leave/return continuity; no API, asset, page, or console errors. Existing debrief browser test remains skipped by its own fixture gate.
- Recovery Chromium paths — 3 passed: safe automatic/manual startup retry; real WebGL unavailability, compatibility, recovery, keyboard focus, reduced motion, unavailable report backend and clipboard copy; unconfirmed creation never repeated.
- Desktop (1280 px) and mobile (390 px) support/workstation screenshots inspected. No horizontal overflow. Recovery light-theme contrast and 44 px support controls corrected in the visual pass.
- Impeccable detector — no findings on changed recovery/start targets.
- `git diff --check` — passed.

Tests use local Chromium/SwiftShader and synthesized keyboard input. They do not establish physical-device or screen-reader certification. No database migration, backend support persistence, merge, or deployment is included.
