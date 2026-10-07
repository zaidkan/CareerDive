// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import {
  applyWorkplaceInteraction,
  createInitialWorldState,
  toClientView,
} from "@sim/core";
import { CaseEvidence } from "../src/components/tools/CaseEvidence.js";

afterEach(cleanup);
it("exposes the required pair before inspection, records it, and shows saved status", async () => {
  let state = createInitialWorldState(
    "comparison-ui",
    7,
    {},
    loadDefaultCybersecurityPack(),
  );
  const onInspect = vi.fn(async () => {});
  const ui = () => (
    <CaseEvidence
      view={toClientView(state)}
      eventId="suspicious-login-1"
      onInspect={onInspect}
      pending={false}
    />
  );
  const { rerender } = render(ui());
  const record = screen.getByRole("button", {
    name: "Record this comparison: session timeline + VPN catalogue",
  });
  expect(record).toBeVisible();
  expect(record).toBeDisabled();
  expect(
    screen.getByText("Required route comparison not recorded."),
  ).toBeVisible();
  for (const artifactId of ["login-session-timeline", "vpn-context-1"]) {
    state = applyWorkplaceInteraction(state, {
      type: "open_artifact",
      artifactId,
    }).state;
  }
  rerender(ui());
  await userEvent.click(record);
  const comparison = {
    type: "compare_artifacts" as const,
    eventId: "suspicious-login-1",
    artifactIds: ["login-session-timeline", "vpn-context-1"],
  };
  expect(onInspect).toHaveBeenCalledWith(comparison);
  state = applyWorkplaceInteraction(state, comparison).state;
  rerender(ui());
  expect(screen.getByText("Required route comparison saved.")).toBeVisible();
  expect(
    screen.getByRole("button", { name: "Comparison recorded" }),
  ).toBeDisabled();
});
