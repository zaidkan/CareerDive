# Desk OS visual polish — final QA

Branch: `worker/desk-os-visual-polish-final`.
Base: `1194e8fb64d5722c8b7a35bf5ef49d8c81411313` (`worker/cyber-shift-usability-final`).

The older `/tmp/desk-os-polish-qa` draft was inspected, not applied. Its fixture was regenerated from the finished base in a separate temporary QA directory. Production edits are presentation only: no pack, decision, server, persistence, provenance, or assessment logic changes.

## Visual changes

- `foundation.css` remains the sole semantic palette, font, and radius source. Removed the competing root/theme definitions from simulation `styles.css`, including their body backgrounds and duplicate base utilities. Simulation-only compatibility names are scoped to `.simulation-main`.
- Primary actions use `--action-primary` with `--action-on-primary` in both themes. Notes, guide fields, and artifact prose use matching semantic text/surface tokens. Removed per-app dark/cream artifact skins, double borders, and the decorative CASE stamp. This also fixes the late-found light-mode Team artifact contrast failure.
- Blue indicates focus, selection, and active work; green indicates a saved/completed outcome; warnings and errors use their dedicated tokens. High priority no longer automatically gets a danger marker or glow; low priority is neutral. Physical credential paper and the 3D scene retain their existing authored appearance.
- Consistent 6px controls and 10px panels/windows; Plus Jakarta Sans for reading, IBM Plex Mono for technical metadata. Focused windows have an accent border/top rule; unfocused windows use a neutral title surface.
- Padded window chrome, 20px case detail gutters, 16px source/record panels, 12px form controls, separated action footers, readable field rows, and distinct selected attachments/choices. One coherent spacing rhythm replaces edge-glued content.
- Source inspection, side-by-side comparisons, structured handoff sections/preview, ticket choices, status updates, and interruption actions have clearer hierarchy and immediate selected/focus feedback. SOC is the primary Browser destination; intranet remains secondary.
- Day-one supporting explanation, search methodology, CaseReview help, repeated task “Why this matters,” and incidental nearby HUD context use native disclosures. Essential walking directions remain visible. Guides retain existing inspect-to-read behavior with wider reading tracks and readable prose. No authored facts were removed.
- Container queries constrain inner grids and switch narrow windows to one vertical content scroller with horizontal queue navigation. No new dependency, animation system, or frame-driven state updates.

## Continuous real browser run

**PASS — one continuous assessed session, not aggregated fixture runs.**

Session: `2c075ea8-8aa8-43f7-af8f-70f3809a029c` on the local development server.

Landing → actual arrival film → day-one brief → floor → SOC → physical WASD walking → sit → credential-slip login → Browser/SOC → previous handoff and ownership confirmation → record search/revisit → device-first investigation → account history → timeline/prior session/VPN → explicit comparison → ticket with source attachments → escalate → scanner investigation and documented closure → phone/laptop troubleshooting → access request and chat → Morgan status update → structured handoff → complete shift → five-decision debrief.

Evidence:

- Exactly **one** `session.create`; all recorded session views carry that same ID; final action returns `completed: true`; debrief reload resumes it.
- Walking automation initially overshot/changed camera direction when clicking into pointer lock. Same-session viewpoint reload and keyboard walking succeeded; no recovery workstation or seeded completion was used.
- Browser → intranet → back → forward → back → reload preserved the investigation ticket, inspected sources, and selections. Email/Tickets switching preserved drafts. Notes switching preserved handoff selections and optional note.
- Real search returned authored authentication rows; AUTH-0741-PATEL was inspected/revisited. Device inventory was checked before account history (alternate order).
- Live Snooze and Continue interruption responses worked. Handle routing remains covered by existing runtime tests; it is not claimed as a live action in this run.
- Nonsense chat produced a bounded clarification, not meaningful acknowledgement.
- Handoff selected five actually inspected references: timeline, VPN catalogue, device inventory, scanner run log, approved scanner window. Actual resolutions and unresolved session ownership remained explicit. Debrief showed those same references and decisions.
- No failed tRPC responses or uncaught page errors in the continuous run. CSS was corrected during QA; the final semantic artifact fix was confirmed separately with current component states.

