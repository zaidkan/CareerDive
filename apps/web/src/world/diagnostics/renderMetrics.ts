export function graphicsDiagnosticsEnabled(
  dev: boolean,
  search: string,
): boolean {
  return dev && new URLSearchParams(search).get("graphics") === "1";
}

export function createRenderSamples() {
  return {
    frames: new Float64Array(300),
    calls: new Float64Array(300),
    triangles: new Float64Array(300),
    count: 0,
    next: 0,
  };
}
export type RenderSamples = ReturnType<typeof createRenderSamples>;

export function recordRenderSample(
  samples: RenderSamples,
  seconds: number,
  calls: number,
  triangles: number,
) {
  if (!Number.isFinite(seconds) || seconds <= 0) return;
  samples.frames[samples.next] = seconds * 1000;
  samples.calls[samples.next] = calls;
  samples.triangles[samples.next] = triangles;
  samples.next = (samples.next + 1) % samples.frames.length;
  samples.count = Math.min(samples.count + 1, samples.frames.length);
}

export function summarizeRenderSamples(samples: RenderSamples) {
  if (!samples.count) return undefined;
  const frames = Array.from(samples.frames.subarray(0, samples.count)).sort(
    (a, b) => a - b,
  );
  const mean = (values: ArrayLike<number>) => {
    let sum = 0;
    for (let i = 0; i < samples.count; i++) sum += values[i] ?? 0;
    return sum / samples.count;
  };
  return {
    fps: 1000 / mean(frames),
    p95Ms: frames[Math.ceil(samples.count * 0.95) - 1] ?? 0,
    maxMs: frames[frames.length - 1] ?? 0,
    meanCalls: mean(samples.calls),
    meanTriangles: mean(samples.triangles),
    count: samples.count,
  };
}
