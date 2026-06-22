import { describe, expect, it } from "vitest";
import { allowedWebOrigins } from "../src/config.js";

describe("local CORS configuration", () => {
  it("allows both localhost and loopback Vite origins in development", () => {
    expect(allowedWebOrigins(false)).toEqual([
      "http://localhost:5173",
      "http://127.0.0.1:5173",
    ]);
  });

  it("allows only configured production origin", () => {
    expect(allowedWebOrigins(true, "https://career.example")).toEqual([
      "https://career.example",
    ]);
  });
});
