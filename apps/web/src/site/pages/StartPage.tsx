import { lazy, Suspense, useMemo, useState } from "react";
import type { SimulationClient } from "../../client.js";
import { defaultClient } from "../../client.js";
import { ArrivalFilm } from "../ArrivalFilm.js";

/** Film never needs the sim shell; pay for App only on Enter. */
const App = lazy(async () => {
  const mod = await import("../../index.js");
  return { default: mod.App };
});

type StartStep = "film" | "sim";

const GATE_KEY = "first-shift-start-gate";

function readGate(): StartStep | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.sessionStorage.getItem(GATE_KEY);
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
 * /start gate: film freezes at doors → DoorHud button animates onto doors
 * and goes straight to the sim. No extra briefing page — briefing lives
 * inside the sim. Single assessed shift.
 */
export function StartPage({
  client = defaultClient,
}: {
  client?: SimulationClient;
}) {
  const [step, setStep] = useState<StartStep>(() => readGate() ?? "film");

  // Stable identity: a new object per render would retrigger App's
  // createSession effect and surface a false start-up failure.
  const assessedClient = useMemo<SimulationClient>(
    () => ({
      ...client,
      createSession: (input) =>
        client.createSession({
          ...input,
          sessionKind: "assessed",
          pacingMode: "standard",
        }),
    }),
    [client],
  );

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
    <Suspense fallback={<p className="mode-note">Entering the floor…</p>}>
      <App briefing="hidden" client={assessedClient} />
    </Suspense>
  );
}
