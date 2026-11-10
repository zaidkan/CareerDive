---
target: apps/web site (SiteApp.tsx)
total_score: 30
max_score: 36
na_heuristics: 7
p0_count: 0
p1_count: 3
target_identity: "file:/Users/zaid/orca/Career-Expo/apps/web/src/site/SiteApp.tsx"
target_fingerprint: "sha256:a24c2acbc417f6bd64b429945b0f578eac0198691c6d0cc487eb336e8441f43e"
target_path: /Users/zaid/orca/Career-Expo/apps/web/src/site/SiteApp.tsx
timestamp: 2026-09-23T22-05-06Z
slug: src-site-siteapp-tsx
---
⚠️ DEGRADED: single-context (no sub-agent/Task tool exposed in this session; Assessment A and B ran inline in isolation order)

**Target:** `apps/web/src/site/SiteApp.tsx` (public First Shift marketing site) · **Mode:** Persuade

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Route focus + Suspense fallbacks work; SPA nav has no transition feedback |
| 2 | Match System / Real World | 4 | Plain, teen-respectful copy throughout |
| 3 | User Control and Freedom | 3 | Film gate is product-required; DoorHud has no dismiss/back affordance |
| 4 | Consistency and Standards | 2 | Mixed SPA vs full-reload links; touch targets 40/44/46/48px; shared h1 styles inline-duplicated |
| 5 | Error Prevention | 4 | Film error/transcript fallbacks; honest beta banners |
| 6 | Recognition Rather Than Recall | 4 | Labeled nav, Trust TOC, FAQ accordions |
| 7 | Flexibility and Efficiency | n/a | Persuade surface — no expert power path to accelerate |
| 8 | Aesthetic and Minimalist Design | 3 | Strong chapter rhythm; chip density + mock noise on hero |
| 9 | Error Recovery | 4 | `film-unavailable-note` path is excellent |
| 10 | Help and Documentation | 3 | FAQ/Trust strong; not contextual to CTA moments |
| **Total** | | **30/36** | **Good (83%)** |

## Design Specificity Verdict

**LLM assessment:** Authored for this product. Paper-trace SOC language, mono chapter numbers, phosphor accents, Verdaly world-building, and the arrival-film ritual are not category-interchangeable. Hero mock mirrors the actual sim console. The biggest specificity leak is How-it-works reusing the tower-doors poster as if it were product UI.

**Deterministic scan (`impeccable detect`):** 3 findings in `site.css` — 2× `side-tab` warnings (L235 hero priority row; L865 `.proof-card`), 1× `codex-grid-background` advisory (L113 hero). L235 reads as intentional SOC priority chrome; L865 is **dead CSS** (no `.proof-card` usage in TSX). Grid overlay is semi-justified on a console mock but still a generated-UI signature on the hero media field.

**Visual overlays:** Skipped — no browser automation exposed this session; CLI detector only.

## Overall Impression

A confident, warm Persuade surface with real product voice. The single biggest opportunity: make every interaction feel as finished as the copy — consistent in-app navigation, honest imagery, and a crawlable SEO shell.

## What's Working

1. **Voice + trust architecture** — chips, FAQ JSON-LD, Trust TOC, and beta honesty reduce teen/parent anxiety without legal fog.
2. **Arrival film failure design** — poster → play → captions → transcript → stills → media-error note is exemplary recovery.
3. **Route focus management** — `SiteApp` moves focus to the new h1/h2 on navigation; skip link present.

## Priority Issues

### [P1] What: Inconsistent internal navigation (SPA vs full reload)
**Why it matters:** How-it-works CTAs, FAQ→Trust, and Landing trust-strip use raw `href` without `navigate()` — full document reloads, lost scroll/state, broken “app” feel next to chrome links that SPA-navigate.
**Fix:** Route all internal site links through `navigate()` (or a shared `SiteLink`).
**Suggested command:** `/impeccable polish`

### [P1] What: SEO shell is client-only + placeholder identity
**Why it matters:** Titles/descriptions/canonical for `/how-it-works`, `/trust`, `/faq` exist only after JS; social scrapers and weak crawlers see home-only meta. `og:image` is SVG (often ignored). Canonical domain is `careerexpo.example.com`.
**Fix:** Prerender/SSR route shells (or static HTML per route); PNG/JPEG OG image; real origin before launch.
**Suggested command:** `/impeccable polish` (plus infra prerender)

### [P1] What: Touch targets and focus consistency below 44px
**Why it matters:** ThemeToggle 40px, DoorHud CTA 40px (comment: “not full 48”), nav links ~30px tall; global `button:focus-visible` exists but no matching site-level `a:focus-visible` system. Hurts Casey/Sam.
**Fix:** ≥44px hit areas; shared `:focus-visible` for links/buttons; keep visual size via padding.
**Suggested command:** `/impeccable adapt` or `/impeccable audit` fixes via `/impeccable polish`

### [P2] What: Misleading How-it-works imagery
**Why it matters:** Two showcase `<img>` use `verdaly-tower-doors.svg` with alts “Alert detail” / “Your notes” — wrong for screen readers and trust.
**Fix:** Real UI stills or drop images for styled mock blocks (like the inbox/desk placeholders above them).
**Suggested command:** `/impeccable clarify`

### [P2] What: Detector slop + dead proof-card styles
**Why it matters:** Side-tab accent + tiled grid are generated-UI tells; unused `.proof-card`/`.proof-grid` rot.
**Fix:** Soften priority accent (dot/inset ring), restrain hero grid opacity or scope to mock only, delete dead CSS.
**Suggested command:** `/impeccable quieter` / `/impeccable distill`

## Persona Red Flags

**Jordan (First-Timer):** CTA label “How the shift works” vs footer “How the shift works” is fine; full reload on secondary CTAs feels like leaving the app mid-story. Film required before sim with no “skip film” for the impatient (transcript only inside details).

**Casey (Distracted Mobile):** Nav wraps at 820px but link hit height is thin; DoorHud primary CTA is 40px; theme toggle 40px — miss-taps on one-handed use.

**Sam (Accessibility):** DoorHud `role="dialog"` without `aria-modal`/focus trap semantics; mismatched image alts; link focus styles rely on UA defaults; FAQ `+` affordance doesn’t reflect open state visually beyond native marker removal.

## Minor Observations

- Massive inline `style={{...}}` duplication for page h1/lede — promote to a `.page-hero` class.
- `site-chip` uses hard-coded `rgb(45 212 191 …)` — won’t track light-theme `--signal`.
- Landing hero grid + mock grid double up visual noise.
- `proof-card` left border is a hard-coded teal, not a token.

## Questions to Consider

- Should the film remain a hard gate, or offer “Skip to doors” for returning visitors?
- What would a crawlable, prerendered multi-route shell look like without losing the SPA feel?
- If imagery can’t be real product stills, should How-it-works drop photos entirely?
