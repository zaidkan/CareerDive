# Desk OS cleanup — final verification

Branch: `worker/desk-os-visual-polish-final`.
Base: `2e4874a4dc3f82e72e487d8b282b3ff62595dc39`.

## Scoped fixes

- Desktop background and icon text use semantic surface/text tokens. Removed the unconditional “Open the Browser…” hint. Minimized taskbar entries retain readable semantic text instead of opacity dimming.
- Marketing navigation/footer and the simulation introduction/privacy paragraph hide while the seated Desk OS is mounted. Native `:has` selectors restore them when standing or completing the shift; no session/route machinery was added. Recovery, reporting, taskbar navigation, and leave/expand controls remain available.
- Current objective stays in the SOC status strip; Dashboard owns its own guidance when open. Removed the duplicate seated journey instructions. Energy, snack, and recovery controls remain intact in a native “Desk resources” disclosure below the workstation.
- Rail selection follows the existing case selection resolver and exposes `aria-pressed`. High/urgent priority uses warning text/surface tokens in matching rail/detail labels, with no danger semantics or scenario priority changes. Case, window-control, and taskbar hover states use theme-aware surfaces.
- Alerts owns record search and the case-source block. Guides retains its guide search, inventory lookup, and original task actions, with a button back to the same case’s sources/search in Alerts. Query/result persistence and canonical inspection handlers are unchanged.
- Unopened sources no longer repeat “Available to inspect.” Opened state remains explicit. Empty-action, unopened-record, and checkpoint helpers use concise workstation wording.
- Primary workplace actions have content-sized width (maximum 36rem), tighter padding, and an inline time label. The status strip is quieter and shorter. No action, decision, evidence, or handoff requirements changed.

## Real browser completion

A fresh assessed session ran through landing, arrival, brief/floor, walking, sitting, credential-slip login, Desk OS, authored record search, investigation, source comparison, decisions, supporting apps, interruptions, structured handoff, completion, and debrief. One browser session creation; zero failed API responses in its network log. One reload occurred before walking; investigation through debrief then ran continuously. This was a guided verification, not a blind-user audit.

The main login case used device inspection before account-history comparison, opened the login timeline/VPN context, recorded a comparison, and saved the structured ticket before escalation. Scanner evidence/procedure and the remaining existing shift work were completed. Ticket draft survived app switching and Browser → intranet → Back. Handoff selections/note survived Notes → Browser. Final preview preserved inspected sources, actual decisions, and unresolved follow-up. Debrief rendered and survived reload. Public chrome returned at completion.

Separate committed browser coverage verifies seated chrome hiding, leave/return chrome restoration, notes continuity, Browser navigation/reload, exactly one session creation, and recovery/report fallback.

## Visual/accessibility QA

- 1366×900 and 834×900 (real handoff also 834×1112), dark/light.
- Fixture renders current production Desk OS/components with existing authored state; fixture captures are not claimed as real gameplay completion.
- Twenty desktop/Alerts/Tickets/Guides/Team samples: no page horizontal overflow; final axe WCAG A/AA checks reported zero violations. Desktop was explicitly exposed by minimizing Browser.
- First batch found an existing minimized-taskbar opacity contrast failure. Fixed with semantic text at full opacity; confirmation passed. High-priority rail/detail colors were additionally confirmed equal in both themes.
- Real handoff and debrief: four viewport/theme samples each, zero overflow and zero axe violations. Normal/reduced motion exercised across the real handoff samples. Window-control hover changes verified; selected cases and enabled/disabled source controls remained readable.
- Native resources disclosure is keyboard accessible; carried-snack tests explicitly open it and still verify exact canonical bite interactions.
- Images and temporary harnesses are outside Git in `/tmp/desk-os-cleanup-final-qa/`. Representative images: `screenshots/1366-light-desktop.png`, `screenshots/1366-light-Alerts.png`, `screenshots/834-dark-Guides.png`, `real-834-light-handoff.png`, `real-1366-dark-debrief.png`.
- Layout-shift timing was not instrumented in this cleanup; no CLS number is claimed.

## Gates

- `pnpm typecheck`: passed.
- `pnpm lint`: passed.
- `pnpm test`: 812 passed, 9 skipped, 0 failed.
- Final targeted UI regression run: 48 passed across case-source navigation, case selection, search/draft persistence, Desk OS lifecycle, and desk resources.
- `pnpm build`: passed (existing Vite chunk-size advisory only).
- `pnpm check:product-contract`: passed.
- `git diff --check`: passed.
- Playwright: 4 passed (entry/leave/return continuity and 3 recovery/support scenarios).

Skips: 3 PostgreSQL tests because `TEST_DATABASE_URL` is unavailable; 2 proposed A-1204 content tests; 4 pre-existing pending query DOM-binding tests. Initial checks exposed obsolete duplicate-search expectations and one timed-out window lifecycle test under concurrent load; expectations were updated to the canonical Alerts route without weakening search/provenance/draft assertions, and final full/targeted runs passed.

## Remaining

P0/P1: none observed in the tested cleanup scope.
P2: existing instructional wording in authored task-result feedback remains unchanged; this pass only changes workstation helper copy. The horizontal case rail at 834 is intentional and scrollable. Smaller viewports, exhaustive contrast across every possible authored state, and cross-browser coverage were not part of this pass.

No public homepage/careers, backend, scenario decisions, search behavior, persistence, structured handoff logic, or debrief provenance changed. No deployment or merge.
