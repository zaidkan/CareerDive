import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, EASE_OUT, STAGGER_FRAMES } from "../theme";

const FONT_STACK =
  "'Syne', 'DM Sans', system-ui, sans-serif";

/**
 * HeroSting — 5s landing intro: mesh glow, tower doors, VERDALY sign,
 * tagline. Spring entrances only (no linear interpolation on props),
 * fps-derived timing, grain + vignette finish.
 */
export function HeroSting() {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const entrance = (delayFrames: number) =>
    spring({
      frame: frame - delayFrames,
      fps,
      config: { damping: 100, stiffness: 90, mass: 0.8 },
    });

  const doorGlow = entrance(0);
  const sign = entrance(STAGGER_FRAMES);
  const tagline = entrance(STAGGER_FRAMES * 2);

  // Grade: gentle fade-in on the mesh, ease-out fade at the tail.
  const fadeIn = interpolate(frame, [0, Math.round(fps * 0.6)], [0, 1], {
    easing: (t) => 1 - Math.pow(1 - t, EASE_OUT[1]),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(
    frame,
    [durationInFrames - Math.round(fps * 0.5), durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill
      style={{ backgroundColor: COLORS.ink, opacity: fadeIn * fadeOut }}
    >
      {/* L1 · mesh */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 90% 65% at 50% 20%, ${COLORS.phosphor}22 0%, transparent 60%), linear-gradient(180deg, ${COLORS.inkLift} 0%, ${COLORS.ink} 100%)`,
          opacity: fadeIn,
        }}
      />
      {/* L2 · assets: door glow, low and behind the sign (Ken Burns settle) */}
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          transform: `scale(${String(interpolate(doorGlow, [0, 1], [1.08, 1]))})`,
          opacity: doorGlow,
        }}
      >
        <div
          style={{
            width: 560,
            height: 180,
            marginTop: 300,
            borderRadius: 90,
            background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${COLORS.doorGlow}66 0%, transparent 70%)`,
          }}
        />
      </AbsoluteFill>
      {/* L3 · graphics: sign + tagline */}
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 18,
        }}
      >
        <div
          style={{
            fontFamily: FONT_STACK,
            fontWeight: 800,
            fontSize: 92,
            letterSpacing: 18,
            color: COLORS.paper,
            opacity: sign,
            transform: `translateY(${String(interpolate(sign, [0, 1], [26, 0]))}px)`,
          }}
        >
          VERDALY
        </div>
        <div
          style={{
            fontFamily: FONT_STACK,
            fontWeight: 600,
            fontSize: 26,
            letterSpacing: 7,
            color: COLORS.signal,
            opacity: tagline,
            transform: `translateY(${String(interpolate(tagline, [0, 1], [18, 0]))}px)`,
          }}
        >
          TRY DAY ONE · FIRST SHIFT
        </div>
      </AbsoluteFill>
      {/* L4 · grade: cool vignette */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse 100% 100% at 50% 50%, transparent 55%, rgba(0,0,0,0.5) 100%)",
        }}
      />
      {/* L5 · grain: subtle animated noise via repeating gradient */}
      <AbsoluteFill
        style={{
          opacity: 0.05,
          backgroundImage: `repeating-linear-gradient(${String((frame * 7) % 180)}deg, #fff 0px, #fff 1px, transparent 1px, transparent 3px)`,
        }}
      />
    </AbsoluteFill>
  );
}
