# Career Expo — repository status (public handoff)

Last reconciliation: **2026-09-22** (experimental consolidation f5d2bff) · **Cleanup pass 2026-09-22 on `zaidkan/product-experimental` (`b71a78c` → post-cleanup)**.

This file is the public-safe map of what is on GitHub, what is draft, and what must stay local. It does **not** document private developer-infrastructure internals.

## Simplified model

| Branch | Role |
| --- | --- |
| `main` / `origin/main` (`8bf7111`) | **Stable/release.** Desk OS audit docs, structured-ticket substrate notes, v2 benign triage schema. Do not merge product drafts without explicit release decision. **Currently unprotected — protect near release/promotion (not in this task).** |
| **`zaidkan/product-experimental`** (`b71a78c` → +cleanup) | **Current integrated development product — SINGLE ACTIVE PRODUCT BRANCH.** Single place to clone and run. Task8 + site shell + landing de-redundancy + Desk OS lock fix + light theme + briefing prop + arrival-film fallback + CI/reliability fixes. See below. |
| **Everything else** | **Historical/draft/source material.** Keep as history; do not treat as parallel active lanes. Do not delete yet (defer until after Task 10 + Windows playtest + Task 11 + promotion to main). |

**Future product work should start from `zaidkan/product-experimental`.**

## What `zaidkan/product-experimental` contains (f5d2bff, child of 8a846dd)

**Base:** `zaidkan/chore-product-consolidation` @ `8a846dd` — Task8 complete (structured ticket composer is canonical player workflow, single submission satisfies old ticket-summary gate; legacy gate kept only for replay compat) + Task7 foundation. Privacy fix: manager-only context out of guidance.

**Integrated:**
- Site shell/pages from `zaidkan/public-website-draft` (`21885ae`): `SiteApp`, `SiteChrome`, `ThemeToggle`, `ArrivalFilm/DoorHud`, `Landing/HowItWorks/Start/Trust/Faq`, `routes/seo/site.css`, public assets, `ExperienceShell` hints + mode note, `index.html`.
- Landing de-redundancy from `worker/frontend-experience` (`675b3e4`/`5746267`): `LandingPage` now `How the 10 minutes move` (0-2 handoff, 2-8 investigate, mid-shift interruption, end decide), removed redundant `Three ways` + duplicate ready CTA; hero `Start` is single entry.
- Desk OS single-leave (`d51a91e`): `LockScreen` drops duplicate `Stand up`, single `Leave desk` on lock chrome.
- App entry improvement: `App` now accepts optional `briefing="shown"|"hidden"` (default `tutorial` flow preserved for Task7/8 tests, `StartPage` uses `hidden` to skip duplicate briefing when coming from site).
- Light-theme tokens + `styles.css` corrections (career-agnostic, not cyber-themed; dark remains default).
- `site-entry.test.tsx` updated to match final landing copy.

**Preserves:** `TicketComposer`, `AlertRecords`, `workplace`/`effects`/`reducer`/`serializer`, `workplace-golden-path` + `workplace-parity` green, `morgan-a1042-context` privacy.

**Verification on f5d2bff:** `pnpm lint` green, `pnpm typecheck` green, `pnpm build` green (RoomCanvas 1,014 kB warning unchanged), `pnpm test` 84 files 630 pass 6 skipped, `site-entry` 8/8 green. Manual smoke: `/` landing → `/start` film gate (forced watch, doors freeze → DoorHud) → `/start` briefing → `App` Walk/Desk/List modes → Desk OS lock → alerts/email/knowledge/inventory → ticket composer → TeamChat/Morgan → escalation — no blank screens or dead buttons observed.

**Cleanup on `b71a78c` (this pass):**
- Arrival film soft-lock fixed — `ArrivalFilm.tsx` now handles `onError` / missing `arrival-film.mp4` by falling back to poster + stills/transcript and unlocking `DoorHud` (`film unavailable — continue with the poster…`); reduced-motion behavior preserved; valid film path still plays through to doors freeze. No dead end.
- CI now runs on pushes to `zaidkan/product-experimental` as well as `main` + PRs (`install → lint → typecheck → test → build`).
- Reliability workflow no longer uses job-level `secrets` condition (which failed before job creation); now uses preflight `ENABLE_PAID_AI_EVALS` + `ANTHROPIC_API_KEY` + test-file check, skips cleanly with `GITHUB_STEP_SUMMARY`, never prints secrets, never makes paid calls.
- Stale PR #1 (`experimental → main`, "Fix optional AI workflow…") closed after recovering its reliability fix; its graphics/AGENTS changes remain historical on `origin/experimental` per this handoff.
- README aligned to canonical pack (`cybersecurity_analyst@1.0.0`, events `incomplete_handoff` / `suspicious_login` / `routine_alert_review`) — removed stale `phishing report` / `false-positive` as live gameplay; phish actions remain quarantined (R1).
- Public-safe workplace systems plan/design restored to `docs/product/workplace-systems-overhaul-design.md` and `docs/product/workplace-systems-overhaul-plan.md` (Tasks 1–11 preserved; Tasks 10–11 are next; private BrainV2/orchestration remains excluded).
- Branch hygiene deferred as requested — old branches/tags/worktrees/stashes not deleted.

## What was deliberately NOT integrated (and why)

