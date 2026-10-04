// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it } from "vitest";
import { MutationStatus } from "../src/components/MutationStatus.js";
import { EMPTY_MUTATION_STATE, type MutationState } from "../src/useMutationCoordinator.js";

afterEach(cleanup);
it("keeps compact saved feedback without stealing dialogue focus, but focuses errors", async () => {
  const user = userEvent.setup();
  const saved = {
    ...EMPTY_MUTATION_STATE,
    requestSequence: 1,
    success: "Task complete. Record saved without revealing an answer.",
  };
  const ui = (state: MutationState) => (
    <>
      <input aria-label="Case question" autoFocus />
      <MutationStatus compact focusSuccess={false} state={state} />
    </>
  );
  const { rerender } = render(ui(saved));
  expect(screen.getByLabelText("Case question")).toHaveFocus();
  expect(screen.getByText("Case update saved.")).toBeVisible();
  expect(screen.getByText("Record saved.")).not.toBeVisible();
  await user.click(screen.getByText("Update details"));
  expect(screen.getByText("Record saved.")).toBeVisible();
  rerender(
    ui({
      ...EMPTY_MUTATION_STATE,
      error: "Could not save this change.",
      requestSequence: 2,
    }),
  );
  expect(screen.getByRole("alert")).toHaveFocus();
});
