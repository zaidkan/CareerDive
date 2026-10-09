// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { useState } from "react";
import { cleanup, render, screen, waitFor, within, } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import type { AvailableAction, ClientTaskView, ClientView, SimulationActionId, WorkplaceInteraction, } from "@sim/schemas";
import { createInitialWorldState, foldActionLog, toClientView, } from "@sim/core";
import { InMemoryRepository, createAppRouter, type StoredSession, } from "../../server/src/index.js";
import { DeskOs } from "../src/world/deskOs/DeskOs.js";
import { OsSessionProvider } from "../src/world/deskOs/osSession.js";
import { WORK_SYSTEMS } from "../src/systems.js";
import type { NotificationHandler } from "../src/components/shared.js";
import { BreakRoomPanel, CarriedSnackControl, } from "../src/world/BreakRoomPanel.js";
import { actionMutationKey, notificationMutationKey, taskMutationKey, useMutationCoordinator, workplaceMutationKey, } from "../src/useMutationCoordinator.js";
import { JulesDialogue } from "../src/world/JulesDialogue.js";
afterEach(() => { cleanup(); sessionStorage.clear(); });
const pack = loadDefaultCybersecurityPack();
type Mode = "os";
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
    expect(JSON.stringify(view)).not.toMatch(/requiredOptionIds|coachOnFailure|successText|notKnownBy/);
    for (const event of view.events) {
        expect(event).not.toHaveProperty("templateId");
        expect(["main_case", "routine", "handoff", "general"]).toContain(event.category);
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
            if (option.source &&
                !view.artifacts.find(({ id }) => id === option.source?.artifactId)
                    ?.observed)
                expect(option.source).not.toHaveProperty("quote");
        }
}
describe("rendered workplace golden path", () => {
    it.each(["os"] as const)("completes the same assessed shift through %s controls", async (mode) => {
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
            if (failures.has(kind))
                return;
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
                    decisionOptionId: action.decisionOptionId,
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
                    ...(action.decisionOptionId
                        ? { decisionOptionId: action.decisionOptionId }
                        : {}),
                    ...(action.handoffPayload ? { handoffPayload: action.handoffPayload } : {}),
                });
                return { result: undefined, view: await update() };
            })
                .catch(() => undefined);
        };
        const onTaskAttempt = (task: ClientTaskView, selectedOptionIds: string[]) => coordinator.runMutation(taskMutationKey(task), async () => {
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
        const onWorkplaceInteraction = (interaction: WorkplaceInteraction) => coordinator.runMutation(workplaceMutationKey(interaction), async () => {
            if (interaction.type === "open_artifact" ||
                interaction.type === "open_alert_record")
                failOnce("artifact");
            trace.push(interaction);
            const result = await caller.simulation.performWorkplaceInteraction({
                sessionId: "golden",
                interaction,
            });
            return { result, view: await update() };
        });
        const onNotification: NotificationHandler = (notification, response, onApplied) => coordinator
            .runMutation(notificationMutationKey(notification, response), async () => {
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
        })
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
            return (<>
            <OsSessionProvider>
              <DeskOs {...props} phase="seated_monitor" onLoginSuccess={() => undefined} onStand={() => undefined} onOsFullscreen={() => undefined}/>
            </OsSessionProvider>
            {/* Actual spatial HUD components, without a WebGL canvas. */}
            <BreakRoomPanel workplace={view.workplace} station="fridge" onSubmit={(interaction) => {
                    void onWorkplaceInteraction(interaction);
                }}/>
            <BreakRoomPanel workplace={view.workplace} station="coffee" onSubmit={(interaction) => {
                    void onWorkplaceInteraction(interaction);
                }}/>
            <CarriedSnackControl workplace={view.workplace} onSubmit={(interaction) => {
                    void onWorkplaceInteraction(interaction);
                }}/>
            <JulesDialogue seenTopics={view.workplace.julesTopicsSeen} pending={false} onClose={() => undefined} onTopic={(topic) => {
                    void onWorkplaceInteraction({ type: "talk_to_jules", topic });
                }}/>
          </>);
        };
        function Harness() {
            const [view, setView] = useState(() => toClientView(state));
            coordinator = useMutationCoordinator(setView);
            return tree(view);
        }
        const { container } = render(<Harness />);
        {
            // DeskOs root marker (this harness renders DeskOs without LaptopOverlay).
            await waitFor(() => {
                expect(document.querySelector("[data-desk-os]")).not.toBeNull();
            }, { timeout: 6000 });
        }
        async function activate(element: HTMLElement) {
            expect(element).toBeEnabled();
            await user.click(element);
            await waitFor(() => {
                expect(coordinator.mutationState.pendingKey).toBeUndefined();
            });
            const retry = screen.queryByRole("button", { name: "Retry" });
            if (retry) {
                const error = required(coordinator.mutationState.error, "inline network error");
                expect(error).toMatch(/^Network unavailable:/);
                expect(JSON.stringify(state)).toBe(failedSnapshot);
                expect(screen
                    .getAllByRole("alert")
                    .some((node) => node.textContent.includes(error))).toBe(true);
                await user.click(retry);
                await waitFor(() => {
                    expect(coordinator.mutationState.pendingKey).toBeUndefined();
                });
                expect(coordinator.mutationState.error).toBeUndefined();
                recovered.add(error);
            }
        }
        async function openSystem(systemId: AvailableAction["systemId"]) {
            const tab = required(WORK_SYSTEMS.find(({ id }) => id === systemId), `Desk OS tab ${systemId}`);
            await user.click(screen.getByRole("button", {
                name: new RegExp(`^${tab.label}( suggested next)?$`),
            }));
        }
        async function verifyAvailableTargets() {
            const found = new Set<string>();
            const foundTasks = new Set<string>();
            const collect = () => {
                container
                    .querySelectorAll<HTMLElement>("[data-action-id]")
                    .forEach((node) => {
                    const actionId = required(node.dataset.actionId, "rendered action ID");
                    const eventId = required(node.dataset.eventId, "rendered action event ID");
                    found.add(`${actionId}:${eventId}`);
                });
                container
                    .querySelectorAll<HTMLElement>("[data-task-id]")
                    .forEach((node) => {
                    const taskId = required(node.dataset.taskId, "rendered task ID");
                    const eventId = required(node.dataset.eventId, "rendered action event ID");
                    const stepIndex = required(node.dataset.stepIndex, "rendered task step index");
                    foundTasks.add(`${taskId}:${eventId}:${stepIndex}`);
                });
            };
            for (const system of WORK_SYSTEMS) {
                await openSystem(system.id);
                collect();
                for (const event of toClientView(state).events) {
                    await user.selectOptions(screen.getByRole("combobox", { name: "Current case" }), event.id);
                    collect();
                }
            }
            const view = toClientView(state);
            expect([...found].sort()).toEqual([
                ...new Set(view.availableActions.map(({ id, eventId }) => `${id}:${eventId}`)),
            ].sort());
            expect([...foundTasks].sort()).toEqual(view.tasks
                // document_ticket uses TicketComposer; every other task kind,
                // including authored build summaries, must render a task panel.
                .filter(({ actionId }) => !["document_ticket", "submit_shift_handoff", "route_access_request", "resolve_login_help"].includes(actionId))
                .map(({ id, eventId, stepIndex }) => `${id}:${eventId}:${String(stepIndex)}`)
                .sort());
        }
    async function perform(id: SimulationActionId, eventId: string) {
        const action = toClientView(state).availableActions.find(
          (entry) => entry.id === id && entry.eventId === eventId,
        );
        if (!action) throw new Error(`Unavailable ${id}:${eventId}`);
        await openSystem(action.systemId);
        if (state.events.some(({ id }) => id === eventId))
          await user.selectOptions(screen.getByRole("combobox", { name: "Current case" }), eventId);
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
        }
        if (id === "submit_shift_handoff") {
          const builder = screen.getByRole("region", {
            name: "Build shift handoff",
          });
          const sources = within(builder).getAllByRole("checkbox");
          for (const source of sources)
            if (
              (source as HTMLInputElement).dataset.optionId?.startsWith(
                "carry-",
              )
            )
              await user.click(source);
          await activate(
            within(builder).getByRole("button", {
              name: "Send handoff to next analyst",
            }),
          );
          expect(
            state.teamMessages?.some(
              ({ actionId, body }) =>
                actionId === "submit_shift_handoff" &&
                body.includes("STILL NEEDS FOLLOW-UP"),
            ),
          ).toBe(true);
          return;
        }
        if (
          !action.taskId ||
          [
            "document_ticket",
            "route_access_request",
            "resolve_login_help",
          ].includes(id)
        ) {
          if (
            [
              "document_ticket",
              "route_access_request",
              "resolve_login_help",
            ].includes(id)
          ) {
            const button = required(
              container.querySelector<HTMLButtonElement>(
                `button[data-action-id="${id}"][data-event-id="${eventId}"]`,
              ),
              `${id} submit button`,
            );
            const form = required(button.closest("form"), `${id} form`);
            const selections: Record<string, string[]> = {
              "suspicious-login-1": [
                "login-evidence-1",
                "login-evidence-2",
                "login-evidence-3",
                "login-uncertainty-1",
                "login-uncertainty-3",
                "login-nextStep-1",
              ],
              "routine-alert-1": [
                "scanner-evidence-1",
                "scanner-evidence-2",
                "scanner-evidence-3",
                "scanner-uncertainty-1",
                "scanner-nextStep-1",
              ],
              "access-request-1": [
                "finance-evidence-1",
                "finance-evidence-2",
                "finance-uncertainty-1",
                "finance-nextStep-1",
              ],
              "login-help-1": [
                "rivera-evidence-1",
                "rivera-uncertainty-1",
                "rivera-uncertainty-2",
                "rivera-nextStep-1",
              ],
            };
            for (const optionId of required(
              selections[eventId],
              "case selections",
            )) {
              const checkbox = required(
                form.querySelector<HTMLInputElement>(
                  `input[data-option-id="${optionId}"]`,
                ),
                optionId,
              );
              const sourceButtons = checkbox
                .closest("label")
                ?.parentElement?.querySelectorAll<HTMLButtonElement>(
                  "button[data-source-id]",
                );
              for (const source of Array.from(sourceButtons ?? []))
                await activate(source);
              const current = required(
                form.querySelector<HTMLInputElement>(
                  `input[data-option-id="${optionId}"]`,
                ),
                optionId,
              );
              if (!current.checked) await user.click(current);
            }
            const firstDecision = within(form).queryAllByRole("radio")[0];
            if (firstDecision) await user.click(firstDecision);
            const saveDraft = within(form).queryByRole("button", {
              name: "Save draft",
            });
            if (saveDraft) {
              await activate(saveDraft);
              expect(state.structuredTickets[`ticket-${eventId}`]?.status).toBe(
                "in_progress",
              );
            }
            await activate(button);
            expect(
              state.structuredTickets[`ticket-${eventId}`]?.reasoning?.evidence
                .length,
            ).toBeGreaterThan(0);
            expect(
              state.structuredTickets[`ticket-${eventId}`]?.sourceArtifactIds,
            ).toContain(
              eventId === routine
                ? "scanner-window"
                : eventId === "suspicious-login-1"
                  ? "device-inventory-1"
                  : eventId === "access-request-1"
                    ? "access-approval-guide"
                    : "rivera-auth-summary",
            );
            return;
          }
          if (id === "ask_manager") {
            const button = required(
              container.querySelector<HTMLButtonElement>(
                `button[data-action-id="${id}"][data-event-id="${eventId}"]`,
              ),
              "bounded Morgan question",
            );
            await activate(button);
            expect(
              state.teamMessages?.some(
                (message) =>
                  message.eventId === eventId && message.author === "morgan",
              ),
            ).toBe(true);
            return;
          }
          if (id === "acknowledge_handoff") {
            const button = required(
              container.querySelector<HTMLButtonElement>(
                `button[data-action-id="${id}"][data-event-id="${eventId}"]`,
              ),
              `${id} chat button`,
            );
            const form = required(button.closest("form"), `${id} chat form`);
            await user.type(
              within(form).getByRole("textbox"),
              "I read the handoff and will review the open sign-in alert first.",
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
              eventId === routine ? "RUN-FIN-031" : "files or messages",
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
              name: /Submit findings|Save findings|Send selected response/,
            }),
          );
        }
      }
      async function saveTicketNote(eventId: string) {
        await openSystem("ticket_queue");
        const queue = container.querySelector(".desk-os-queue");
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
        const source = required(
          editor.querySelector<HTMLButtonElement>(
            'button[data-source-id="scanner-run-log"]',
          ),
          "scanner run source",
        );
        await activate(source);
        for (const optionId of [
          "scanner-evidence-1",
          "scanner-evidence-2",
          "scanner-evidence-3",
          "scanner-uncertainty-1",
          "scanner-nextStep-1",
        ]) {
          const checkbox = required(
            editor.querySelector<HTMLInputElement>(
              `input[data-option-id="${optionId}"]`,
            ),
            optionId,
          );
          if (!checkbox.checked) await user.click(checkbox);
        }
        await activate(button);
        expect(state.ticketNotes[eventId]).toContain("Scanner run log");
        expect(state.ticketNotes[eventId]).toContain(
          "connections, not the results",
        );
      }
          await verifyAvailableTargets();
        await perform("read_handoff", "handoff-1");
        await perform("acknowledge_handoff", "handoff-1");
        await perform("review_alert", suspicious);
        await perform("inspect_login_context", suspicious);
        await openSystem("knowledge_base");
        await user.type(screen.getByRole("searchbox", { name: "Find an exact device" }), "unknown-laptop-17");
        await activate(required(container.querySelector<HTMLElement>('[data-interaction-id="open_artifact"][data-artifact-id="device-inventory-1"]'), "exact inventory record"));
        expect(state.observedArtifactIds).toContain("device-inventory-1");
        await verifyAvailableTargets();
        await activate(screen.getByRole("button", { name: "Handle now" }));
        await perform("review_alert", routine);
        await openSystem("knowledge_base");
        await user.type(screen.getByRole("searchbox", { name: "Find a guide" }), "scanner");
        await activate(required(container.querySelector<HTMLElement>('[data-interaction-id="open_artifact"][data-artifact-id="scanner-window"]'), "scanner guide"));
        expect(state.observedArtifactIds).toContain("scanner-window");
        await perform("search_knowledge_base", routine);
        await saveTicketNote(routine);
        await perform("document_ticket", routine);
        await perform("dismiss_alert", routine);
        await perform("inspect_account_history", suspicious);
        await perform("check_device_inventory", suspicious);
        // Sol content coverage: access request, login help, Morgan status check.
        await perform("route_access_request", "access-request-1");
        await perform("resolve_login_help", "login-help-1");
        await perform("send_status_update", "status-check-1");
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

        await activate(screen.getByRole("button", { name: "Current work" }));

        await perform("ask_manager", suspicious);
        expect(screen.getByRole("list", { name: "Team conversation" })).toBeVisible();
        await perform("document_ticket", suspicious);
        expect(state.ticketNotes[suspicious]).toContain("Device inventory · j.patel");
        expect(state.ticketNotes[suspicious]).toContain("do not identify who used the unfamiliar laptop");
        await perform("escalate_alert", suspicious);
        // Sol content coverage: end-of-shift handoff before complete.
        await perform("submit_shift_handoff", "shift-handoff-1");
        await verifyAvailableTargets();
        await perform("complete_shift", "shift");
        expect(state.workplace.energy.current).toBeGreaterThan(0);
        expect(state.workplace).toMatchObject({
            fridgeSnackBars: 1,
            carriedSnackBites: 2,
            coffeeServings: 1,
            julesTopicsSeen: ["current_work"],
        });
        expect(state.events.find(({ id }) => id === suspicious)?.status).toBe("resolved");
        expect(state.events.find(({ id }) => id === routine)?.status).toBe("resolved");
        expect([...failures].sort()).toEqual([
            "action",
            "artifact",
            "notification",
            "task",
        ]);
        expect(recovered.size).toBe(4);
        expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
        const stored = await repository.getSession("user-1", "golden");
        expect(stored.evidence.length).toBeGreaterThan(0);
        expect(foldActionLog(initial, stored.actionLog)).toEqual(state);
        const debrief = await caller.debrief.get({ sessionId: "golden" });
        expect(debrief.confidence).toBe("early_signal");
        expect(Object.keys(debrief.sections)).toHaveLength(8);
        expect(debrief.sections.consequences).toContain("RUN-FIN-031");
        expect(debrief.sections.consequences).toContain("SCAN-FIN-MON");
        expect(debrief.sections.consequences).toContain("07:45 export has no file-access or mailbox activity");
        outcomes.set(mode, stored);
        traces.set(mode, trace);
    }, 60000);
});
