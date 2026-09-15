// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import { createInitialWorldState, toClientView } from "@sim/core";
import type { Debrief } from "@sim/schemas";
import { App, type SimulationClient } from "../src/index.js";

vi.mock("../src/world/RoomCanvas.js", () => ({ RoomCanvas: () => <div>Office canvas</div> }));
afterEach(cleanup);
const view = toClientView(createInitialWorldState("lifecycle", 24, {}, loadDefaultCybersecurityPack()));
const debrief: Debrief = {
  sessionId: view.sessionId, confidence: "early_signal", evidenceIds: [],
  sections: { whatHappened: "Work reviewed.", whatYouDid: "Records checked.", consequences: "Review requested.", earlyEvidence: "Limited evidence.", yourExperience: "Private reflection.", confidenceAndLimitations: "One shift.", careerReality: "Routine work.", nextAction: "Reflect." },
};
function client(overrides: Partial<SimulationClient> = {}): SimulationClient {
  return {
    createSession: vi.fn().mockResolvedValue({ sessionId: view.sessionId, view }),
    performAction: vi.fn().mockResolvedValue(view),
    submitTaskAttempt: vi.fn(), performWorkplaceInteraction: vi.fn(), respondToNotification: vi.fn(),
    getDebrief: vi.fn().mockResolvedValue(debrief), ...overrides,
  };
}
it("retries failed practice startup without leaving a permanent loading screen", async () => {
  const user = userEvent.setup();
  const createSession = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({ sessionId: view.sessionId, view });
  render(<App client={client({ createSession })} />);
  await user.click(await screen.findByRole("button", { name: "Retry starting shift" }));
  expect(await screen.findByRole("button", { name: /Enter the Verdaly floor/ })).toBeEnabled();
  expect(screen.queryByRole("alert")).toBeNull();
  expect(createSession.mock.calls.map(([input]) => input.sessionKind)).toEqual(["tutorial", "tutorial"]);
});
it("retries the assessed session after its creation fails", async () => {
  const user = userEvent.setup();
  const createSession = vi.fn().mockResolvedValueOnce({ sessionId: view.sessionId, view }).mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({ sessionId: "assessed", view: { ...view, sessionId: "assessed" } });
  render(<App client={client({ createSession })} />);
  await user.click(await screen.findByRole("button", { name: /Skip practice/ }));
  await user.click(await screen.findByRole("button", { name: "Retry starting shift" }));
  expect(await screen.findByText("Assessed shift")).toBeVisible();
  expect(createSession.mock.calls.map(([input]) => input.sessionKind)).toEqual(["tutorial", "assessed", "assessed"]);
});
it.each(["Desk only", "Simple list"])("retries only the debrief read after completion in %s", async (mode) => {
  const user = userEvent.setup();
  const complete = { id: "complete_shift" as const, eventId: "shift", systemId: "team_chat" as const, label: "Complete shift", description: "Finish work", simulatedMinutes: 0 };
  const finished = { ...view, tasks: [], availableActions: [complete], events: view.events.map((event) => ({ ...event, status: "resolved" as const })) };
  const getDebrief = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(debrief);
  const performAction = vi.fn().mockResolvedValue(finished);
  render(<App client={client({ createSession: vi.fn().mockResolvedValue({ sessionId: view.sessionId, view: finished }), performAction, getDebrief })} />);
  await user.click(await screen.findByRole("button", { name: /Enter the Verdaly floor/ }));
  await user.click(screen.getByRole("button", { name: mode }));
  if (mode === "Desk only") await user.click(screen.getByRole("button", { name: /^Team chat/ }));
  await user.click(screen.getByRole("button", { name: /^Complete shift/ }));
  await user.click(await screen.findByRole("button", { name: "Retry loading debrief" }));
  expect(await screen.findByRole("heading", { name: "Shift debrief" })).toBeVisible();
  expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(8);
  await waitFor(() => expect(getDebrief).toHaveBeenCalledTimes(2));
  expect(performAction).toHaveBeenCalledTimes(1);
});
