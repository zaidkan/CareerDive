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
import { afterEach, describe, expect, it } from "vitest";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import type {
  AvailableAction,
  ClientTaskView,
  ClientView,
  SimulationActionId,
  WorkplaceInteraction,
} from "@sim/schemas";
import {
  createInitialWorldState,
  foldActionLog,
  toClientView,
} from "@sim/core";
import {
  InMemoryRepository,
  createAppRouter,
  type StoredSession,
} from "../../server/src/index.js";
import { ExperienceShell } from "../src/experience/ExperienceShell.js";
import { DeskOs } from "../src/world/deskOs/DeskOs.js";
import { OsSessionProvider } from "../src/world/deskOs/osSession.js";
import { APP_TABS } from "../src/world/deskOs/tabs.js";
import { WORK_SYSTEMS } from "../src/systems.js";
import type { NotificationHandler } from "../src/components/shared.js";
import {
  BreakRoomPanel,
  CarriedSnackControl,
} from "../src/world/BreakRoomPanel.js";
import {
  actionMutationKey,
  notificationMutationKey,
  taskMutationKey,
  useMutationCoordinator,
  workplaceMutationKey,
} from "../src/useMutationCoordinator.js";
import { JulesDialogue } from "../src/world/JulesDialogue.js";

afterEach(cleanup);
const pack = loadDefaultCybersecurityPack();
type Mode = "desk" | "list" | "os";
const outcomes = new Map<Mode, StoredSession>();
const traces = new Map<Mode, unknown[]>();
const suspicious = "suspicious-login-1";
const routine = "routine-alert-1";

function required<T>(value: T | null | undefined, description: string): T {
  if (value === null || value === undefined)
    throw new Error(`Missing ${description}`);
  return value;
}

function assertPublicView(view: ClientView) {
  for (const key of ["hidden", "rules", "evidence", "reflections"])
    expect(view).not.toHaveProperty(key);
  expect(JSON.stringify(view)).not.toMatch(
    /requiredOptionIds|coachOnFailure|successText|notKnownBy/,
  );
  for (const event of view.events) {
    expect(event).not.toHaveProperty("templateId");
    expect(["main_case", "routine", "handoff", "general"]).toContain(
      event.category,
    );
  }
  for (const artifact of view.artifacts) {
    expect(artifact).not.toHaveProperty("relatedArtifactIds");
  }
  for (const artifact of view.artifacts.filter(({ observed }) => !observed)) {
    expect(artifact).not.toHaveProperty("body");
    expect(artifact).not.toHaveProperty("metadata");
  }
  for (const task of view.tasks)
    for (const option of task.options) {
      if (
        option.source &&
        !view.artifacts.find(({ id }) => id === option.source?.artifactId)
          ?.observed
      )
        expect(option.source).not.toHaveProperty("quote");
    }
}

