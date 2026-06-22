export function allowedWebOrigins(
  isProduction: boolean,
  configuredOrigin?: string,
): string[] {
  if (isProduction) {
    if (!configuredOrigin) {
      throw new Error("WEB_ORIGIN is required in production");
    }
    return [configuredOrigin];
  }
  return ["http://localhost:5173", "http://127.0.0.1:5173"];
}
