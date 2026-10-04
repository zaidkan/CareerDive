export type RecoveryContext = {
  phase: string;
  apiFailure?: string;
  assetFailure?: string;
};
export function graphicsAvailable(kind: "webgl" | "webgl2") {
  try {
    const gl = document.createElement("canvas").getContext(kind) as
      | WebGLRenderingContext
      | WebGL2RenderingContext
      | null;
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    return Boolean(gl);
  } catch {
    return false;
  }
}
/** Feature checks only: no pixel reads, renderer strings, hardware or tracking identifiers. */
export function compatibilityDetails(context: RecoveryContext) {
  const match =
    navigator.userAgent.match(/(Edg|OPR)\/([\d.]+)/) ??
    navigator.userAgent.match(/(Firefox|Chrome|Version)\/([\d.]+)/);
  return {
    webgl: graphicsAvailable("webgl"),
    webgl2: graphicsAvailable("webgl2"),
    browser: match
      ? `${match[1] === "Version" ? "Safari" : (match[1] ?? "Unknown")} ${match[2] ?? "Unknown"}`
      : "Unknown",
    viewport: `${String(window.innerWidth)} × ${String(window.innerHeight)}`,
    reducedMotion:
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    build: typeof __BUILD_SHA__ === "string" ? __BUILD_SHA__ : "unknown",
    route: [
      "/",
      "/careers",
      "/start",
      "/trust",
      "/faq",
      "/simulation",
    ].includes(window.location.pathname)
      ? window.location.pathname
      : "/careers",
    apiFailure: context.apiFailure ?? "none",
    assetFailure: context.assetFailure ?? "none",
    phase: context.phase,
  };
}
declare const __BUILD_SHA__: string;
