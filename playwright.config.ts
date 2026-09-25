import { defineConfig } from "@playwright/test";

/**
 * Career Expo golden-path browser smoke test.
 *
 * scripts/qa-golden-path.mjs owns the dev stack and its process group.
 */
const WEB_ORIGIN = process.env.WEB_ORIGIN ?? "http://localhost:5173";

export default defineConfig({
  testDir: "./apps/web/e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 180_000,
  expect: { timeout: 20_000 },
  reporter: [["list"]],
  use: {
    baseURL: WEB_ORIGIN,
    headless: true,
    trace: "retain-on-failure",
    launchOptions: {
      args: [
        // Headless chromium renders WebGL through SwiftShader; make sure the
        // 3D workplace can actually compile shaders instead of silently
        // dropping the canvas.
        "--use-gl=swiftshader",
        "--enable-webgl",
        "--ignore-gpu-blocklist",
        "--enable-unsafe-swiftshader",
      ],
    },
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
