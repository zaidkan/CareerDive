// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ClientTaskView, ClientView } from "@sim/schemas";
import { describe, expect, it, vi } from "vitest";
import { SystemToolPanel } from "../src/components/SystemToolPanel.js";

const openArtifact = vi.fn();

function emailView(): ClientView {
  return {
    sessionId: "session-1",
    sessionKind: "tutorial",
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
        templateId: "incomplete_handoff",
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
    pacingMode: "practice",
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
  return (
    <SystemToolPanel
      actions={[]}
      onAction={() => undefined}
      onWorkplaceInteraction={async (interaction) => {
        if (interaction.type !== "open_artifact") return;
        openArtifact(interaction);
        setView((current) => ({
          ...current,
          artifacts: current.artifacts.map((artifact) =>
            artifact.id === interaction.artifactId
              ? {
                  ...artifact,
                  observed: true,
                  body: "Did not finish device inventory check.",
                  metadata: { sender: "night analyst" },
                  searchableText: "handoff inventory",
                }
              : artifact,
          ),
        }));
      }}
      selectedEventId="handoff-1"
      systemId="email"
      view={view}
    />
  );
}

describe("work tools", () => {
  it("opens an unread email canonically before rendering its body", async () => {
    const user = userEvent.setup();
    render(<EmailToolHarness />);

    expect(
      screen.queryByText(/Did not finish device inventory check/i),
    ).toBeNull();
    await user.click(screen.getByRole("button", { name: /open message/i }));
    expect(openArtifact).toHaveBeenCalledWith({
      type: "open_artifact",
      artifactId: "handoff-email",
    });
    expect(
      await screen.findByText(/Did not finish device inventory check/i),
    ).toBeVisible();
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
    if (!originalEvent) throw new Error("Expected an alert event fixture");
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

    render(
      <SystemToolPanel
        actions={[
          {
            id: "review_alert",
            eventId: "alert-1",
            systemId: "alert_dashboard",
            label: "Review alert",
            description: "Review the alert details.",
            simulatedMinutes: 10,
            taskId: task.id,
          },
        ]}
        onAction={() => undefined}
        onTaskAttempt={onTaskAttempt}
        selectedEventId="alert-1"
        systemId="alert_dashboard"
        view={{ ...view, tasks: [task] }}
      />,
    );

    await user.click(
      screen.getByLabelText("Six failed checks, then a success"),
    );
    await user.click(screen.getByRole("button", { name: /check my work/i }));

    expect(onTaskAttempt).toHaveBeenCalledWith(task, ["timeline-failures"]);
  });
});
