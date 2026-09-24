import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../theme";

/**
 * AmbientGlow — 12s seamless text-free loop for the landing hero.
 * Two glow blobs drift on sine paths (period = duration, so the loop
 * is seamless), over the mesh + grade + grain stack.
 */
export function AmbientGlow() {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const phase = (frame / durationInFrames) * Math.PI * 2;
  const phosphorX = Math.sin(phase) * 140;
  const phosphorY = Math.cos(phase) * 60;
  const signalX = Math.sin(phase + Math.PI) * 160;
  const signalY = Math.cos(phase + Math.PI) * 70;

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.inkLift }}>
      {/* L1 · mesh */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 90% 65% at 15% 20%, ${COLORS.phosphor}1a 0%, transparent 60%), linear-gradient(180deg, ${COLORS.inkLift} 0%, ${COLORS.ink} 100%)`,
        }}
      />
      {/* L2 · assets: drifting glows */}
      <AbsoluteFill>
        <div
          style={{
            position: "absolute",
            left: `calc(30% + ${String(phosphorX)}px)`,
            top: `calc(25% + ${String(phosphorY)}px)`,
            width: 480,
            height: 320,
            borderRadius: "50%",
            background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${COLORS.phosphor}30 0%, transparent 70%)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: `calc(60% + ${String(signalX)}px)`,
            top: `calc(55% + ${String(signalY)}px)`,
            width: 420,
            height: 280,
            borderRadius: "50%",
            background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${COLORS.signal}22 0%, transparent 70%)`,
          }}
        />
      </AbsoluteFill>
      {/* L4 · grade */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse 100% 100% at 50% 50%, transparent 55%, rgba(0,0,0,0.5) 100%)",
        }}
      />
      {/* L5 · grain */}
      <AbsoluteFill
        style={{
          opacity: 0.05,
          backgroundImage: `repeating-linear-gradient(${String((frame * 7) % 180)}deg, #fff 0px, #fff 1px, transparent 1px, transparent 3px)`,
        }}
      />
    </AbsoluteFill>
  );
}