## Visual/accessibility evidence

Temporary outputs: `/tmp/desk-os-polish-final-qa/` (not committed).

- 90 initial current-base captures: 1366×768, 834×1112, 390×844; dark/light; all seven SOC tabs, Files, Notes, login, ticket, handoff, debrief, and action footers. These are component fixtures, not claimed gameplay completions.
- Confirmation captures cover login error, selected ticket/handoff controls, search empty state, intranet, blocked Browser address, Notes focus, and foreground/background windows.
- Real-session handoff and debrief captures at 1366, 834, 390 in both themes, with normal/reduced-motion checks. No document horizontal overflow; form fields fit their container. Narrow windows retain internal queue scrolling and a reachable action footer.
- Final axe checks: 24 SOC tab/theme/width samples, 18 login/ticket/handoff samples, two edge-state samples, six real debrief samples: no WCAG A/AA violations. Initial real handoff samples found the obsolete Team skin; that skin was removed, and final SOC/edge checks passed.
- Focus, hover, selected, disabled, empty, and error states inspected. No added motion; reduced-motion layout/controls remain available.
- Representative files: `screenshots/1366-light-notes.png`, `screenshots/1366-light-ticket-confirmation.png`, `screenshots/390-light-handoff-confirmation.png`, `screenshots/light-search-empty.png`, `screenshots/light-window-focus.png`, `real-ticket-light.png`, `real-handoff-light.png`, `real-1366-dark-handoff.png`, `real-390-light-handoff-actions.png`, `real-1366-light-debrief.png`, `real-390-dark-debrief.png`.
- Machine results: `screenshots/results.json`, `accessibility.json` (final overwrite), `forms-accessibility.json`, `edge-states.json`, `debrief-matrix.json`. `live-matrix.json` retains the initial Team contrast finding for transparency.
- Network and trace: `/tmp/desk-polish-browser-network.jsonl`, `/tmp/desk-polish-browser-trace.zip`. Temporary capture helpers and all images stay outside Git.

## Gates

- `pnpm typecheck`: PASS.
- `pnpm lint`: PASS.
- `pnpm test`: **810 passed, 9 skipped**, zero final failures.
- `pnpm build`: PASS; existing large-chunk notice only.
- `pnpm check:product-contract`: PASS.
- `git diff --check`: PASS.
- Impeccable source detector: zero findings on the scoped UI targets.
- Playwright recovery/support: three tests passed.
- Playwright assessed entry/leave-return: isolated confirmation passed in 50.7s, one assessed creation, two successful movement calls, zero API/asset/page/console errors. Initial combined run reached leave-return but exhausted its 150s test timeout under load; retained its trace and reran without load. No test was weakened.
- Playwright seeded debrief suite: one skipped because `DEBRIEF_BROWSER_FIXTURE=1`/its fixture server was not enabled. Actual unseeded full completion and six debrief theme/width checks above cover this candidate instead.

Unit skips: three PostgreSQL tests without `TEST_DATABASE_URL`; two proposed A-1204 content tests; four pre-existing pending query DOM binding tests. These skips were not changed.

## Remaining issues and scope

No confirmed remaining P0 or P1 visual defect. P2: short default workstation windows still benefit from the existing Current shift collapse or Expand workstation control for long records; some legacy sources repeat case-source narrative. These are visible density limits, not lost content or state. 390px is a responsive/recovery check, not a claim that a phone is the ideal 3D workstation.

Public homepage and `/careers` unchanged. Scenario decisions/content truth, simulation behavior, backend, deployment and production service setup unchanged. No merge performed.
