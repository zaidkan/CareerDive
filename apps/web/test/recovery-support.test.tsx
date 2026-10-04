// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { StrictMode } from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import { createInitialWorldState, toClientView } from "@sim/core";
import { App, type SimulationClient } from "../src/index.js";
import { HttpSimulationClient, StartupFailure } from "../src/client.js";
import { ExperienceShell } from "../src/experience/ExperienceShell.js";
import { ProblemReport } from "../src/experience/ProblemReport.js";
import { compatibilityDetails } from "../src/experience/diagnostics.js";

const scene = vi.hoisted(() => ({ failed: false, renders: 0 }));
vi.mock("../src/world/SpatialShell.js", () => ({
  SpatialShell: () => {
    scene.renders++;
    if (scene.failed) throw new Error("Workplace initialization failed");
    return <div>Normal workplace</div>;
  },
}));
const view = toClientView(
  createInitialWorldState(
    "kept-session",
    24,
    {},
    loadDefaultCybersecurityPack(),
  ),
);
function client(
  createSession: SimulationClient["createSession"],
): SimulationClient {
  return {
    createSession,
    performAction: vi.fn(),
    submitTaskAttempt: vi.fn(),
    performWorkplaceInteraction: vi.fn(),
    respondToNotification: vi.fn(),
    getDebrief: vi.fn(),
  };
}
afterEach(() => {
  cleanup();
  sessionStorage.clear();
  scene.failed = false;
  scene.renders = 0;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("shares the entire safe retry through StrictMode and stops after one retry", async () => {
  const create = vi
    .fn()
    .mockRejectedValue(new StartupFailure(true, "service-unavailable"));
  render(
    <StrictMode>
      <App client={client(create)} />
    </StrictMode>,
  );
  const retry = await screen.findByRole("button", {
    name: "Retry starting shift",
  });
  expect(create).toHaveBeenCalledTimes(2);
  expect(retry).toHaveFocus();
  create.mockResolvedValue({ sessionId: view.sessionId, view });
  await userEvent.click(retry);
  expect(await screen.findByText("Normal workplace")).toBeVisible();
  expect(create).toHaveBeenCalledTimes(3);
});
it("never repeats unconfirmed session creation", async () => {
  const create = vi
    .fn()
    .mockRejectedValue(new StartupFailure(false, "creation-unconfirmed"));
  render(<App client={client(create)} />);
  expect(
    await screen.findByText(/couldn't confirm whether your shift started/),
  ).toBeVisible();
  expect(create).toHaveBeenCalledTimes(1);
  expect(
    screen.queryByRole("button", { name: "Retry starting shift" }),
  ).toBeNull();
});
it("does not POST when health check fails", async () => {
  const fetch = vi.fn().mockRejectedValue(new TypeError("offline"));
  vi.stubGlobal("fetch", fetch);
  await expect(
    new HttpSimulationClient("http://localhost:3001").createSession({
      seed: 1,
      sessionKind: "assessed",
      pacingMode: "standard",
    }),
  ).rejects.toMatchObject({ safeToRetry: true });
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch.mock.calls[0]?.[0]).toMatch(/\/ready$/);
});
it("checks compatibility after one workplace retry and keeps the same workstation data", async () => {
  scene.failed = true;
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  render(
    <ExperienceShell
      view={view}
      onAction={vi.fn()}
      onTaskAttempt={vi.fn()}
      onWorkplaceInteraction={vi.fn()}
    />,
  );
  const heading = await screen.findByRole("heading", {
    name: "Continue in the recovery workstation",
  });
  expect(heading).toHaveFocus();
  expect(screen.getByRole("status")).toHaveTextContent(
    /couldn't provide the graphics/,
  );
  const renders = scene.renders;
  await userEvent.click(
    screen.getByRole("button", { name: "Open recovery workstation" }),
  );
  expect(
    await screen.findByRole("region", { name: "Workplace recovery" }),
  ).toHaveTextContent("Your work is preserved");
  expect(scene.renders).toBe(renders);
  expect(
    await screen.findByRole("heading", { name: "Your workstation" }),
  ).toBeVisible();
});
it("retains report on missing backend, copies only consented data, restores after remount", async () => {
  const user = userEvent.setup();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response("missing", { status: 404 })),
  );
  const copy = vi
    .fn<(text: string) => Promise<void>>()
    .mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: copy },
  });
  const ui = render(<ProblemReport context={{ phase: "compatibility" }} />);
  await user.click(screen.getByRole("button", { name: "Report a problem" }));
  expect(screen.getByLabelText("Category")).toHaveFocus();
  await user.type(
    screen.getByLabelText("Description"),
    "My office stopped opening.",
  );
  await user.click(screen.getByRole("button", { name: "Send report" }));
  expect(await screen.findByText(/couldn't confirm delivery/)).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Copy report details" }));
  expect(JSON.parse(copy.mock.calls[0]?.[0] ?? "{}")).toEqual({
    category: "Workplace",
    description: "My office stopped opening.",
    contact: "",
  });
  ui.unmount();
  render(<ProblemReport context={{ phase: "workstation" }} />);
  await user.click(screen.getByRole("button", { name: "Report a problem" }));
  expect(screen.getByLabelText("Description")).toHaveValue(
    "My office stopped opening.",
  );
  await user.click(screen.getByRole("button", { name: "Close report" }));
  expect(
    screen.getByRole("button", { name: "Report a problem" }),
  ).toHaveFocus();
});
it("offers selected text when clipboard is unavailable", async () => {
  const user = userEvent.setup();
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: undefined,
  });
  render(<ProblemReport context={{ phase: "workstation" }} />);
  await user.click(screen.getByRole("button", { name: "Report a problem" }));
  await user.click(screen.getByRole("button", { name: "Copy report details" }));
  await waitFor(() => {
    expect(screen.getByLabelText("Report details")).toHaveFocus();
  });
});
it("limits diagnostics to the allowlist and respects reduced motion", () => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true }));
  const details = compatibilityDetails({
    phase: "compatibility",
    assetFailure: "workplace-initialization",
  });
  expect(details.webgl).toBe(false);
  expect(details.webgl2).toBe(false);
  expect(details.reducedMotion).toBe(true);
  expect(Object.keys(details).sort()).toEqual(
    [
      "webgl",
      "webgl2",
      "browser",
      "viewport",
      "reducedMotion",
      "build",
      "route",
      "apiFailure",
      "assetFailure",
      "phase",
    ].sort(),
  );
});

it("keeps keyboard focus in the workstation when canonical view updates", async () => {
  const props = { view, onAction: vi.fn() };
  const ui = render(<ExperienceShell {...props} />);
  await userEvent.click(await screen.findByText("Accessibility recovery"));
  await userEvent.click(
    screen.getByRole("button", { name: "Recover workstation access" }),
  );
  await screen.findByRole("heading", { name: "Your workstation" });
  const report = screen.getByRole("button", { name: "Report a problem" });
  report.focus();
  ui.rerender(
    <ExperienceShell
      {...props}
      view={{ ...view, simClock: view.simClock + 1 }}
    />,
  );
  expect(report).toHaveFocus();
});

it("cancels the automatic startup retry after leaving the page", async () => {
  const create = vi
    .fn()
    .mockRejectedValue(new StartupFailure(true, "service-unavailable"));
  const ui = render(<App client={client(create)} />);
  await screen.findByText("Connection interrupted. Trying once more…");
  ui.unmount();
  await new Promise((resolve) => setTimeout(resolve, 450));
  expect(create).toHaveBeenCalledTimes(1);
});
