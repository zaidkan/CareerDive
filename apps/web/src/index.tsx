import { launchEvent } from "./analytics.js";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AvailableAction,
  ClientNotification,
  ClientTaskView,
  ClientView,
  Debrief,
  NotificationResponse,
  WorkplaceInteraction,
} from "@sim/schemas";
import {
  StartupFailure,
  PENDING_SESSION_KEY,
  defaultClient,
  type SimulationClient,
} from "./client.js";
import { DebriefView } from "./components/DebriefView.js";
import { DecisionAcknowledgement } from "./components/DecisionAcknowledgement.js";
import { ExperienceShell } from "./experience/ExperienceShell.js";
import { ProblemReport } from "./experience/ProblemReport.js";
import { COMPANY } from "./world/company.js";
import {
  actionMutationKey,
  notificationMutationKey,
  taskMutationKey,
  useMutationCoordinator,
  workplaceMutationKey,
} from "./useMutationCoordinator.js";
import "./styles.css";
import "./desk-os-polish.css";
import "./world/deskOs/workspace.css";
import { readTabValue, writeTabValue } from "./useTabDraft.js";
// Route changes retain the pending creation promise as well as its confirmed session.
const liveSessions = new WeakMap<
  SimulationClient,
  { promise: ReturnType<SimulationClient["createSession"]> }
>();
const SESSION_KEY = "career-expo-active-session";

