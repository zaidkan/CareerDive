// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Taskbar } from "../src/world/deskOs/os/Taskbar.js";
import { Desktop } from "../src/world/deskOs/os/Desktop.js";
import { WindowFrame } from "../src/world/deskOs/os/WindowFrame.js";

afterEach(cleanup);

describe("WindowFrame visual system", () => {
  it("renders title bar with app glyph and title, no controls without handlers", () => {
    render(
      <WindowFrame app="files" title="Files" subtitle="Workstation documents">
        <p>body</p>
      </WindowFrame>,
    );
    expect(screen.getByText("Files")).toBeVisible();
    expect(screen.getByText("Workstation documents")).toBeVisible();
    expect(screen.getByText("body")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: /minimize|maximize|restore|close/i }),
    ).toBeNull();
  });

  it("renders working minimize, maximize, and close controls when wired", async () => {
    const user = userEvent.setup();
    const onMinimize = vi.fn();
    const onToggleMaximize = vi.fn();
    const onClose = vi.fn();
    render(
      <WindowFrame
        app="notes"
        title="Notes"
        onClose={onClose}
        onMinimize={onMinimize}
        onToggleMaximize={onToggleMaximize}
      >
        <p>body</p>
      </WindowFrame>,
    );
    const min = screen.getByRole("button", { name: "Minimize Notes" });
    const max = screen.getByRole("button", { name: "Maximize Notes" });
    const close = screen.getByRole("button", { name: "Close Notes" });
    await user.click(min);
    expect(onMinimize).toHaveBeenCalledTimes(1);
    await user.click(max);
    expect(onToggleMaximize).toHaveBeenCalledTimes(1);
    await user.click(close);
    expect(onClose).toHaveBeenCalledTimes(1);
    // Keyboard-focusable controls.
    min.focus();
    expect(min).toHaveFocus();
  });

  it("marks active and maximized windows visually", () => {
    const { rerender } = render(
      <WindowFrame app="browser" title="Browser">
        <p>body</p>
      </WindowFrame>,
    );
    const frame = screen.getByText("body").parentElement?.parentElement;
    expect(frame).not.toHaveClass("os-window-frame-active");
    rerender(
      <WindowFrame
        active
        app="browser"
        maximized
        onToggleMaximize={() => undefined}
        title="Browser"
      >
        <p>body</p>
      </WindowFrame>,
    );
    expect(screen.getByRole("button", { name: "Restore Browser" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const active = screen.getByText("body").parentElement?.parentElement;
    expect(active).toHaveClass(
      "os-window-frame",
      "os-window-frame-active",
      "os-window-frame-maximized",
    );
    expect(active).toHaveAttribute("data-active", "true");
    expect(active).toHaveAttribute("data-maximized", "true");
  });

  it("moves visually during drag and commits bounds once on release", () => {
    const onMove = vi.fn();
    const { container } = render(
      <WindowFrame app="files" title="Files" bounds={{ x: 20, y: 30, w: 400, h: 300 }} onMove={onMove} />,
    );
    const frame = container.querySelector<HTMLElement>(".os-window-frame");
    const bar = container.querySelector<HTMLElement>(".os-window-bar");
    if (!frame || !bar) throw new Error("Window frame missing");
    const pointer = (type: string, x: number, y: number) => {
      const event = new MouseEvent(type, { bubbles: true, button: 0, clientX: x, clientY: y });
      Object.defineProperty(event, "pointerId", { value: 1 });
      fireEvent(bar, event);
    };
    pointer("pointerdown", 100, 100);
    pointer("pointermove", 120, 130);
    pointer("pointermove", 140, 150);
    expect(frame.style.transform).toBe("translate(40px, 50px)");
    expect(onMove).not.toHaveBeenCalled();
    pointer("pointerup", 140, 150);
    expect(onMove).toHaveBeenCalledExactlyOnceWith(60, 80);
    expect(frame.style.transform).toBe("");
  });
});

describe("taskbar window entries", () => {
  it("renders pinned launchers with current focus state", () => {
    render(
      <Taskbar
        onOsFullscreen={() => undefined}
        onLaunch={() => undefined}
        onSelectWindow={() => undefined}
        onStand={() => undefined}
        osFullscreen={false}
        simClock={42}
        windows={[{ active: true, app: "files", key: "w1", label: "Files", minimized: false }]}
      />,
    );
    expect(screen.getByRole("button", { name: "Files" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Browser" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("renders a W1 window list with active and minimized states", async () => {
    const user = userEvent.setup();
    const onSelectWindow = vi.fn();
    render(
      <Taskbar
        onOsFullscreen={() => undefined}
        onLaunch={() => undefined}
        onSelectWindow={onSelectWindow}
        onStand={() => undefined}
        osFullscreen={false}
        simClock={42}
        windows={[
          { active: true, app: "browser", key: "w1", label: "Browser", minimized: false },
          { active: false, app: "notes", key: "w2", label: "Notes", minimized: true },
        ]}
      />,
    );
    const browser = screen.getByRole("button", { name: "Browser, active" });
    expect(browser).toHaveAttribute("aria-pressed", "true");
    expect(browser).toHaveAttribute("data-minimized", "false");
    const notes = screen.getByRole("button", { name: "Notes, minimized" });
    expect(notes).toHaveAttribute("data-minimized", "true");
    await user.click(notes);
    expect(onSelectWindow).toHaveBeenCalledWith("w2");
  });
});

describe("desktop launcher", () => {
  it("opens catalog apps with stable accessible names", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(<Desktop onOpen={onOpen} />);
    await user.click(screen.getByRole("button", { name: "Open Browser" }));
    expect(onOpen).toHaveBeenCalledWith("browser");
    expect(screen.getByRole("button", { name: "Open Files" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Open Notes" })).toBeVisible();
  });
});
