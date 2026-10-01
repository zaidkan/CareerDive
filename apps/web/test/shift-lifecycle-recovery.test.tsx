// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import { createInitialWorldState, toClientView } from "@sim/core";
import type { Debrief } from "@sim/schemas";
import { StartupFailure } from "../src/client.js";
import { App, type SimulationClient } from "../src/index.js";
vi.mock("../src/world/RoomCanvas.js", () => ({
    RoomCanvas: () => <div>Office canvas</div>,
}));
afterEach(cleanup);
const view = toClientView(createInitialWorldState("lifecycle", 24, {}, loadDefaultCybersecurityPack()));
function taskFixtureView() {
    const pack = structuredClone(loadDefaultCybersecurityPack());
    const task = pack.scenario.tasks.find(({ id }) => id === "handoff-open-items");
    if (!task)
        throw new Error("Missing handoff task fixture");
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
it("auto-recovers a failed assessed startup without a permanent error", async () => {
    const createSession = vi
        .fn<SimulationClient["createSession"]>()
        .mockRejectedValueOnce(new StartupFailure(true, "service-unavailable"))
        .mockResolvedValueOnce({ sessionId: view.sessionId, view });
    render(<App client={client({ createSession })}/>);
    expect(await screen.findByRole("button", { name: /Security Operations/ })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Retry starting shift" })).toBeNull();
    expect(screen.queryByText(/couldn't start your shift/i)).toBeNull();
    expect(createSession.mock.calls.map(([input]) => input.sessionKind)).toEqual([
        "assessed",
        "assessed",
    ]);
});
it("retries failed assessed startup after automatic recovery also fails", async () => {
    const user = userEvent.setup();
    const createSession = vi
        .fn<SimulationClient["createSession"]>()
        .mockRejectedValueOnce(new StartupFailure(true, "service-unavailable"))
        .mockRejectedValueOnce(new StartupFailure(true, "service-unavailable"))
        .mockResolvedValueOnce({ sessionId: view.sessionId, view });
    render(<App client={client({ createSession })}/>);
    await user.click(await screen.findByRole("button", { name: "Retry starting shift" }));
    expect(await screen.findByRole("button", { name: /Security Operations/ })).toBeEnabled();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(createSession.mock.calls.map(([input]) => input.sessionKind)).toEqual([
        "assessed",
        "assessed",
        "assessed",
    ]);
});
it.each(["recovery"])("retries only the debrief read after completion in %s", async () => {
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
        .mockRejectedValueOnce(new StartupFailure(true, "service-unavailable"))
        .mockResolvedValueOnce(debrief);
    const performAction = vi.fn().mockResolvedValue(finished);
    render(<App client={client({
            createSession: vi
                .fn()
                .mockResolvedValue({ sessionId: view.sessionId, view: finished }),
            performAction,
            getDebrief,
        })}/>);
    await user.click(await screen.findByText("Accessibility recovery"));
    await user.click(await screen.findByRole("button", { name: "Recover workstation access" }, { timeout: 6000 }));
        await user.click(await screen.findByRole("button", { name: /^Team chat/ }, { timeout: 6000 }));
    await user.click(await screen.findByRole("button", { name: /^Complete shift/ }, { timeout: 6000 }));
    await user.click(await screen.findByRole("button", { name: "Retry loading debrief" }));
    expect(await screen.findByRole("heading", { name: "Shift debrief" })).toBeVisible();
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(8);
    await waitFor(() => {
        expect(getDebrief).toHaveBeenCalledTimes(2);
    });
    expect(performAction).toHaveBeenCalledTimes(1);
});
it("preserves selected findings when the App task request fails", async () => {
    const user = userEvent.setup();
    const taskView = taskFixtureView();
    const source = taskView.tasks[0];
    if (!source)
        throw new Error("Expected initial task");
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
        availableActions: taskView.availableActions.filter((action) => action.taskId === task.id),
    };
    const submitTaskAttempt = vi.fn().mockRejectedValueOnce(new Error("offline"));
    render(<App client={client({
            createSession: vi
                .fn()
                .mockResolvedValue({ sessionId: current.sessionId, view: current }),
            submitTaskAttempt,
        })}/>);
    await user.click(await screen.findByText("Accessibility recovery"));
    await user.click(await screen.findByRole("button", { name: "Recover workstation access" }, { timeout: 6000 }));
    await user.click(await screen.findByRole("radio", { name: "Keep this finding" }, { timeout: 6000 }));
    await user.click(await screen.findByRole("button", { name: "Check my work" }, { timeout: 6000 }));
    expect(await screen.findByRole("button", { name: "Retry" })).toBeEnabled();
    expect(screen.getByRole("radio", { name: "Keep this finding" })).toBeChecked();
});
