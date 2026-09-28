# Public art direction · UI-1

Use `PublicChapter`, `ArtifactStage`, `ChapterSeparator`, and `ProvenanceLabel` from `apps/web/src/site/ArtDirection.tsx`. Import of `art-direction.css` lives in `SiteApp.tsx`. All `ui-*` classes opt in; current public pages keep their existing layout.

## Chapter surfaces and rhythm

`PublicChapter` accepts `surface="base|chapter|stage|finale"`, `rhythm="compact|standard|expansive|stage|final"`, and `width="reading|wide|full"`. Pick per argument. Adjacent chapters may share a surface. `full` bleeds across the viewport while retaining responsive gutters. Use `ui-editorial-split` or `ui-editorial-split--reverse` for two-part chapters, `ui-proof-wide` for full-width proof, and `ChapterSeparator` only where a rule clarifies a boundary. The `ui-type-*` classes cover eyebrow, argument, proof, caption, provenance, metadata, authentic operational text, and final CTA. Keep monospace within actual operational artifacts.

## Artifact stage

`ArtifactStage` needs `dominant`. Optional `secondary` accepts one or two peripheral, noninteractive layers. `emphasis` places the dominant layer left, center, or right. Optional `eyebrow`, `caption`, and `provenance` stay outside the clipped field. DOM markers `data-media-slot="artifact-stage"` and `data-media-layer="dominant|secondary"` give later media integrations stable targets. The stage supplies placement, crop, and responsive recomposition, never a fabricated artifact. For real Cyber product proof use `{ career: "Cybersecurity Analyst", kind: "real" }`. For RN, Mechanical Engineer, Electrician, or Lawyer representative media use `kind: "workshop"`. TypeScript restricts combinations. If a secondary object needs interaction or holds indispensable information, place it in normal document flow instead.

## Motion contract

Add `data-motion` to containing object and `data-motion-role` to parts. Set `data-motion-active="true"` when user action or one-shot viewport entry warrants movement. `useChapterReveal` supplies optional IntersectionObserver trigger. Content is fully visible before activation and without JavaScript.

| `data-motion` | Roles | Meaning |
| --- | --- | --- |
| `chapter-reveal` | `argument`, `artifact` | Bounded entrance |
| `artifact-gather` | `secondary` | Related objects join dominant case |
| `evidence-link` | `link` | Rule connects records |
| `decision-commit` | `selection`, `noise` | Selection settles; noise quiets |
| `callback-return` | `return` | Object returns from `--ui-return-from` direction |
| `handoff-pass` | `document` | Object exits toward `--ui-pass-to` direction |
| `career-switch` | `data-career="active|departing|inactive"` | Departing ecosystem exits; next one enters. Caller updates `aria-hidden` and focusability |
| `debrief-assemble` | `evidence`, `consequence` | Review parts align |
| `mascot-micro` | `mascot` | One small peek |

No primitive loops. Default and reduced-motion states preserve full composition. Reduced motion removes movement; commit and handoff retain end-state opacity. Career switching is state driven: mark old content `departing` for 180ms, then `inactive`. Departing and inactive content must also be removed from keyboard order by caller (use `inert` for interactive trees). Repeated animations require explicit state reset and reactivation.

## Proof

Run `pnpm --filter @sim/web dev` and open `/fixtures/art-direction.html`. Fixture is served in development but absent from production Vite entry. Toggle theme, play motion, switch career, and emulate reduced motion in browser tools. Placeholder rectangles mark slots only; they are not product media.
