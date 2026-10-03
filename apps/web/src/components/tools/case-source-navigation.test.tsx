// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import { createInitialWorldState, toClientView } from "@sim/core";
import { SystemToolPanel } from "../SystemToolPanel.js";
import { CaseRail } from "../CaseRail.js";

afterEach(cleanup);

it("routes Guides to case sources without inspecting evidence or duplicating search", () => {
  const view = toClientView(
    createInitialWorldState(
      "source-nav",
      42,
      {},
      loadDefaultCybersecurityPack(),
    ),
  );
  const onOpenCaseSources = vi.fn();
  const onInspect = vi.fn();
  render(
    <SystemToolPanel
      view={view}
      systemId="knowledge_base"
      selectedEventId="suspicious-login-1"
      actions={[]}
      onAction={vi.fn()}
      onWorkplaceInteraction={onInspect}
      onOpenCaseSources={onOpenCaseSources}
    />,
  );
  expect(
    screen.queryByRole("button", { name: "Search records" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("region", { name: "Case evidence" }),
  ).not.toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", {
      name: "Open case sources and record search in Alerts",
    }),
  );
  expect(onOpenCaseSources).toHaveBeenCalledOnce();
  expect(onInspect).not.toHaveBeenCalled();
  expect(view.artifacts.filter(({ observed }) => observed)).toEqual([]);
});

it("marks the current rail case and preserves its resume destination", () => {
  const view = toClientView(
    createInitialWorldState(
      "rail-selection",
      42,
      {},
      loadDefaultCybersecurityPack(),
    ),
  );
  const onResume = vi.fn();
  render(
    <CaseRail
      view={view}
      selectedEventId="suspicious-login-1"
      onResume={onResume}
    />,
  );
  const selected = screen.getByRole("button", { pressed: true });
  expect(selected).toHaveTextContent("Unfamiliar successful login");
  expect(selected).toHaveTextContent("high priority");
  fireEvent.click(selected);
  expect(onResume).toHaveBeenCalledWith({
    eventId: "suspicious-login-1",
    systemId: "alert_dashboard",
  });
});
