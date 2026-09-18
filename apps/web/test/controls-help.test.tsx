// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ControlsHelp } from "../src/world/ControlsHelp.js";

describe("controls help overlay", () => {
  it("stays collapsed until asked and never shows permanent key lists", async () => {
    const user = userEvent.setup();
    render(<ControlsHelp />);

    const toggle = screen.getByRole("button", { name: "Show controls" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("dialog", { name: "Controls" })).toBeNull();

    await user.click(toggle);
    const panel = screen.getByRole("dialog", { name: "Controls" });
    expect(panel).toHaveTextContent(/Move around the floor/i);
    expect(panel).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
  });

  it("closes with Escape, returns focus, and supports the close button", async () => {
    const user = userEvent.setup();
    render(<ControlsHelp />);

    const toggle = screen.getByRole("button", { name: "Show controls" });
    await user.click(toggle);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Controls" })).toBeNull();
    expect(toggle).toHaveFocus();

    await user.click(toggle);
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog", { name: "Controls" })).toBeNull();
  });
});