| Source | Why excluded |
| --- | --- |
| `zaidkan/blocked-spray-deskos-draft` (`0233530`) `blocked_spray_review`/A-1159 pack + HUD spray | Content not approved, would break `workplace-golden-path` (12 spray-aware failures previously). Keep as draft, needs content + test policy decision. |
| `zaidkan/shift-depth-contract-draft` (`9436ec7`) + RED lanes (`*.red.test.ts`, V2/V3/soc-vertical-slice) | Future contracts; `pnpm test` gates normal suite only (`test:red` separate). Not promoted to gameplay. |
| `zaidkan/simulation-entry-draft` (`47f52a2`) assessed-first as full branch | Proposal only; experimental keeps tutorial-first default (Task7/8 green) and only takes the `briefing` prop plumbing needed for site entry. |
| `worker/frontend-experience` rest (beyond landing + desk single-leave) | That branch’s ancestry strips Task8 `TicketComposer`/workplace files; only cherry-picked functional landing + desk fix. |
| Dirty main checkout regressions (`apps/server/test/*`, `app.test`, `workplace-golden-path` weakened edits) | Duplicate/superseded or weaker than 8a846dd; not copied. Main dirty remains untracked as safety. |
| `origin/experimental` (`c376e9b` cubicle rendering) | Historical graphics polish, superseded by product baseline; not product-functional tip. |

## Task status on experimental

- **Task7:** as on `45ff32d` baseline (email/alert tooling, artifact observation, source-bound records, guide/inventory, lock-screen login). Open gaps per `docs/planning/desk-os-audit/` remain (sentence-level source selection proof, legacy gate clean-up, mode consistency) — not regressed.
- **Task8:** **integrated** — structured ticket composer is canonical, Team Chat `managerGuidance` privacy-preserved, legacy `build_summary` gate remains only for replay. Golden-path asserts ticket composer success.
- **Task9:** complete per `f5d2bff` (site shell + landing + Desk OS lock + briefing prop + light theme).
- **Task10:** **NEXT** — Accessibility parity, acceptance, and documentation (`docs/product/workplace-systems-overhaul-plan.md` Task 10). Do not start yet.
- **Task11:** **FOLLOWS** — Final review and branch verification (`docs/product/workplace-systems-overhaul-plan.md` Task 11).

Product plan/design restored: `docs/product/workplace-systems-overhaul-design.md` and `docs/product/workplace-systems-overhaul-plan.md` — authoritative Task 1–11; private BrainV2 docs remain excluded.

**Legacy tech debt retained (do not clean yet):** `requiredOptionIds`, old `build_summary`/`select`/`compare` authoring, and other compatibility shims — Task 7/8 already routes normal workflow through the newer real-work system; broad schema cleanup deferred.

## Old branches — keep as history, not active lanes

| Branch | SHA | Note |
| --- | --- | --- |
| `zaidkan/product-consolidation-baseline` | `45ff32d` | Previous stable baseline; superseded by `zaidkan/product-experimental` for active work. Keep. |
| `zaidkan/chore-product-consolidation` | `8a846dd` | Parent of experimental; keep. |
| `zaidkan/public-website-draft` | `21885ae` | Source for site shell; now absorbed. Keep. |
| `zaidkan/frontend-experience-draft` | `d2bc35c` | Source for landing polish; now absorbed. Keep. |
| `zaidkan/simulation-entry-draft` | `47f52a2` | Proposal; keep. |
| `zaidkan/blocked-spray-deskos-draft` | `0233530` | WIP content; keep. |
| `zaidkan/shift-depth-contract-draft` | `9436ec7` | Future RED; keep. |
| `worker/frontend-experience` | `5746267` | Local landing fix commits; now on experimental via `d2bc35c` + f5d2bff. Keep. |
| `origin/experimental` | `c376e9b` | Unrelated cubicle work; ignore. |

Do **not** treat these as parallel active development lanes. Do not delete yet.

## What is intentionally private / local (never on product branches)

- BrainV2 and `worker/brainv2-*` (incl. `brainv2-integration-b1`) — private dev infra
- `scripts/brain`, `scripts/oc-*`, private orchestration/mcp, `.codex/.kiro/.agents/.claude`, `.github/skills` local installs
- `neo4j-backup/`, `skills-lock.json`, credentials
- Dirty root checkout (`chore/public-cleanup-minimal-ai` @ `94abd02` with 17 modified + site untracked + private tooling) — safety only, not source of truth
- Stashes `tmp2` / `ab5ebd1` — left intact

## To run experimental on Windows

```bash
git clone https://github.com/zaidkan/Career-Expo.git
git checkout zaidkan/product-experimental
pnpm install
pnpm build   # or pnpm dev (web 5173, server 3001)
pnpm test    # expect 84/84, 630 pass
```

No BrainV2/Neo4j required. No private env needed beyond `.env.example`.

## Remaining known gaps

- Landing still text-only cards (no real screenshots), site footer `Start` link is single entry (hero `Start` remains primary).
- Desk OS overhaul questions still open per `DESK_OS_AUDIT_HANDOFF.md`; experimental only fixes duplicate leave.
- V2 blocked-spray / shift-depth RED contracts still future.

Do **not** merge `zaidkan/product-experimental` into `main` without release decision. Old branches not deleted.
