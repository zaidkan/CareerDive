# Chromebook-class performance pass

**Branch:** `perf/chromebook-lightweight` (base `5888522` on `zaidkan/product-experimental`)  
**Date:** 2026-09-23  
**Scope:** load-path, render-loop cost while seated, site chrome accessibility, and measured before/after bundle evidence. No canonical sim, assessment, evidence, Desk OS architecture, or Walk/Desk/List product changes.

---

## 1. Goals and non-goals

| Goal | Non-goal |
| --- | --- |
| Cut critical-path JS/CSS for marketing/landing | Change simulation semantics or mutation ordering |
| Stop paying for peer modes / Desk OS until chosen | Redesign Desk OS windows/state (owned by `docs/planning/desk-os-audit/DESK_OS_OVERHAUL_PLAN.md`) |
| Reduce 3D work while seated at Desk OS | Remove WorkSurface / AccessibleMode / mode selector |
| Fix measurable site a11y landmark issues | Claim FPS/heap numbers without a real device |
| Record deferred items honestly | Speculative visual quality degradation |

**Target device class (product, not measured here):** low-end Chromebook-class — integrated GPU, 4–8 GB RAM, current Chrome, ~1366×768.

---

## 2. Environments

| Item | Value |
| --- | --- |
| Host used for this pass | macOS (Darwin), Node ≥ 24, pnpm 11 |
| Build | `pnpm build` → Vite 7.3.5, React 19, `@react-three/fiber` 9, three 0.185 |
| Tests | Vitest 3 (`pnpm test` monorepo; web suite `jsdom`) |
| Bundle numbers | Production `vite build` sizes + gzip (Vite reporter), baseline rebuilt from clean tree via stash |
| Chromebook / CPU throttling / WebGL GPU capture | **Not run** — no FPS, TBT, or heap claims |

Gates after this change: `pnpm lint` (10/10), `pnpm typecheck` (10/10), `pnpm test` (84 files, **631 passed**, 6 skipped), `pnpm build` (10/10).

---

## 3. Baseline (before)

Clean tree at `5888522` (perf edits stashed), same Vite config:

| Asset | Raw | Gzip |
| --- | ---: | ---: |
| `index.html` | 2,816 | 1,019 |
| `index-*.css` | 83,851 | 15,880 |
| `index-*.js` (single entry) | 448,747 | 129,495 |
| `SceneEffects-*.js` (already lazy) | 82,936 | 22,748 |
| `RoomCanvas-*.js` (already lazy) | 1,014,125 | 269,916 |
| **Landing critical path** (html + css + entry js) | **535,414** | **146,394** |
| **All emitted assets + html** | **1,632,475** | **439,058** |

**Load-graph problem:** `main → SiteApp` statically imported `StartPage → App (index.tsx) → ExperienceShell → SpatialShell → LaptopOverlay/DeskOs` into the entry chunk. Landing visitors paid for the full sim shell. `RoomCanvas` / `SceneEffects` were already lazy (kept).

---

## 4. Bottlenecks identified

1. **Entry graph pull-in** — static `StartPage`/`App`/`ExperienceShell` chain on every page load.  
2. **Peer modes always co-resolved** — Walk/Desk/List renderers sat in the same graph as the shell.  
3. **Always-on WebGL frameloop** — `frameloop="always"` even when seated (Desk OS HTML over a static pose).  
4. **Per-frame work while seated** — quality `useFrame` sampler, ceiling/prop animation, first-person typing pose still scheduled.  
5. **Site chrome landmark** — `.site-nav` was a `div`, not `header`/`nav` (a11y).  
6. **Not addressed this pass (needs evidence):** Google Fonts render-blocking stylesheet, font weight trim, further `RoomCanvas` chunk surgery, deeper adaptive-quality tiers.

---

## 5. Optimizations applied

### 5.1 Code-splitting (landing → start → floor)

| Boundary | File | Effect |
| --- | --- | --- |
| `StartPage` lazy from site shell | `apps/web/src/site/SiteApp.tsx` | `/start` (and film gate) leave the landing entry |
| `App` lazy from start gate | `apps/web/src/site/pages/StartPage.tsx` | Film/briefing steps do not load sim shell; floor entry Suspense fallback |
| `SpatialShell` / `WorkSurface` / `AccessibleMode` lazy peers | `apps/web/src/experience/ExperienceShell.tsx` | Mode-specific bundles only after mode is chosen; single Suspense + existing spatial error boundary |
| Drop `AccessibleMode`/`WorkSurface` re-exports from entry barrel | `apps/web/src/index.tsx` | Tests import components directly; barrel no longer pins peer renderers into App chunk |

