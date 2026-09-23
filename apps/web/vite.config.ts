import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/** Local Career Expo web port. Must stay in sync with server dev CORS. */
export const DEV_WEB_PORT = 5173;

export const devServer = {
  port: DEV_WEB_PORT,
  // Fail immediately if 5173 is taken instead of silently using 5174/5175
  // (CORS only allows 5173, so a silent port jump breaks session creation).
  strictPort: true,
} as const;

export default defineConfig({
  plugins: [react()],
  server: devServer,
});
