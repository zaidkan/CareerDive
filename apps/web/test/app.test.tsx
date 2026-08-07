// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ClientView, Debrief } from "@sim/schemas";
import {
  App,
  AccessibleMode,
  DebriefView,
  Tutorial,
  WorkSurface,
} from "../src/index.js";

vi.mock("../src/world/RoomCanvas.js", () => ({
  RoomCanvas: ({
    onInteract,
  }: {
    onInteract: (id: string) => void;
  }) => (
    <div>
      <button type="button" onClick={() => onInteract("desk_player")}>
        Sit at desk
      </button>
      <button type="button" onClick={() => onInteract("door_exit")}>
        Exit room
      </button>
    </div>
  ),
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
      templateId: "suspicious_login",
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

    render(<WorkSurface view={workplaceView} onAction={() => undefined} />);
    const systems = screen.getByRole("navigation", { name: "Work systems" });
    expect(systems).toBeVisible();
    await user.click(
      within(systems).getByRole("button", { name: /Email/i }),
    );

    expect(
      screen.getByRole("heading", { name: "Shift handoff" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: /read shift handoff/i }),
    ).toBeVisible();
    expect(
      screen.getByText(/Still watching the unfamiliar login thread/i),
    ).toBeVisible();
    expect(screen.queryByLabelText("Available actions")).toBeNull();
  });

  it("lets analysts edit ticket notes through the same action targets", async () => {
    const user = userEvent.setup();
    const actions: Array<{ id: string; freeText?: string }> = [];
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

    render(
      <WorkSurface
        view={ticketView}
        onAction={(action, freeText) => {
          actions.push(
            freeText === undefined
              ? { id: action.id }
              : { id: action.id, freeText },
          );
        }}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Tickets/i }));
    await user.type(
      screen.getByLabelText("Investigation notes"),
      "Need device inventory",
    );
    await user.click(
      screen.getByRole("button", { name: /save update investigation notes/i }),
    );

    expect(actions.at(-1)).toEqual({
      id: "update_ticket_notes",
      freeText: "Need device inventory",
    });
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
      await screen.findByRole("heading", {
        name: /Step 1 · Check your inbox/i,
      }),
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
      screen.getByRole("heading", {
        name: /Step 1 · Check your inbox/i,
      }),
    ).toBeVisible();
    expect(screen.getByText(/Practice · day one at/i)).toBeVisible();
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
      await screen.findByRole("button", { name: /Skip practice/i }),
    );

    expect(
      await screen.findByRole("heading", {
        name: /Welcome to day one as a Junior Cybersecurity Analyst at Verdaly/i,
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: /Enter the Verdaly floor/i }),
    ).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: /Enter the Verdaly floor/i }),
    );
    expect(
      await screen.findByRole("heading", { name: /Day one · where to/i }),
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
      await screen.findByRole("button", { name: /Skip practice/i }),
    );
    await user.click(
      await screen.findByRole("button", { name: /Enter the Verdaly floor/i }),
    );
    await user.click(screen.getByRole("button", { name: "Simple list" }));
    await user.click(
      await screen.findByRole("button", { name: /ask manager for context/i }),
    );

    expect(
      await screen.findByRole("heading", { name: "Morgan is here to help" }),
    ).toBeVisible();
    expect(screen.getByText(/Morgan recommends reviewing/i)).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Back to my desk" }),
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
