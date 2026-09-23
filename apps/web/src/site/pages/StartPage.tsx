import { useState } from "react";
import { App } from "../../index.js";
import type { SimulationClient } from "../../client.js";
import { defaultClient } from "../../client.js";
import { ArrivalFilm } from "../ArrivalFilm.js";

type StartStep = "film" | "sim";

const GATE_KEY = "first-shift-start-gate";

function readGate(): StartStep | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.sessionStorage.getItem(GATE_KEY);
    // legacy "briefing" maps to sim — the intermediate briefing page was removed.
    if (stored === "sim" || stored === "briefing") return "sim";
    if (stored === "film") return stored;
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
 * /start gate: film plays through to frozen doors, DoorHud button
 * animates onto the doors (center), then straight to sim. No
 * intermediate briefing page — briefing lives inside the sim's own
 * ShiftBriefing. Single assessed shift; session creation stays inside
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
          go("sim");
        }}
      />
    );
  }

  return (
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
  );
}
