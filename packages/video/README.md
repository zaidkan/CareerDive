# @sim/video — motion-graphics videos (Remotion)

Isolated from `apps/web`: Remotion renders deterministic MP4/WebM files.
The web app embeds **only the rendered files** (e.g. in `apps/web/public/`);
never the Remotion runtime.

## Develop

```bash
pnpm --filter @sim/video preview   # Remotion Studio
pnpm --filter @sim/video render    # renders HeroSting → out/hero-sting.mp4
```

Or directly: `npx remotion studio`, `npx remotion render HeroSting out/hero-sting.mp4`.

## Rules (from the motion-graphics skill)

- Spring entrances only — no linear interpolation on props.
- 2–3 prop entrances per shot, staggered 3–6 frames.
- Ken Burns settle on stills (scale 1.08 → 1).
- 5-layer stack: mesh → assets → graphics → grade → grain+vignette.
- Fps-derived timing (`FPS` in `src/theme.ts`); easing `cubic-bezier(0.16,1,0.3,1)`.
- Fix loop: render → extract frames → review → fix → re-render.

## Ship to web

1. Render the composition.
2. Copy the file to `apps/web/public/` (e.g. `hero-sting.mp4` + poster fallback).
3. Reference it with `<video autoplay muted loop playsInline>` and a
   `prefers-reduced-motion` poster fallback.
