import { apiOrigin } from "./apiOrigin.js";

let lastAttempt = -Infinity;

/** Wake a sleeping API while visitors browse. No identity or session is created. */
export function warmApi(): void {
  if (Date.now() - lastAttempt < 30_000) return;
  lastAttempt = Date.now();
  void fetch(`${apiOrigin}/ready`, {
    signal: AbortSignal.timeout(10_000),
  }).catch(() => {
    // Startup owns bounded readiness retries; browsing remains usable offline.
  });
}
