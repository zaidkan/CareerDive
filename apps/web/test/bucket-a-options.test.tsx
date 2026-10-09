// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import { applyAction, createInitialWorldState, toClientView } from "@sim/core";
import type { AvailableAction } from "@sim/schemas";
import { InitialHandoff } from "../src/components/tools/InitialHandoff.js";
import { TicketComposer } from "../src/components/tools/TicketComposer.js";
afterEach(() => {
  cleanup();
  sessionStorage.clear();
});
function fresh() {
  return createInitialWorldState(
    "options-failsafe",
    7,
    {},
    loadDefaultCybersecurityPack(),
  );
}
it("initial handoff has native options, clear, cancellable confirmation, and no assessed textbox", async () => {
  const user = userEvent.setup();
  const view = toClientView(
    applyAction(fresh(), {
      id: "read_handoff",
      eventId: "handoff-1",
      actorId: "user",
    }).state,
  );
  const action = view.availableActions.find(
    (a) => a.id === "acknowledge_handoff",
  );
  if (!action) throw new Error("Missing acknowledgement");
  const onAction = vi.fn<(action: AvailableAction, text?: string) => void>();
  render(
    <InitialHandoff
      view={view}
      action={action}
      onAction={onAction}
      pending={false}
    />,
  );
  expect(screen.queryByRole("textbox")).toBeNull();
  const owner = screen.getByRole("checkbox", {
    name: /session owner is still unconfirmed/,
  });
  await user.click(owner);
  await user.click(screen.getByRole("button", { name: "Clear selections" }));
  expect(owner).not.toBeChecked();
  await user.click(owner);
  await user.click(screen.getByRole("button", { name: "Confirm the handoff" }));
  expect(onAction).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Cancel" }));
  expect(owner).toBeChecked();
  expect(onAction).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Confirm the handoff" }));
  await user.click(screen.getByRole("button", { name: "Confirm and send" }));
  expect(onAction).toHaveBeenCalledExactlyOnceWith(
    action,
    "A-1042's session owner is still unconfirmed.",
  );
});
it("editing invalidates the reviewed ticket; clear and pending states cannot silently commit", async () => {
  const user = userEvent.setup();
  const view = toClientView(fresh());
  const action = view.availableActions.find(
    (a) => a.id === "update_ticket_notes",
  );
  if (!action) throw new Error("Missing draft");
  const onAction = vi.fn<(action: AvailableAction, text?: string) => void>();
  const props = { view, action, onAction, mutationState: {} };
  const { rerender } = render(<TicketComposer {...props} />);
  await user.click(screen.getByRole("button", { name: "Save draft" }));
  expect(
    screen.getByRole("group", { name: "Review before confirming" }),
  ).toHaveFocus();
  const choices = screen
    .getAllByRole("checkbox")
    .filter((c) => !(c as HTMLInputElement).disabled);
  await user.click(choices[0] as HTMLElement);
  expect(
    screen.queryByRole("group", { name: "Review before confirming" }),
  ).toBeNull();
  expect(onAction).not.toHaveBeenCalled();
  await user.click(
    screen.getByRole("button", { name: "Clear all selections" }),
  );
  expect(
    screen
      .getAllByRole("checkbox")
      .every((c) => !(c as HTMLInputElement).checked),
  ).toBe(true);
  await user.click(screen.getByRole("button", { name: "Save draft" }));
  await user.click(
    within(
      screen.getByRole("group", { name: "Review before confirming" }),
    ).getByRole("button", { name: "Confirm Save draft" }),
  );
  expect(onAction).toHaveBeenCalledOnce();
  expect(onAction.mock.calls[0]?.[0]).toMatchObject({
    ticketPayload: { reasoning: { evidence: [] } },
  });
  rerender(
    <TicketComposer {...props} mutationState={{ pendingKey: "saving" }} />,
  );
  expect(
    screen
      .getAllByRole("checkbox")
      .every((c) => (c as HTMLInputElement).disabled),
  ).toBe(true);
});

import { useState } from "react";
import { OptionGroup } from "../src/components/tools/OptionGroup.js";
import { applyWorkplaceInteraction } from "@sim/core";
it("opening an option source exposes its real inspected body beside the selections", async () => {
  const user = userEvent.setup();
  function Harness() {
    const [state, setState] = useState(fresh());
    const view = toClientView(state);
    const [selected, setSelected] = useState<string[]>([]);
    return (
      <OptionGroup
        prompt="Check the record"
        options={[
          {
            id: "timeline",
            label: "Session timeline",
            sourceArtifactIds: ["login-session-timeline"],
          },
        ]}
        artifacts={view.artifacts}
        selected={selected}
        onChange={setSelected}
        pending={false}
        onOpenArtifact={async (id) => {
          setState(
            applyWorkplaceInteraction(state, {
              type: "open_artifact",
              artifactId: id,
            }).state,
          );
        }}
      />
    );
  }
  render(<Harness />);
  expect(screen.queryByText(/S-0741.*unknown-laptop-17/)).toBeNull();
  await user.click(
    screen.getByRole("button", { name: "Open source: login-session-timeline" }),
  );
  expect(
    document.querySelector(".option-source-reader .artifact-body")?.textContent,
  ).toMatch(/S-0741/);
  expect(
    document.querySelector(".option-source-reader .artifact-body")?.textContent,
  ).toMatch(/unknown-laptop-17/);
  expect(screen.getByRole("checkbox")).not.toBeChecked();
});
