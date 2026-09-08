// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { useState } from "react";
import { cleanup, render, screen } from "@testing-library/react";
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
function Harness() {
  const [state, setState] = useState(() =>
    createInitialWorldState(
      "source-ui",
      42,
      {},
      loadDefaultCybersecurityPack(),
    ),
  );
  const view = toClientView(state);
  const task = view.tasks.find(({ id }) => id === "handoff-open-items");
  if (!task) return <p>Handoff reviewed</p>;
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
