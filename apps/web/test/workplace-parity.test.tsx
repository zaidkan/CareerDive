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
afterEach(cleanup);
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
        expect(screen.getByRole("heading", { name: "Guides" })).toHaveFocus();
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
    it("keeps Morgan's thread and guidance available after manager actions disappear", async () => {
        const current = view();
        current.availableActions = [];
        current.operationalMessages = [
            "Morgan recommends checking the opened records.",
        ];
        render(<WorkSurface view={current} onAction={vi.fn()}/>);
        await userEvent.setup().click(screen.getByRole("button", { name: /^Team chat/ }));
        expect(screen.getByRole("article", { name: "Morgan message thread" })).toBeVisible();
        expect(screen.getByRole("complementary", { name: "Morgan guidance" })).toHaveTextContent(required(current.operationalMessages[0]));
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
        expect(screen.getByRole("textbox", { name: "Verified evidence" })).toBeVisible();
        expect(screen.getByRole("textbox", { name: "Uncertainty" })).toBeVisible();
        expect(screen.getByRole("textbox", { name: "Next step" })).toBeVisible();
        expect(screen.getByRole("group", { name: "Attach opened sources" })).toBeVisible();
        rerender(renderStep(1));
        expect(screen.getByRole("textbox", { name: "Uncertainty" })).toBeVisible();
        rerender(renderStep(2));
        expect(screen.getByRole("textbox", { name: "Uncertainty" })).toBeVisible();
        rerender(renderStep(summary.steps.length - 1));
        expect(screen.getByRole("textbox", { name: "Next step" })).toBeVisible();
        expect(screen.queryByRole("button", { name: "Submit findings" })).toBeNull();
    });
});
