// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import { createInitialWorldState, toClientView } from "@sim/core";
import type { WorkstationProps } from "../src/components/shared.js";
import { ExperienceShell } from "../src/experience/ExperienceShell.js";

const spatial = vi.hoisted(() => ({ fail: false, render: vi.fn<(props: WorkstationProps) => void>() }));
vi.mock("../src/world/SpatialShell.js", () => ({
  SpatialShell: (props: WorkstationProps) => {
    spatial.render(props);
    if (spatial.fail) throw new Error("WebGL is unavailable");
    return <div>Spatial workplace</div>;
  },
}));
afterEach(() => { cleanup(); spatial.fail = false; vi.restoreAllMocks(); spatial.render.mockClear(); });
const view = toClientView(createInitialWorldState("recovery", 24, {}, loadDefaultCybersecurityPack()));

it("enters SpatialShell with the canonical view and no product selector", async () => {
  render(<ExperienceShell view={view} onAction={vi.fn()} />);
  expect(await screen.findByText("Spatial workplace")).toBeVisible();
  expect(spatial.render.mock.lastCall?.[0].view).toBe(view);
  expect(screen.queryByRole("navigation", { name: /Choose how/ })).toBeNull();
  expect(screen.queryByRole("region", { name: "Workplace recovery" })).toBeNull();
});

it.each(["failure", "accessibility"] as const)("recovers after %s without changing canonical session state", async (cause) => {
  const before = JSON.stringify(view);
  const onAction = vi.fn();
  const onWorkplaceInteraction = vi.fn().mockResolvedValue({ view, sequence: 1, feedback: "artifact_opened" });
  if (cause === "failure") {
    spatial.fail = true;
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  }
  render(<ExperienceShell view={view} onAction={onAction} onWorkplaceInteraction={onWorkplaceInteraction} />);
  if (cause === "accessibility") {
    const user = userEvent.setup();
    await user.click(await screen.findByText("Accessibility recovery"));
    await user.click(screen.getByRole("button", { name: "Recover workstation access" }));
  }
  expect(await screen.findByRole("heading", { name: "Your workstation" })).toBeVisible();
  expect(JSON.stringify(view)).toBe(before);
  expect(onWorkplaceInteraction).not.toHaveBeenCalled();
  expect(onAction).not.toHaveBeenCalled();
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Open message" }));
  expect(onWorkplaceInteraction).toHaveBeenCalledWith({ type: "open_artifact", artifactId: "handoff-email" });
});