Preserved: `WorkSurface`, `AccessibleMode`, mode selector, spatial fallback-to-desk-on-error, `ExperienceShell` as mode boundary (not a product removal).

### 5.2 Seated render-loop cost (Desk OS over canvas)

| Change | File | Rationale |
| --- | --- | --- |
| `frameloop={seated ? "demand" : "always"}` | `RoomCanvas.tsx` | Seated player reads Desk OS HTML; walk keeps interactive loop |
| Seat settle + `invalidate()` until pose final | `PlayerController.tsx` | Demand loop still finishes sit transition |
| Freeze decorative fixtures/props when seated (`animated={!seated}`) | `SocRoom.tsx` | No continuous prop `useFrame` noise while reading |
| Skip quality sampler `useFrame` when seated | `useAdaptiveQuality.tsx` | Seated quality already forced by `resolveEffects({ seated })` (composer off, etc.) — no extra per-frame bookkeeping |

Existing adaptive path unchanged in spirit: `DEFAULT_QUALITY` already starts composer off, dpr 1, directional shadows off, cheap glass on low-end/reduced-motion; **no new quality tier added** (would need device evidence).

### 5.3 Site accessibility (this pass)

| Finding | Fix |
| --- | --- |
| Primary nav not exposed as landmark | `SiteChrome.tsx`: `div.site-nav` → `<header>`, links in `<nav aria-label="Primary">` (CSS still targets `.site-nav`) |

**Observed already present (not changed):** skip link, `main#main-content`, footer nav label, focus-visible, site `prefers-reduced-motion`, ArrivalFilm reduced-motion stills + `aria-live`, theme toggle `aria-pressed`, section `aria-labelledby` on site pages.

**Not claimed:** full automated axe/keyboard audit of Desk OS internals — deferred with overhaul Task X1.

---

## 6. Before / after (measured)

Same machine, production build, Vite gzip reporter + independent gzip-9 on `dist`.

### 6.1 Landing critical path (must download to paint marketing site)

| | Baseline | After | Δ raw | Δ gzip |
| --- | ---: | ---: | ---: | ---: |
| `index.html` | 2,816 | 2,816 | 0 | +1 |
| Entry CSS | 83,851 | 74,108 | −9,743 | −1,724 |
| Entry JS | 448,747 | 213,927 | −234,820 | −62,795 |
| **Total** | **535,414 / 146,394 gz** | **290,851 / 81,876 gz** | **−244,563 (−45.7%)** | **−64,518 (−44.1%)** |

Entry JS gzip: **129,495 → 66,700 (−48.5%)**.

### 6.2 After — chunk map (production)

| Chunk | Raw | Gzip | Load when |
| --- | ---: | ---: | --- |
| `index-*.js` (site entry) | 213,927 | 66,700 | First paint (html references) |
| `index-*.css` | 74,108 | 14,156 | First paint |
| `StartPage-*.js` | 112,489 | 28,910 | Navigate `/start` |
| `index-B1pfkK6s.js` (**App** shell) | 30,891 | 10,601 | “Enter the Verdaly floor” (sim step) |
| `SpatialShell-*.js` | 41,200 | 12,699 | Mode = walk |
| `WorkSurface-*.js` | 4,816 | 1,924 | Mode = desk |
| `AccessibleMode-*.js` | 4,981 | 1,983 | Mode = list |
| `RoomCanvas-*.js` | 1,014,515 | 270,068 | Spatial shell requests room (walk) |
| `SceneEffects-*.js` | 83,110 | 22,844 | Composer enabled (walk quality) |
| `NotificationBanner-*.js` (+css) | 34,734 + 9,030 | 10,939 + 2,335 | Peer modes / ops console |
| `SystemToolPanel-*.js` | 8,824 | 2,767 | Peer modes |

`RoomCanvas` remains the single large chunk (**~1.01 MB / ~271 KB gz**) and is **not** on the landing path — same as baseline. Splitting it further without runtime profiling risks regressing walk-mode startup; recorded as follow-up.

### 6.3 Seated behavior (code evidence, not FPS)

