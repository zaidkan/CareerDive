/** Local web port. Must stay in sync with apps/web/vite.config.ts. */
export const DEV_WEB_PORT = 5173;

export function allowedWebOrigins(
  isProduction: boolean,
  configuredOrigin?: string,
): string[] {
  if (isProduction) {
    if (!configuredOrigin) {
      throw new Error("WEB_ORIGIN is required in production");
    }
    if (new URL(configuredOrigin).origin !== configuredOrigin)
      throw new Error(
        "WEB_ORIGIN must be an origin without path or trailing slash",
      );
    return [configuredOrigin];
  }
  // Narrow local CORS: only the fixed Vite port. Do not widen to arbitrary
  // localhost ports — that would hide a silent Vite port jump.
  return [
    `http://localhost:${String(DEV_WEB_PORT)}`,
    `http://127.0.0.1:${String(DEV_WEB_PORT)}`,
  ];
}

export function isPortInUseError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  const code: unknown = "code" in error ? error.code : undefined;
  return code === "EADDRINUSE";
}

export function describeListenFailure(port: number, error: unknown): string {
  if (isPortInUseError(error)) {
    const portText = String(port);
    const webPortText = String(DEV_WEB_PORT);
    return [
      `API port ${portText} is already in use (EADDRINUSE).`,
      `CareerDive expects the API on port ${portText}.`,
      "Another process is holding the port — stop it or run only one `pnpm dev`.",
      `Inspect holders: lsof -nP -iTCP:${portText} -sTCP:LISTEN`,
      `Do not start a second stack against a different web port; dev CORS only allows http://localhost:${webPortText}.`,
    ].join("\n");
  }
  return error instanceof Error ? error.message : String(error);
}

/** Preserve Render's existing one-hop boundary; never trust forwarded hops beyond ingress. */
export function trustOneProxyHop(_address: string, hop: number): boolean {
  return hop === 0;
}
