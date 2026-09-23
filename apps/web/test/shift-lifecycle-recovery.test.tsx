// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import { createInitialWorldState, toClientView } from "@sim/core";
import type { Debrief } from "@sim/schemas";
import { App, type SimulationClient } from "../src/index.js";

vi.mock("../src/world/RoomCanvas.js", () => ({
  RoomCanvas: () => <div>Office canvas</div>,
}));
afterEach(cleanup);
const view = toClientView(
  createInitialWorldState("lifecycle", 24, {}, loadDefaultCybersecurityPack()),
);
function taskFixtureView() {
  const pack = structuredClone(loadDefaultCybersecurityPack());
  const task = pack.scenario.tasks.find(
    ({ id }) => id === "handoff-open-items",
  );
  if (!task) throw new Error("Missing handoff task fixture");
  task.releasesActionGate = false;
  return toClientView(createInitialWorldState("task-retry", 24, {}, pack));
}
const debrief: Debrief = {
  sessionId: view.sessionId,
  confidence: "early_signal",
  evidenceIds: [],
  sections: {
    whatHappened: "Work reviewed.",
    whatYouDid: "Records checked.",
    consequences: "Review requested.",
    earlyEvidence: "Limited evidence.",
    yourExperience: "Private reflection.",
    confidenceAndLimitations: "One shift.",
    careerReality: "Routine work.",
    nextAction: "Reflect.",
  },
};
function client(overrides: Partial<SimulationClient> = {}): SimulationClient {
  return {
    createSession: vi
      .fn()
      .mockResolvedValue({ sessionId: view.sessionId, view }),
    performAction: vi.fn().mockResolvedValue(view),
    submitTaskAttempt: vi.fn(),
    performWorkplaceInteraction: vi.fn(),
    respondToNotification: vi.fn(),
    getDebrief: vi.fn().mockResolvedValue(debrief),
    ...overrides,
  };
}
it("auto-recovers a failed practice startup without a permanent error", async () => {
  const createSession = vi
    .fn<SimulationClient["createSession"]>()
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValueOnce({ sessionId: view.sessionId, view });
  render(<App client={client({ createSession })} />);
  expect(
    await screen.findByRole("button", { name: /Enter the Verdaly floor/ }),
  ).toBeEnabled();
  expect(screen.queryByRole("button", { name: "Retry starting shift" })).toBeNull();
  expect(screen.queryByText(/couldn't start your shift/i)).toBeNull();
  expect(createSession.mock.calls.map(([input]) => input.sessionKind)).toEqual([
    "tutorial",
    "tutorial",
  ]);
});
it("retries failed practice startup after automatic recovery also fails", async () => {
  const user = userEvent.setup();
  const createSession = vi
    .fn<SimulationClient["createSession"]>()
    .mockRejectedValueOnce(new Error("offline"))
    .mockRejectedValueOnce(new Error("still offline"))
    .mockResolvedValueOnce({ sessionId: view.sessionId, view });
  render(<App client={client({ createSession })} />);
  await user.click(
    await screen.findByRole("button", { name: "Retry starting shift" }),
  );
  expect(
    await screen.findByRole("button", { name: /Enter the Verdaly floor/ }),
  ).toBeEnabled();
  expect(screen.queryByRole("alert")).toBeNull();
  expect(createSession.mock.calls.map(([input]) => input.sessionKind)).toEqual([
    "tutorial",
    "tutorial",
    "tutorial",
  ]);
});
it("retries the assessed session after its creation fails", async () => {
  const user = userEvent.setup();
  const createSession = vi
    .fn<SimulationClient["createSession"]>()
    .mockResolvedValueOnce({ sessionId: view.sessionId, view })
    .mockRejectedValueOnce(new Error("offline"))
    .mockRejectedValueOnce(new Error("still offline"))
    .mockResolvedValueOnce({
      sessionId: "assessed",
      view: { ...view, sessionId: "assessed" },
    });
  render(<App client={client({ createSession })} />);
  await user.click(
    await screen.findByRole("button", { name: /Skip practice/ }),
  );
  await user.click(
    await screen.findByRole("button", { name: "Retry starting shift" }),
  );
  expect(await screen.findByText("Assessed shift")).toBeVisible();
  expect(createSession.mock.calls.map(([input]) => input.sessionKind)).toEqual([
    "tutorial",
    "assessed",
    "assessed",
    "assessed",
  ]);
});
it.each(["Desk only", "Simple list"])(
  "retries only the debrief read after completion in %s",
  async (mode) => {
    const user = userEvent.setup();
    const complete = {
      id: "complete_shift" as const,
      eventId: "shift",
      systemId: "team_chat" as const,
      label: "Complete shift",
      description: "Finish work",
      simulatedMinutes: 0,
    };
    const finished = {
      ...view,
      tasks: [],
      availableActions: [complete],
      events: view.events.map((event) => ({
        ...event,
        status: "resolved" as const,
      })),
    };
    const getDebrief = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(debrief);
    const performAction = vi.fn().mockResolvedValue(finished);
    render(
      <App
        client={client({
          createSession: vi
            .fn()
            .mockResolvedValue({ sessionId: view.sessionId, view: finished }),
          performAction,
          getDebrief,
        })}
      />,
    );
    await user.click(
      await screen.findByRole("button", { name: /Enter the Verdaly floor/ }),
    );
    await user.click(
      await screen.findByRole("button", { name: mode }, { timeout: 6000 }),
    );
    if (mode === "Desk only")
      await user.click(
        await screen.findByRole(
          "button",
          { name: /^Team chat/ },
          { timeout: 6000 },
        ),
      );
    await user.click(
      await screen.findByRole(
        "button",
        { name: /^Complete shift/ },
        { timeout: 6000 },
      ),
    );
    await user.click(
      await screen.findByRole("button", { name: "Retry loading debrief" }),
    );
    expect(
      await screen.findByRole("heading", { name: "Shift debrief" }),
    ).toBeVisible();
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(8);
    await waitFor(() => {
      expect(getDebrief).toHaveBeenCalledTimes(2);
    });
    expect(performAction).toHaveBeenCalledTimes(1);
  },
);

it("preserves selected findings when the App task request fails", async () => {
  const user = userEvent.setup();
  const taskView = taskFixtureView();
  const source = taskView.tasks[0];
  if (!source) throw new Error("Expected initial task");
  const task = {
    ...source,
    kind: "match_reference" as const,
    minSelections: 1,
    maxSelections: 1,
    relatedArtifactIds: [],
    options: [{ id: "visible-finding", label: "Keep this finding" }],
  };
  const current = {
    ...taskView,
    tasks: [task],
    availableActions: taskView.availableActions.filter(
      (action) => action.taskId === task.id,
    ),
  };
  const submitTaskAttempt = vi.fn().mockRejectedValueOnce(new Error("offline"));
  render(
    <App
      client={client({
        createSession: vi
          .fn()
          .mockResolvedValue({ sessionId: current.sessionId, view: current }),
        submitTaskAttempt,
      })}
    />,
  );
  await user.click(
    await screen.findByRole("button", { name: /Enter the Verdaly floor/ }),
  );
  await user.click(
    await screen.findByRole("button", { name: "Simple list" }, { timeout: 6000 }),
  );
  await user.click(
    await screen.findByRole(
      "radio",
      { name: "Keep this finding" },
      { timeout: 6000 },
    ),
  );
  await user.click(
    await screen.findByRole("button", { name: "Check my work" }, { timeout: 6000 }),
  );
  expect(await screen.findByRole("button", { name: "Retry" })).toBeEnabled();
  expect(
    screen.getByRole("radio", { name: "Keep this finding" }),
  ).toBeChecked();
});

it("ignores a late practice debrief after the assessed session starts", async () => {
  const user = userEvent.setup();
  let resolve!: (value: Debrief) => void;
  const pending = new Promise<Debrief>((done) => {
    resolve = done;
  });
  const finished = {
    ...view,
    tasks: [],
    availableActions: [
      {
        id: "complete_shift" as const,
        eventId: "shift",
        systemId: "team_chat" as const,
        label: "Complete shift",
        description: "Finish work",
        simulatedMinutes: 0,
      },
    ],
    events: view.events.map((event) => ({
      ...event,
      status: "resolved" as const,
    })),
  };
  const createSession = vi
    .fn<SimulationClient["createSession"]>()
    .mockResolvedValueOnce({ sessionId: view.sessionId, view: finished })
    .mockResolvedValueOnce({
      sessionId: "new-assessed",
      view: { ...view, sessionId: "new-assessed" },
    });
  render(
    <App
      client={client({
        createSession,
        performAction: vi.fn().mockResolvedValue(finished),
        getDebrief: vi.fn().mockReturnValue(pending),
      })}
    />,
  );
  await user.click(
    await screen.findByRole("button", { name: /Enter the Verdaly floor/ }),
  );
  await user.click(
    await screen.findByRole("button", { name: "Simple list" }, { timeout: 6000 }),
  );
  await user.click(
    await screen.findByRole(
      "button",
      { name: /^Complete shift/ },
      { timeout: 6000 },
    ),
  );
  expect(await screen.findByText("Loading your debrief…")).toBeVisible();
  await user.click(screen.getByRole("button", { name: /start real shift/i }));
  expect(await screen.findByText("Assessed shift")).toBeVisible();
  await act(async () => {
    resolve(debrief);
    await pending;
  });
  expect(screen.queryByRole("heading", { name: "Shift debrief" })).toBeNull();
  expect(
    screen.getByRole("button", { name: /Enter the Verdaly floor/ }),
  ).toBeEnabled();
});
