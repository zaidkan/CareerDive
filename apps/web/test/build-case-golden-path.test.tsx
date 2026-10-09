// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { useState } from "react";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it } from "vitest";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import {
  createInitialWorldState,
  findingQuestions,
  foldActionLog,
  toClientView,
} from "@sim/core";
import type {
  AvailableAction,
  Debrief,
  WorkSystemId,
  WorkplaceInteraction,
} from "@sim/schemas";
import { createAppRouter, InMemoryRepository } from "../../server/src/index.js";
import { workspaceObjective } from "../src/world/deskOs/workspaceObjective.js";
import { OpsConsole } from "../src/world/deskOs/OpsConsole.js";
import { OsSessionProvider } from "../src/world/deskOs/osSession.js";
import { DebriefView } from "../src/components/DebriefView.js";
import {
  actionMutationKey,
  useMutationCoordinator,
  workplaceMutationKey,
} from "../src/useMutationCoordinator.js";
afterEach(() => {
  cleanup();
  sessionStorage.clear();
});

it("constructs sources/findings through real controls and router, survives failed saves, receives results and reaches honest debrief", async () => {
  const user = userEvent.setup();
  const initial = createInitialWorldState(
    "new-golden",
    24,
    {},
    loadDefaultCybersecurityPack(),
  );
  const repository = new InMemoryRepository();
  await repository.createSession("user-1", initial);
  const caller = createAppRouter(repository).createCaller({ userId: "user-1" });
  let current = toClientView(initial);
  let coordinator: ReturnType<typeof useMutationCoordinator>;
  let failed = false;
  let failureSnapshot = "";
  function Harness() {
    const [view, setView] = useState(current);
    const [debrief, setDebrief] = useState<Debrief>();
    coordinator = useMutationCoordinator((next) => {
      current = next;
      setView(next);
    });
    const onAction = (action: AvailableAction) => {
      void coordinator
        .runMutation(actionMutationKey(action), async () => {
          if (!failed && action.id === "update_ticket_notes") {
            failed = true;
            failureSnapshot = JSON.stringify(
              (await repository.getSession("user-1", "new-golden")).state,
            );
            throw new Error("Offline during finding save");
          }
          const result = await caller.simulation.performAction({
            sessionId: "new-golden",
            actionId: action.id,
            eventId: action.eventId,
            ...(action.ticketPayload
              ? { ticketPayload: action.ticketPayload }
              : {}),
            ...(action.decisionOptionId
              ? { decisionOptionId: action.decisionOptionId }
              : {}),
            ...(action.handoffPayload
              ? { handoffPayload: action.handoffPayload }
              : {}),
          });
          if (action.id === "complete_shift")
            setDebrief(await caller.debrief.get({ sessionId: "new-golden" }));
          return { result: undefined, view: result.view };
        })
        .catch(() => undefined);
    };
    const inspect = (interaction: WorkplaceInteraction) =>
      coordinator.runMutation(workplaceMutationKey(interaction), async () => {
        const result = await caller.simulation.performWorkplaceInteraction({
          sessionId: "new-golden",
          interaction,
        });
        return { result, view: result.view };
      });
    return debrief ? (
      <DebriefView debrief={debrief} />
    ) : (
      <OsSessionProvider>
        <OpsConsole
          view={view}
          onAction={onAction}
          onWorkplaceInteraction={inspect}
          mutationState={coordinator.mutationState}
          onRetryMutation={() => {
            void coordinator.retryMutation().catch(() => undefined);
          }}
        />
      </OsSessionProvider>
    );
  }
  render(<Harness />);
  async function settle() {
    await waitFor(() => {
      expect(coordinator.mutationState.pendingKey).toBeUndefined();
    });
  }
  async function click(name: string | RegExp) {
    await user.click(screen.getByRole("button", { name }));
    await settle();
  }
  async function confirm(name: string) {
    await click(name);
    await click(new RegExp(`^Confirm ${name}$`));
  }
  const toolNames: Record<WorkSystemId, string> = {
    alert_dashboard: "Alerts",
    email: "Email",
    ticket_queue: "Tickets",
    knowledge_base: "Guides",
    team_chat: "Team chat",
  };
  async function tool(id: WorkSystemId) {
    await click(toolNames[id]);
  }
  async function selectCase(id: string) {
    await user.selectOptions(screen.getByLabelText("Current case"), id);
  }
  await click("Read incoming assignment");
  await user.click(
    screen.getByRole("radio", { name: "Unfamiliar successful login" }),
  );
  await confirm("Take ownership and tell Morgan");
  await click("Open the case I own");
  async function construct(eventId: string) {
    for (const question of findingQuestions(eventId)) {
      await user.selectOptions(
        screen.getByLabelText("Open question"),
        question.id,
      );
      const form = screen.getByRole("form", {
        name: `Construct finding: ${question.title}`,
      });
      for (const sourceId of new Set(
        question.rows.map((row) => row.sourceId),
      )) {
        const title = current.artifacts.find((a) => a.id === sourceId)?.title;
        await user.click(
          within(form).getByRole("button", {
            name: `Open ${title ?? sourceId}`,
          }),
        );
        await settle();
      }
      for (const group of question.rowGroups) {
        if (group.multiple)
          for (const rowId of group.rowIds) {
            const row = question.rows.find((r) => r.id === rowId);
            if (row)
              await user.click(
                within(form).getByRole("checkbox", { name: row.excerpt }),
              );
          }
        else
          await user.selectOptions(
            within(form).getByRole("combobox", { name: group.label }),
            group.rowIds[0] ?? "",
          );
      }
      // Deliberately overclaim coverage to verify honest review after real dispatch.
      const claim = question.claims.find(
        (c) =>
          c.id ===
          (question.id === "coverage"
            ? "coverage-no-access"
            : question.claims[0]?.id),
      );
      if (!claim) throw new Error("Missing claim");
      await user.click(within(form).getByRole("radio", { name: claim.label }));
      await user.click(
        within(form).getByRole("button", { name: "Save finding" }),
      );
      await settle();
      if (coordinator.mutationState.error) {
        expect(
          JSON.stringify(
            (await repository.getSession("user-1", "new-golden")).state,
          ),
        ).toBe(failureSnapshot);
        expect(
          within(form).getByRole("radio", { name: claim.label }),
        ).toBeChecked();
        await click("Retry");
      }
      expect(
        current.structuredTickets?.[
          `ticket-${eventId}`
        ]?.reasoning?.caseFindings?.some((f) => f.questionId === question.id),
      ).toBe(true);
    }
  }
  await construct("suspicious-login-1");
  await tool("ticket_queue");
  expect(screen.queryByText("Evidence reviewed")).toBeNull();
  await user.click(
    screen.getByRole("checkbox", {
      name: /Ask the reviewer for the missing session activity/,
    }),
  );
  await user.click(
    screen.getByRole("radio", { name: /Escalate.*comparisons/i }),
  );
  await confirm("Dispatch case memo");
  expect(
    screen.getByRole("region", { name: "Case response receipt" }),
  ).toHaveTextContent("senior review pending");
  await selectCase("routine-alert-1");
  await tool("alert_dashboard");
  await construct("routine-alert-1");
  await tool("ticket_queue");
  await user.click(
    screen.getByRole("checkbox", { name: /Close A-1180 with the matched run/ }),
  );
  await user.click(screen.getByRole("radio", { name: /Close.*monitoring/i }));
  await confirm("Dispatch case memo");
  expect(
    screen.getByRole("region", { name: "Case response receipt" }),
  ).toHaveTextContent("A-1214");
  await selectCase("access-request-1");
  await tool("email");
  await construct("access-request-1");
  await tool("ticket_queue");
  await user.click(screen.getByRole("radio", { name: /Route.*data owner/i }));
  await user.click(
    screen.getByRole("checkbox", { name: /Include an interim report request/ }),
  );
  await confirm("Send routing request");
  expect(
    current.structuredTickets?.["ticket-access-request-1"]?.disposition,
  ).toBe("route-with-interim");
  expect(
    screen.getByRole("region", { name: "Case response receipt" }),
  ).toHaveTextContent("finance data owner");
  await selectCase("login-help-1");
  await tool("alert_dashboard");
  await construct("login-help-1");
  await tool("ticket_queue");
  await user.click(
    screen.getByRole("radio", {
      name: /Ask Rivera to update the saved password in the phone app/,
    }),
  );
  await user.click(
    screen.getByRole("checkbox", { name: /Reopen review if retries continue/ }),
  );
  await confirm("Request check and receive result");
  expect(workspaceObjective(current, "login-help-1").objective).toBe(
    "What did the requested device check establish?",
  );
  await click("Read the actual result receipt");
  await user.click(
    screen.getByRole("radio", { name: /Carry the receipt's actual result/ }),
  );
  await user.click(
    screen.getByRole("checkbox", { name: /Reopen on continued retries/ }),
  );
  await click("Save result interpretation");
  expect(
    screen.getByRole("region", { name: "Interpret Rivera's result" }),
  ).toHaveTextContent("Result interpretation saved");
  await selectCase("status-check-1");
  await tool("team_chat");
  const facts = screen.getByRole("group", { name: "State what is confirmed" });
  await user.click(
    within(facts).getByRole("button", {
      name: "Open Unfamiliar successful login",
    }),
  );
  await settle();
  for (const text of [
    /A-1042 records six failed checks/,
    /The records do not establish who controlled S-0741/,
    /Senior review of the escalated session/,
  ])
    await user.click(screen.getByRole("radio", { name: text }));
  await confirm("Send status to Morgan");
  await selectCase("shift-handoff-1");
  for (const option of current.handoffOptions?.options.filter((o) =>
    o.id.startsWith("carry-"),
  ) ?? [])
    await user.click(screen.getByRole("checkbox", { name: option.label }));
  expect(
    screen.getByRole("region", { name: "Handoff preview" }),
  ).toHaveTextContent("senior review pending");
  await confirm("Send handoff to next analyst");
  await confirm("Finish shift");
  const lessons = screen.getAllByRole("region", {
    name: "Your claim and its record",
  });
  expect(lessons).toHaveLength(4);
  expect(lessons[0]).toHaveTextContent(
    "Before 07:45 the export proves no files",
  );
  expect(lessons[0]).toHaveTextContent("before OR after");
  expect(lessons[0]).toHaveTextContent("Request activity records");
  const stored = await repository.getSession("user-1", "new-golden");
  expect(
    stored.actionLog.filter(
      (e) =>
        e.interaction.type === "action" &&
        e.interaction.action.id === "document_ticket" &&
        e.interaction.action.eventId === "suspicious-login-1",
    ),
  ).toHaveLength(1);
  expect(
    stored.actionLog.some(
      (e) =>
        e.interaction.type === "action" &&
        e.interaction.action.id === "escalate_alert",
    ),
  ).toBe(false);
  expect(foldActionLog(initial, stored.actionLog)).toEqual(stored.state);
}, 20000);
