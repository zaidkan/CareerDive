const configured = import.meta.env.VITE_SERVER_URL as string | undefined;
const apiOrigin =
  configured?.replace(/\/+$/, "") ??
  (import.meta.env.PROD ? "" : "http://localhost:3001");

let warmupStarted = false;

export function markStartIntent(): void {
  if (typeof performance === "undefined") return;
  try {
    performance.mark("careerdive:start-intent");
  } catch {
    // Performance entries are optional diagnostics.
  }
}

export function markStartIntentIfMissing(): void {
  if (typeof performance === "undefined") return;
  try {
    if (performance.getEntriesByName("careerdive:start-intent", "mark").length === 0)
      markStartIntent();
  } catch {
    markStartIntent();
  }
}

/**
 * Wake the API when a visitor shows intent to start, before the simulation
 * bundle begins its 90-second readiness poll. This is a safe GET only:
 * it creates no identity, session, or database record.
 */
export function warmApiServer(): void {
  if (warmupStarted || typeof fetch !== "function") return;
  warmupStarted = true;
  const url = apiOrigin ? apiOrigin + "/ready" : "/ready";
  void fetch(url, {
    cache: "no-store",
    credentials: "omit",
  }).catch(() => {
    // createSession owns the authoritative readiness/retry flow.
  });
}
