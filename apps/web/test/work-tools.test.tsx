// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { useState } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AvailableAction, ClientTaskView, ClientView } from "@sim/schemas";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SystemToolPanel } from "../src/components/SystemToolPanel.js";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import { applyAction, applyWorkplaceInteraction, createInitialWorldState, toClientView } from "@sim/core";
import type { WorldState } from "@sim/schemas";
const openArtifact = vi.fn();
afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});
function emailView(): ClientView {
    return {
        sessionId: "session-1",
        sessionKind: "assessed",
        simClock: 0,
        currentLocation: {
            id: "operations-center",
            name: "Security Operations Center",
            connectedLocationIds: [],
            interactableIds: [],
        },
        events: [
            {
                id: "handoff-1",
                category: "handoff",
                title: "Handoff email",
                summary: "A handoff is waiting.",
                priority: "normal",
                systemId: "email",
                status: "active",
                deadlineAt: 180,
                completedActionIds: [],
                observedArtifactIds: [],
            },
        ],
        availableActions: [],
        operationalMessages: [],
        pacingMode: "standard",
        artifacts: [
            {
                id: "handoff-email",
                systemId: "email",
                kind: "email",
                title: "Incomplete shift handoff",
                summary: "From night analyst · inbox",
                eventIds: ["handoff-1"],
                relatedArtifactIds: [],
                observed: false,
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
}
function EmailToolHarness() {
    const [view, setView] = useState(emailView);
    return (<SystemToolPanel actions={[]} onAction={() => undefined} onWorkplaceInteraction={async (interaction) => {
            if (interaction.type !== "open_artifact")
                return;
            openArtifact(interaction);
            setView((current) => ({
                ...current,
                artifacts: current.artifacts.map((artifact) => artifact.id === interaction.artifactId
                    ? {
                        ...artifact,
                        observed: true,
                        body: "Did not finish device inventory check.",
                        metadata: { sender: "night analyst" },
                        searchableText: "handoff inventory",
                    }
                    : artifact),
            }));
        }} selectedEventId="handoff-1" systemId="email" view={view}/>);
}
describe("work tools", () => {
    it.each(["desk"] as const)("opens real alert record and binds %s career action to its source", async (mode) => {
        const user = userEvent.setup();
        const initial = createInitialWorldState(`alert-${mode}`, 42, {}, loadDefaultCybersecurityPack());
        const onAction = vi.fn();
        const onInteraction = vi.fn();
        function Harness() {
            const [state, setState] = useState<WorldState>(initial);
            const view = toClientView(state);
            const open = async (interaction: Parameters<typeof applyWorkplaceInteraction>[1]) => {
                onInteraction(interaction);
                setState((current) => applyWorkplaceInteraction(current, interaction).state);
                return { view, sequence: 1, feedback: "alert_record_opened" as const };
            };
            const act = (action: AvailableAction) => {
                onAction(action);
                setState((current) => applyAction(current, { ...action, actorId: "user" }).state);
            };
            return (<SystemToolPanel actions={view.availableActions.filter(({ eventId, systemId }) => eventId === "suspicious-login-1" && systemId === "alert_dashboard")} onAction={act} onWorkplaceInteraction={open} selectedEventId="suspicious-login-1" systemId="alert_dashboard" view={view}/>);
        }
        render(<Harness />);
        expect(screen.getByRole("button", { name: /A-1042 · sign-in monitoring/i })).toBeVisible();
        expect(screen.queryByText(/Six failed extra checks 07:38-07:40/)).toBeNull();
        await user.click(screen.getByRole("button", { name: /A-1042 · sign-in monitoring/i }));
        expect(onInteraction).toHaveBeenCalledWith({ type: "open_alert_record", recordId: "A-1042" });
        expect(await screen.findByText(/Six failed extra checks 07:38-07:40/)).toBeVisible();
        await user.click(screen.getByRole("button", { name: /Review alert/i }));
        expect(onAction).toHaveBeenCalledWith(expect.objectContaining({
            id: "review_alert",
            eventId: "suspicious-login-1",
            sourceRecordId: "A-1042",
            sourceArtifactId: "suspicious-login-alert",
        }));
    });
    it.each(["knowledge_base", "ticket_queue", "team_chat"] as const)("offers canonical opening for unread %s records", async (systemId) => {
        const user = userEvent.setup();
        const view = emailView();
        view.artifacts = view.artifacts.map((artifact) => ({
            ...artifact,
            systemId,
        }));
        const onOpen = vi.fn().mockResolvedValue(undefined);
        render(<SystemToolPanel actions={[]} onAction={() => undefined} onWorkplaceInteraction={onOpen} systemId={systemId} view={view}/>);
        await user.click(screen.getByRole("button", { name: "Open Incomplete shift handoff" }));
        expect(onOpen).toHaveBeenCalledWith({
            type: "open_artifact",
            artifactId: "handoff-email",
        });
        expect(screen.queryByText("Did not finish device inventory check.")).toBeNull();
    });
    it("opens an unread email canonically before rendering its body", async () => {
        const user = userEvent.setup();
        render(<EmailToolHarness />);
        expect(screen.queryByText(/Did not finish device inventory check/i)).toBeNull();
        await user.click(screen.getByRole("button", { name: /open message/i }));
        expect(openArtifact).toHaveBeenCalledWith({
            type: "open_artifact",
            artifactId: "handoff-email",
        });
        expect(await screen.findByText(/Did not finish device inventory check/i)).toBeVisible();
        expect(screen.getByRole("heading", { name: "Incomplete shift handoff" })).toHaveFocus();
    });
    it("moves focus with the selected email record without opening it", async () => {
        const user = userEvent.setup();
        const view = emailView();
        const source = view.artifacts[0];
        if (!source) throw new Error("Expected an email fixture");
        view.artifacts.push({
            ...source,
            id: "follow-up-email",
            title: "Follow-up question",
            summary: "From Morgan · inbox",
        });
        render(<SystemToolPanel actions={[]} onAction={() => undefined} selectedEventId="handoff-1" systemId="email" view={view}/>);
        const nextMessage = screen.getByRole("button", { name: /Follow-up question/i });
        await user.click(nextMessage);
        expect(nextMessage).toHaveAttribute("aria-pressed", "true");
        expect(screen.getByRole("heading", { name: "Follow-up question" })).toHaveFocus();
        expect(screen.getByRole("button", { name: "Open message" })).toBeVisible();
    });
    it("submits selected alert rows using their canonical option IDs", async () => {
        const user = userEvent.setup();
        const task: ClientTaskView = {
            id: "alert-rows",
            eventId: "alert-1",
            actionId: "review_alert",
            systemId: "alert_dashboard",
            kind: "select_clues",
            title: "Mark the alert rows to investigate",
            prompt: "Which rows need follow-up?",
            instruction: "Select one alert row.",
            whyItMatters: "Rows preserve the evidence behind the decision.",
            relatedArtifactIds: ["alert-1"],
            stepIndex: 0,
            stepCount: 1,
            options: [
                { id: "timeline-failures", label: "Six failed checks, then a success" },
                { id: "timeline-normal", label: "One routine login" },
            ],
            minSelections: 1,
            maxSelections: 1,
        };
        const onTaskAttempt = vi.fn().mockResolvedValue({
            accepted: true,
            completed: true,
            feedback: "Saved.",
        });
        const view = emailView();
        const originalEvent = view.events[0];
        if (!originalEvent)
            throw new Error("Expected an alert event fixture");
        view.events = [
            {
                ...originalEvent,
                id: "alert-1",
                systemId: "alert_dashboard",
            },
        ];
        view.artifacts = [
            {
                id: "alert-1",
                systemId: "alert_dashboard",
                kind: "alert",
                title: "Unfamiliar successful login",
                summary: "Alert A-1042 · high priority",
                body: "Six failed checks, then one successful login.",
                eventIds: ["alert-1"],
                relatedArtifactIds: [],
                searchableText: "failed successful login",
                metadata: { device: "unknown-laptop-17" },
                observed: true,
            },
        ];
        render(<SystemToolPanel actions={[
                {
                    id: "review_alert",
                    eventId: "alert-1",
                    systemId: "alert_dashboard",
                    label: "Review alert",
                    description: "Review the alert details.",
                    simulatedMinutes: 10,
                    taskId: task.id,
                },
            ]} onAction={() => undefined} onTaskAttempt={onTaskAttempt} selectedEventId="alert-1" systemId="alert_dashboard" view={{ ...view, tasks: [task] }}/>);
        await user.click(screen.getByLabelText("Six failed checks, then a success"));
        await user.click(screen.getByRole("button", { name: /check my work/i }));
        expect(onTaskAttempt).toHaveBeenCalledWith(task, ["timeline-failures"]);
    });
});
