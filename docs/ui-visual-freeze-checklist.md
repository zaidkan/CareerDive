# Public UI visual freeze checklist

Manual acceptance for the Career Expo public site, paired with the automated gate in `scripts/qa-visual-freeze.mjs`. This document is review infrastructure only. It does not change production UI.

## Scope

Routes under freeze:

| Key | Path | Notes |
| --- | --- | --- |
| home | `/` | Arrival Film V2, handoff capture, workshop provenance |
| careers | `/careers` | one playable career with real media; four workshop previews |
| cyber | `/careers/cybersecurity-analyst` | only `detailPublished` route, real artifact media |
| faq | `/faq` | no media today |
| trust | `/trust` | architectural proof first, code proof second |
| 404 | `/this-route-does-not-exist` | public 404 |
| start | `/start` | deterministic poster path, reduced-motion captures only |

Out of scope: simulation, Desk OS, `/brag`, server, database, analytics, consequence runtime, media pipeline, product defects.

## Run

```bash
node scripts/qa-visual-freeze.mjs
node scripts/qa-visual-freeze-sheet.mjs
```

Outputs land in `/tmp/career-expo-ui-freeze` (override with `FREEZE_OUT`). The harness reuses a healthy `http://localhost:5173` via `WEB_ORIGIN`, otherwise it boots Vite itself and tears it down on exit. It needs no API server.

The harness exits non-zero when any automated check fails. Exit code `2` is the 25-minute watchdog.

## Matrix

- Viewports: `1366×900`, `1280×800`, `834×1112`, `390×844`, `320×720`.
- Themes: light and dark, set through `career-expo-theme` before first paint.
- Reduced motion: light theme at `1366`, `834`, `390` (one per breakpoint class). `/start` is reduced-only.
- Section shots: `1366` light, up to 12 major sections per route, under `sections/`.

## Automated checks

Objective, no human judgement required:

| Check | Meaning |
| --- | --- |
| `theme-applied` | `data-theme` matches the requested theme |
| `reduced-motion-applied` | `prefers-reduced-motion` matches the requested motion |
| `one-h1` | exactly one visible `h1` |
| `no-horizontal-overflow` | document width ≤ viewport width + 1 |
| `no-content-outside-viewport` | visible text outside the horizontal viewport (clip ancestors excluded, `body`/`html` skipped) |
| `no-clipped-nav` | header nav neither scrollable nor clipping links |
| `no-broken-images` | no loaded image with `naturalWidth === 0`, none pending |
| `no-missing-media-source` | videos have a source, no `MEDIA_ERR` |
| `no-duplicate-visible-ids` | no repeated visible `id` |
| `no-empty-media-slots` | every `data-media-slot` has area |
| `no-internal-content-leak` | no `[object Object]`, `localhost:`, `VITE_`, `node_modules/`, `TODO`/`FIXME`/`XXX`, stack frames, `.tsx:12` |
| `workshop-provenance-visible` | home and careers say workshop, and any `.ui-provenance` reads `Workshop concept` |
| `cyber-real-media-labels` | cyber page has no workshop-provenance label, does not present a workshop career as playable, and carries the simplified-tasks honesty marker |
| `focus-visible` | first 12 tabbable controls change rendered style on focus |
| `no-console-errors` / `no-page-errors` / `no-asset-errors` | allowlisted noise (fonts, CDN, media aborts) excluded |
| `reduced-motion-keeps-information` | reduced text length ≥ 95% of normal at 1366 light |
| `cls` | cumulative layout shift recorded as a note above 0.1 |

## Manual review model

Run this against the contact sheet first, then section shots. Ten questions per chapter of the page. Every answer is one word (pass / fail) with a note only when it fails.

1. **Argument** — does this chapter state one thing a visitor can repeat back?
2. **Proof** — is the claim carried by an object from the product, not by decoration?
3. **Dominance** — is one element clearly the subject, or are three competing?
4. **Composition** — does the eye land where the argument starts?
5. **Whitespace** — does empty space separate, or is it leftover?
6. **Motion** — does anything move that is not explaining a change of state?
7. **Copy** — is every line exact, short, and free of marketing filler?
8. **Honesty** — are workshop material and real material visually distinguishable at a glance?
9. **Theme** — does the chapter hold in light and dark without hue or contrast loss?
10. **Mobile** — does 390 reflow into a new argument order, or is it a shrunken desktop?

### Munder-depth failure flags

Treat any of these as a failure even when every automated check passes:

- The chapter cannot be summarised in one sentence, so the page has no argument.
- More than one object is presented as proof; nothing is allowed to dominate.
- Whitespace is decorative rather than load-bearing between claims.
- Motion runs on a loop rather than on an event.
- Copy contains a phrase that would survive a competitor's site unchanged.
- A workshop artefact is presented with real-media confidence, or a real artefact is presented as a demo.
- A theme loses legibility anywhere in the chapter, including focus states.
- The mobile layout is the desktop layout at smaller scale.

## Locked decisions

- Arrival Film V2 targets **12–15 seconds** across PLACE → ROLE → WORK CUE → HANDOFF. Do not shorten to ~8 seconds.
- Trust leads with architectural proof; code proof stays secondary behind "See the wiring".
- Career rotation is a breadth device, never the hero proof.
- Keep "Different careers. Different kinds of work."
- Keep real product proof, distinct silhouettes, artifact-led pages, quiet sections, and limited meaningful motion.

## Known defects recorded, not repaired

From the run at `cd90847` (see `report.md` in the output directory):

- **D3 — home handoff caption leaves the viewport at mobile widths.** The handoff document layer rests at `transform: translateX(24px)` (art-direction `ui-pass`), so `.home-capture` and `.home-media-note` end at `right: 402` in a 390 viewport and `right: 332` in a 320 viewport. `html` has `overflow-x: clip`, so the last characters of "Handoff · actual product capture, synthetic records" are cut. Fails `no-horizontal-overflow` and `no-content-outside-viewport` on four captures (`home` × 390/320 × light/dark).

Record the defect here, report it in the run output, and leave the repair to the owning workstream. The next run should show these four captures failing until the handoff layer is re-anchored at narrow widths.

## Exit criteria

- Every automated check passes on every capture, or each failure is filed against an owning workstream.
- The contact sheet shows no clipped, overlapping, or empty chapter at any viewport.
- All ten manual questions pass on every chapter of every route in both themes.
- Only the harness, the sheet builder, and this document are committed.
