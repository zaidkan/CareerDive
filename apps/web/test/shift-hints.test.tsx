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
