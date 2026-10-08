// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import { createInitialWorldState, toClientView } from "@sim/core";
import { ConsequenceUpdates } from "../src/components/ConsequenceUpdates.js";
afterEach(cleanup);

it("announces newly delivered follow-ups, keeps history, and avoids replay on remount", () => {
  const view = toClientView(createInitialWorldState("receipt", 7, {}, loadDefaultCybersecurityPack()));
  const { rerender, unmount } = render(<ConsequenceUpdates view={view} />);
  const delivered = { ...view, consequenceUpdates: [{ id: "delayed-1", eventTitle: "Login case", actionLabel: "Dismiss alert", body: "Related activity appeared after dismissal." }] };
  rerender(<ConsequenceUpdates view={delivered} />);
  expect(screen.getByRole("status").textContent).toContain("Earlier action: Dismiss alert");
  expect(screen.getByRole("status").textContent).toContain("Related activity appeared");
  rerender(<ConsequenceUpdates view={delivered} />);
  fireEvent.click(screen.getByRole("button", { name: "Acknowledge follow-up" }));
  expect(screen.queryByRole("status")).toBeNull();
  expect(screen.getByText("Earlier-decision follow-ups (1)")).toBeTruthy();
  unmount();
  render(<ConsequenceUpdates view={delivered} />);
  expect(screen.queryByRole("status")).toBeNull();
  expect(screen.getByText("Earlier-decision follow-ups (1)")).toBeTruthy();
});

it("retains a burst of receipts and clears announcements across sessions", () => {
  const view = toClientView(createInitialWorldState("burst", 7, {}, loadDefaultCybersecurityPack()));
  const { rerender } = render(<ConsequenceUpdates view={view} />);
  const consequenceUpdates = ["first", "second"].map((id) => ({ id, eventTitle: id, actionLabel: "Earlier choice", body: `Follow-up ${id}` }));
  rerender(<ConsequenceUpdates view={{ ...view, consequenceUpdates }} />);
  expect(screen.getByRole("status").textContent).toContain("Follow-up first");
  expect(screen.getByRole("status").textContent).toContain("Follow-up second");
  rerender(<ConsequenceUpdates view={{ ...view, sessionId: "new", consequenceUpdates: [] }} />);
  expect(screen.queryByRole("status")).toBeNull();
});
