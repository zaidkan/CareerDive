// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ClientView, Debrief } from "@sim/schemas";
import { App, DebriefView } from "../src/index.js";
import { WorkSurface } from "../src/components/WorkSurface.js";
vi.mock("../src/world/RoomCanvas.js", () => ({
    RoomCanvas: ({ onInteract, onNearbyChange, }: {
        onInteract: (id: string) => void;
        onNearbyChange: (id?: string, label?: string) => void;
    }) => (<div>
      <button type="button" onClick={() => {
            onInteract("desk_player");
        }}>
        Sit at desk
      </button>
      <button type="button" onClick={() => {
            onInteract("door_exit");
        }}>
        Exit room
      </button>
      <button type="button" onClick={() => {
            onNearbyChange("coffee", "Coffee maker");
        }}>
        Approach coffee maker
      </button>
    </div>),
}));
afterEach(cleanup);
const view: ClientView = {
    sessionId: "session-1",
    sessionKind: "assessed",
    simClock: 10,
    currentLocation: {
        id: "operations-center",
        name: "Security Operations Center",
        connectedLocationIds: [],
        interactableIds: ["alert-dashboard"],
    },
    events: [
        {
            id: "suspicious-login-1",
            category: "main_case",
            title: "Unfamiliar successful login",
            summary: "Repeated failures followed by a successful sign-in.",
            priority: "high",
            systemId: "alert_dashboard",
            status: "active",
            deadlineAt: 180,
            completedActionIds: [],
            observedArtifactIds: ["suspicious-login-alert"],
        },
    ],
    availableActions: [
        {
            id: "inspect_login_context",
            eventId: "suspicious-login-1",
            systemId: "alert_dashboard",
            label: "Inspect login context",
            description: "Review device, location, and account context.",
            simulatedMinutes: 15,
        },
        {
            id: "dismiss_alert",
            eventId: "suspicious-login-1",
            systemId: "alert_dashboard",
            label: "Dismiss as false positive",
            description: "Close the alert.",
            simulatedMinutes: 15,
        },
    ],
    operationalMessages: [],
    pacingMode: "standard",
    artifacts: [
        {
            id: "suspicious-login-alert",
            systemId: "alert_dashboard",
            kind: "alert",
            title: "Unfamiliar successful login",
            summary: "Alert A-1042",
            body: "Repeated failures followed by a successful sign-in.",
            eventIds: ["suspicious-login-1"],
            relatedArtifactIds: [],
            searchableText: "login alert",
            metadata: { alertId: "A-1042" },
            observed: true,
        },
    ],
    ticketNotes: {},
    notebook: "",
    kbQuery: "",
    tasks: [],
    notifications: [],
    queryResults: [],
    workplace: {
        energy: { current: 100, max: 100 },
        carriedSnackBites: 0,
        fridgeSnackBars: 2,
        fridgeOpen: false,
        coffeeServings: 2,
        coffeeStage: "idle",
        julesTopicsSeen: [],
        emergencyRecoveryUsed: false,
    },
};
const clientInteractionStubs = {
    performWorkplaceInteraction: () => Promise.resolve({
        view,
        sequence: 1,
        feedback: "fridge_opened" as const,
    }),
    submitTaskAttempt: () => Promise.resolve({
        view,
        accepted: true,
        completed: true,
        feedback: "Done.",
    }),
    respondToNotification: () => Promise.resolve(view),
};
describe("workstation recovery", () => {
    it("renders a real work task with guided retry in recovery workstation", async () => {
        const user = userEvent.setup();
        const inspectAction = view.availableActions[0];
        if (!inspectAction)
            throw new Error("Expected inspect action fixture");
        const onTaskAttempt = vi.fn().mockResolvedValue({
            accepted: false,
            completed: false,
            feedback: "Compare what is new for this account.",
        });
        const taskView: ClientView = {
            ...view,
            availableActions: [
                {
                    ...inspectAction,
                    taskId: "login-context-clues",
                },
            ],
            tasks: [
                {
                    id: "login-context-clues",
                    eventId: "suspicious-login-1",
                    actionId: "inspect_login_context",
                    systemId: "alert_dashboard",
                    kind: "select_clues",
                    title: "Find the strongest context clues",
                    prompt: "Which two details make this session different?",
                    instruction: "Select exactly two clues.",
                    whyItMatters: "Device and network context reveal unusual activity.",
                    relatedArtifactIds: ["suspicious-login-alert"],
                    stepIndex: 0,
                    stepCount: 1,
                    options: [
                        { id: "unknown-device", label: "Unknown Windows device" },
                        { id: "new-network", label: "New residential network" },
                        { id: "chrome", label: "Chrome browser" },
                    ],
                    minSelections: 2,
                    maxSelections: 2,
                },
            ],
        };
        render(<WorkSurface onAction={() => undefined} onTaskAttempt={onTaskAttempt} view={taskView}/>);
        expect(screen.getByRole("heading", { name: "Find the strongest context clues" })).toBeVisible();
        expect(screen.getByText(/case context/i)).toBeVisible();
        await user.click(screen.getByLabelText("Unknown Windows device"));
        await user.click(screen.getByLabelText("Chrome browser"));
        await user.click(screen.getByRole("button", { name: /save findings/i }));
        expect(onTaskAttempt).toHaveBeenCalledWith(expect.objectContaining({ id: "login-context-clues" }), ["unknown-device", "chrome"]);
        expect(await screen.findByText(/Compare what is new/i)).toBeVisible();
    });
    it("keeps current cases visible and handles interruption choices", async () => {
        const user = userEvent.setup();
        const onNotification = vi.fn().mockResolvedValue(undefined);
        const interrupted: ClientView = {
            ...view,
            notifications: [
                {
                    id: "routine-scanner-arrived",
                    eventId: "suspicious-login-1",
                    systemId: "alert_dashboard",
                    title: "New low-priority scanner alert",
                    body: "Routine work arrived while you investigated the login.",
                    priority: "low",
                    status: "unread",
                    canSnooze: true,
                },
            ],
        };
        render(<WorkSurface onAction={() => undefined} onNotification={onNotification} view={interrupted}/>);
        expect(screen.getByRole("complementary", { name: "Current shift" })).toBeVisible();
        expect(screen.getByRole("status", { name: /new work/i })).toBeVisible();
        await user.click(screen.getByRole("button", { name: "Snooze 15 minutes" }));
        expect(onNotification).toHaveBeenCalledWith(expect.objectContaining({ id: "routine-scanner-arrived" }), "snooze");
    });
    it("supports keyboard activation and announces the selected action", async () => {
        const user = userEvent.setup();
        let selected = "";
        render(<WorkSurface view={view} onAction={(action) => {
                selected = action.id;
            }}/>);
        screen.getByRole("button", { name: /Inspect login context/i }).focus();
        await user.keyboard("{Enter}");
        expect(selected).toBe("inspect_login_context");
    });
    it("never renders hidden numeric assessment language", () => {
        const { container } = render(<WorkSurface view={view} onAction={() => undefined}/>);
        expect(container.textContent).not.toMatch(/trust|compatibility|stress:\s*\d|\b\d+%/i);
    });
    it("opens work through professional systems instead of an answer grid", async () => {
        const user = userEvent.setup();
        const workplaceView: ClientView = {
            ...view,
            events: [
                ...view.events,
                {
                    id: "handoff-1",
                    category: "handoff",
                    title: "Shift handoff",
                    summary: "The previous analyst left incomplete notes.",
                    priority: "normal",
                    systemId: "email",
                    status: "active",
                    deadlineAt: 35,
                    completedActionIds: [],
                    observedArtifactIds: [],
                },
            ],
            availableActions: [
                ...view.availableActions,
                {
                    id: "read_handoff",
                    eventId: "handoff-1",
                    systemId: "email",
                    label: "Read shift handoff",
                    description: "Review the previous analyst's incomplete notes.",
                    simulatedMinutes: 5,
                },
            ],
            artifacts: [
                ...view.artifacts,
                {
                    id: "handoff-email",
                    systemId: "email",
                    kind: "email",
                    title: "Incomplete shift handoff",
                    summary: "From night analyst",
                    body: "Still watching the unfamiliar login thread.",
                    eventIds: ["handoff-1"],
                    relatedArtifactIds: [],
                    searchableText: "handoff",
                    metadata: {},
                    observed: false,
                },
            ],
        };
        render(<WorkSurface view={workplaceView} onAction={() => undefined}/>);
        const systems = screen.getByRole("navigation", { name: "Work systems" });
        expect(systems).toBeVisible();
        await user.click(within(systems).getByRole("button", { name: /Email/i }));
        expect(screen.getByRole("heading", { name: "Shift handoff" })).toBeVisible();
        expect(screen.getByRole("button", { name: /read shift handoff/i })).toBeVisible();
        expect(screen.queryByText(/Still watching the unfamiliar login thread/i)).toBeNull();
        expect(screen.getByRole("button", { name: /open message/i })).toBeVisible();
        expect(screen.queryByLabelText("Available actions")).toBeNull();
    });
    it("lets analysts edit ticket notes through the same action targets", async () => {
        const user = userEvent.setup();
        const actions: Array<{
            id: string;
            freeText?: string;
        }> = [];
        const ticketView: ClientView = {
            ...view,
            availableActions: [
                ...view.availableActions,
                {
                    id: "update_ticket_notes",
                    eventId: "suspicious-login-1",
                    systemId: "ticket_queue",
                    label: "Update investigation notes",
                    description: "Edit ticket notes.",
                    simulatedMinutes: 0,
                },
            ],
            artifacts: [
                ...view.artifacts,
                {
                    id: "ticket-suspicious-login",
                    systemId: "ticket_queue",
                    kind: "ticket",
                    title: "Ticket · unfamiliar login",
                    summary: "Investigation notes",
                    body: "Capture evidence before deciding.",
                    eventIds: ["suspicious-login-1"],
                    relatedArtifactIds: [],
                    searchableText: "ticket",
                    metadata: {},
                    observed: false,
                },
            ],
        };
        render(<WorkSurface view={ticketView} onAction={(action, freeText) => {
                actions.push(freeText === undefined
                    ? { id: action.id }
                    : { id: action.id, freeText });
            }}/>);
        await user.click(screen.getByRole("button", { name: /Tickets/i }));
        await user.selectOptions(screen.getByLabelText("Investigation notes"), "Check the device label");
        await user.click(screen.getByRole("button", { name: /save update investigation notes/i }));
        expect(actions.at(-1)).toEqual({
            id: "update_ticket_notes",
            freeText: "Check the device label",
        });
    });
});
describe("assessed shift and debrief", () => {
    it("does not ask for desk work before the player reaches the desk", async () => {
        const client = {
            ...clientInteractionStubs,
            createSession: () => Promise.resolve({ sessionId: "session-1", view }),
            performAction: () => Promise.resolve(view),
            getDebrief: () => Promise.reject(new Error("not needed")),
        };
        render(<App client={client}/>);
    
        expect(await screen.findByText(/Head to Security Operations/i)).toBeVisible();
        expect(screen.queryByText(/Check your inbox/i)).toBeNull();
    });
    it("replaces the workplace view with the canonical interaction result", async () => {
        const user = userEvent.setup();
        const openedView: ClientView = {
            ...view,
            workplace: {
                ...view.workplace,
                energy: { current: 63, max: 100 },
                fridgeOpen: true,
                fridgeSnackBars: 1,
                coffeeStage: "brewing",
            },
        };
        const performWorkplaceInteraction = vi.fn(() => Promise.resolve({
            view: openedView,
            sequence: 1,
            feedback: "coffee_started" as const,
        }));
        const client = {
            ...clientInteractionStubs,
            createSession: () => Promise.resolve({ sessionId: "session-1", view }),
            performAction: () => Promise.resolve(view),
            performWorkplaceInteraction,
            getDebrief: () => Promise.reject(new Error("not needed")),
        };
        render(<App client={client}/>);
    
        await user.click(await screen.findByRole("button", { name: /Security Operations/i }));
        await user.click(await screen.findByRole("button", { name: "Approach coffee maker" }, { timeout: 6000 }));
        await user.click(screen.getByRole("button", { name: "Start coffee" }));
        expect(performWorkplaceInteraction).toHaveBeenCalledWith("session-1", {
            type: "start_coffee",
        });
        expect(await screen.findByRole("button", { name: "Finish brewing" })).toBeVisible();
        expect(screen.queryByRole("meter", { name: "Energy" })).toBeNull();
    });
    it("renders all eight debrief sections", () => {
        const debrief: Debrief = {
            sessionId: "session-1",
            confidence: "early_signal",
            sections: {
                whatHappened: "A routine alert required review.",
                whatYouDid: "You inspected context.",
                consequences: "A senior analyst received the alert.",
                earlyEvidence: "One early signal appeared.",
                yourExperience: "Your reflection remains separate.",
                confidenceAndLimitations: "One simulation is limited evidence.",
                careerReality: "The work includes routine monitoring.",
                nextAction: "Try another shift.",
            },
            evidenceIds: ["signal-1"],
        };
        render(<DebriefView debrief={debrief}/>);
        expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(8);
        expect(screen.queryByText(/score|percent|you should become/i)).toBeNull();
    });
});
