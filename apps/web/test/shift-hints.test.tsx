// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { enqueueHint } from "../src/world/dialogue/ShiftHints.js";
import { splitGraphemes } from "../src/world/dialogue/DialogueLine.js";
describe("restrained shift presentation", () => {
  it("bounds burst notifications and replaces a repeated inbox hint", () => {
    let queue = [{ id: "inbox", title: "OLD" }];
    for (let i = 0; i < 5; i++)
      queue = enqueueHint(queue, {
        id: `work-${String(i)}`,
        title: "NEW WORK",
      });
    expect(queue).toHaveLength(3);
    queue = enqueueHint(queue, { id: "inbox", title: "CHECK YOUR INBOX" });
    queue = enqueueHint(queue, { id: "inbox", title: "CHECK YOUR INBOX" });
    expect(queue.filter((h) => h.id === "inbox")).toHaveLength(1);
    expect(queue).toHaveLength(3);
  });
  it("never separates combining accents or joined emoji during reveal", () => {
    expect(splitGraphemes("e\u0301👩‍💻")).toEqual(["e\u0301", "👩‍💻"]);
  });
});

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach } from "vitest";
import { ShiftHints } from "../src/world/dialogue/ShiftHints.js";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import { createInitialWorldState, toClientView } from "@sim/core";
afterEach(cleanup);
it("drops a queued work hint once that work is resolved and never replays it on remount", () => {
  const world = createInitialWorldState(
    "hint-lifecycle",
    7,
    {},
    loadDefaultCybersecurityPack(),
  );
  const initial = toClientView(world);
  const { rerender, unmount } = render(
    <ShiftHints view={initial} phase="seated_monitor" />,
  );
  const first = initial.events[0];
  if (!first) throw new Error("Missing work fixture");
  const arrival = {
    ...initial,
    events: [
      ...initial.events,
      { ...first, id: "new-work", status: "active" as const },
    ],
  };
  rerender(<ShiftHints view={arrival} phase="seated_monitor" />);
  expect(screen.getByRole("status").textContent).toContain("NEW WORK");
  rerender(<ShiftHints view={arrival} phase="seated_monitor" paused />);
  expect(screen.queryByRole("status")).toBeNull();
  rerender(<ShiftHints view={arrival} phase="seated_monitor" />);
  expect(screen.getByRole("status").textContent).toContain("NEW WORK");
  const resolved = {
    ...arrival,
    events: arrival.events.map((e) =>
      e.id === "new-work" ? { ...e, status: "resolved" as const } : e,
    ),
  };
  rerender(<ShiftHints view={resolved} phase="seated_monitor" />);
  expect(screen.queryByRole("status")).toBeNull();
  unmount();
  render(<ShiftHints view={arrival} phase="seated_monitor" />);
  expect(screen.queryByRole("status")).toBeNull();
});

it("announces login without repeating the console's Email objective", () => {
  const view = toClientView(
    createInitialWorldState(
      "login-hint",
      7,
      {},
      loadDefaultCybersecurityPack(),
    ),
  );
  const { rerender } = render(<ShiftHints view={view} phase="desk_login" />);
  rerender(<ShiftHints view={view} phase="seated_monitor" />);
  expect(screen.getByRole("status").textContent).toBe("SHIFT STARTED");
  expect(screen.getByRole("status").textContent).not.toMatch(/Email|handoff/i);
});

import { fireEvent } from "@testing-library/react";
import { getOptionalShiftHints } from "../src/guidance.js";

function hintView() {
  return toClientView(
    createInitialWorldState(
      "optional-hints",
      7,
      {},
      loadDefaultCybersecurityPack(),
    ),
  );
}

it("offers chair help only on request, with a persistent dismissible announcement", () => {
  render(<ShiftHints view={hintView()} phase="room_walk" />);
  expect(screen.queryByText("Optional hint")).toBeNull();
  const button = screen.getByRole("button", { name: "Need a hint? (H)" });
  expect(button.getAttribute("aria-keyshortcuts")).toBe("H");
  fireEvent.click(button);
  expect(screen.getByRole("status").textContent).toContain("Ready prompt");
  fireEvent.click(screen.getByRole("button", { name: "Dismiss hint" }));
  expect(screen.queryByRole("status")).toBeNull();
  expect(document.activeElement).toBe(button);
});

