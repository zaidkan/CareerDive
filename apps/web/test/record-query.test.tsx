// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type {
  AvailableAction,
  ClientView,
  QueryResultView,
} from "@sim/schemas";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SystemToolPanel } from "../src/components/SystemToolPanel.js";
import { RecordQueryTool } from "../src/components/tools/RecordQueryTool.js";

afterEach(() => {
  cleanup();
  sessionStorage.clear();
});

const queryAction: AvailableAction = {
  id: "query_records",
  eventId: "alert-1",
  systemId: "alert_dashboard",
  label: "Search records",
  description: "Search structured records.",
  simulatedMinutes: 2,
};

function baseView(): ClientView {
  return {
    sessionId: "session-1",
    sessionKind: "assessed",
    simClock: 12,
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
    artifacts: [],
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

function authResult(): QueryResultView {
  return {
    queryId: "session-1-q1",
    datasetId: "auth",
    records: [
      {
        id: "AUTH-0741",
        datasetId: "auth",
        simMinutes: 461,
        relatedRecordIds: ["D-unknown-laptop-17"],
        user: "j.patel@example.com",
        sourceIp: "203.0.113.44",
        deviceLabel: "unknown-laptop-17",
        method: "password",
        result: "success",
        sessionId: "S-0741",
        note: "Extra check result not present in export.",
      },
    ],
    resultIds: ["AUTH-0741"],
    totalCount: 1,
    truncated: false,
    simMinutes: 12,
  };
}

function zeroVpnResult(): QueryResultView {
  return {
    queryId: "session-1-q2",
    datasetId: "vpn",
    records: [],
    resultIds: [],
    totalCount: 0,
    truncated: false,
    simMinutes: 14,
  };
}

describe("RecordQueryTool", () => {
  it("swaps visible filters when the dataset changes", async () => {
    const user = userEvent.setup();
    render(
      <RecordQueryTool
        view={baseView()}
        queryAction={queryAction}
        onQueryRecords={() => undefined}
      />,
    );

    expect(screen.getByLabelText("Session ID")).not.toBeVisible();
    await user.click(screen.getByText("More filters"));
    expect(screen.getByLabelText("Session ID")).toBeVisible();
    expect(screen.queryByLabelText("Assigned user")).toBeNull();

    await user.selectOptions(screen.getByLabelText("Record type"), "devices");
    expect(screen.getByLabelText("Assigned user")).toBeVisible();
    expect(screen.getByLabelText("Device")).toBeVisible();
    expect(screen.queryByLabelText("Session ID")).toBeNull();

    expect(
      screen.queryByRole("option", { name: "Phishing reports" }),
    ).toBeNull();
  });

  it("submits structured filters and a time window as a query payload", async () => {
    const user = userEvent.setup();
    const onQueryRecords = vi.fn();
    render(
      <RecordQueryTool
        view={baseView()}
        queryAction={queryAction}
        onQueryRecords={onQueryRecords}
      />,
    );

    await user.type(screen.getByLabelText("User"), "j.patel@example.com");
    await user.click(screen.getByText(/^More filters/));
    await user.type(screen.getByLabelText("Session ID"), "S-0741");
    await user.type(screen.getByLabelText("Time from (HH:MM)"), "07:21");
    await user.type(screen.getByLabelText("Time to (HH:MM)"), "07:45");
    await user.click(screen.getByRole("button", { name: "Search records" }));

    expect(onQueryRecords).toHaveBeenCalledTimes(1);
    expect(onQueryRecords).toHaveBeenCalledWith(queryAction, {
      datasetId: "auth",
      filters: {
        user: "j.patel@example.com",
        sessionId: "S-0741",
        windowStartSimMinutes: 441,
        windowEndSimMinutes: 465,
      },
    });
  });

  it("resolves the query action from available actions when not passed directly", async () => {
    const user = userEvent.setup();
    const onQueryRecords = vi.fn();
    const view = baseView();
    view.availableActions = [queryAction];
    render(<RecordQueryTool view={view} onQueryRecords={onQueryRecords} />);

    await user.click(screen.getByText(/^More filters/));
    await user.type(screen.getByLabelText("Source IP"), "203.0.113.44");
    await user.click(screen.getByRole("button", { name: "Search records" }));

    expect(onQueryRecords).toHaveBeenCalledWith(queryAction, {
      datasetId: "auth",
      filters: { sourceIp: "203.0.113.44" },
    });
  });

  it("blocks submission with neutral validation text for a bad time window", async () => {
    const user = userEvent.setup();
    const onQueryRecords = vi.fn();
    render(
      <RecordQueryTool
        view={baseView()}
        queryAction={queryAction}
        onQueryRecords={onQueryRecords}
      />,
    );

    await user.click(screen.getByText(/^More filters/));
    await user.type(screen.getByLabelText("Time from (HH:MM)"), "07:45");
    await user.type(screen.getByLabelText("Time to (HH:MM)"), "07:21");
    await user.click(screen.getByRole("button", { name: "Search records" }));

    expect(onQueryRecords).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Time window start must be at or before the window end.",
    );

    await user.clear(screen.getByLabelText("Time to (HH:MM)"));
    await user.type(screen.getByLabelText("Time to (HH:MM)"), "later");
    await user.click(screen.getByRole("button", { name: "Search records" }));
    expect(onQueryRecords).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Enter office-local times as HH:MM.",
    );

    await user.clear(screen.getByLabelText("Time from (HH:MM)"));
    await user.clear(screen.getByLabelText("Time to (HH:MM)"));
    await user.click(screen.getByRole("button", { name: "Search records" }));
    expect(onQueryRecords).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("renders returned records with technical fields and hides relationship internals", () => {
    const view = baseView();
    view.queryResults = [authResult()];
    render(
      <RecordQueryTool
        view={view}
        queryAction={queryAction}
        onQueryRecords={() => undefined}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Authentication records — 1 match" }),
    ).toBeVisible();
    const record = screen.getByRole("article", { name: "Record AUTH-0741" });
    expect(within(record).getByText("j.patel@example.com")).toBeVisible();
    expect(within(record).getByText("203.0.113.44")).toBeVisible();
    expect(
      within(record).getByText("Extra check result not present in export."),
    ).toBeVisible();
    expect(screen.queryByText("D-unknown-laptop-17")).toBeNull();
    expect(screen.queryByText("relatedRecordIds")).toBeNull();
    expect(
      screen.queryByText(/correct|incorrect|clue|answer|score|templateId/i),
    ).toBeNull();
  });

  it("reveals technical fields only after canonical record inspection", async () => {
    const user = userEvent.setup();
    const onInspectRecord = vi.fn().mockResolvedValue(undefined);
    const view = { ...baseView(), queryResults: [authResult()] };
    const props = { queryAction, onQueryRecords: vi.fn(), onInspectRecord };
    const { rerender } = render(<RecordQueryTool view={view} {...props} />);
    expect(
      screen.queryByText("Extra check result not present in export."),
    ).toBeNull();
    await user.click(screen.getByRole("button", { name: /Inspect AUTH-0741/ }));
    expect(onInspectRecord).toHaveBeenCalledWith({
      type: "inspect_query_record",
      queryId: "session-1-q1",
      recordId: "AUTH-0741",
    });
    expect(
      screen.queryByText("Extra check result not present in export."),
    ).toBeNull();
    rerender(
      <RecordQueryTool
        view={{
          ...view,
          workplace: { ...view.workplace, inspectedRecordIds: ["AUTH-0741"] },
        }}
        {...props}
      />,
    );
    expect(
      screen.getByText("Extra check result not present in export."),
    ).toBeVisible();
  });

  it("presents zero results as a legitimate outcome, not an error", () => {
    const view = baseView();
    view.queryResults = [zeroVpnResult()];
    render(
      <RecordQueryTool
        view={view}
        queryAction={queryAction}
        onQueryRecords={() => undefined}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "VPN sessions — 0 matches" }),
    ).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent(
      "No matching records for these filters.",
    );
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows a capped-result state that invites narrower filters", () => {
    const view = baseView();
    const capped = authResult();
    capped.truncated = true;
    capped.totalCount = 134;
    view.queryResults = [capped];
    render(
      <RecordQueryTool
        view={view}
        queryAction={queryAction}
        onQueryRecords={() => undefined}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Showing the first 1 of 134. Narrow the filters to see more.",
    );
    expect(
      screen.getByRole("article", { name: "Record AUTH-0741" }),
    ).toBeVisible();
  });

  it("supports repeated queries without losing prior results or form state", async () => {
    const user = userEvent.setup();
    const onQueryRecords = vi.fn();
    const { rerender } = render(
      <RecordQueryTool
        view={baseView()}
        queryAction={queryAction}
        onQueryRecords={onQueryRecords}
      />,
    );

    await user.click(screen.getByText(/^More filters/));
    await user.type(screen.getByLabelText("Session ID"), "S-0741");
    await user.click(screen.getByRole("button", { name: "Search records" }));
    await user.click(screen.getByRole("button", { name: "Search records" }));

    expect(onQueryRecords).toHaveBeenCalledTimes(2);
    expect(onQueryRecords.mock.calls[0]?.[1]).toEqual(
      onQueryRecords.mock.calls[1]?.[1],
    );

    const first = authResult();
    const second = zeroVpnResult();
    rerender(
      <RecordQueryTool
        view={{ ...baseView(), queryResults: [first, second] }}
        queryAction={queryAction}
        onQueryRecords={onQueryRecords}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Authentication records — 1 match" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "VPN sessions — 0 matches" }),
    ).toBeVisible();
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(screen.getByRole("status")).toHaveTextContent(
      "No matching records for these filters.",
    );
    expect(screen.getByLabelText("Session ID")).toHaveValue("S-0741");
  });

  it("disables submission neutrally when record search is not offered", () => {
    const view = baseView();
    view.queryResults = [authResult()];
    render(<RecordQueryTool view={view} />);

    expect(
      screen.getByRole("button", { name: "Search records" }),
    ).toBeDisabled();
    expect(
      screen.getByText(
        "Record search is not offered for the current work item.",
      ),
    ).toBeVisible();
    expect(
      screen.getByRole("article", { name: "Record AUTH-0741" }),
    ).toBeVisible();
  });

  it("mounts in the desk Alerts panel only when record search is offered", () => {
    const { rerender } = render(
      <SystemToolPanel
        actions={[]}
        onAction={() => undefined}
        systemId="alert_dashboard"
        view={baseView()}
      />,
    );
    expect(screen.queryByRole("heading", { name: "Record search" })).toBeNull();
    rerender(
      <SystemToolPanel
        actions={[queryAction]}
        selectedEventId={queryAction.eventId}
        onAction={() => undefined}
        systemId="alert_dashboard"
        view={{ ...baseView(), availableActions: [queryAction] }}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Record search" }),
    ).toBeVisible();
  });
});
