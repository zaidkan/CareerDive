import { useEffect, useState } from "react";
import type {
  AvailableAction,
  ClientNotification,
  ClientTaskView,
  ClientView,
  Debrief,
  NotificationResponse,
} from "@sim/schemas";
import { defaultClient, type SimulationClient } from "./client.js";
import { DebriefView } from "./components/DebriefView.js";
import { getTutorialStep } from "./guidance.js";
import { ManagerContext, ShiftBriefing } from "./components/shell.js";
import { COMPANY } from "./world/company.js";
import { SpatialShell } from "./world/SpatialShell.js";

export function App({ client = defaultClient }: { client?: SimulationClient }) {
  const [view, setView] = useState<ClientView>();
  const [sessionId, setSessionId] = useState<string>();
  const [debrief, setDebrief] = useState<Debrief>();
  const [error, setError] = useState<string>();
  const [phase, setPhase] = useState<"tutorial" | "assessed">("tutorial");
  const [activeSurface, setActiveSurface] = useState<
    "briefing" | "dashboard" | "manager"
  >("briefing");

  useEffect(() => {
    void client
      .createSession({
        seed: Date.now() & 0x7fffffff,
        sessionKind: "tutorial",
        pacingMode: "practice",
      })
      .then((created) => {
        setSessionId(created.sessionId);
        setView(created.view);
      })
      .catch(() => {
        setError("Simulation could not start. Try again shortly.");
      });
  }, [client]);

  async function startAssessedShift() {
    setError(undefined);
    setView(undefined);
    setDebrief(undefined);
    try {
      const created = await client.createSession({
        seed: Date.now() & 0x7fffffff,
        sessionKind: "assessed",
        pacingMode: "standard",
      });
      setSessionId(created.sessionId);
      setView(created.view);
      setPhase("assessed");
      setActiveSurface("briefing");
    } catch {
      setError("Assessed shift could not start. Try again shortly.");
    }
  }

  async function perform(action: AvailableAction, freeText?: string) {
    if (!sessionId) return;
    try {
      const nextView = await client.performAction(
        sessionId,
        action.id,
        action.eventId,
        freeText,
      );
      setView(nextView);
      if (action.id === "ask_manager") {
        setActiveSurface("manager");
      }
      if (action.id === "complete_shift") {
        setDebrief(await client.getDebrief(sessionId));
      }
    } catch {
      setError("That action could not be completed.");
    }
  }

  async function submitTaskAttempt(
    task: ClientTaskView,
    selectedOptionIds: string[],
  ) {
    if (!sessionId) {
      return {
        accepted: false,
        completed: false,
        feedback: "Session is not ready.",
      };
    }
    try {
      const result = await client.submitTaskAttempt(
        sessionId,
        task.id,
        task.eventId,
        selectedOptionIds,
      );
      setView(result.view);
      return {
        accepted: result.accepted,
        completed: result.completed,
        feedback: result.feedback,
      };
    } catch {
      setError("That work step could not be checked.");
      return {
        accepted: false,
        completed: false,
        feedback: "Something interrupted the check. Try again.",
      };
    }
  }

  async function respondToWorkNotification(
    notification: ClientNotification,
    response: NotificationResponse["response"],
  ) {
    if (!sessionId) return;
    try {
      setView(
        await client.respondToNotification(
          sessionId,
          notification.id,
          response,
        ),
      );
    } catch {
      setError("That notification choice could not be saved.");
    }
  }

  const tutorialComplete =
    phase === "tutorial" && view && !getTutorialStep(view);
  const phaseLabel = phase === "tutorial" ? "Practice shift" : "Assessed shift";

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
            <span className="site-chip">{phaseLabel}</span>
            <span className="site-chip site-chip-muted">{COMPANY.floor}</span>
          </p>
        </div>
      </header>

      {error ? (
        <p className="app-alert" role="alert">
          {error}
        </p>
      ) : null}

      {phase === "tutorial" && view ? (
        <div className="shift-cta-row">
          {tutorialComplete ? (
            <button
              className="start-shift"
              onClick={() => {
                void startAssessedShift();
              }}
              type="button"
            >
              Start real shift
            </button>
          ) : (
            <button
              className="skip-tutorial"
              onClick={() => {
                void startAssessedShift();
              }}
              type="button"
            >
              Skip practice — start real shift
            </button>
          )}
        </div>
      ) : null}

      {!view ? (
        <p className="app-loading" aria-live="polite">
          Preparing workplace…
        </p>
      ) : debrief ? (
        <DebriefView debrief={debrief} />
      ) : activeSurface === "briefing" ? (
        <ShiftBriefing
          onOpen={() => {
            setActiveSurface("dashboard");
          }}
        />
      ) : activeSurface === "manager" ? (
        <ManagerContext
          message={
            [...view.operationalMessages]
              .reverse()
              .find((message) => message.startsWith("Morgan ")) ??
            "Morgan has no additional context available."
          }
          onReturn={() => {
            setActiveSurface("dashboard");
          }}
        />
      ) : (
        <SpatialShell
          guided={phase === "tutorial"}
          onAction={(action, freeText) => void perform(action, freeText)}
          onNotification={respondToWorkNotification}
          onTaskAttempt={submitTaskAttempt}
          view={view}
        />
      )}

      <aside className="privacy-note">
        Reflections stay private unless you explicitly share them.
      </aside>
    </main>
  );
}

export { AccessibleMode } from "./components/AccessibleMode.js";
export { DebriefView } from "./components/DebriefView.js";
export { WorkSurface } from "./components/WorkSurface.js";
export { ManagerContext, ShiftBriefing, Tutorial } from "./components/shell.js";
export type { SimulationClient } from "./client.js";
export { HttpSimulationClient } from "./client.js";
