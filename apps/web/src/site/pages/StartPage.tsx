import { lazy, Suspense, useEffect, useState } from "react";
import type { SimulationClient } from "../../client.js";
import { ArrivalFilm } from "../ArrivalFilm.js";
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

type Phase = "arrive" | "brief" | "sim";

export function StartPage({ client }: { client?: SimulationClient }) {
  const [phase, setPhase] = useState<Phase>(() => (readGate() === "sim" ? "sim" : "arrive"));

  useEffect(() => {
    if (phase === "brief") void import("../../index.js").catch(() => {});
  }, [phase]);

  function handleSeen() {
    setPhase("brief");
  }

  function handleContinueToSim() {
    writeGate("sim");
    setPhase("sim");
  }

  function handleLeave() {
    // Before a live session exists: leave immediately (no invented data-loss claim)
    // Brief is pre-session/ephemeral so honest leave is just navigation
    navigate("/careers/cybersecurity-analyst");
  }

  const rail = phase === "arrive" ? 0 : phase === "brief" ? 1 : 2;

  if (phase === "arrive") {
    return (
      <ThresholdShell rail={rail}>
        <ArrivalFilm onSeen={handleSeen} />
      </ThresholdShell>
    );
  }

  if (phase === "brief") {
    return (
      <ThresholdShell rail={rail}>
        <ThresholdBrief onContinue={handleContinueToSim} onLeave={handleLeave} />
      </ThresholdShell>
    );
  }

  // ponytail: keep existing runtime ownership — no changes to createSession/auth/baseline/journey
  return (
    <Suspense fallback={
      <ThresholdShell rail={rail}>
        <div className="threshold-connecting" aria-live="polite" aria-busy="true">
          <p className="threshold-connecting-title">Connecting to Verdaly</p>
          <p className="mode-note">Entering Floor 12…</p>
        </div>
      </ThresholdShell>
    }>
      <App {...(client ? { client } : {})} />
    </Suspense>
  );
}

function ThresholdShell({ children, rail }: { children: React.ReactNode; rail: number }) {
  return (
    <div className="threshold">
      <nav className="threshold-rail" aria-label="Threshold">
        <ol>
          <li aria-current={rail === 0 ? "step" : undefined} className={rail >= 0 ? "is-active" : ""}>
            Arrive
          </li>
          <li aria-current={rail === 1 ? "step" : undefined} className={rail >= 1 ? "is-active" : ""}>
            Brief
          </li>
          <li aria-current={rail === 2 ? "step" : undefined} className={rail >= 2 ? "is-active" : ""}>
            Find floor
          </li>
        </ol>
      </nav>
      {children}
    </div>
  );
}
