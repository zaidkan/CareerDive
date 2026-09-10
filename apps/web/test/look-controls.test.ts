// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { bindLookControls } from "../src/world/lookControls.js";

describe("office look controls", () => {
  it("supports drag look when pointer lock is rejected, stops on release, and cleans up", async () => {
    const canvas = document.createElement("canvas");
    canvas.requestPointerLock = vi
      .fn()
      .mockRejectedValue(new Error("unsupported"));
    const look = vi.fn();
    const dispose = bindLookControls(canvas, look);
    canvas.dispatchEvent(
      new MouseEvent("pointerdown", { button: 0, clientX: 10, clientY: 20 }),
    );
    await Promise.resolve();
    document.dispatchEvent(
      new MouseEvent("mousemove", { buttons: 1, clientX: 25, clientY: 24 }),
    );
    expect(look).toHaveBeenCalledWith(15, 4);
    document.dispatchEvent(new MouseEvent("pointerup"));
    document.dispatchEvent(new MouseEvent("mousemove", { clientX: 50 }));
    expect(look).toHaveBeenCalledTimes(1);
    dispose();
    canvas.dispatchEvent(new MouseEvent("pointerdown", { button: 0 }));
    document.dispatchEvent(
      new MouseEvent("mousemove", { buttons: 1, clientX: 60 }),
    );
    expect(look).toHaveBeenCalledTimes(1);
  });
  it("uses relative motion while locked and clears drag on blur", () => {
    const canvas = document.createElement("canvas");
    const look = vi.fn();
    const dispose = bindLookControls(canvas, look);
    Object.defineProperty(document, "pointerLockElement", {
      configurable: true,
      value: canvas,
    });
    const move = new MouseEvent("mousemove");
    Object.defineProperties(move, {
      movementX: { value: 8 },
      movementY: { value: -3 },
    });
    document.dispatchEvent(move);
    expect(look).toHaveBeenCalledWith(8, -3);
    Object.defineProperty(document, "pointerLockElement", {
      configurable: true,
      value: null,
    });
    canvas.dispatchEvent(new MouseEvent("pointerdown", { button: 0 }));
    window.dispatchEvent(new Event("blur"));
    document.dispatchEvent(
      new MouseEvent("mousemove", { buttons: 1, clientX: 50 }),
    );
    expect(look).toHaveBeenCalledTimes(1);
    dispose();
  });
});
