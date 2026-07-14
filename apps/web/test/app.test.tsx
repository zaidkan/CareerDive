// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import type { ClientView, Debrief } from "@sim/schemas";
import {
  App,
  AccessibleMode,
  DebriefView,
  Tutorial,
  WorkSurface,
} from "../src/index.js";

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
      templateId: "suspicious_login",
      title: "Unfamiliar successful login",
      summary: "Repeated failures followed by a successful sign-in.",
      priority: "high",
      systemId: "alert_dashboard",
      status: "active",
      deadlineAt: 180,
      completedActionIds: [],
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
};

describe("parallel simulation views", () => {
  it("renders identical action ids in work surface and accessible mode", () => {
    const onAction = () => undefined;
    const work = render(<WorkSurface view={view} onAction={onAction} />);
    const workIds = [
      ...work.container.querySelectorAll("[data-action-id]"),
    ].map((element) => element.getAttribute("data-action-id"));
    work.unmount();
    const accessible = render(
      <AccessibleMode view={view} onAction={onAction} />,
    );
    const accessibleIds = [
      ...accessible.container.querySelectorAll("[data-action-id]"),
    ].map((element) => element.getAttribute("data-action-id"));

    expect(accessibleIds).toEqual(workIds);
  });

  it("supports keyboard activation and announces the selected action", async () => {
    const user = userEvent.setup();
    let selected = "";
    render(
      <AccessibleMode
        view={view}
        onAction={(action) => {
          selected = action.id;
        }}
      />,
    );

    await user.tab();
    await user.keyboard("{Enter}");

    expect(selected).toBe("inspect_login_context");
  });

  it("never renders hidden numeric assessment language", () => {
    const { container } = render(
      <WorkSurface view={view} onAction={() => undefined} />,
    );
    expect(container.textContent).not.toMatch(
      /trust|compatibility|stress:\s*\d|\b\d+%/i,
    );
  });

  it("opens work through professional systems instead of an answer grid", async () => {
    const user = userEvent.setup();
    const workplaceView: ClientView = {
      ...view,
      events: [
        ...view.events,
        {
          id: "handoff-1",
          templateId: "incomplete_handoff",
          title: "Shift handoff",
          summary: "The previous analyst left incomplete notes.",
          priority: "normal",
          systemId: "email",
          status: "active",
          deadlineAt: 35,
          completedActionIds: [],
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
    };

    render(<WorkSurface view={workplaceView} onAction={() => undefined} />);
    expect(
      screen.getByRole("navigation", { name: "Work systems" }),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: /email/i }));

    expect(
      screen.getByRole("heading", { name: "Shift handoff" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: /read shift handoff/i }),
    ).toBeVisible();
    expect(screen.queryByLabelText("Available actions")).toBeNull();
  });
});

describe("tutorial and debrief", () => {
  it("starts with a separate practice session before assessed play", async () => {
    const calls: Array<{ sessionKind: string; pacingMode: string }> = [];
    const client = {
      createSession: (input: {
        seed: number;
        sessionKind: "tutorial" | "assessed";
        pacingMode:
          | "standard"
          | "extended"
          | "pause_compatible"
          | "no_hard_timer"
          | "practice";
      }) => {
        calls.push(input);
        return Promise.resolve({
          sessionId: `${input.sessionKind}-session`,
          view: {
            ...view,
            sessionKind: input.sessionKind,
            pacingMode: input.pacingMode,
          },
        });
      },
      performAction: () => Promise.resolve(view),
      getDebrief: () => Promise.reject(new Error("not needed")),
    };

    render(<App client={client} />);

    expect(
      await screen.findByRole("heading", { name: "Practice tutorial" }),
    ).toBeVisible();
    expect(calls[0]).toEqual(
      expect.objectContaining({
        sessionKind: "tutorial",
        pacingMode: "practice",
      }),
    );
  });

  it("labels tutorial as practice and explains that it records no evidence", () => {
    render(<Tutorial />);
    expect(
      screen.getByRole("heading", { name: "Practice tutorial" }),
    ).toBeVisible();
    expect(screen.getByText(/does not record evidence/i)).toBeVisible();
  });

  it("welcomes the user into the shift before opening the workstation", async () => {
    const user = userEvent.setup();
    const client = {
      createSession: () => Promise.resolve({ sessionId: "session-1", view }),
      performAction: () => Promise.resolve(view),
      getDebrief: () => Promise.reject(new Error("not needed")),
    };

    render(<App client={client} />);
    await user.click(
      await screen.findByRole("button", { name: "Start assessed shift" }),
    );

    expect(
      await screen.findByRole("heading", { name: "Welcome to your shift" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Open workstation" }),
    ).toBeVisible();
  });

  it("opens manager context after asking for guidance", async () => {
    const user = userEvent.setup();
    const askView: ClientView = {
      ...view,
      simClock: 0,
      availableActions: [
        {
          id: "ask_manager",
          eventId: "suspicious-login-1",
          systemId: "team_chat",
          label: "Ask manager for context",
          description: "Request guidance without transferring responsibility.",
          simulatedMinutes: 5,
        },
      ],
    };
    const consultedView: ClientView = {
      ...askView,
      simClock: 5,
      availableActions: [
        {
          id: "review_alert",
          eventId: "suspicious-login-1",
          systemId: "alert_dashboard",
          label: "Review alert",
          description: "Read the alert details.",
          simulatedMinutes: 10,
        },
      ],
      operationalMessages: [
        "Morgan recommends reviewing the alert details, checking device and location context, and documenting uncertainty before deciding.",
      ],
    };
    const client = {
      createSession: () =>
        Promise.resolve({ sessionId: "session-1", view: askView }),
      performAction: () => Promise.resolve(consultedView),
      getDebrief: () => Promise.reject(new Error("not needed")),
    };

    render(<App client={client} />);
    await user.click(
      await screen.findByRole("button", { name: "Start assessed shift" }),
    );
    await user.click(
      await screen.findByRole("button", { name: "Open workstation" }),
    );
    await user.click(screen.getByRole("button", { name: /team chat/i }));
    await user.click(
      await screen.findByRole("button", { name: /ask manager for context/i }),
    );

    expect(
      await screen.findByRole("heading", { name: "Manager context" }),
    ).toBeVisible();
    expect(screen.getByText(/Morgan recommends reviewing/i)).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Return to alert dashboard" }),
    ).toBeVisible();
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
    render(<DebriefView debrief={debrief} />);

    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(8);
    expect(screen.queryByText(/score|percent|you should become/i)).toBeNull();
  });
});