it("summons and cycles procedural hints with H, but ignores typing and modifiers", () => {
  render(
    <>
      <ShiftHints view={hintView()} phase="seated_monitor" />
      <input aria-label="Ticket note" />
    </>,
  );
  const input = screen.getByRole("textbox");
  fireEvent.keyDown(input, { key: "h" });
  fireEvent.keyDown(window, { key: "h", ctrlKey: true });
  fireEvent.keyDown(window, { key: "h", repeat: true });
  expect(screen.queryByRole("status")).toBeNull();
  fireEvent.keyDown(window, { key: "h" });
  expect(screen.getByRole("status").textContent).toContain("Open Email");
  fireEvent.keyDown(window, { key: "H" });
  expect(screen.getByRole("status").textContent).toContain("Clear selections");
  fireEvent.click(screen.getByRole("button", { name: "Next hint" }));
  expect(screen.getByRole("status").textContent).toContain("Open Email");
});

it("does not offer hints during dialogue or after completion and clears on session change", () => {
  const view = hintView();
  const { rerender } = render(
    <ShiftHints view={view} phase="room_walk" paused />,
  );
  fireEvent.keyDown(window, { key: "h" });
  expect(screen.queryByRole("button")).toBeNull();
  rerender(<ShiftHints view={view} phase="room_walk" />);
  fireEvent.keyDown(window, { key: "h" });
  expect(screen.getByRole("status")).toBeTruthy();
  rerender(
    <ShiftHints
      view={{ ...view, sessionId: "another-session" }}
      phase="room_walk"
    />,
  );
  expect(screen.queryByRole("status")).toBeNull();
  rerender(
    <ShiftHints view={{ ...view, completed: true }} phase="seated_monitor" />,
  );
  expect(screen.queryByRole("button")).toBeNull();
  expect(
    getOptionalShiftHints({ ...view, completed: true }, "room_walk"),
  ).toEqual([]);
});

it("grounds optional help in the selected case rather than another case's queue action", () => {
  const view = hintView();
  expect(
    getOptionalShiftHints(view, "seated_monitor", "routine-alert-1")[0],
  ).toMatch(/run log and approved window/);
  expect(
    getOptionalShiftHints(view, "seated_monitor", "access-request-1")[0],
  ).toMatch(/finance request and access approval guide/);
  expect(
    getOptionalShiftHints(view, "seated_monitor", "login-help-1")[0],
  ).toMatch(/laptop and phone separately/);
  expect(
    getOptionalShiftHints(view, "seated_monitor", "shift-handoff-1")[0],
  ).toMatch(/recorded outcomes/);
  expect(getOptionalShiftHints(view, "floor_map")[0]).toMatch(
    /Choose Security Operations/,
  );
  expect(getOptionalShiftHints(view, "desk_login")[0]).toMatch(
    /Click the monitor/,
  );
});
it("changes login help after source inspection and after recording the comparison", () => {
  const view = hintView();
  expect(
    getOptionalShiftHints(view, "seated_monitor", "suspicious-login-1")[0],
  ).toMatch(/open the session timeline and VPN context/);
  const inspected = {
    ...view,
    artifacts: view.artifacts.map((a) =>
      ["login-session-timeline", "vpn-context-1"].includes(a.id)
        ? { ...a, observed: true }
        : a,
    ),
  };
  expect(
    getOptionalShiftHints(inspected, "seated_monitor", "suspicious-login-1")[0],
  ).toMatch(/use Record comparison/);
  const compared = {
    ...inspected,
    workplace: {
      ...inspected.workplace,
      comparisons: [
        {
          eventId: "suspicious-login-1",
          artifactIds: ["login-session-timeline", "vpn-context-1"],
          simMinutes: 10,
        },
      ],
    },
  };
  expect(
    getOptionalShiftHints(compared, "seated_monitor", "suspicious-login-1")[0],
  ).toMatch(/comparison is recorded/);
});
