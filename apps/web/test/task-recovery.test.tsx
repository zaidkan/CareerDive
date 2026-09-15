// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import type { ClientTaskView } from "@sim/schemas";
import { WorkTaskPanel } from "../src/components/WorkTaskPanel.js";
import { taskMutationKey } from "../src/useMutationCoordinator.js";

afterEach(cleanup);
const task: ClientTaskView = {
  id: "shared-task",
  eventId: "case-a",
  actionId: "review_alert",
  systemId: "alert_dashboard",
  kind: "match_reference",
  title: "Check the reference",
  prompt: "Compare the visible information.",
  instruction: "Choose one finding.",
  whyItMatters: "Keep a record of your check.",
  stepIndex: 0,
  stepCount: 2,
  minSelections: 1,
  maxSelections: 1,
  relatedArtifactIds: [],
  options: [{ id: "finding", label: "Record the visible finding" }],
};

it("scopes request identity to the event as well as task and step", () => {
  expect(taskMutationKey(task)).not.toBe(
    taskMutationKey({ ...task, eventId: "case-b" }),
  );
});

it("clears selections when the same task is shown for another event", async () => {
  const user = userEvent.setup();
  const onTaskAttempt = vi.fn();
  const { rerender } = render(
    <WorkTaskPanel task={task} onTaskAttempt={onTaskAttempt} />,
  );
  await user.click(screen.getByRole("radio"));
  rerender(
    <WorkTaskPanel
      task={{ ...task, eventId: "case-b" }}
      onTaskAttempt={onTaskAttempt}
    />,
  );
  expect(screen.getByRole("radio")).not.toBeChecked();
  expect(screen.getByRole("button", { name: "Check my work" })).toBeDisabled();
});

it("does not carry a pending request or late feedback into another event", async () => {
  const user = userEvent.setup();
  let resolve!: (result: {
    accepted: boolean;
    completed: boolean;
    feedback: string;
  }) => void;
  const pending = new Promise<{
    accepted: boolean;
    completed: boolean;
    feedback: string;
  }>((done) => {
    resolve = done;
  });
  const onTaskAttempt = vi.fn().mockReturnValue(pending);
  const { rerender } = render(
    <WorkTaskPanel task={task} onTaskAttempt={onTaskAttempt} />,
  );
  await user.click(screen.getByRole("radio"));
  await user.click(screen.getByRole("button", { name: "Check my work" }));
  rerender(
    <WorkTaskPanel
      task={{ ...task, eventId: "case-b" }}
      onTaskAttempt={onTaskAttempt}
    />,
  );
  expect(screen.getByRole("radio")).toBeEnabled();
  await act(async () => {
    resolve({ accepted: true, completed: false, feedback: "Case A saved" });
    await pending;
  });
  expect(screen.queryByText("Case A saved")).toBeNull();
});

it("uses structured controls for a task without a specialized tool and retries unchanged findings", async () => {
  const user = userEvent.setup();
  const onTaskAttempt = vi
    .fn()
    .mockRejectedValueOnce(new Error("network unavailable"))
    .mockResolvedValueOnce({
      accepted: true,
      completed: true,
      feedback: "Reference recorded",
    });
  render(<WorkTaskPanel task={task} onTaskAttempt={onTaskAttempt} />);
  await user.click(screen.getByRole("radio"));
  await user.click(screen.getByRole("button", { name: "Check my work" }));
  expect(
    await screen.findByText("Could not submit findings. Try again."),
  ).toHaveFocus();
  expect(screen.getByRole("radio")).toBeChecked();
  await user.click(screen.getByRole("button", { name: "Check my work" }));
  expect(await screen.findByText("Reference recorded")).toHaveFocus();
  expect(onTaskAttempt.mock.calls).toEqual([
    [task, ["finding"]],
    [task, ["finding"]],
  ]);
});
