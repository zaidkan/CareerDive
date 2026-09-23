import { describe, expect, it } from "vitest";
import { DEV_WEB_PORT, devServer } from "../vite.config";

describe("vite local dev server", () => {
  it("pins the Career Expo web port to 5173", () => {
    expect(DEV_WEB_PORT).toBe(5173);
    expect(devServer.port).toBe(5173);
  });

  it("uses strictPort so collisions fail instead of jumping to 5174/5175", () => {
    // Regression for silent Vite port auto-increment, which produced a site
    // that loaded while API CORS rejected session creation.
    expect(devServer.strictPort).toBe(true);
  });
});
