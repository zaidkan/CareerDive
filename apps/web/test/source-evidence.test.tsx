// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { useState } from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it } from "vitest";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import {
  applyTaskAttempt,
  applyWorkplaceInteraction,
  createInitialWorldState,
  toClientView,
} from "@sim/core";
import { TaskInteraction } from "../src/components/tools/TaskInteraction.js";

afterEach(cleanup);
function Harness({ comparison = false }: { comparison?: boolean }) {
  const [state, setState] = useState(() => {
    let initial = createInitialWorldState(
      "source-ui",
      42,
      {},
      loadDefaultCybersecurityPack(),
    );
    if (comparison) {
      for (const [taskId, selectedOptionIds] of [
        ["login-alert-compare", ["failures-then-success"]],
        ["login-alert-compare", ["geo-hint"]],
        [
          "login-context-clues",
          ["unknown-windows-device", "new-residential-network"],
        ],
      ] as const)
        initial = applyTaskAttempt(initial, {
          taskId,
          eventId: "suspicious-login-1",
          selectedOptionIds: [...selectedOptionIds],
        }).state;
    }
    return initial;
  });
  const view = toClientView(state);
  const task = view.tasks.find(
    ({ id }) =>
      id === (comparison ? "account-pattern-compare" : "handoff-open-items"),
  );
  if (!task)
    return <p>{comparison ? "Comparison recorded" : "Handoff reviewed"}</p>;
  return (
    <TaskInteraction
      task={task}
      openedArtifacts={view.artifacts.filter(({ observed }) => observed)}
      artifacts={view.artifacts}
      onOpenArtifact={async (artifactId) => {
        setState(
          applyWorkplaceInteraction(state, {
            type: "open_artifact",
            artifactId,
          }).state,
        );
      }}
      onTaskAttempt={async (current, selectedOptionIds) => {
        const result = applyTaskAttempt(state, {
          taskId: current.id,
          eventId: current.eventId,
          selectedOptionIds,
        });
        setState(result.state);
        return result;
      }}
    />
  );
}
it("marks baseline evidence in two records, keeps citations, then submits a cautious conclusion", async () => {
  const user = userEvent.setup();
  render(<Harness comparison />);
  expect(
    screen.getByRole("region", { name: "Compare source records" }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "HQ Wi-Fi" }),
  ).not.toBeInTheDocument();
  await user.click(
    screen.getByRole("button", {
      name: "Open source: Account history · j.patel",
    }),
  );
  await user.click(screen.getByRole("button", { name: "HQ Wi-Fi" }));
  await user.click(screen.getByRole("button", { name: "enrolled MacBook" }));
  const tray = screen.getByRole("region", { name: "Selected findings" });
  expect(within(tray).getAllByText("Account history · j.patel")).toHaveLength(
    2,
  );
  await user.click(screen.getByRole("button", { name: "Submit findings" }));
  expect(
    screen.getByRole("region", { name: "Compare source records" }),
  ).toHaveTextContent("Typical weekday logins");
  await user.click(
    screen.getByLabelText(
      "Both the device and network differ from the usual pattern.",
    ),
  );
  await user.click(screen.getByRole("button", { name: "Check my work" }));
  expect(screen.getByRole("button", { name: "Submit findings" })).toBeDisabled();
  for (const title of ["Earlier session · S-0731", "Office VPN route catalogue", "Sign-in timeline · A-1042"]) {
    await user.click(screen.getByRole("button", { name: `Open source: ${title}` }));
  }
  for (const name of [
    "S-0731 used corp-macbook-patel through VPN connection V-218, exiting at 198.51.100.20.",
    "V-218 maps to exit 198.51.100.20; this office's only approved VPN exit in this snapshot.",
    "S-0741: source 203.0.113.44; VPN connection ID absent; device label unknown-laptop-17.",
  ]) await user.click(screen.getByRole("button", { name }));
  await user.click(screen.getByRole("button", { name: "Submit findings" }));
  expect(screen.getByText("Comparison recorded")).toBeInTheDocument();
});
it("opens a real handoff, marks passages, and completes both work steps", async () => {
  const user = userEvent.setup();
  render(<Harness />);
  expect(
    screen.queryByText("Did not finish device inventory check."),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Submit findings" }),
  ).toBeDisabled();
  await user.click(
    screen.getByRole("button", {
      name: "Open source: Incomplete shift handoff",
    }),
  );
  await user.click(
    screen.getByRole("button", {
      name: "Did not finish device inventory check.",
    }),
  );
  expect(
    screen.getByRole("button", {
      name: "Did not finish device inventory check.",
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await user.click(screen.getByRole("button", { name: "Submit findings" }));
  expect(
    screen.getByRole("button", { name: "Submit findings" }),
  ).toBeDisabled();
  await user.click(
    screen.getByRole("button", {
      name: "A routine scanner alert may appear, but I forgot to include the approved schedule reference.",
    }),
  );
  await user.click(screen.getByRole("button", { name: "Submit findings" }));
  expect(screen.getByText("Handoff reviewed")).toBeInTheDocument();
});
