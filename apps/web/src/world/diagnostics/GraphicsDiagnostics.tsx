import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { useWorldQuality } from "../effects/useAdaptiveQuality.js";
import {
  createRenderSamples,
  recordRenderSample,
  summarizeRenderSamples,
} from "./renderMetrics.js";

/** Explicit development-only observer. Never sends data or controls the simulation. */
export function GraphicsDiagnostics({ seated }: { seated: boolean }) {
  const gl = useThree((state) => state.gl);
  const quality = useWorldQuality();
  const mode = `${seated ? "seated" : "walking"} · DPR ${String(quality.dpr)} · effects ${quality.composer ? "on" : "off"}`;
  const samples = useRef(createRenderSamples());
  const previousMode = useRef("");
  const warmup = useRef(0);
  const publish = useRef(0);
  const skipFrame = useRef(true);
  const [readout, setReadout] = useState("Warming up…");

  useEffect(() => {
    const autoReset = gl.info.autoReset;
    // Collect every pass, including the composer, rather than just its final blit.
    gl.info.autoReset = false;
    const reset = () => {
      samples.current = createRenderSamples();
      warmup.current = 0;
      publish.current = 0;
      skipFrame.current = true;
      setReadout("Warming up…");
    };
    document.addEventListener("visibilitychange", reset);
    return () => {
      document.removeEventListener("visibilitychange", reset);
      gl.info.autoReset = autoReset;
      gl.info.reset();
    };
  }, [gl]);

  useFrame((_, delta) => {
    // Read the completed preceding frame, then reset before any new render pass.
    const { calls, triangles } = gl.info.render;
    gl.info.reset();
    if (document.hidden) return;
    if (previousMode.current !== mode) {
      previousMode.current = mode;
      samples.current = createRenderSamples();
      warmup.current = 0;
      publish.current = 0;
      skipFrame.current = true;
      setReadout("Warming up…");
    }
    if (skipFrame.current) {
      skipFrame.current = false;
      return;
    }
    warmup.current += delta;
    if (warmup.current < 2) return;
    recordRenderSample(samples.current, delta, calls, triangles);
    publish.current += delta;
    if (publish.current < 1) return;
    publish.current = 0;
    const summary = summarizeRenderSamples(samples.current);
    if (!summary) return;
    setReadout(
      `${summary.fps.toFixed(1)} FPS · p95 ${summary.p95Ms.toFixed(1)} ms · max ${summary.maxMs.toFixed(1)} ms\n${summary.meanCalls.toFixed(0)} calls · ${summary.meanTriangles.toFixed(0)} triangles/frame\n${String(gl.info.memory.geometries)} geometries · ${String(gl.info.memory.textures)} textures · ${String(summary.count)} samples`,
    );
  }, -100);

  return (
    <Html fullscreen style={{ pointerEvents: "none" }}>
      <pre
        aria-label="Development graphics diagnostics"
        style={{
          position: "absolute",
          top: 48,
          left: 12,
          margin: 0,
          padding: 10,
          background: "#101b20ee",
          color: "#e0f5ec",
          fontSize: 12,
          whiteSpace: "pre-wrap",
        }}
      >
        {`LOCAL GRAPHICS · ${mode}\n${readout}\nRolling 300 frames · frame timing, not GPU timing`}
      </pre>
    </Html>
  );
}
