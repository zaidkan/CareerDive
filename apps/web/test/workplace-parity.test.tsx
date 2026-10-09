// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import { createInitialWorldState, toClientView } from "@sim/core";
import { ClientTaskViewSchema, type ClientView } from "@sim/schemas";
import { SystemToolPanel } from "../src/components/SystemToolPanel.js";
import { SpatialShell } from "../src/world/SpatialShell.js";
import { WorkSurface } from "../src/components/WorkSurface.js";
vi.mock("../src/world/RoomCanvas.js", () => ({
    RoomCanvas: () => <div>Office canvas</div>,
}));
afterEach(() => { cleanup(); sessionStorage.clear(); });
const pack = loadDefaultCybersecurityPack();
function required<T>(value: T | null | undefined): T {
    if (value === null || value === undefined)
        throw new Error("Missing acceptance fixture");
    return value;
}
function view(): ClientView {
    return toClientView(createInitialWorldState("parity", 24, {}, pack));
}
describe("structured workplace acceptance", () => {
    it("focuses the selected tool heading after keyboard navigation in desk mode", async () => {
        const user = userEvent.setup();
        render(<WorkSurface view={view()} onAction={vi.fn()}/>);
        const button = within(screen.getByRole("navigation", { name: "Work systems" })).getByRole("button", { name: /^Guides/ });
        button.focus();
        await user.keyboard("{Enter}");
        expect(screen.getByRole("heading", { name: "Unfamiliar successful login" })).toHaveFocus();
    });
    it("offers the same one-time emergency recovery in the spatial HUD", async () => {
        const user = userEvent.setup();
        const current = view();
        current.workplace = {
            ...current.workplace,
            energy: { current: 0, max: 100 },
            fridgeSnackBars: 0,
            carriedSnackBites: 0,
            coffeeServings: 0,
            coffeeStage: "idle",
        };
        const onWorkplaceInteraction = vi
            .fn()
            .mockResolvedValue({
            view: current,
            sequence: 1,
            feedback: "energy_recovered",
        });
        const { rerender } = render(<SpatialShell view={current} onAction={vi.fn()} onWorkplaceInteraction={onWorkplaceInteraction}/>);
        await user.click(screen.getByRole("button", { name: /Security Operations/ }));
        const recover = await screen.findByRole("button", { name: "Use emergency recovery" }, { timeout: 6000 });
        recover.focus();
        await user.keyboard("{Enter}");
        expect(onWorkplaceInteraction).toHaveBeenCalledWith({
            type: "emergency_recovery",
        });
        rerender(<SpatialShell view={{
                ...current,
                workplace: {
                    ...current.workplace,
                    emergencyRecoveryUsed: true,
                    energy: { current: 20, max: 100 },
                },
            }} onAction={vi.fn()} onWorkplaceInteraction={onWorkplaceInteraction}/>);
        expect(screen.queryByRole("button", { name: "Use emergency recovery" })).toBeNull();
    });
    it("keeps canonical Morgan messages available after work is settled", async () => {
        const current = view();
        current.availableActions = [];
        current.teamMessages = [
            {
                id: "morgan-reply",
                eventId: "suspicious-login-1",
                author: "morgan",
                actionId: "ask_manager",
                simMinutes: 5,
                body: "The session owner remains unverified.",
            },
        ];
        render(<WorkSurface view={current} onAction={vi.fn()}/>);
        await userEvent.setup().click(screen.getByRole("button", { name: /^Team chat/ }));
        expect(screen.getByRole("article", { name: "Morgan message thread" })).toBeVisible();
        expect(screen.getByRole("status")).toHaveTextContent("The session owner remains unverified.");
    });
    it("announces and focuses mutation failures inline with a keyboard retry", async () => {
        const user = userEvent.setup();
        const onRetryMutation = vi.fn();
        render(<WorkSurface view={view()} onAction={vi.fn()} mutationState={{ error: "Save failed", requestSequence: 1 }} onRetryMutation={onRetryMutation}/>);
        expect(screen.getByRole("alert")).toHaveFocus();
        await user.tab();
        expect(screen.getByRole("button", { name: "Retry" })).toHaveFocus();
        await user.keyboard("{Enter}");
        expect(onRetryMutation).toHaveBeenCalledOnce();
    });
    it.each(["visual"] as const)("labels each canonical ticket step in the %s renderer", () => {
        const current = view();
        const summary = required(pack.scenario.tasks.find(({ id }) => id === "login-ticket-summary"));
        const renderStep = (index: number) => {
            const step = required(summary.steps[index]);
            const task = {
                ...summary,
                ...step,
                id: summary.id,
                eventId: "suspicious-login-1",
                stepIndex: index,
                stepCount: summary.steps.length,
            };
            // Only pass the public task shape, never the fixture's answer key.
            const publicTask = ClientTaskViewSchema.parse(task);
            const action = {
                id: summary.actionId,
                taskId: summary.id,
                eventId: task.eventId,
                systemId: summary.systemId,
                label: "Document ticket",
                description: "Record findings",
                simulatedMinutes: 5,
            };
            const updated = {
                ...current,
                tasks: [publicTask],
                availableActions: [action],
            };
            return (<SystemToolPanel view={updated} systemId="ticket_queue" selectedEventId={task.eventId} actions={[action]} onAction={vi.fn()}/>);
        };
        const { rerender } = render(renderStep(0));
        const assertGroups = () => {
            expect(screen.getByRole("group", { name: "Which records support the device and connection differences in S-0741?" })).toBeVisible();
            expect(screen.getByRole("group", { name: "What is still unknown?" })).toBeVisible();
            expect(screen.getByRole("group", { name: "What is the next step?" })).toBeVisible();
            expect(screen.queryByRole("textbox", { name: "Verified evidence" })).toBeNull();
            expect(screen.queryByRole("group", { name: "Attach opened sources" })).toBeNull();
            expect(screen.queryByRole("button", { name: "Submit findings" })).toBeNull();
        };
        assertGroups();
        for (let index = 1; index < summary.steps.length; index++) {
            rerender(renderStep(index));
            assertGroups();
        }
    });
});
