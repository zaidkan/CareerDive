// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bindLookControls } from "../src/world/lookControls.js";

function pointer(target: EventTarget, type: string, options: MouseEventInit = {}) {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, ...options });
  target.dispatchEvent(event);
  return event;
}

describe("office look controls", () => {
  let canvas: HTMLCanvasElement;
  beforeEach(() => {
    document.body.innerHTML = "";
    canvas = document.createElement("canvas");
    document.body.appendChild(canvas);
  });
  afterEach(() => {
    document.body.innerHTML = "";
  });
  it("looks only while dragging on the canvas, without locking, capturing or consuming clicks", () => {
    const requestPointerLock = vi.fn(() => Promise.resolve());
    const setPointerCapture = vi.fn();
    canvas.requestPointerLock = requestPointerLock;
    canvas.setPointerCapture = setPointerCapture;
    const click = vi.fn();
    canvas.addEventListener("click", click);
    const look = vi.fn();
    const dispose = bindLookControls(canvas, look);
    try {
      const down = pointer(canvas, "pointerdown", { button: 0, clientX: 10, clientY: 20 });
      expect(down.defaultPrevented).toBe(false);
      pointer(canvas, "pointermove", { buttons: 1, clientX: 25, clientY: 24 });
      expect(look).toHaveBeenCalledExactlyOnceWith(15, 4);
      pointer(document, "pointerup");
      pointer(canvas, "pointermove", { clientX: 50 });
      const event = pointer(canvas, "click");
      expect(event.defaultPrevented).toBe(false);
      expect(click).toHaveBeenCalledOnce();
      expect(look).toHaveBeenCalledOnce();
      expect(requestPointerLock).not.toHaveBeenCalled();
      expect(setPointerCapture).not.toHaveBeenCalled();
    } finally {
      dispose();
    }
  });

  it.each(["pointerup", "pointercancel", "pointerleave", "blur"] as const)("stops on %s and removes listeners", (type) => {
    const look = vi.fn();
    const dispose = bindLookControls(canvas, look);
    try {
      pointer(canvas, "pointerdown", { button: 0 });
      pointer(type === "blur" ? window : canvas, type);
      pointer(canvas, "pointermove", { buttons: 1, clientX: 50 });
      expect(look).not.toHaveBeenCalled();
    } finally {
      dispose();
    }
    pointer(canvas, "pointerdown", { button: 0 });
    pointer(canvas, "pointermove", { buttons: 1, clientX: 60 });
    expect(look).not.toHaveBeenCalled();
  });

  it("ends a drag when the button is no longer held", () => {
    const look = vi.fn();
    const dispose = bindLookControls(canvas, look);
    try {
      pointer(canvas, "pointerdown", { button: 0 });
      pointer(canvas, "pointermove", { buttons: 0 });
      pointer(canvas, "pointermove", { buttons: 1, clientX: 50 });
      expect(look).not.toHaveBeenCalled();
    } finally {
      dispose();
    }
  });

  it("leaves DOM UI clicks and focus alone, including after a canvas drag", () => {
    const button = document.createElement("button");
    document.body.append(button);
    const look = vi.fn();
    const click = vi.fn();
    button.addEventListener("click", click);
    const dispose = bindLookControls(canvas, look);
    try {
      pointer(canvas, "pointerdown", { button: 0 });
      pointer(canvas, "pointerleave");
      pointer(button, "pointermove", { buttons: 1, clientX: 50 });
      pointer(button, "pointerup");
      button.focus();
      expect(pointer(button, "pointerdown", { button: 0 }).defaultPrevented).toBe(false);
      expect(pointer(button, "click").defaultPrevented).toBe(false);
      expect(click).toHaveBeenCalledOnce();
      expect(document.activeElement).toBe(button);
      expect(look).not.toHaveBeenCalled();
    } finally {
      dispose();
      button.remove();
    }
  });
});
