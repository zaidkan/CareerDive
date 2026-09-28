import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

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
  test: {
    // Playwright specs in e2e/ run under `npx playwright test`, not vitest.
    exclude: [
      "e2e/**",
      "**/node_modules/**",
      "**/dist/**",
      "**/.{idea,git,cache,output,temp}/**",
      "**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*",
    ],
  },
});
