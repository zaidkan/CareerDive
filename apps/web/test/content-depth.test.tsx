// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { createInitialWorldState, toClientView } from "@sim/core";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import { EmailTool } from "../src/components/tools/EmailTool.js";
import { TeamChatTool } from "../src/components/tools/TeamChatTool.js";
import { SystemToolPanel } from "../src/components/SystemToolPanel.js";
import { CaseRail } from "../src/components/CaseRail.js";
import { ShiftCheckpoints } from "../src/world/deskOs/ShiftCheckpoints.js";
afterEach(cleanup);
const pack = loadDefaultCybersecurityPack();
const view = () => toClientView(createInitialWorldState("content", 24, {}, pack));
it("shows the approved email timestamp without opening its body", () => {
    const current = view();
    const artifact = current.artifacts.find(({ id }) => id === "handoff-email");
    if (!artifact)
        throw new Error("Missing handoff");
    render(<EmailTool artifacts={[artifact]} onSelect={vi.fn()} onOpenArtifact={vi.fn()}/>);
    expect(screen.getAllByText("07:55")).toHaveLength(2);
    expect(screen.queryByText(/This shift/)).toBeNull();
    expect(artifact).not.toHaveProperty("body");
    expect(screen.queryByText(/Did not finish device inventory check/)).toBeNull();
});
it("derives shift checkpoints from current visible work, not static future meetings", () => {
    const current = view();
    const { rerender } = render(<ShiftCheckpoints view={current} onOpenEmail={vi.fn()}/>);
    expect(screen.getByText("Shift handoff")).toBeVisible();
    expect(screen.getByText(/Buddy check with Morgan/)).toBeVisible();
    expect(screen.getByText(/Optional break with Jules/)).toBeVisible();
    expect(screen.queryByText(/Priya|09:15|11:00|14:30|locked/)).toBeNull();
    rerender(<ShiftCheckpoints view={{
            ...current,
            events: current.events.map((event) => ({
                ...event,
                status: "resolved",
            })),
            availableActions: [],
        }} onOpenEmail={vi.fn()}/>);
    expect(screen.queryByText("Shift handoff")).toBeNull();
    expect(screen.queryByText(/Buddy check|Optional break/)).toBeNull();
    expect(screen.getByText(/No current work checkpoints/)).toBeVisible();
});
it.each(["resolved", "escalated"] as const)("keeps the canonical %s resolution visible in the shared case rail", (status) => {
    const current = view();
    const resolution = "Review requested; the identity of the session owner remains unverified.";
    current.events = current.events.map((event) => ({
        ...event,
        status,
        resolution,
    }));
    render(<CaseRail view={current} onResume={vi.fn()}/>);
    expect(screen.getAllByText(resolution)).toHaveLength(current.events.length);
});
it.each(["desk"] as const)("carries only opened case evidence and saved notes into the %s decision", () => {
    const current = view();
    const event = current.events.find(({ id }) => id === "suspicious-login-1");
    if (!event)
        throw new Error("Missing login case");
    current.events = [event];
    current.tasks = [];
    current.availableActions = [
        {
            id: "dismiss_alert",
            eventId: event.id,
            systemId: "alert_dashboard",
            label: "Dismiss as false positive",
            description: "Close the item.",
            simulatedMinutes: 15,
        },
    ];
    current.ticketNotes[event.id] =
        "Saved review: compare the device reference before deciding.";
    current.artifacts = [
        {
            id: "opened",
            title: "Earlier login record",
            summary: "Record preview",
            kind: "alert",
            systemId: "alert_dashboard",
            eventIds: [event.id],
            observed: true,
            body: "Previously opened comparison passage.",
        },
        {
            id: "unopened",
            title: "Unopened record",
            summary: "Preview only",
            kind: "email",
            systemId: "email",
            eventIds: [event.id],
            observed: false,
            body: "UNOPENED BODY MUST NOT APPEAR",
        },
    ];
    const { container } = render(<SystemToolPanel view={current} systemId="alert_dashboard" selectedEventId={event.id} actions={current.availableActions} onAction={vi.fn()}/>);
    const review = container.querySelector('[aria-label="Case review before decision"]');
    expect(review).toHaveTextContent("Previously opened comparison passage.");
    expect(review).toHaveTextContent(current.ticketNotes[event.id] ?? "");
    expect(review).not.toHaveTextContent("UNOPENED BODY MUST NOT APPEAR");
    expect(review).toHaveTextContent(/another check/i);
});
it("offers bounded consultation for the selected work without repeated procedure paragraphs", () => {
    const current = view();
    const onAction = vi.fn();
    const action = current.availableActions.find(
        (a) => a.id === "ask_manager" && a.eventId === "suspicious-login-1",
    );
    if (!action) throw new Error("Missing consultation fixture");
    render(<TeamChatTool view={current} actions={[action]} onAction={onAction}/>);
    expect(screen.queryByLabelText("Morgan procedure reminders")).toBeNull();
    expect(screen.getByRole("button", { name: "What case context do we have?" })).toBeVisible();
    expect(screen.getByRole("button", { name: "What remains uncertain?" })).toBeVisible();
    expect(screen.getByRole("button", { name: "What should the next analyst know?" })).toBeVisible();
});