describe("rendered workplace golden path", () => {
  it.each(["desk", "list", "os"] as const)(
    "completes the same assessed shift through %s controls",
    async (mode) => {
      const user = userEvent.setup();
      let state = createInitialWorldState("golden", 24, {}, pack);
      const initial = structuredClone(state);
      const repository = new InMemoryRepository();
      await repository.createSession("user-1", state);
      const caller = createAppRouter(repository).createCaller({
        userId: "user-1",
      });
      const trace: unknown[] = [];
      let coordinator: ReturnType<typeof useMutationCoordinator>;
      const failures = new Set<string>();
      const recovered = new Set<string>();
      let failedSnapshot: string | undefined;
      function failOnce(kind: string) {
        if (failures.has(kind)) return;
        failures.add(kind);
        failedSnapshot = JSON.stringify(state);
        throw new Error(`Network unavailable: ${kind}`);
      }
      const update = async () => {
        state = (await repository.getSession("user-1", "golden")).state;
        return toClientView(state);
      };
      const onAction = (action: AvailableAction, freeText?: string) => {
        void coordinator
          .runMutation(actionMutationKey(action), async () => {
            failOnce("action");
            trace.push({
              type: "action",
              id: action.id,
              eventId: action.eventId,
              freeText,
              sourceRecordId: action.sourceRecordId,
              sourceArtifactId: action.sourceArtifactId,
              ticketPayload: action.ticketPayload,
            });
            await caller.simulation.performAction({
              sessionId: "golden",
              actionId: action.id,
              eventId: action.eventId,
              ...(freeText ? { freeText } : {}),
              ...(action.sourceRecordId
                ? { sourceRecordId: action.sourceRecordId }
                : {}),
              ...(action.sourceArtifactId
                ? { sourceArtifactId: action.sourceArtifactId }
                : {}),
              ...(action.ticketPayload
                ? { ticketPayload: action.ticketPayload }
                : {}),
            });
            return { result: undefined, view: await update() };
          })
          .catch(() => undefined);
      };
      const onTaskAttempt = (
        task: ClientTaskView,
        selectedOptionIds: string[],
      ) =>
        coordinator.runMutation(taskMutationKey(task), async () => {
          failOnce("task");
          trace.push({
            type: "task",
            taskId: task.id,
            eventId: task.eventId,
            selectedOptionIds,
          });
          const result = await caller.simulation.submitTaskAttempt({
            sessionId: "golden",
            taskId: task.id,
            eventId: task.eventId,
            selectedOptionIds,
          });
          expect(result.accepted).toBe(true);
          return { result, view: await update() };
        });
      const onWorkplaceInteraction = (interaction: WorkplaceInteraction) =>
        coordinator.runMutation(workplaceMutationKey(interaction), async () => {
          if (
            interaction.type === "open_artifact" ||
            interaction.type === "open_alert_record"
          )
            failOnce("artifact");
          trace.push(interaction);
          const result = await caller.simulation.performWorkplaceInteraction({
            sessionId: "golden",
            interaction,
          });
          return { result, view: await update() };
        });
      const onNotification: NotificationHandler = (
        notification,
        response,
        onApplied,
      ) =>
        coordinator
          .runMutation(
            notificationMutationKey(notification, response),
            async () => {
              failOnce("notification");
              trace.push({
                type: "notification",
                id: notification.id,
                response,
              });
              await caller.simulation.respondToNotification({
                sessionId: "golden",
                notificationId: notification.id,
                response,
              });
              return {
                result: undefined,
                view: await update(),
                ...(onApplied ? { onApplied } : {}),
              };
            },
          )
          .catch(() => undefined);
      const tree = (view: ClientView) => {
        assertPublicView(view);
        const props = {
          view,
          onAction,
          onTaskAttempt,
          onWorkplaceInteraction,
          onNotification,
          mutationState: coordinator.mutationState,
          onRetryMutation: () => {
            void coordinator.retryMutation().catch(() => undefined);
          },
        };
        return mode === "os" ? (
          <>
            <OsSessionProvider>
              <DeskOs
                {...props}
                phase="seated_monitor"
                onLoginSuccess={() => undefined}
                onStand={() => undefined}
                onOsFullscreen={() => undefined}
              />
            </OsSessionProvider>
            {/* Actual spatial HUD components, without a WebGL canvas. */}
            <BreakRoomPanel
              workplace={view.workplace}
              station="fridge"
              onSubmit={(interaction) => {
                void onWorkplaceInteraction(interaction);
              }}
            />
            <BreakRoomPanel
              workplace={view.workplace}
              station="coffee"
              onSubmit={(interaction) => {
                void onWorkplaceInteraction(interaction);
              }}
            />
            <CarriedSnackControl
              workplace={view.workplace}
              onSubmit={(interaction) => {
                void onWorkplaceInteraction(interaction);
              }}
            />
            <JulesDialogue
              seenTopics={view.workplace.julesTopicsSeen}
              pending={false}
              onClose={() => undefined}
              onTopic={(topic) => {
                void onWorkplaceInteraction({ type: "talk_to_jules", topic });
              }}
            />
          </>
        ) : (
          <ExperienceShell
            {...props}
            mode={mode}
            onModeChange={() => undefined}
          />
        );
      };
      function Harness() {
        const [view, setView] = useState(() => toClientView(state));
        coordinator = useMutationCoordinator(setView);
        return tree(view);
      }
      const { container } = render(<Harness />);
      // Peer modes are code-split — wait for the suspended shell before acting.
      if (mode === "os") {
        // DeskOs root marker (this harness renders DeskOs without LaptopOverlay).
        await waitFor(
          () => {
            expect(document.querySelector("[data-desk-os]")).not.toBeNull();
          },
          { timeout: 6000 },
        );
      } else if (mode === "list") {
        await screen.findByRole(
          "heading",
          { name: "Structured workplace view" },
          { timeout: 6000 },
        );
      } else {
        await screen.findByRole(
          "navigation",
          { name: "Work systems" },
          { timeout: 6000 },
        );
      }
      async function activate(element: HTMLElement) {
        expect(element).toBeEnabled();
        if (mode === "list") {
          element.focus();
          await user.keyboard(element.tagName === "INPUT" ? " " : "{Enter}");
        } else await user.click(element);
        await waitFor(() => {
          expect(coordinator.mutationState.pendingKey).toBeUndefined();
        });
        const retry = screen.queryByRole("button", { name: "Retry" });
        if (retry) {
          const error = required(
            coordinator.mutationState.error,
            "inline network error",
          );
          expect(error).toMatch(/^Network unavailable:/);
          expect(JSON.stringify(state)).toBe(failedSnapshot);
          expect(
            screen
              .getAllByRole("alert")
              .some((node) => node.textContent.includes(error)),
          ).toBe(true);
          if (mode === "list") {
            retry.focus();
            await user.keyboard("{Enter}");
          } else await user.click(retry);
          await waitFor(() => {
            expect(coordinator.mutationState.pendingKey).toBeUndefined();
          });
          expect(coordinator.mutationState.error).toBeUndefined();
          recovered.add(error);
        }
      }
      async function openSystem(systemId: AvailableAction["systemId"]) {
        if (mode === "list") return;
        if (mode === "os") {
          const tab = required(
            APP_TABS.find(({ id }) => id === systemId),
            `Desk OS tab ${systemId}`,
          );
          await user.click(
            screen.getByRole("tab", {
              name: new RegExp(`^${tab.label}( suggested next)?$`),
            }),
          );
        } else {
          const system = required(
            WORK_SYSTEMS.find(({ id }) => id === systemId),
            `work system ${systemId}`,
          );
          await user.click(
            within(
              screen.getByRole("navigation", { name: "Work systems" }),
            ).getByRole("button", { name: new RegExp(`^${system.label}`) }),
          );
        }
      }
      async function verifyAvailableTargets() {
        const found = new Set<string>();
        const foundTasks = new Set<string>();
        const collect = () => {
          container
            .querySelectorAll<HTMLElement>("[data-action-id]")
            .forEach((node) => {
              const actionId = required(
                node.dataset.actionId,
                "rendered action ID",
              );
              const eventId = required(
                node.dataset.eventId,
                "rendered action event ID",
              );
              found.add(`${actionId}:${eventId}`);
            });
          container
            .querySelectorAll<HTMLElement>("[data-task-id]")
            .forEach((node) => {
              const taskId = required(node.dataset.taskId, "rendered task ID");
              const eventId = required(
                node.dataset.eventId,
                "rendered task event ID",
              );
              const stepIndex = required(
                node.dataset.stepIndex,
                "rendered task step index",
              );
              foundTasks.add(`${taskId}:${eventId}:${stepIndex}`);
            });
        };
        for (const system of WORK_SYSTEMS) {
          await openSystem(system.id);
          collect();
          const queue = container.querySelector(
            mode === "os" ? ".desk-os-queue" : ".work-queue",
          );
          for (const button of Array.from(
            queue?.querySelectorAll<HTMLButtonElement>("button") ?? [],
          )) {
            await user.click(button);
            collect();
          }
        }
        const view = toClientView(state);
        expect([...found].sort()).toEqual(
          [
            ...new Set(
              view.availableActions.map(
                ({ id, eventId }) => `${id}:${eventId}`,
              ),
            ),
          ].sort(),
        );
        expect([...foundTasks].sort()).toEqual(
          view.tasks
            .filter(({ kind }) => kind !== "build_summary")
            .map(
              ({ id, eventId, stepIndex }) =>
                `${id}:${eventId}:${String(stepIndex)}`,
            )
            .sort(),
        );
      }
      async function perform(id: SimulationActionId, eventId: string) {
        const action = toClientView(state).availableActions.find(
          (entry) => entry.id === id && entry.eventId === eventId,
        );
        if (!action) throw new Error(`Unavailable ${id}:${eventId}`);
        await openSystem(action.systemId);
        const queue = container.querySelector(
          mode === "os" ? ".desk-os-queue" : ".work-queue",
        );
        const eventTitle = state.events.find(({ id }) => id === eventId)?.title;
        const item = Array.from(
          queue?.querySelectorAll<HTMLButtonElement>("button") ?? [],
        ).find(
          (button) => eventTitle && button.textContent.includes(eventTitle),
        );
        if (item) await user.click(item);
        if (
          action.systemId === "alert_dashboard" &&
          !state.workplace.selectedAlertIdsByEvent?.[eventId]
        ) {
          const recordId = eventId === routine ? "A-1180" : "A-1042";
          await activate(
            required(
              container.querySelector<HTMLElement>(
                `button[data-record-id="${recordId}"]`,
              ),
              `${recordId} alert record`,
            ),
          );
          expect(state.workplace.selectedAlertIdsByEvent?.[eventId]).toBe(
            recordId,
          );
          if (mode === "list" && eventId === routine) {
            expect(
              Array.from(container.querySelectorAll(".alert-record h4")).map(
                (heading) => heading.textContent,
              ),
            ).toEqual(
              expect.arrayContaining([
                "A-1042 · sign-in monitoring",
                "A-1180 · connection monitoring",
              ]),
            );
          }
        }
        if (!action.taskId || id === "document_ticket") {
          if (id === "document_ticket") {
            const button = required(
              container.querySelector<HTMLButtonElement>(
                `button[data-action-id="${id}"][data-event-id="${eventId}"]`,
              ),
              `${id} submit button`,
            );
            const form = required(button.closest("form"), `${id} form`);
            const fields = within(form).getAllByRole("textbox");
            await user.type(
              required(fields[0], "verified evidence"),
              eventId === routine
                ? "A-1180 matches RUN-FIN-031 and SCAN-FIN-MON at the recorded event time."
                : "unknown-laptop-17 is not enrolled; sign-in context and account history checked.",
            );
            await user.type(
              required(fields[1], "uncertainty"),
              eventId === routine
                ? "The log covers discovery connections only."
                : "Device ownership and file-access or mailbox activity are suspected, not yet proven.",
            );
            await user.type(
              required(fields[2], "next step"),
              eventId === routine
                ? "Close matching alert with source records."
                : "Escalate for review of file-access or mailbox activity.",
            );
            const sources = within(form).getAllByRole("checkbox");
            expect(sources.length).toBeGreaterThan(0);
            for (const source of sources) await user.click(source);
            const saveDraft = required(
              within(form).queryByRole("button", { name: "Save draft" }),
              "ticket draft button",
            );
            await activate(saveDraft);
            expect(state.structuredTickets[`ticket-${eventId}`]?.status).toBe(
              "in_progress",
            );
            await activate(button);
            expect(
              state.structuredTickets[`ticket-${eventId}`]?.sourceArtifactIds
                ?.length,
            ).toBe(sources.length);
            expect(
              state.structuredTickets[`ticket-${eventId}`]?.sourceArtifactIds,
            ).toContain(
              eventId === routine ? "scanner-window" : "device-inventory-1",
            );
            return;
          }
          if (id === "ask_manager" || id === "acknowledge_handoff") {
            const button = required(
              container.querySelector<HTMLButtonElement>(
                `button[data-action-id="${id}"][data-event-id="${eventId}"]`,
              ),
              `${id} chat button`,
            );
            const form = required(button.closest("form"), `${id} chat form`);
            await user.type(
              within(form).getByRole("textbox"),
              id === "ask_manager"
                ? "I checked the alert and device record. What should the reviewer check next?"
                : "I read the handoff and will review the open sign-in alert first.",
            );
            await activate(button);
            expect(
              state.teamMessages?.some(
                (message) =>
                  message.eventId === eventId && message.author === "player",
              ),
            ).toBe(true);
            return;
          }
          if (
            (id === "dismiss_alert" && eventId === routine) ||
            id === "escalate_alert"
          ) {
            const note = required(
              state.ticketNotes[eventId],
              "saved handoff before decision",
            );
            expect(
              Array.from(container.querySelectorAll("pre.artifact-body")).some(
                (node) => node.textContent === note,
              ),
            ).toBe(true);
            expect(note).toContain(
              eventId === routine
                ? "RUN-FIN-031"
                : "file-access or mailbox activity",
            );
          }
          await activate(
            required(
              container.querySelector<HTMLElement>(
                `button[data-action-id="${id}"][data-event-id="${eventId}"]`,
              ),
              `${id} action button`,
            ),
          );
          return;
        }
        const taskId = action.taskId;
        while (!state.taskProgress[`${eventId}:${taskId}`]?.completed) {
          const stepIndex =
            state.taskProgress[`${eventId}:${taskId}`]?.currentStep ?? 0;
          // Answer fixtures stay in tests; only toClientView(state) enters the renderer.
          const taskRule = required(
            state.rules.tasks[taskId],
            `task rule ${taskId}`,
          );
          const step = required(
            taskRule.steps[stepIndex],
            `task step ${taskId}:${String(stepIndex)}`,
          );
          const panel = () =>
            required(
              container.querySelector<HTMLElement>(
                `[data-task-id="${taskId}"][data-event-id="${eventId}"]`,
              ),
              `${taskId} task panel`,
            );
          if (step.id === "scanner-run-cross-check") {
            expect(
              within(panel()).getByRole("button", { name: "Submit findings" }),
            ).toBeDisabled();
            expect(
              panel().querySelector('[data-option-id="run-identity-scope"]'),
            ).toBeNull();
          }
          for (const artifactId of step.relatedArtifactIds) {
            if (!state.observedArtifactIds.includes(artifactId)) {
              const taskContainer = required(
                panel().parentElement,
                `${taskId} task container`,
              );
              await activate(
                required(
                  taskContainer.querySelector<HTMLElement>(
                    `[data-interaction-id="open_artifact"][data-artifact-id="${artifactId}"]`,
                  ),
                  `${artifactId} artifact open button`,
                ),
              );
            }
          }
          expect(panel().dataset.stepIndex).toBe(String(stepIndex));
          for (const optionId of step.requiredOptionIds)
            await activate(
              required(
                panel().querySelector<HTMLElement>(
                  `[data-option-id="${optionId}"]`,
                ),
                `${optionId} task option`,
              ),
            );
          await activate(
            within(panel()).getByRole("button", {
              name: /Submit findings|Check my work/,
            }),
          );
        }
      }
      async function saveTicketNote(eventId: string, note: string) {
        await openSystem("ticket_queue");
        const queue = container.querySelector(
          mode === "os" ? ".desk-os-queue" : ".work-queue",
        );
        const eventTitle = state.events.find(({ id }) => id === eventId)?.title;
        const item = Array.from(
          queue?.querySelectorAll<HTMLButtonElement>("button") ?? [],
        ).find(
          (button) => eventTitle && button.textContent.includes(eventTitle),
        );
        if (item) await user.click(item);
        const button = required(
          container.querySelector<HTMLButtonElement>(
            `button[data-action-id="update_ticket_notes"][data-event-id="${eventId}"]`,
          ),
          `${eventId} save note button`,
        );
        const editor = required(
          button.closest("form"),
          `${eventId} note editor`,
        );
        const field = within(editor).getByRole("textbox");
        await user.clear(field);
        await user.type(field, note);
        await activate(button);
        expect(state.ticketNotes[eventId]).toBe(note);
      }
      await verifyAvailableTargets();
      await perform("read_handoff", "handoff-1");
      await perform("acknowledge_handoff", "handoff-1");
      await perform("review_alert", suspicious);
      await perform("inspect_login_context", suspicious);
      await openSystem("knowledge_base");
      await user.type(
        screen.getByRole("searchbox", { name: "Find an exact device" }),
        "unknown-laptop-17",
      );
      await activate(
        required(
          container.querySelector<HTMLElement>(
            '[data-interaction-id="open_artifact"][data-artifact-id="device-inventory-1"]',
          ),
          "exact inventory record",
        ),
      );
      expect(state.observedArtifactIds).toContain("device-inventory-1");
      await verifyAvailableTargets();
      await activate(screen.getByRole("button", { name: "Handle now" }));
      await perform("review_alert", routine);
      await openSystem("knowledge_base");
      await user.type(
        screen.getByRole("searchbox", { name: "Filter guides locally" }),
        "scanner",
      );
      await activate(
        required(
          container.querySelector<HTMLElement>(
            '[data-interaction-id="open_artifact"][data-artifact-id="scanner-window"]',
          ),
          "scanner guide",
        ),
      );
      expect(state.observedArtifactIds).toContain("scanner-window");
      await perform("search_knowledge_base", routine);
      await saveTicketNote(
        routine,
        "A-1180 matches RUN-FIN-031 and SCAN-FIN-MON at the recorded event time. The log covers discovery connections only.",
      );
      await perform("document_ticket", routine);
      await perform("dismiss_alert", routine);
      await perform("inspect_account_history", suspicious);
      await perform("check_device_inventory", suspicious);
      await verifyAvailableTargets();
      for (const label of [
        "Open fridge",
        "Take one snack bar",
        "Eat snack — 3 bites remaining",
        "Start coffee",
        "Finish brewing",
        "Pour coffee",
        "Drink coffee",
        "Close fridge",
      ])
        await activate(screen.getByRole("button", { name: label }));
      if (mode !== "os")
        await activate(screen.getByRole("button", { name: "Talk to Jules" }));
      await activate(screen.getByRole("button", { name: "Current work" }));
      if (mode !== "os")
        await activate(screen.getByRole("button", { name: /^Close$/ }));
      await perform("ask_manager", suspicious);
      expect(
        screen.getByRole("complementary", { name: "Morgan guidance" }),
      ).toBeVisible();
      await perform("document_ticket", suspicious);
      expect(state.ticketNotes[suspicious]).toContain(
        "unknown-laptop-17 is not enrolled",
      );
      expect(state.ticketNotes[suspicious]).toContain(
        "suspected, not yet proven",
      );
      await perform("escalate_alert", suspicious);
      await verifyAvailableTargets();
      await perform("complete_shift", "shift");
      expect(state.workplace.energy.current).toBeGreaterThan(0);
      expect(state.workplace).toMatchObject({
        fridgeSnackBars: 1,
        carriedSnackBites: 2,
        coffeeServings: 1,
        julesTopicsSeen: ["current_work"],
      });
      expect(state.events.find(({ id }) => id === suspicious)?.status).toBe(
        "resolved",
      );
      expect(state.events.find(({ id }) => id === routine)?.status).toBe(
        "resolved",
      );
      expect([...failures].sort()).toEqual([
        "action",
        "artifact",
        "notification",
      ]);
      expect(recovered.size).toBe(3);
      expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
      const stored = await repository.getSession("user-1", "golden");
      expect(stored.evidence.length).toBeGreaterThan(0);
      expect(foldActionLog(initial, stored.actionLog)).toEqual(state);
      const debrief = await caller.debrief.get({ sessionId: "golden" });
      expect(debrief.confidence).toBe("early_signal");
      expect(Object.keys(debrief.sections)).toHaveLength(8);
      expect(debrief.sections.consequences).toContain("RUN-FIN-031");
      expect(debrief.sections.consequences).toContain("SCAN-FIN-MON");
      expect(debrief.sections.consequences).toContain(
        "07:45 export has no file-access or mailbox activity",
      );
      outcomes.set(mode, stored);
      traces.set(mode, trace);
    },
    30000,
  );

  it("produces identical actions, task/option IDs, resource interactions, evidence and outcomes across renderers", () => {
    expect(outcomes.size).toBe(3);
    expect(traces.get("list")).toEqual(traces.get("desk"));
    expect(traces.get("os")).toEqual(traces.get("desk"));
    const comparable = (mode: Mode) => {
      const stored = required(outcomes.get(mode), `${mode} stored outcome`);
      return {
        ...stored,
        evidence: stored.evidence.map((signal) => {
          // Repository UUIDs and wall-clock audit timestamps are not assessment content.
          const { id, occurredAt, ...behavior } = signal;
          expect(id).toBeTruthy();
          expect(occurredAt).toBeTruthy();
          return behavior;
        }),
      };
    };
    expect(comparable("list")).toEqual(comparable("desk"));
    expect(comparable("os")).toEqual(comparable("desk"));
  });

  it("keeps tutorial tasks and breaks free of assessment evidence", async () => {
    let state = createInitialWorldState(
      "tutorial-golden",
      24,
      { sessionKind: "tutorial" },
      pack,
    );
    const repository = new InMemoryRepository();
    await repository.createSession("user-1", state);
    const caller = createAppRouter(repository).createCaller({
      userId: "user-1",
    });
    const sessionId = state.sessionId;
    const tutorialActions = [
      ["handoff-1", "read_handoff"],
      ["handoff-1", "acknowledge_handoff"],
      [suspicious, "review_alert"],
      [suspicious, "inspect_login_context"],
      [routine, "review_alert"],
      [routine, "search_knowledge_base"],
      [routine, "document_ticket"],
      [routine, "dismiss_alert"],
      [suspicious, "inspect_account_history"],
      [suspicious, "check_device_inventory"],
      [suspicious, "document_ticket"],
      [suspicious, "escalate_alert"],
      ["shift", "complete_shift"],
    ] as const;
    for (const [eventId, actionId] of tutorialActions) {
      const view = toClientView(state);
      assertPublicView(view);
      const action = required(
        view.availableActions.find(
          ({ id, eventId: target }) => id === actionId && target === eventId,
        ),
        `tutorial action ${actionId}:${eventId}`,
      );
      if (action.taskId && action.id !== "document_ticket") {
        while (!state.taskProgress[`${eventId}:${action.taskId}`]?.completed) {
          const stepIndex =
            state.taskProgress[`${eventId}:${action.taskId}`]?.currentStep ?? 0;
          const step = required(
            state.rules.tasks[action.taskId]?.steps[stepIndex],
            `tutorial task step ${action.taskId}:${String(stepIndex)}`,
          );
          for (const artifactId of step.relatedArtifactIds)
            if (!state.observedArtifactIds.includes(artifactId))
              await caller.simulation.performWorkplaceInteraction({
                sessionId,
                interaction: { type: "open_artifact", artifactId },
              });
          await caller.simulation.submitTaskAttempt({
            sessionId,
            taskId: action.taskId,
            eventId,
            selectedOptionIds: step.requiredOptionIds,
          });
          state = (await repository.getSession("user-1", sessionId)).state;
        }
      } else {
        await caller.simulation.performAction({
          sessionId,
          actionId: action.id,
          eventId: action.eventId,
          ...(action.id === "document_ticket"
            ? {
                ticketPayload: {
                  ticketId: `ticket-${eventId}`,
                  verifiedEvidence:
                    eventId === routine
                      ? "Scanner window and run agree."
                      : "Sign-in and inventory records compared.",
                  uncertainty:
                    eventId === routine
                      ? "Log scope remains limited."
                      : "User identity remains unverified.",
                  followUp:
                    eventId === routine
                      ? "Document closure."
                      : "Request reviewer assessment.",
                  sourceArtifactIds: [
                    eventId === routine
                      ? "scanner-window"
                      : "device-inventory-1",
                  ],
                },
              }
            : {}),
        });
      }
      state = (await repository.getSession("user-1", sessionId)).state;
      expect(repository.evidenceFor("user-1", sessionId)).toEqual([]);
    }
    await caller.simulation.performWorkplaceInteraction({
      sessionId,
      interaction: { type: "movement_exertion", distanceMeters: 5 },
    });
    for (const interaction of [
      { type: "open_fridge" },
      { type: "take_snack" },
      { type: "eat_snack_bite" },
      { type: "close_fridge" },
      { type: "talk_to_jules", topic: "first_day" },
    ] satisfies WorkplaceInteraction[])
      await caller.simulation.performWorkplaceInteraction({
        sessionId,
        interaction,
      });
    state = (await repository.getSession("user-1", sessionId)).state;
    expect(state.completedActionIds).toContain("complete_shift");
    expect(repository.evidenceFor("user-1", sessionId)).toEqual([]);
    expect(state.workplace.energy.current).toBeGreaterThan(0);
  });
});
