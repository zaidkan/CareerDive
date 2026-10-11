// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import { applyAction, createInitialWorldState, toClientView } from "@sim/core";
import { MorganDialogue } from "../src/world/dialogue/MorganDialogue.js";
import { TeamChatTool } from "../src/components/tools/TeamChatTool.js";
import { DialogueLine } from "../src/world/dialogue/DialogueLine.js";
const pack = loadDefaultCybersecurityPack();
const question = "What case context do we have?";
function consulted() {
  return toClientView(
    applyAction(createInitialWorldState("ui-recap", 7, {}, pack), {
      id: "ask_manager",
      actorId: "player",
      eventId: "suspicious-login-1",
      freeText: question,
    }).state,
  );
}
afterEach(cleanup);
it("floor Morgan reopens the last exchange; repeat is a labeled local recap without mutation", () => {
  const view = consulted();
  const onAction = vi.fn();
  const onClose = vi.fn();
  const actions = view.availableActions.filter((a) => a.id === "ask_manager");
  const { rerender } = render(
    <MorganDialogue
      view={view}
      actions={actions}
      onAction={onAction}
      onClose={onClose}
      pending={false}
    />,
  );
  expect(screen.getByText(`You asked: ${question}`)).toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent(
    view.teamMessages?.at(-1)?.body ?? "",
  );
  fireEvent.click(screen.getByRole("button", { name: question }));
  expect(onAction).not.toHaveBeenCalled();
  expect(screen.getByText("Recap · no time or energy spent")).toBeVisible();
  const changed = structuredClone(view);
  changed.workplace.inspectedArtifactIds = ["login-session-timeline"];
  rerender(
    <MorganDialogue
      view={changed}
      actions={actions}
      onAction={onAction}
      onClose={onClose}
      pending={false}
    />,
  );
  expect(screen.queryByText("Recap · no time or energy spent")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: question }));
  expect(onAction).toHaveBeenCalledTimes(1);
});
it("Desk OS repeats show a recap instead of dispatching another simulation action", () => {
  const view = consulted();
  const onAction = vi.fn();
  render(
    <TeamChatTool
      view={view}
      actions={view.availableActions.filter(
        (a) => a.id === "ask_manager" && a.eventId === "suspicious-login-1",
      )}
      onAction={onAction}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: question }));
  expect(
    screen.getByRole("status", { name: "Morgan recap" }),
  ).toHaveTextContent("Recap · no time or energy spent");
  expect(onAction).not.toHaveBeenCalled();
});
it("offers authored manager choices without a free-text dialogue entry", () => {
  const view = consulted();
  render(
    <TeamChatTool
      view={view}
      actions={view.availableActions.filter(
        (a) => a.id === "ask_manager" && a.eventId === "suspicious-login-1",
      )}
      onAction={vi.fn()}
    />,
  );
  expect(screen.queryByRole("textbox")).toBeNull();
  expect(screen.queryByText("Ask a specific case question")).toBeNull();
  expect(screen.getByRole("button", { name: question })).toBeVisible();
});

it("closing a floor line uses Back to work, while a real next turn keeps Continue", () => {
  const close = vi.fn();
  const { unmount } = render(
    <DialogueLine
      animate={false}
      advanceLabel="Back to work"
      text="One checked source."
      onAdvance={close}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Back to work" }));
  expect(close).toHaveBeenCalledTimes(1);
  expect(
    screen.queryByRole("button", { name: "Continue conversation" }),
  ).toBeNull();
  unmount();
  render(<DialogueLine animate={false} text="Another turn." />);
  expect(
    screen.getByRole("button", { name: "Continue conversation" }),
  ).toBeVisible();
});
it("reopened Morgan selects the most recent exchanged case", () => {
  const state = createInitialWorldState("ui-case-memory", 7, {}, pack);
  const finance = state.events.find((e) => e.id === "access-request-1");
  if (!finance) throw new Error("Missing finance fixture");
  finance.status = "active";
  const view = toClientView(
    applyAction(state, {
      id: "ask_manager",
      actorId: "player",
      eventId: finance.id,
      freeText: "Who is the approval owner?",
    }).state,
  );
  render(
    <MorganDialogue
      view={view}
      actions={view.availableActions.filter((a) => a.id === "ask_manager")}
      onAction={vi.fn()}
      onClose={vi.fn()}
      pending={false}
    />,
  );
  expect(
    screen.getByRole("combobox", { name: "Case to discuss with Morgan" }),
  ).toHaveValue(finance.id);
  expect(screen.getByRole("status")).toHaveTextContent(
    "deadline isn't an access approval",
  );
});
