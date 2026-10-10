// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import {
  applyWorkplaceInteraction,
  createInitialWorldState,
  toClientView,
} from "@sim/core";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import { CaseCommunication } from "../src/world/deskOs/CaseCommunication.js";
afterEach(() => {
  cleanup();
  sessionStorage.clear();
});
it("keeps a selected status claim, explains its missing source, and enables sending after opening it", async () => {
  const user = userEvent.setup();
  let state = createInitialWorldState(
    "status-ui",
    7,
    {},
    loadDefaultCybersecurityPack(),
  );
  const status = state.events.find((e) => e.id === "status-check-1");
  if (!status) throw new Error("Missing status fixture");
  status.status = "active";
  state.simClock = 65;
  const onAction = vi.fn();
  const draw = () => (
    <CaseCommunication
      view={toClientView(state)}
      eventId="status-check-1"
      systemId="team_chat"
      pending={false}
      onAction={onAction}
      onOpenSystem={vi.fn()}
      onWorkplaceInteraction={async (interaction) => {
        state = applyWorkplaceInteraction(state, interaction).state;
        mounted.rerender(draw());
        return {
          view: toClientView(state),
          sequence: 1,
          feedback: "artifact_opened",
        };
      }}
    />
  );
  const mounted = render(draw());
  const send = screen.getByRole("button", {
    name: "Send status to your manager",
  });
  expect(send).toBeEnabled(); // An empty/thin message remains permissible.
  const claim = screen.getByRole("radio", {
    name: /A-1042 records six failed checks/,
  });
  await user.click(claim);
  expect(send).toBeDisabled();
  expect(screen.getByRole("status")).toHaveTextContent(
    /Open.*Unfamiliar successful login.*before sending/,
  );
  expect(onAction).not.toHaveBeenCalled();
  await user.click(
    screen.getByRole("button", { name: "Open Unfamiliar successful login" }),
  );
  expect(claim).toBeChecked();
  expect(send).toBeEnabled();
  await user.click(send);
  await user.click(screen.getByRole("button", { name: /^Confirm/ }));
  expect(onAction).toHaveBeenCalledWith(
    expect.objectContaining({
      ticketPayload: {
        ticketId: "ticket-status-check-1",
        statusOptionIds: ["confirmed-sequence"],
      },
    }),
  );
});

it("preserves handled status guidance while hiding unexpected transport failures", async () => {
  const { TRPCClientError } = await import("@trpc/client");
  const { actionFailureMessage } = await import("../src/client.js");
  const validation = TRPCClientError.from({
    error: {
      code: -32600,
      message:
        "Open Unfamiliar successful login before sending this status claim.",
      data: { code: "BAD_REQUEST", httpStatus: 400 },
    },
  });
  expect(actionFailureMessage(validation, "send_status_update")).toBe(
    validation.message,
  );
  const unexpected = TRPCClientError.from({
    error: {
      code: -32603,
      message: "internal details",
      data: { code: "INTERNAL_SERVER_ERROR", httpStatus: 500 },
    },
  });
  expect(actionFailureMessage(unexpected, "send_status_update")).toBe(
    "That action could not be completed.",
  );
  expect(actionFailureMessage(validation, "document_ticket")).toBe(
    "That action could not be completed.",
  );
});
