import { lazy, Suspense, useState } from "react";
import type { SimulationClient } from "../../client.js";
import { defaultClient } from "../../client.js";
import { ArrivalFilm } from "../ArrivalFilm.js";

/** Film/briefing never need the sim shell; pay for App only on Enter. */
const App = lazy(async () => {
  const mod = await import("../../index.js");
  return { default: mod.App };
});

type StartStep = "film" | "briefing" | "sim";

const GATE_KEY = "first-shift-start-gate";

function readGate(): StartStep | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.sessionStorage.getItem(GATE_KEY);
    if (stored === "briefing" || stored === "film") return stored;
  } catch {
    // Storage unavailable; fall through to fresh gate.
  }
  return null;
}

function writeGate(step: StartStep): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(GATE_KEY, step);
  } catch {
    // Storage unavailable; gate still works in memory this session.
  }
}

/**
 * /start gate. Step 1 film gate (5s skip, reduced-motion DoorHud path,
 * freeze-at-doors on ended), step 2 briefing, then sim boot. Single
 * assessed shift; no practice variant. Session creation stays inside
 * <App/> so bounces never pay sim cost.
 */
export function StartPage({
  client = defaultClient,
}: {
  client?: SimulationClient;
}) {
  const [step, setStep] = useState<StartStep>(() => readGate() ?? "film");

  function go(next: StartStep): void {
    writeGate(next);
    setStep(next);
  }

  if (step === "film") {
    return (
      <ArrivalFilm
        required
        onSeen={() => {
          go("briefing");
        }}
      />
    );
  }

  if (step === "briefing") {
    return (
      <section className="page-section" aria-labelledby="start-briefing">
        <p className="eyebrow">Step 2 of 2 · Verdaly Technologies · Floor 12</p>
        <h2 id="start-briefing">You are at the doors. Ready?</h2>
        <p className="lede">
          Badge in, walk the floor, meet the team. Your desk is in Security
          Operations. Read the handoff, ask questions, take your time — real
          work is not a race.
        </p>
        <div className="hero-ctas">
          <button
            type="button"
            className="button-secondary"
            onClick={() => {
              go("film");
            }}
          >
            Back
          </button>
          <button
            type="button"
            className="start-shift"
            onClick={() => {
              go("sim");
            }}
          >
            Enter the Verdaly floor
          </button>
        </div>
        <p className="mode-note">
          Entering creates your session now. Walk, Desk, or Simple list choice
          follows inside.
        </p>
      </section>
    );
  }

  return (
    <Suspense fallback={<p className="mode-note">Entering the floor…</p>}>
      <App
        briefing="hidden"
        client={{
          ...client,
          createSession: (input: {
            seed: number;
            sessionKind: "tutorial" | "assessed";
            pacingMode:
              | "standard"
              | "extended"
              | "pause_compatible"
              | "no_hard_timer"
              | "practice";
          }) => client.createSession({ ...input, sessionKind: "assessed" }),
        }}
      />
    </Suspense>
  );
}
