// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import { createInitialWorldState, toClientView } from "@sim/core";
import { ClientTaskViewSchema, type ClientView } from "@sim/schemas";
import { AccessibleMode } from "../src/components/AccessibleMode.js";
import { SystemToolPanel } from "../src/components/SystemToolPanel.js";
import { ExperienceShell } from "../src/experience/ExperienceShell.js";
import { SpatialShell } from "../src/world/SpatialShell.js";
import { WorkSurface } from "../src/components/WorkSurface.js";

vi.mock("../src/world/RoomCanvas.js", () => ({ RoomCanvas: () => <div>Office canvas</div> }));

afterEach(cleanup);
const pack = loadDefaultCybersecurityPack();
function required<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error("Missing acceptance fixture");
  return value;
}
function view(): ClientView {
  return toClientView(createInitialWorldState("parity", 24, {}, pack));
}

describe("structured workplace acceptance", () => {
  it("focuses the selected tool heading after keyboard navigation in desk mode", async () => {
    const user = userEvent.setup();
    render(<WorkSurface view={view()} onAction={vi.fn()} />);
    const button = within(screen.getByRole("navigation", { name: "Work systems" })).getByRole("button", { name: /^Guides/ });
    button.focus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("heading", { name: "Guides" })).toHaveFocus();
  });

  it("offers the same one-time emergency recovery in the spatial HUD", async () => {
    const user = userEvent.setup();
    const current = view();
    current.workplace = { ...current.workplace, energy: { current: 0, max: 100 }, fridgeSnackBars: 0, carriedSnackBites: 0, coffeeServings: 0, coffeeStage: "idle" };
    const onWorkplaceInteraction = vi.fn().mockResolvedValue({ view: current, sequence: 1, feedback: "energy_recovered" });
    const { rerender } = render(<SpatialShell view={current} onAction={vi.fn()} onWorkplaceInteraction={onWorkplaceInteraction} />);
    await user.click(screen.getByRole("button", { name: /Security Operations/ }));
    const recover = await screen.findByRole("button", { name: "Use emergency recovery" }, { timeout: 6000 });
    recover.focus();
    await user.keyboard("{Enter}");
    expect(onWorkplaceInteraction).toHaveBeenCalledWith({ type: "emergency_recovery" });
    rerender(<SpatialShell view={{ ...current, workplace: { ...current.workplace, emergencyRecoveryUsed: true, energy: { current: 20, max: 100 } } }} onAction={vi.fn()} onWorkplaceInteraction={onWorkplaceInteraction} />);
    expect(screen.queryByRole("button", { name: "Use emergency recovery" })).toBeNull();
  });
  it("keeps Morgan's thread and guidance available after manager actions disappear", () => {
    const current = view();
    current.availableActions = [];
    current.operationalMessages = ["Morgan recommends checking the opened records."];
    render(<AccessibleMode view={current} onAction={vi.fn()} />);
    expect(screen.getByRole("article", { name: "Morgan message thread" })).toBeVisible();
    expect(screen.getByRole("complementary", { name: "Morgan guidance" })).toHaveTextContent(required(current.operationalMessages[0]));
  });

  it("opens each unread artifact once and focuses it only after the canonical response", async () => {
    const user = userEvent.setup();
    const current = view();
    current.availableActions = [];
    current.tasks = [];
    const onOpen = vi.fn().mockResolvedValue(undefined);
    const props = { onAction: vi.fn(), onWorkplaceInteraction: onOpen };
    const { rerender } = render(<AccessibleMode {...props} view={current} />);
    const buttons = screen.getAllByRole("button", { name: "Open Incomplete shift handoff" });
    expect(buttons).toHaveLength(1);
    await user.click(required(buttons[0]));
    expect(onOpen).toHaveBeenCalledWith({ type: "open_artifact", artifactId: "handoff-email" });
    expect(screen.queryByText(/Did not finish device inventory check/)).toBeNull();
    const opened = { ...current, artifacts: current.artifacts.map((artifact) => artifact.id === "handoff-email" ? { ...artifact, observed: true, body: "Did not finish device inventory check." } : artifact) };
    rerender(<AccessibleMode {...props} view={opened} />);
    expect(screen.getByRole("heading", { name: "Incomplete shift handoff" })).toHaveFocus();
    expect(screen.getByText("Did not finish device inventory check.")).toBeVisible();
  });

  it("announces and focuses mutation failures inline with a keyboard retry", async () => {
    const user = userEvent.setup();
    const onRetryMutation = vi.fn();
    render(<AccessibleMode view={view()} onAction={vi.fn()} mutationState={{ error: "Save failed", requestSequence: 1 }} onRetryMutation={onRetryMutation} />);
    expect(screen.getByRole("alert")).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Retry" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onRetryMutation).toHaveBeenCalledOnce();
  });

  it.each(["visual", "structured"] as const)("labels each canonical ticket step in the %s renderer", (mode) => {
    const current = view();
    const summary = required(pack.scenario.tasks.find(({ id }) => id === "login-ticket-summary"));
    const renderStep = (index: number) => {
      const step = required(summary.steps[index]);
      const task = { ...summary, ...step, id: summary.id, eventId: "suspicious-login-1", stepIndex: index, stepCount: summary.steps.length };
      // Only pass the public task shape, never the fixture's answer key.
      const publicTask = ClientTaskViewSchema.parse(task);
      const action = { id: summary.actionId, taskId: summary.id, eventId: task.eventId, systemId: summary.systemId, label: "Document ticket", description: "Record findings", simulatedMinutes: 5 };
      const updated = { ...current, tasks: [publicTask], availableActions: [action] };
      return mode === "structured" ? <AccessibleMode view={updated} onAction={vi.fn()} /> : <SystemToolPanel view={updated} systemId="ticket_queue" selectedEventId={task.eventId} actions={[action]} onAction={vi.fn()} />;
    };
    const { rerender } = render(renderStep(0));
    expect(screen.getByRole("group", { name: "Verified evidence" })).toBeVisible();
    rerender(renderStep(1));
    expect(screen.getByRole("group", { name: "Uncertainty" })).toBeVisible();
    rerender(renderStep(2));
    expect(screen.getByRole("group", { name: "Next step" })).toBeVisible();
  });

  it.each(["desk", "list"] as const)("exposes the Jules topic fieldset and restores focus in %s mode", async (mode) => {
    const user = userEvent.setup();
    const current = view();
    const onWorkplaceInteraction = vi.fn().mockResolvedValue({ view: current, sequence: 1, feedback: "jules_replied" });
    render(<ExperienceShell mode={mode} view={current} onAction={vi.fn()} onModeChange={vi.fn()} onWorkplaceInteraction={onWorkplaceInteraction} />);
    await user.click(screen.getByRole("button", { name: "Talk to Jules" }));
    const topics = screen.getByRole("group", { name: "Topics" });
    expect(topics.tagName).toBe("FIELDSET");
    expect(within(topics).getByRole("button", { name: "First day rhythm" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onWorkplaceInteraction).toHaveBeenCalledWith({ type: "talk_to_jules", topic: "first_day" });
    await user.keyboard("{Escape}");
    expect(screen.getByRole("button", { name: "Talk to Jules" })).toHaveFocus();
  });
});
