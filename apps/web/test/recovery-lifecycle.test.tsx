// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { StrictMode, useLayoutEffect } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import { createInitialWorldState, toClientView } from "@sim/core";
import { App, type SimulationClient } from "../src/index.js";
import { StartupFailure } from "../src/client.js";
import { ExperienceShell } from "../src/experience/ExperienceShell.js";

const observations = vi.hoisted(() => ({
  focusedAtCommit: undefined as boolean | undefined,
  loads: 0,
  workplaceFailed: false,
  failureMessage: "Workplace initialization failed",
  rejectImport: false,
}));
vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof import("react")>();
  return {
    ...react,
    lazy: ((loader) =>
      react.lazy(() => {
        observations.loads++;
        if (observations.rejectImport)
          return Promise.reject(
            new Error("Failed to fetch dynamically imported module"),
          );
        return loader();
      })) as typeof react.lazy,
  };
});
vi.mock("../src/experience/ProblemReport.js", () => ({
  ProblemReport: function RecoveryFocusProbe() {
    useLayoutEffect(() => {
      const retry = Array.from(document.querySelectorAll("button")).find(
        (button) => button.textContent === "Retry starting shift",
      );
      if (retry)
        observations.focusedAtCommit ??= document.activeElement === retry;
    }, []);
    return null;
  },
}));
vi.mock("../src/world/SpatialShell.js", () => ({
  SpatialShell: () => {
    if (observations.workplaceFailed)
      throw new Error(observations.failureMessage);
    return <div>Normal workplace</div>;
  },
}));
const view = toClientView(
  createInitialWorldState(
    "recovery-lifecycle",
    24,
    {},
    loadDefaultCybersecurityPack(),
  ),
);
afterEach(() => {
  cleanup();
  observations.workplaceFailed = false;
  observations.failureMessage = "Workplace initialization failed";
  observations.rejectImport = false;
  vi.restoreAllMocks();
});
it("focuses the safe startup retry at commit, before passive effects or paint", async () => {
  const client: SimulationClient = {
    createSession: vi
      .fn()
      .mockRejectedValue(new StartupFailure(true, "service-unavailable")),
    performAction: vi.fn(),
    submitTaskAttempt: vi.fn(),
    performWorkplaceInteraction: vi.fn(),
    respondToNotification: vi.fn(),
    getDebrief: vi.fn(),
  };
  render(
    <StrictMode>
      <App client={client} />
    </StrictMode>,
  );
  const retry = await screen.findByRole("button", {
    name: "Retry starting shift",
  });
  expect(retry).toHaveFocus();
  expect(observations.focusedAtCommit).toBe(true);
});
it("retries an initialized workplace without another lazy load before compatibility", async () => {
  observations.workplaceFailed = true;
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  render(<ExperienceShell view={view} onAction={vi.fn()} />);
  await screen.findByRole("heading", {
    name: "Trying your workplace once more",
  });
  const loadsBeforeRetry = observations.loads;
  const heading = await screen.findByRole("heading", {
    name: "Continue in the recovery workstation",
  });
  expect(heading).toHaveFocus();
  expect(observations.loads).toBe(loadsBeforeRetry);
});

it("uses a fresh import for an asset failure and stops at compatibility if that retry fails", async () => {
  observations.workplaceFailed = true;
  observations.failureMessage = "Failed to load workplace chunk";
  observations.rejectImport = true;
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  render(<ExperienceShell view={view} onAction={vi.fn()} />);
  await screen.findByRole("heading", {
    name: "Trying your workplace once more",
  });
  const loadsBeforeRetry = observations.loads;
  const heading = await screen.findByRole("heading", {
    name: "Continue in the recovery workstation",
  });
  expect(heading).toHaveFocus();
  expect(observations.loads).toBe(loadsBeforeRetry + 1);
});
