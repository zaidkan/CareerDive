import { lazy, Suspense, useEffect, useState } from "react";
import type { SimulationClient } from "../../client.js";
import { acknowledgeStart, hasStartConsent, StartConsent } from "../StartConsent.js";

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
  const [accepted, setAccepted] = useState(hasStartConsent);
  if (!accepted) {
    return (
      <article className="page-section page-hero start-entry">
        <h1>Start your first day</h1>
        <p className="lede">Try the Cybersecurity Analyst shift at fictional Verdaly.</p>
        <div className="start-cta">
          <button
            type="button"
            className="start-shift"
            aria-describedby="start-entry-consent"
            onClick={() => {
              acknowledgeStart();
              setAccepted(true);
            }}
          >
            Start your first day
          </button>
          <StartConsent id="start-entry-consent" />
        </div>
      </article>
    );
  }
  return <ConsentedStart {...(client ? { client } : {})} />;
}

function ConsentedStart({ client }: { client?: SimulationClient }) {
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
