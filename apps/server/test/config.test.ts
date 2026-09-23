import { describe, expect, it } from "vitest";
import {
  DEV_WEB_PORT,
  allowedWebOrigins,
  describeListenFailure,
  isPortInUseError,
} from "../src/config.js";

describe("local CORS configuration", () => {
  it("allows both localhost and loopback Vite origins in development", () => {
    expect(allowedWebOrigins(false)).toEqual([
      "http://localhost:5173",
      "http://127.0.0.1:5173",
    ]);
  });

  it("keeps development CORS narrow to the fixed web port only", () => {
    const origins = allowedWebOrigins(false);
    expect(origins).toHaveLength(2);
    expect(origins.every((origin) => origin.includes(":5173"))).toBe(true);
    // Regression: Vite must not silently jump ports; CORS must not absorb that.
    expect(origins.some((origin) => /:517[4-9]/.test(origin))).toBe(false);
    expect(DEV_WEB_PORT).toBe(5173);
  });

  it("allows only configured production origin", () => {
    expect(allowedWebOrigins(true, "https://career.example")).toEqual([
      "https://career.example",
    ]);
  });

  it("requires WEB_ORIGIN in production", () => {
    expect(() => allowedWebOrigins(true)).toThrow(/WEB_ORIGIN/);
  });
});

describe("listen failure diagnostics", () => {
  it("detects EADDRINUSE", () => {
    const err = Object.assign(new Error("listen EADDRINUSE: address in use"), {
      code: "EADDRINUSE",
    });
    expect(isPortInUseError(err)).toBe(true);
  });

  it("does not treat other errors as port conflicts", () => {
    expect(isPortInUseError(new Error("boom"))).toBe(false);
    expect(isPortInUseError(null)).toBe(false);
  });

  it("explains how to recover when 3001 is occupied", () => {
    const err = Object.assign(new Error("EADDRINUSE"), { code: "EADDRINUSE" });
    const message = describeListenFailure(3001, err);
    expect(message).toContain("3001");
    expect(message).toContain("EADDRINUSE");
    expect(message).toContain("lsof");
    expect(message).toContain("5173");
  });

  it("passes through non-port errors", () => {
    expect(describeListenFailure(3001, new Error("disk full"))).toBe("disk full");
  });
});