- Canvas `frameloop="demand"` + antialias/shadows off when seated (already partly true for shadows; now demand loop).  
- Quality sampler does not run `useFrame` while seated.  
- Decorative scene animation gated with `animated={!seated}`.  
- **No FPS / frame-time numbers** — requires Task-style device verification (overhaul P1/V1).

---

## 7. Test impact of lazy boundaries

Code-splitting made peer shells async. Suites were updated so queries wait for Suspense:

- `findByRole` / `waitFor` after mode switches (`movement-parity`, `shift-lifecycle-recovery`, `desk-os`, `workplace-golden-path`, `experience-shell`, `workplace-parity`, `site-entry`, `app`).  
- Golden path waits for `[data-desk-os]` (DeskOs renders without LaptopOverlay in that harness).  
- Fiber mock in `player-controller` gained `invalidate`.  
- `findByRole` timeouts must be **third** argument (`waitForOptions`), not inside `ByRoleOptions`.

Full monorepo suite green after changes (631 passed). Under heavy parallel load with concurrent builds, default 5s test timeouts can flake; clean `pnpm test` is stable.

---

## 8. Accessibility findings (this pass + notes)

| Severity | Finding | Status |
| --- | --- | --- |
| Medium | Site primary nav missing `header`/`nav` landmarks | **Fixed** (`SiteChrome.tsx`) |
| Info | Skip link, focus-visible, reduced-motion site CSS already present | Verified, unchanged |
| Info | Film gate has reduced-motion alternative + live status | Verified, unchanged |
| Deferred | Desk OS landmark/tab/focus model, overlay labelling | Overhaul Task **X1** (not this branch) |
| Deferred | Full axe/keyboard matrix across modes | Needs dedicated pass; `vitest-axe` available in web devDeps but not expanded here |
| Deferred | Google Fonts blocking CSS / weight trim | Needs measurement before editing (visual identity risk) |

---

## 9. Deferred / out of scope (explicit)

1. **Desk OS overhaul plan items** — OS session ownership (A1), window model (W1), peer-mode removal (R1/R2), instrumentation (P1), low-end verification (V1). **Do not implement here.**  
2. **Hidden Browser/Files/Notes mounts** — intentional single-active-window design; CSS `hidden` keeps state; not treated as a bug in this pass.  
3. **Adaptive quality tier expansion** — only with Chromebook CPU/GPU evidence.  
4. **Font subsetting / non-blocking font load** — visual identity + no load metrics yet.  
5. **Further `RoomCanvas` split** (three.js vendor vs scene graph) — needs walk-mode profiling.  
6. **Any claimed FPS/heap/TBT numbers** — environment had no Chromebook or throttled lab.

---

## 10. Risks

| Risk | Mitigation |
| --- | --- |
| Suspense fallback flash on mode/start entry | Short text fallbacks; tests use `findBy*` |
| Demand frameloop “freezes” sit animation | `invalidate()` until seat pose settles |
| Walking path regressions from seated gates | Gates only when `seated === true` |
| Peer-mode still product-correct for a11y | Loaders and components kept; only timing changed |
| Large RoomCanvas still hurts walk entry | Unchanged vs baseline; already lazy; listed as next measurement target |
| Parallel test flakes under load | Prefer clean full run; optional future `testTimeout` bump if CI shows pattern |

---

## 11. How to reproduce

```bash
# Worktree
git checkout perf/chromebook-lightweight

# Gates
pnpm lint && pnpm typecheck && pnpm test && pnpm build

# Bundle compare
# Baseline: stash working changes, pnpm --filter @sim/web build, record dist/assets sizes
# After: restore, same build command
```

Critical-path formula used above: bytes of `dist/index.html` + its referenced `index-*.css` + referenced `index-*.js`.

---

## 12. Summary

- **Landing critical path −45.7% raw / −44.1% gzip** via lazy StartPage → App → peer experience shells.  
- **Seated Desk OS** uses demand frameloop, skips quality sampling and prop animation while seated — code-verified, **not** FPS-verified.  
- **Site nav landmark fixed**; Desk OS a11y and device benchmarks explicitly deferred to the overhaul plan and a future measurement step.  
- **Gates green:** lint, typecheck, 631 tests, production build.  
- **`RoomCanvas` (~1 MB) remains the dominant walk-mode asset** and the primary follow-up for the next measured pass.
