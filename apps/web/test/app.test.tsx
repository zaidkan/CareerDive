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
      title: "Unfamiliar successful login",
      status: "active",
    },
  ],
  availableActions: [
    {
      id: "inspect_login_context",
      label: "Inspect login context",
      description: "Review device, location, and account context.",
      simulatedMinutes: 15,
    },
    {
      id: "dismiss_alert",
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
    const workIds = [...work.container.querySelectorAll("[data-action-id]")].map(
      (element) => element.getAttribute("data-action-id"),
    );
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
        onAction={(actionId) => {
          selected = actionId;
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
          view: { ...view, sessionKind: input.sessionKind, pacingMode: input.pacingMode },
        });
      },
      performAction: () => Promise.resolve(view),
      getDebrief: () => Promise.reject(new Error("not needed")),
    };

    render(<App client={client} />);

    expect(await screen.findByRole("heading", { name: "Practice tutorial" })).toBeVisible();
    expect(calls[0]).toEqual(
      expect.objectContaining({
        sessionKind: "tutorial",
        pacingMode: "practice",
      }),
    );
  });

  it("labels tutorial as practice and explains that it records no evidence", () => {
    render(<Tutorial />);
    expect(screen.getByRole("heading", { name: "Practice tutorial" })).toBeVisible();
    expect(screen.getByText(/does not record evidence/i)).toBeVisible();
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
