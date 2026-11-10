# CareerDive — P0-A Launch Decisions (owner: Zaid Khan)

Source-of-truth answers to the privacy/legal review's open questions. Drives the P0-B build.

## Confirmed
- **Operator / legal identity:** Zaid Khan — a **personal project**, NOT a company/LLC, not monetized, not a startup. A free educational web app.
- **Public contact email:** `khn.zaid.2008@gmail.com` (used for privacy + support + accessibility — single personal contact).
- **Identity model:** **ANONYMOUS.** No accounts, no login UI. Reconcile the client/server auth so there is a consistent anonymous model (fix the dev `x-user-id` vs Supabase-Bearer mismatch). Privacy/Trust copy describes anonymous use, not accounts.
- **Audience / age:** **13+** stated policy via a neutral age gate; **under-13 → blocked/soft-blocked** at launch. Under-13 verifiable parental consent is a POST-LAUNCH fast-follow. Counsel must still classify COPPA before public launch.

## Pending owner confirm (recommendations noted)
- **Anthropic AI:** recommend **OFF for launch** (no user text sent to an AI vendor; sim falls back to prewritten dialogue). → CONFIRM
- **Simulation data retention:** recommend **90 days then auto-delete** (sessions/actions/reflections). → CONFIRM
- **Free text at launch:** recommend **closed-ended only** (disable free-text entry fields) given anonymous + youth audience; add free-text later with warnings. → CONFIRM

## Still needed before publish (infra facts, gather during deploy)
- Supabase project region + plan + backup mode; confirm anon auth on, no service key client-side.
- Render plan + server region + log retention.
- PostHog: launching OFF (`VITE_LAUNCH_ANALYTICS_ENABLED=false`); if ever on, region + AI-training opt-out + first-party allowlist config.
- GitHub repo public? (affects "open source" claims.)

## Legal (not self-certified)
- Attorney reviews the FINAL `/privacy` + `/terms` + data-flow + production evidence AFTER P0-B/P0-C. No "COPPA/legally reviewed" claims until then.
