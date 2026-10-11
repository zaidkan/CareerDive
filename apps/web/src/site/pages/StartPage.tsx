import { lazy, Suspense, useEffect, useState } from "react";
import type { SimulationClient } from "../../client.js";
import { ThresholdBrief } from "../ThresholdBrief.js";
import { navigate } from "../routes.js";

const App = lazy(async () => {
  const mod = await import("../../index.js");
  return { default: mod.App };
});

type Gate = "film" | "sim";
const GATE_KEY = "first-shift-start-gate";

function readGate(): Gate | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.sessionStorage.getItem(GATE_KEY);
    if (v === "sim" || v === "briefing") return "sim";
    if (v === "film") return "film";
  } catch {
    // ignore
  }
  return null;
}
function writeGate(g: Gate): void {
  try {
    window.sessionStorage.setItem(GATE_KEY, g);
  } catch {
    // ignore - gate still works in memory
  }
}

type Phase = "brief" | "sim";

export function StartPage({ client }: { client?: SimulationClient }) {
  // Capture entry intent before Continue writes the existing in-sim gate.
  // A reload/resume skips both the brief and the room-entry film.
  const [entryGate] = useState(readGate);
  const [phase, setPhase] = useState<Phase>(() =>
    entryGate === "sim" ? "sim" : "brief",
  );

  useEffect(() => {
    if (phase === "brief") void import("../../index.js").catch(() => {});
  }, [phase]);

  function handleContinueToSim() {
    writeGate("sim");
    setPhase("sim");
  }

  function handleLeave() {
    // Before a live session exists: leave immediately (no invented data-loss claim)
    // Brief is pre-session/ephemeral so honest leave is just navigation
    navigate("/careers/cybersecurity-analyst");
  }

  const rail = phase === "brief" ? 0 : 1;

  if (phase === "brief") {
    return (
      <ThresholdShell rail={rail}>
        <ThresholdBrief
          onContinue={handleContinueToSim}
          onLeave={handleLeave}
        />
      </ThresholdShell>
    );
  }

  // ponytail: keep existing runtime ownership — no changes to createSession/auth/baseline/journey
  return (
    <Suspense
      fallback={
        <ThresholdShell rail={rail}>
          <div
            className="threshold-connecting"
            aria-live="polite"
            aria-busy="true"
          >
            <p className="threshold-connecting-title">Connecting to Verdaly</p>
            <p className="mode-note">Entering Floor 12…</p>
          </div>
        </ThresholdShell>
      }
    >
      <App
        arrivalFilmEnabled={entryGate !== "sim"}
        {...(client ? { client } : {})}
      />
    </Suspense>
  );
}

function ThresholdShell({
  children,
  rail,
}: {
  children: React.ReactNode;
  rail: number;
}) {
  return (
    <div className="threshold">
      <nav className="threshold-rail" aria-label="Threshold">
        <ol>
          <li
            aria-current={rail === 0 ? "step" : undefined}
            className={rail >= 0 ? "is-active" : ""}
          >
            Brief
          </li>
          <li
            aria-current={rail === 1 ? "step" : undefined}
            className={rail >= 1 ? "is-active" : ""}
          >
            Find floor
          </li>
        </ol>
      </nav>
      {children}
    </div>
  );
}
