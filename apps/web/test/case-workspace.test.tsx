// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import {
  applyAction,
  applyWorkplaceInteraction,
  createInitialWorldState,
  toClientView,
} from "@sim/core";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import type { AvailableAction, WorkSystemId } from "@sim/schemas";
import { CaseWorkspace } from "../src/world/deskOs/CaseWorkspace.js";
import { EMPTY_MUTATION_STATE } from "../src/useMutationCoordinator.js";
afterEach(() => {
  cleanup();
  sessionStorage.clear();
});
it("builds an uncited weak claim, carries it across tools, and dispatches one operation without a checkbox exam", async () => {
  const user = userEvent.setup();
  let state = createInitialWorldState(
    "case-ui",
    7,
    {},
    loadDefaultCybersecurityPack(),
  );
  let systemId: WorkSystemId = "alert_dashboard";
  const sent = vi.fn<(action: AvailableAction) => void>();
  const draw = () => (
    <CaseWorkspace
      view={toClientView(state)}
      eventId="suspicious-login-1"
      systemId={systemId}
      mutationState={EMPTY_MUTATION_STATE}
      onOpenSystem={(next) => {
        systemId = next;
        mounted.rerender(draw());
      }}
      onWorkplaceInteraction={async (interaction) => {
        state = applyWorkplaceInteraction(state, interaction).state;
        mounted.rerender(draw());
        return {
          view: toClientView(state),
          sequence: 1,
          feedback: "artifact_opened",
        };
      }}
      onAction={(available: AvailableAction) => {
        sent(available);
        state = applyAction(state, { ...available, actorId: "user" }).state;
        mounted.rerender(draw());
      }}
    />
  );
  const mounted = render(draw());
  const board = screen.getByRole("banner", { name: "Case argument" });
  expect(board).toHaveTextContent("No finding saved");
  await user.selectOptions(screen.getByLabelText("Open question"), "route");
  await user.click(
    screen.getByRole("radio", {
      name: "The shared city explains both sessions as the same approved route.",
    }),
  );
  await user.click(screen.getByRole("button", { name: "Save finding" }));
  expect(board).toHaveTextContent("Last saved claim: The shared city");
  expect(
    state.structuredTickets["ticket-suspicious-login-1"]?.reasoning
      ?.caseFindings?.[0]?.rowIds,
  ).toEqual([]);
  await user.click(
    screen.getByRole("button", { name: "Build judgment from saved findings" }),
  );
  expect(screen.queryByText("Evidence reviewed")).toBeNull();
  expect(
    within(screen.getByRole("region", { name: "Case memo" })).getByText(
      "The shared city explains both sessions as the same approved route.",
    ),
  ).toBeVisible();
  await user.click(
    screen.getByRole("radio", { name: /Escalate.*comparisons/i }),
  );
  await user.click(screen.getByRole("button", { name: "Dispatch case memo" }));
  await user.click(screen.getByRole("button", { name: /Confirm/ }));
  expect(
    sent.mock.calls.filter(([a]) => a.id === "document_ticket"),
  ).toHaveLength(1);
  expect(sent.mock.calls.some(([a]) => a.id === "escalate_alert")).toBe(false);
  expect(
    screen.getByRole("region", { name: "Case response receipt" }),
  ).toHaveTextContent("senior reviewer");
  expect(
    screen.getByRole("region", { name: "Case response receipt" }),
  ).toHaveTextContent("None");
  expect(
    screen.getByRole("region", { name: "Case response receipt" }),
  ).toHaveTextContent("does not certify");
});
