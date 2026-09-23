export function allowedWebOrigins(
  isProduction: boolean,
  configuredOrigin?: string,
): Array<string | RegExp> {
  if (isProduction) {
    if (!configuredOrigin) {
      throw new Error("WEB_ORIGIN is required in production");
    }
    return [configuredOrigin];
  }
  return [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/];
}
