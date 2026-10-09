// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DialogueLine } from "../src/world/dialogue/DialogueLine.js";
beforeEach(() =>
  Object.defineProperty(document, "hidden", {
    configurable: true,
    value: false,
  }),
);
afterEach(() => {
  cleanup();
  delete (document as unknown as { hidden?: boolean }).hidden;
  vi.restoreAllMocks();
});
describe("fast dialogue", () => {
  it("provides the complete semantic text immediately and skips without advancing twice", () => {
    const text =
      "A source comparison is recorded. The session owner is still unknown.";
    let advanced = 0;
    render(<DialogueLine text={text} onAdvance={() => advanced++} />);
    expect(screen.getByRole("status")).toHaveTextContent(text);
    fireEvent.click(screen.getByRole("button", { name: "Show full message" }));
    expect(advanced).toBe(0);
    fireEvent.click(
      screen.getByRole("button", { name: "Continue conversation" }),
    );
    expect(advanced).toBe(1);
  });
});

import userEvent from "@testing-library/user-event";
import { act } from "@testing-library/react";
it.each(["{Enter}", " "])(
  "%s finishes first and advances only on the next press",
  async (key) => {
    const user = userEvent.setup();
    let advanced = 0;
    render(
      <DialogueLine
        text={
          "A long enough case message to keep revealing until the first input arrives."
        }
        onAdvance={() => {
          advanced++;
        }}
      />,
    );
    screen.getByRole("button", { name: "Show full message" }).focus();
    await user.keyboard(key);
    expect(advanced).toBe(0);
    await user.keyboard(key);
    expect(advanced).toBe(1);
  },
);
it("reduced motion shows the complete line without scheduling reveal frames", () => {
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener() {},
    removeEventListener() {},
  }));
  const frames = vi.spyOn(window, "requestAnimationFrame");
  render(<DialogueLine text="The full line is available immediately." />);
  expect(
    screen.queryByRole("button", { name: "Show full message" }),
  ).toBeNull();
  expect(frames).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
});
it("finishes when hidden and does not restart on returning to the tab", () => {
  const text = "The case still has an unresolved ownership question.";
  const { rerender } = render(<DialogueLine text={text} />);
  act(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  expect(
    screen.queryByRole("button", { name: "Show full message" }),
  ).toBeNull();
  act(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  rerender(<DialogueLine text={text} />);
  expect(
    screen.queryByRole("button", { name: "Show full message" }),
  ).toBeNull();
});
it("cancels the scheduled reveal frame immediately on skip and close", () => {
  let nextId = 0;
  const pending = new Set<number>();
  vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => {
    const id = ++nextId;
    pending.add(id);
    return id;
  });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
    pending.delete(id);
  });
  const { unmount } = render(<DialogueLine text="Skip this animated message." />);
  expect(pending.size).toBe(1);
  fireEvent.click(screen.getByRole("button", { name: "Show full message" }));
  expect(pending.size).toBe(0);
  unmount();
  expect(pending.size).toBe(0);
});

it("instant text remains silent and keeps the complete screen-reader line", () => {
  const frames = vi.spyOn(window, "requestAnimationFrame");
  const text = "This complete line needs no animated reveal.";
  render(<DialogueLine text={text} animate={false} />);
  expect(screen.getByRole("status")).toHaveTextContent(text);
  expect(screen.queryByRole("button", { name: "Show full message" })).toBeNull();
  expect(frames).not.toHaveBeenCalled();
});
