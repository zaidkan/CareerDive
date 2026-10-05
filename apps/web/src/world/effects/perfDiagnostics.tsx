/**
 * Dev/profiling-only performance HUD, gated by `?perf=1`.
 *
 * Never mounts during normal gameplay. Samples on a slow cadence (2 Hz) and
 * writes text through a ref so the overlay itself does not rerender React
 * or allocate per frame.
 */
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import type { WebGLRenderer } from "three";
import type { AdaptiveQuality } from "./useAdaptiveQuality.js";

const SAMPLE_WINDOW = 120;
const UI_HZ = 2;

/** Pure: only the explicit `perf=1` flag turns diagnostics on. */
export function isPerfModeEnabled(search: string): boolean {
  return /[?&]perf=1(&|$)/.test(search);
}

export function perfModeEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return isPerfModeEnabled(window.location.search);
}

export type FrameStats = {
  fps: number;
  avgFps: number;
  p95Ms: number;
  worstMs: number;
};

/** Ring buffer of frame deltas with cheap percentile queries. */
export class FrameTimeRing {
  private readonly deltas = new Float32Array(SAMPLE_WINDOW);
  private sorted: Float32Array = new Float32Array(SAMPLE_WINDOW);
  private write = 0;
  private count = 0;
  private latest = 0;

  push(delta: number): void {
    if (!(delta > 0) || delta > 0.25) return;
    this.deltas[this.write] = delta;
    this.latest = delta;
    this.write = (this.write + 1) % SAMPLE_WINDOW;
    if (this.count < SAMPLE_WINDOW) this.count += 1;
  }

  stats(): FrameStats {
    if (this.count === 0) {
      return { fps: 0, avgFps: 0, p95Ms: 0, worstMs: 0 };
    }
    let sum = 0;
    let worst = 0;
    for (let i = 0; i < this.count; i += 1) {
      const d = this.deltas[i];
      if (d === undefined) continue;
      sum += d;
      if (d > worst) worst = d;
      this.sorted[i] = d;
    }
    const mean = sum / this.count;
    const view = this.sorted.subarray(0, this.count);
    view.sort();
    const p95 = view[Math.min(view.length - 1, Math.floor(view.length * 0.95))];
    return {
      fps: this.latest > 0 ? 1 / this.latest : 0,
      avgFps: mean > 0 ? 1 / mean : 0,
      p95Ms: (p95 ?? mean) * 1000,
      worstMs: worst * 1000,
    };
  }
}

function readRendererStats(gl: WebGLRenderer): {
  calls: number;
  triangles: number;
  lines: number;
  points: number;
  geometries: number;
  textures: number;
  programs: number;
} {
  const info = gl.info;
  return {
    calls: info.render.calls,
    triangles: info.render.triangles,
    lines: info.render.lines,
    points: info.render.points,
    geometries: info.memory.geometries,
    textures: info.memory.textures,
    programs: info.programs?.length ?? 0,
  };
}

function formatReport(input: {
  ring: FrameTimeRing;
  gl: WebGLRenderer;
  quality: AdaptiveQuality;
  dpr: number;
}): string {
  const s = input.ring.stats();
  const r = readRendererStats(input.gl);
  const q = input.quality;
  const tier = q.tier === 2 ? "HIGH" : q.tier === 1 ? "MEDIUM" : "LOW";
  return [
    `FPS ${s.fps.toFixed(0)} · avg ${s.avgFps.toFixed(1)}`,
    `p95 ${s.p95Ms.toFixed(1)}ms · worst ${s.worstMs.toFixed(1)}ms`,
    `calls ${String(r.calls)} · tris ${String(r.triangles)}`,
    `lines ${String(r.lines)} · points ${String(r.points)}`,
    `geos ${String(r.geometries)} · tex ${String(r.textures)} · programs ${String(r.programs)}`,
    `tier ${tier} · composer ${q.composer ? "on" : "off"}`,
    `dirShadow ${q.directionalShadows ? "on" : "off"} · contact ${q.contactShadows ? "on" : "off"}`,
    `dust ×${q.dustMul.toFixed(2)} · dpr ${input.dpr.toFixed(2)}`,
    `ambient ${q.ambientEnabled ? `${String(q.ambientHz)}Hz` : "off"}`,
  ].join("\n");
}

/**
 * Mount only when `?perf=1`. Lives inside the R3F tree so it can read
 * `renderer.info` without bridging React state per frame.
 */
export function PerfOverlay({ quality }: { quality: AdaptiveQuality }) {
  const gl = useThree((state) => state.gl);
  const dpr = useThree((state) => state.viewport.dpr);
  const hostRef = useRef<HTMLDivElement>(null);
  const ring = useMemo(() => new FrameTimeRing(), []);
  const lastUi = useRef(0);
  const qualityRef = useRef(quality);
  qualityRef.current = quality;

  useEffect(() => {
    // DOM belongs to the document, not R3F's THREE reconciler.
    const host = document.createElement("div");
    host.dataset.testid = "perf-overlay";
    host.setAttribute("aria-hidden", "true");
    hostRef.current = host;
    host.style.cssText = [
      "position:fixed",
      "left:8px",
      "bottom:8px",
      "z-index:10000",
      "margin:0",
      "padding:8px 10px",
      "background:rgba(0,0,0,0.78)",
      "color:#9fe8e0",
      "font:11px/1.45 ui-monospace,monospace",
      "white-space:pre",
      "pointer-events:none",
      "border:1px solid rgba(79,208,200,0.35)",
      "border-radius:6px",
    ].join(";");
    document.body.appendChild(host);
    return () => {
      hostRef.current = null;
      host.remove();
    };
  }, []);

  useFrame((_, delta) => {
    ring.push(delta);
    const now = performance.now();
    if (now - lastUi.current < 1000 / UI_HZ) return;
    lastUi.current = now;
    const host = hostRef.current;
    if (!host) return;
    host.textContent = formatReport({
      ring,
      gl,
      quality: qualityRef.current,
      dpr,
    });
  });

  return null;
}
