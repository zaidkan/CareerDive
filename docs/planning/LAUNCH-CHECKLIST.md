# CareerDive — Launch Checklist (simple)

Updated 2026-10-11. `[ ]` todo · `[~]` in progress · `[x]` done.
Who: **ME** = you (ChatGPT guides you) · **AI** = an agent does it.
main @ `5675404` — PUSHED to origin; green (lint/typecheck/build ✓, test 1074/1074, flake fixed). Launch film = new SOC render.

---

## 🚫 PRIVACY/LEGAL REVIEW CAME BACK — NOT launch-ready yet (do NOT publicly launch until P0 closed)
Full review: `docs/planning/PRIVACY-LEGAL-REVIEW.md`. Decisions: `docs/planning/P0A-LAUNCH-DECISIONS.md`.
Privacy policy + terms drafted & saved: `docs/planning/PRIVACY-POLICY.md`, `docs/planning/TERMS.md`.

### Locked decisions
Anonymous (no accounts) · operator = Zaid Khan, personal non-commercial project, khn.zaid.2008@gmail.com ·
13+ via clickwrap consent under Start button (no verification) · **AI feature REMOVED** · analytics OFF ·
90-day auto-delete · closed-ended only (no free text) · no lawyer (acceptable: free, anonymous, 13+-gated, not monetized).

### ✅ LAUNCH-READINESS STACK MERGED — main `db917bf`, green (lint/typecheck/build ✓, test 1081/1081 twice)
- [x] Repo cleanup (AI/process docs untracked, LICENSE/README, packages/ai deleted)
- [x] AI feature removed · anonymous auth reconciled · 13+ consent line · /privacy + /terms pages · analytics OFF
- [x] 90-day auto-delete retention · closed-ended only (free-text removed) · accurate Trust/FAQ copy · self-hosted fonts
- [ ] **ME** — Playtest merged main (consent line, no AI, pages load, flows work, sim starts).
- [ ] **ME (deploy, with ChatGPT):** PUSH main · Supabase **enable anonymous sign-in** + pool/TLS · Render services + env/BUILD-ARGS (analytics flag false) · CORS (WEB_ORIGIN ↔ VITE_SERVER_URL) · deploy API→web.
- [ ] **ME** — Smoke test (two anonymous visitors, isolated; /privacy + /terms load) → post the launch.

## ✅ CORE SIM/CODE DONE (merged + pushed, green) — main `5675404`, test 1074/1074, new launch film.

## DEFERRED / OPTIONAL (not needed for this launch)
- R15 (old-data cleanup) — effectively covered by the 90-day auto-delete.
- RED future-content tests — intentionally red specs for unbuilt features; leave.
- (Dropped as not-worth-it for a small short-lived personal project: ponytail code audit, R11 history pagination, R13 SQL-RLS architecture.)