export function App({ client = defaultClient }: { client?: SimulationClient }) {
  const [view, setView] = useState<ClientView>();
  const [sessionId, setSessionId] = useState<string>();
  const [debrief, setDebrief] = useState<Debrief>();
  const [error, setError] = useState<string>();
  const [startupStatus, setStartupStatus] = useState("Preparing your shift…");
  const [startupFailure, setStartupFailure] = useState<StartupFailure>();
  // Focus on attachment, before paint; passive effects can race a retry control becoming visible.
  const retryFocus = useCallback((node: HTMLButtonElement | null) => {
    node?.focus();
  }, []);
  const [sessionRequest, setSessionRequest] = useState(0);
  const [debriefStatus, setDebriefStatus] = useState<"loading" | "failed">();
  const creationRef = useRef<
    | {
        client: SimulationClient;
        attempt: number;
        promise: ReturnType<SimulationClient["createSession"]>;
      }
    | undefined
  >(undefined);
  const sessionGenerationRef = useRef(0);
  const startupActiveRef = useRef(false);
  const currentSessionRef = useRef<
    { generation: number; sessionId: string } | undefined
  >(undefined);
  const { invalidateMutations, mutationState, retryMutation, runMutation } =
    useMutationCoordinator(setView);

  useEffect(() => {
    startupActiveRef.current = true;
    const generation = ++sessionGenerationRef.current;
    currentSessionRef.current = undefined;
    invalidateMutations();
    setError(undefined);
    setStartupFailure(undefined);
    setStartupStatus("Preparing your shift…");
    setView(undefined);
    setDebrief(undefined);
    setDebriefStatus(undefined);
    const freshInput = {
      createRequestId: crypto.randomUUID(),
      seed: Date.now() & 0x7fffffff,
      sessionKind: "assessed",
      pacingMode: "standard",
    } as const;
    const input =
      client === defaultClient
        ? readTabValue<typeof freshInput>(
            "career-expo-create-request",
            freshInput,
          )
        : freshInput;
    if (client === defaultClient)
      writeTabValue("career-expo-create-request", input);
    const isCurrent = () => generation === sessionGenerationRef.current;
    void (async () => {
      try {
        if (
          !creationRef.current ||
          creationRef.current.client !== client ||
          creationRef.current.attempt !== sessionRequest
        ) {
          // Cache the whole retry sequence: StrictMode must not duplicate session creation.
          const existing = liveSessions.get(client);
          const savedId =
            client === defaultClient
              ? readTabValue<string | null>(SESSION_KEY, null)
              : null;
          const promise =
            (existing && client.getSession
              ? existing.promise
                  .then(
                    ({ sessionId }) =>
                      client.getSession?.(sessionId) ?? existing.promise,
                  )
                  .catch(() => {
                    throw new StartupFailure(true, "resume-unavailable");
                  })
              : existing?.promise) ??
            (async () => {
              if (savedId && client.getSession) {
                try {
                  return await client.getSession(savedId);
                } catch {
                  throw new StartupFailure(true, "resume-unavailable");
                }
              }
              try {
                launchEvent(
                  "start_initiated",
                  "cybersecurity-analyst",
                  input.createRequestId,
                );
                return await client.createSession(input);
              } catch (cause) {
                if (!(cause instanceof StartupFailure) || !cause.safeToRetry)
                  throw cause;
                if (
                  startupActiveRef.current &&
                  creationRef.current?.client === client &&
                  creationRef.current.attempt === sessionRequest
                )
                  setStartupStatus("Connection interrupted. Trying once more…");
                await new Promise((resolve) => setTimeout(resolve, 400));
                if (
                  !startupActiveRef.current ||
                  creationRef.current?.client !== client ||
                  creationRef.current.attempt !== sessionRequest
                )
                  throw cause;
                return client.createSession(input);
              }
            })();
          liveSessions.set(client, { promise });
          creationRef.current = { client, attempt: sessionRequest, promise };
          void promise.catch(() => {
            if (liveSessions.get(client)?.promise === promise)
              liveSessions.delete(client);
          });
        }
        const created = await creationRef.current.promise;
        if (client === defaultClient) {
          writeTabValue(SESSION_KEY, created.sessionId);
          writeTabValue(PENDING_SESSION_KEY, false);
        }
        if (!isCurrent()) return;
        currentSessionRef.current = {
          generation,
          sessionId: created.sessionId,
        };
        launchEvent(
          "shift_started",
          "cybersecurity-analyst",
          created.sessionId,
        );
        setSessionId(created.sessionId);
        setView(created.view);
        if (created.view.completed) {
          void loadDebrief({ generation, sessionId: created.sessionId });
        }
      } catch (cause) {
        if (!isCurrent()) return;
        const failure =
          cause instanceof StartupFailure
            ? cause
            : new StartupFailure(false, "creation-unconfirmed");
        setStartupFailure(failure);
        setError(
          failure.category === "resume-unavailable"
            ? "Your saved shift could not be loaded. Your place is kept; retry the connection instead of starting over."
            : failure.safeToRetry
              ? "We couldn't connect to start your shift. Your place is kept. Try again when you're ready."
              : "We couldn't confirm whether your shift started. To avoid starting it twice, we've paused here. Report the problem for help.",
        );
      }
    })();
    return () => {
      startupActiveRef.current = false;
      sessionGenerationRef.current += 1;
    };
  }, [client, invalidateMutations, sessionRequest]);

  useEffect(() => {
    if (sessionId && view)
      liveSessions.set(client, {
        promise: Promise.resolve({ sessionId, view }),
      });
  }, [client, sessionId, view]);

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
      launchEvent("debrief_viewed", "cybersecurity-analyst", session.sessionId);
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
            action.decisionOptionId,
            action.queryPayload,
            action.handoffPayload,
          );
        } catch (cause) {
          throw new Error("That action could not be completed.", { cause });
        }
        if (action.decisionOptionId)
          launchEvent(
            "decision",
            "cybersecurity-analyst",
            `${session.sessionId}:${action.eventId}:${action.decisionOptionId}`,
          );
        if (action.handoffPayload)
          launchEvent("handoff", "cybersecurity-analyst", session.sessionId);
        if (action.id === "complete_shift")
          launchEvent(
            "shift_completed",
            "cybersecurity-analyst",
            session.sessionId,
          );
        if (action.queryPayload || action.sourceRecordId)
          launchEvent(
            "meaningful_investigation",
            "cybersecurity-analyst",
            session.sessionId,
          );
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
        if (
          interaction.type === "open_artifact" &&
          result.feedback === "artifact_opened"
        )
          launchEvent(
            "meaningful_investigation",
            "cybersecurity-analyst",
            session.sessionId,
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
    <main className="simulation-main">
      <header className="site-header">
        <div className="site-brand">
          <p className="brand-mark">CareerDive</p>
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
        <div
          className="app-alert"
          role="alert"
          tabIndex={-1}
          ref={(node) => {
            if (!startupFailure?.safeToRetry) node?.focus();
          }}
        >
          <p>{error}</p>
          {!view && startupFailure?.safeToRetry ? (
            <button
              ref={retryFocus}
              type="button"
              onClick={() => {
                setSessionRequest((current) => current + 1);
              }}
            >
              Retry starting shift
            </button>
          ) : null}
          <ProblemReport
            context={{
              phase: "starting-shift",
              apiFailure: startupFailure?.category ?? "unknown",
            }}
          />
        </div>
      ) : null}

      {!view ? (
        <p className="app-loading" aria-live="polite">
          {error ? "Your place on this page is kept." : startupStatus}
        </p>
      ) : debrief ? (
        <DebriefView
          debrief={debrief}
          sourceTitles={Object.fromEntries(
            view.artifacts.map(({ id, title }) => [id, title]),
          )}
        />
      ) : debriefStatus ? (
        <section
          aria-label="Shift completion"
          aria-live="polite"
          className="shift-completion"
        >
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
            <p>Gathering your decisions and evidence into a review…</p>
          )}
        </section>
      ) : (
        <>
          <DecisionAcknowledgement
            sessionId={view.sessionId}
            items={view.acknowledgements ?? []}
          />
          <ExperienceShell
            key={view.sessionId}
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
        </>
      )}

      <aside className="privacy-note">
        Submitted reflections become part of your CareerDive session. See
        Privacy and safety for access limits.
      </aside>
    </main>
  );
}

export { DebriefView } from "./components/DebriefView.js";
export { ShiftBriefing } from "./components/shell.js";
export type { SimulationClient } from "./client.js";
export { HttpSimulationClient } from "./client.js";
