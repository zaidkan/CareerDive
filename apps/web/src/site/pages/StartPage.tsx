import { lazy, Suspense, useEffect, useState } from "react";
import type { SimulationClient } from "../../client.js";

const App = lazy(async () => {
  const mod = await import("../../index.js");
  return { default: mod.App };
});
const GATE_KEY = "first-shift-start-gate";

function isResume(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const gate = window.sessionStorage.getItem(GATE_KEY);
    return gate === "sim" || gate === "briefing";
  } catch {
    return false;
  }
}

export function StartPage({ client }: { client?: SimulationClient }) {
  // Capture fresh entry before marking this tab as a resume.
  const [resume] = useState(isResume);
  useEffect(() => {
    try {
      window.sessionStorage.setItem(GATE_KEY, "sim");
    } catch {
      // Entry still works without storage.
    }
  }, []);
  return (
    <Suspense fallback={<p role="status">Opening your floor map…</p>}>
      <App arrivalFilmEnabled={!resume} {...(client ? { client } : {})} />
    </Suspense>
  );
}
