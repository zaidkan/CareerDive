import { describe, expect, it } from "vitest";
import { allowedWebOrigins } from "../src/config.js";

describe("local CORS configuration", () => {
  it("allows localhost and loopback Vite origins on fallback development ports", () => {
    expect(allowedWebOrigins(false)).toEqual([
      /^http:\/\/localhost:\d+$/,
      /^http:\/\/127\.0\.0\.1:\d+$/,
    ]);

    const developmentOrigins = allowedWebOrigins(false);
    expect(
      developmentOrigins.some(
        (origin) => origin instanceof RegExp && origin.test("http://localhost:5175"),
      ),
    ).toBe(true);
    expect(
      developmentOrigins.some(
        (origin) => origin instanceof RegExp && origin.test("https://localhost:5175"),
      ),
    ).toBe(false);
  });

  it("allows only configured production origin", () => {
    expect(allowedWebOrigins(true, "https://career.example")).toEqual([
      "https://career.example",
    ]);
  });
});
