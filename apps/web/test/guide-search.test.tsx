// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ClientTaskView, ClientView } from "@sim/schemas";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SystemToolPanel } from "../src/components/SystemToolPanel.js";

afterEach(cleanup);

function guideView(): ClientView {
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
    events: [],
    availableActions: [],
    operationalMessages: [],
    pacingMode: "standard",
    artifacts: [
      {
        id: "phishing-guide",
        systemId: "knowledge_base",
        kind: "kb_document",
        title: "Phishing response guide",
        summary: "Approved steps for a reported phishing message.",
        body: "Full phishing response procedure.",
        eventIds: [],
        relatedArtifactIds: [],
        searchableText: "reported message suspicious link",
        observed: false,
      },
      {
        id: "login-guide",
        systemId: "knowledge_base",
        kind: "kb_document",
        title: "Login alert guide",
        summary: "Review an unfamiliar successful login.",
        body: "Full login alert procedure.",
        eventIds: [],
        relatedArtifactIds: [],
        searchableText: "account history device",
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

const searchTask: ClientTaskView = {
  id: "guide-search-task",
  eventId: "guide-event",
  actionId: "search_knowledge_base",
  systemId: "knowledge_base",
  kind: "match_reference",
  title: "Find the approved guide",
  prompt: "Find the guide that applies.",
  instruction: "Choose one guide.",
  whyItMatters: "Approved guidance keeps the response consistent.",
  relatedArtifactIds: [],
  stepIndex: 0,
  stepCount: 1,
  options: [
    { id: "phishing", label: "Phishing response guide" },
    { id: "login", label: "Login alert guide" },
  ],
  minSelections: 1,
  maxSelections: 1,
};

const taskBearingSearch = {
  id: "search_knowledge_base" as const,
  eventId: "guide-event",
  systemId: "knowledge_base" as const,
  label: "Search guides",
  description: "Find an approved guide.",
  simulatedMinutes: 5,
  taskId: searchTask.id,
};

describe("Guide search", () => {
  it("lets the structured mode find and open guides even without an active task", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    const onOpen = vi.fn().mockResolvedValue(undefined);
    render(
      <SystemToolPanel systemId="knowledge_base" actions={[]} view={guideView()}
        onAction={onAction}
        onWorkplaceInteraction={onOpen}
      />,
    );
    await user.type(
      screen.getByRole("searchbox", { name: "Filter guides locally" }),
      "account history",
    );
    expect(
      screen.getByRole("button", { name: /Login alert guide kb document/ }),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", {
        name: /Phishing response guide kb document/,
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Full login alert procedure."),
    ).not.toBeInTheDocument();
    expect(onAction).not.toHaveBeenCalled();
    await user.click(
      screen.getByRole("button", { name: "Open Login alert guide" }),
    );
    expect(onOpen).toHaveBeenCalledWith({
      type: "open_artifact",
      artifactId: "login-guide",
    });
  });
  it("keeps local search available while a canonical search task exists", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    const view = guideView();
    const { rerender } = render(
      <SystemToolPanel
        actions={[taskBearingSearch]}
        onAction={onAction}
        selectedEventId="guide-event"
        systemId="knowledge_base"
        view={{ ...view, tasks: [searchTask] }}
      />,
    );
    expect(
      screen.queryByText(
        "No actions here yet. Try another tab or read the item on the left.",
      ),
    ).toBeNull();

    const input = screen.getByRole("searchbox", {
      name: "Filter guides locally",
    });
    await user.type(input, "phishing");

    const results = within(screen.getByRole("list"));
    expect(results.getByText("Phishing response guide")).toBeVisible();
    expect(results.queryByText("Login alert guide")).toBeNull();
    expect(onAction).not.toHaveBeenCalled();

    rerender(
      <SystemToolPanel
        actions={[]}
        onAction={onAction}
        selectedEventId="guide-event"
        systemId="knowledge_base"
        view={view}
      />,
    );
    expect(input).toHaveValue("phishing");
  });

  it("shows empty results and only reveals a guide body through canonical open", async () => {
    const user = userEvent.setup();
    const onOpenArtifact = vi.fn().mockResolvedValue(undefined);
    render(
      <SystemToolPanel
        actions={[]}
        onAction={() => undefined}
        onWorkplaceInteraction={(interaction) => {
          if (interaction.type === "open_artifact") {
            onOpenArtifact(interaction.artifactId);
          }
          return Promise.resolve(undefined);
        }}
        systemId="knowledge_base"
        view={guideView()}
      />,
    );

    const input = screen.getByRole("searchbox", {
      name: "Filter guides locally",
    });
    await user.type(input, "does-not-exist");
    expect(screen.getByRole("status")).toHaveTextContent(
      "No guides match “does-not-exist”.",
    );

    await user.click(screen.getByRole("button", { name: "Clear search" }));
    expect(input).toHaveValue("");
    expect(
      within(screen.getByRole("list")).getByText("Phishing response guide"),
    ).toBeVisible();
    expect(screen.queryByText("Full phishing response procedure.")).toBeNull();

    await user.click(
      screen.getByRole("button", { name: "Open Phishing response guide" }),
    );
    expect(onOpenArtifact).toHaveBeenCalledWith("phishing-guide");
    expect(screen.queryByText("Full phishing response procedure.")).toBeNull();
  });

  it("preserves canonical server search when no search task exists", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    const { rerender } = render(
      <SystemToolPanel
        actions={[{ ...taskBearingSearch, taskId: undefined }]}
        onAction={onAction}
        systemId="knowledge_base"
        view={guideView()}
      />,
    );

    const canonicalInput = screen.getByRole("searchbox", {
      name: "Search guides",
    });
    await user.type(canonicalInput, "phishing");
    await user.click(screen.getByRole("button", { name: "Search guides" }));

    expect(onAction).toHaveBeenCalledWith(
      { ...taskBearingSearch, taskId: undefined },
      "phishing",
    );
    rerender(
      <SystemToolPanel
        actions={[{ ...taskBearingSearch, taskId: undefined }]}
        onAction={onAction}
        systemId="knowledge_base"
        view={{ ...guideView(), kbQuery: "phishing" }}
      />,
    );
    expect(
      screen.getByRole("searchbox", { name: "Filter guides locally" }),
    ).toHaveValue("phishing");
    expect(
      screen.queryByRole("button", { name: /Login alert guide kb document/ }),
    ).not.toBeInTheDocument();
    rerender(
      <SystemToolPanel
        actions={[{ ...taskBearingSearch, taskId: undefined }]}
        onAction={onAction}
        systemId="knowledge_base"
        view={{ ...guideView(), kbQuery: "login" }}
      />,
    );
    expect(
      screen.getByRole("searchbox", { name: "Search guides" }),
    ).toHaveValue("login");
    expect(
      screen.getByRole("searchbox", { name: "Filter guides locally" }),
    ).toHaveValue("login");
  });
});
