// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { isTypingTarget, enterFloorFullscreen, useFullscreen } from "../src/world/useFullscreen.js";

describe("isTypingTarget", () => {
  it("treats form fields as typing so F can still type in them", () => {
    const input = document.createElement("input");
    const area = document.createElement("textarea");
    expect(isTypingTarget(input)).toBe(true);
    expect(isTypingTarget(area)).toBe(true);
    expect(isTypingTarget(document.createElement("button"))).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
  });
});


afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  Reflect.deleteProperty(document.documentElement, "requestFullscreen");
  Reflect.deleteProperty(document, "fullscreenElement");
  Reflect.deleteProperty(document, "exitFullscreen");
});

describe("floor entry fullscreen", () => {
  it("requests synchronously and tolerates rejection or unsupported browsers", async () => {
    const request = vi.fn(() => Promise.reject(new Error("Denied")));
    Object.defineProperty(document.documentElement, "requestFullscreen", {
      configurable: true, value: request,
    });
    const pending = enterFloorFullscreen();
    expect(request).toHaveBeenCalledTimes(1);
    await expect(pending).resolves.toBeUndefined();
    Reflect.deleteProperty(document.documentElement, "requestFullscreen");
    await expect(enterFloorFullscreen()).resolves.toBeUndefined();
  });

  it("does not toggle an existing fullscreen off", async () => {
    Object.defineProperty(document, "fullscreenElement", {
      configurable: true, value: document.documentElement,
    });
    const request = vi.fn();
    Object.defineProperty(document.documentElement, "requestFullscreen", {
      configurable: true, value: request,
    });
    await enterFloorFullscreen();
    expect(request).not.toHaveBeenCalled();
  });

  it("recognizes entry fullscreen, allows exit, and never re-enters on render", async () => {
    const stage = document.createElement("div");
    document.body.append(stage);
    const target = { current: stage };
    Object.defineProperty(document, "fullscreenElement", {
      configurable: true, value: document.documentElement,
    });
    const exit = vi.fn(async () => {
      Object.defineProperty(document, "fullscreenElement", {
        configurable: true, value: null,
      });
      document.dispatchEvent(new Event("fullscreenchange"));
    });
    Object.defineProperty(document, "exitFullscreen", {
      configurable: true, value: exit,
    });
    const request = vi.fn(async () => {
      Object.defineProperty(document, "fullscreenElement", {
        configurable: true, value: stage,
      });
      document.dispatchEvent(new Event("fullscreenchange"));
    });
    stage.requestFullscreen = request;
    const { result, rerender } = renderHook(() => useFullscreen(target));
    expect(result.current.active).toBe(true);
    await act(() => result.current.toggle());
    expect(exit).toHaveBeenCalledTimes(1);
    expect(result.current.active).toBe(false);
    rerender();
    expect(request).not.toHaveBeenCalled();
    await act(() => result.current.toggle());
    expect(request).toHaveBeenCalledTimes(1);
    expect(result.current.active).toBe(true);
    stage.remove();
  });
});
