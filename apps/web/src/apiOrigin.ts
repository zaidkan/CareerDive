const configured = import.meta.env.VITE_SERVER_URL as string | undefined;
export const apiOrigin =
  configured?.replace(/\/$/, "") ??
  (import.meta.env.PROD ? "" : "http://localhost:3001");
