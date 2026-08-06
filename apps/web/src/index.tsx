import { useEffect, useState } from "react";
import {
  SimulationActionIdSchema,
  type AvailableAction,
  type ClientView,
  type Debrief,
  type SimulationActionId,
} from "@sim/schemas";
import { defaultClient, type SimulationClient } from "./client.js";
import { AccessibleMode } from "./components/AccessibleMode.js";
import { DebriefView } from "./components/DebriefView.js";
import { getTutorialStep } from "./guidance.js";
import {
  ManagerContext,
  ShiftBriefing,
  Tutorial,
} from "./components/shell.js";
import { SpatialShell } from "./world/SpatialShell.js";

export function App({ client = defaultClient }: { client?: SimulationClient }) {
  const [view, setView] = useState<ClientView>();
  const [sessionId, setSessionId] = useState<string>();
  const [mode, setMode] = useState<"work" | "accessible">("work");
  const [debrief, setDebrief] = useState<Debrief>();
  const [error, setError] = useState<string>();
  const [phase, setPhase] = useState<"tutorial" | "assessed">("tutorial");
  const [activeSurface, setActiveSurface] = useState<
    "briefing" | "dashboard" | "manager"
  >("dashboard");

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

  const tutorialComplete = phase === "tutorial" && view && !getTutorialStep(view);

  return (
    <main>
      <header className="site-header">
        <div>
          <p className="brand-mark">Career Expo</p>
          <h1>Junior Cybersecurity Analyst</h1>
          <p>
            Try the job for a shift. Read, decide, and learn what the work is
            really like.
          </p>
        </div>
        <div className="mode-switch" aria-label="Interaction mode">
          <button
            aria-pressed={mode === "work"}
            onClick={() => {
              setMode("work");
            }}
            type="button"
          >
            Desk view
          </button>
          <button
            aria-pressed={mode === "accessible"}
            onClick={() => {
              setMode("accessible");
            }}
            type="button"
          >
            Simple list
          </button>
        </div>
      </header>
      {error ? <p role="alert">{error}</p> : null}
      {phase === "tutorial" ? (
        view ? <Tutorial view={view} /> : <Tutorial />
      ) : null}
      {phase === "tutorial" && view ? (
        tutorialComplete ? (
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
        )
      ) : null}
      {!view ? (
        <p aria-live="polite">Preparing workplace…</p>
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
      ) : mode === "work" ? (
        <SpatialShell
          guided={phase === "tutorial"}
          onAction={(action, freeText) => void perform(action, freeText)}
          view={view}
        />
      ) : (
        <AccessibleMode
          onAction={(action, freeText) => void perform(action, freeText)}
          view={view}
        />
      )}
      <aside className="privacy-note">
        Reflections stay private unless you explicitly share them.
      </aside>
    </main>
  );
}

export function parseActionId(value: string): SimulationActionId {
  return SimulationActionIdSchema.parse(value);
}

export { AccessibleMode } from "./components/AccessibleMode.js";
export { DebriefView } from "./components/DebriefView.js";
export { WorkSurface } from "./components/WorkSurface.js";
export {
  ManagerContext,
  ShiftBriefing,
  Tutorial,
} from "./components/shell.js";
export type { SimulationClient } from "./client.js";
export { HttpSimulationClient } from "./client.js";
