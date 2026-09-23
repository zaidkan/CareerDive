import { useEffect, useRef, useState } from "react";
import type {
  AvailableAction,
  ClientNotification,
  ClientTaskView,
  ClientView,
  Debrief,
  NotificationResponse,
  WorkplaceInteraction,
} from "@sim/schemas";
import { defaultClient, type SimulationClient } from "./client.js";
import { DebriefView } from "./components/DebriefView.js";
import { ExperienceShell } from "./experience/ExperienceShell.js";
import { COMPANY } from "./world/company.js";
import {
  actionMutationKey,
  notificationMutationKey,
  taskMutationKey,
  useMutationCoordinator,
  workplaceMutationKey,
} from "./useMutationCoordinator.js";

export function App({
  client = defaultClient,
}: {
  client?: SimulationClient;
}) {
  const [view, setView] = useState<ClientView>();
  const [sessionId, setSessionId] = useState<string>();
  const [debrief, setDebrief] = useState<Debrief>();
  const [error, setError] = useState<string>();
  const [sessionRequest, setSessionRequest] = useState(0);
  const [debriefStatus, setDebriefStatus] = useState<"loading" | "failed">();
  const creationRef = useRef<{ client: SimulationClient; attempt: number; promise: ReturnType<SimulationClient["createSession"]> } | undefined>(undefined);
  const sessionGenerationRef = useRef(0);
  const currentSessionRef = useRef<
    { generation: number; sessionId: string } | undefined
  >(undefined);
  const { invalidateMutations, mutationState, retryMutation, runMutation } =
    useMutationCoordinator(setView);

  useEffect(() => {
    const generation = ++sessionGenerationRef.current;
    currentSessionRef.current = undefined;
    invalidateMutations();
    setError(undefined);
    setView(undefined);
    setDebrief(undefined);
    setDebriefStatus(undefined);
    const input = {
      seed: Date.now() & 0x7fffffff,
      sessionKind: "assessed",
      pacingMode: "standard",
    } as const;
    const isCurrent = () => generation === sessionGenerationRef.current;
    void (async () => {
      try {
        let created: Awaited<ReturnType<SimulationClient["createSession"]>>;
        try {
          if (!creationRef.current || creationRef.current.client !== client || creationRef.current.attempt !== sessionRequest) {
            creationRef.current = { client, attempt: sessionRequest, promise: client.createSession(input) };
          }
          created = await creationRef.current.promise;
        } catch {
          // One quiet retry covers a server restart/wake without a dead-end banner.
          await new Promise((resolve) => {
            setTimeout(resolve, 400);
          });
          if (!isCurrent()) return;
          created = await client.createSession(input);
        }
        if (!isCurrent()) return;
        currentSessionRef.current = {
          generation,
          sessionId: created.sessionId,
        };
        setSessionId(created.sessionId);
        setView(created.view);
      } catch {
        if (!isCurrent()) return;
        setError(
          "We couldn't start your shift — the server might be waking up. Give it a moment and hit Retry.",
        );
      }
    })();
    return () => {
      sessionGenerationRef.current += 1;
    };
  }, [client, invalidateMutations, sessionRequest]);

  function currentSession() {
    const current = currentSessionRef.current;
    return current?.sessionId === sessionId ? current : undefined;
  }

  function assertCurrentSession(session: {
    generation: number;
    sessionId: string;
  }) {
    const current = currentSessionRef.current;
    if (
      sessionGenerationRef.current !== session.generation ||
      current?.generation !== session.generation ||
      current.sessionId !== session.sessionId
    ) {
      throw new Error("Session is no longer current.");
    }
  }

  async function loadDebrief(session: {
    generation: number;
    sessionId: string;
  }) {
    assertCurrentSession(session);
    setDebriefStatus("loading");
    try {
      const result = await client.getDebrief(session.sessionId);
      assertCurrentSession(session);
      setDebrief(result);
      setDebriefStatus(undefined);
    } catch {
      if (sessionGenerationRef.current !== session.generation) return;
      setDebriefStatus("failed");
    }
  }

  async function perform(action: AvailableAction, freeText?: string) {
    const session = currentSession();
    if (!session) return;
    try {
      await runMutation(actionMutationKey(action), async () => {
        assertCurrentSession(session);
        let nextView: ClientView;
        try {
          nextView = await client.performAction(
            session.sessionId,
            action.id,
            action.eventId,
            freeText,
            action.sourceRecordId && action.sourceArtifactId
              ? {
                  sourceRecordId: action.sourceRecordId,
                  sourceArtifactId: action.sourceArtifactId,
                }
              : undefined,
            action.ticketPayload,
          );
        } catch (cause) {
          throw new Error("That action could not be completed.", { cause });
        }
        const success =
          action.id === "update_ticket_notes"
            ? "Investigation notes saved."
            : action.id === "update_notebook"
              ? "Notebook saved."
              : action.id === "search_knowledge_base"
                ? "Guide search updated."
                : `${action.label} completed.`;
        return {
          result: nextView,
          view: nextView,
          success,
          ...(action.id === "complete_shift"
            ? {
                onApplied: () => {
                  assertCurrentSession(session);
                  void loadDebrief(session);
                },
              }
            : {}),
        };
      });
    } catch {
      // The coordinator owns visible mutation errors and safe retry.
    }
  }

  async function submitTaskAttempt(
    task: ClientTaskView,
    selectedOptionIds: string[],
  ) {
    const session = currentSession();
    if (!session) {
      return {
        accepted: false,
        completed: false,
        feedback: "Session is not ready.",
      };
    }
    const result = await runMutation(taskMutationKey(task), async () => {
      assertCurrentSession(session);
      try {
        const outcome = await client.submitTaskAttempt(
          session.sessionId,
          task.id,
          task.eventId,
          selectedOptionIds,
        );
        return {
          result: outcome,
          view: outcome.view,
          success: outcome.accepted
            ? outcome.completed
              ? `Task complete. ${outcome.feedback}`
              : `Step ${String(task.stepIndex + 1)} complete. ${outcome.feedback}`
            : outcome.feedback,
        };
      } catch (cause) {
        throw new Error("That work step could not be checked.", { cause });
      }
    });
    return {
      accepted: result.accepted,
      completed: result.completed,
      feedback: result.feedback,
    };
  }

  async function respondToWorkNotification(
    notification: ClientNotification,
    response: NotificationResponse["response"],
    onApplied?: () => void,
  ) {
    const session = currentSession();
    if (!session) return;
    try {
      await runMutation(
        notificationMutationKey(notification, response),
        async () => {
          assertCurrentSession(session);
          try {
            const nextView = await client.respondToNotification(
              session.sessionId,
              notification.id,
              response,
            );
            return {
              result: nextView,
              view: nextView,
              success:
                response === "handle"
                  ? "Notification opened."
                  : response === "snooze"
                    ? "Notification snoozed."
                    : "Current case continued.",
              ...(response === "handle" &&
              onApplied &&
              nextView.notifications.find(({ id }) => id === notification.id)
                ?.status !== "unread"
                ? { onApplied }
                : {}),
            };
          } catch (cause) {
            throw new Error("That notification choice could not be saved.", {
              cause,
            });
          }
        },
      );
    } catch {
      // The coordinator owns visible mutation errors and safe retry.
    }
  }

  async function performWorkplaceInteraction(
    interaction: WorkplaceInteraction,
  ) {
    const session = currentSession();
    if (!session) throw new Error("Session is not ready");
    return runMutation(workplaceMutationKey(interaction), async () => {
      assertCurrentSession(session);
      try {
        const result = await client.performWorkplaceInteraction(
          session.sessionId,
          interaction,
        );
        return {
          result,
          view: result.view,
          ...(interaction.type === "movement_exertion"
            ? {}
            : { success: "Workplace updated." }),
        };
      } catch (cause) {
        const detail =
          cause instanceof Error && cause.message
            ? cause.message
            : "That workplace interaction could not be completed.";
        throw new Error(detail, { cause });
      }
    });
  }

  return (
    <main>
      <header className="site-header">
        <div className="site-brand">
          <p className="brand-mark">Career Expo</p>
          <h1>Junior Cybersecurity Analyst</h1>
          <p className="site-lede">
            Day one at {COMPANY.name} — try the job for a shift. Read, decide,
            and learn what the work is really like.
          </p>
          <p className="site-meta">
            <span className="site-chip">Assessed shift</span>
            <span className="site-chip site-chip-muted">{COMPANY.floor}</span>
          </p>
        </div>
      </header>

      {error ? (
        <div className="app-alert" role="alert">
          <p>{error}</p>
          {!view ? (
            <button
              type="button"
              onClick={() => {
                setSessionRequest((current) => current + 1);
              }}
            >
              Retry starting shift
            </button>
          ) : null}
        </div>
      ) : null}

      {!view ? (
        <p className="app-loading" aria-live="polite">
          {error ? "Your shift hasn't started yet — hit Retry to try again." : "Preparing workplace…"}
        </p>
      ) : debrief ? (
        <DebriefView debrief={debrief} />
      ) : debriefStatus ? (
        <section aria-label="Shift completion" aria-live="polite">
          <h2>Shift complete</h2>
          {debriefStatus === "failed" ? (
            <>
              <p role="alert">
                Debrief could not be loaded. Your completed work is saved.
              </p>
              <button
                type="button"
                onClick={() => {
                  const session = currentSession();
                  if (session) void loadDebrief(session);
                }}
              >
                Retry loading debrief
              </button>
            </>
          ) : (
            <p>Loading your debrief…</p>
          )}
        </section>
      ) : (
        <ExperienceShell
          onAction={(action, freeText) => void perform(action, freeText)}
          onNotification={respondToWorkNotification}
          onTaskAttempt={submitTaskAttempt}
          onWorkplaceInteraction={performWorkplaceInteraction}
          mutationState={mutationState}
          onRetryMutation={() => {
            void retryMutation().catch(() => {
              // The coordinator exposes the repeated failure in mutationState.
            });
          }}
          view={view}
        />
      )}

      <aside className="privacy-note">
        Reflections stay private unless you explicitly share them.
      </aside>
    </main>
  );
}

export { DebriefView } from "./components/DebriefView.js";
export { ShiftBriefing } from "./components/shell.js";
export type { SimulationClient } from "./client.js";
export { HttpSimulationClient } from "./client.js";
