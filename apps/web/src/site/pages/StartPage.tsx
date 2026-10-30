import { lazy, Suspense, useEffect, useState } from "react";
import type { SimulationClient } from "../../client.js";
import { acknowledgeStart, hasStartConsent, StartConsent } from "../StartConsent.js";
import {
  markStartIntent,
  markStartIntentIfMissing,
  warmApiServer,
} from "../apiWarmup.js";

const App = lazy(async () => {
  const mod = await import("../../index.js");
  return { default: mod.App };
});
const GATE_KEY = "first-shift-start-gate";

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
            onPointerEnter={() => { if (!client) warmApiServer(); }}
            onFocus={() => { if (!client) warmApiServer(); }}
            onClick={() => {
              markStartIntent();
              if (!client) warmApiServer();
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
  useEffect(() => {
    markStartIntentIfMissing();
    if (!client) warmApiServer();
    try {
      window.sessionStorage.setItem(GATE_KEY, "sim");
    } catch {
      // Entry still works without storage.
    }
  }, []);
  return (
    <Suspense fallback={<p role="status">Opening your floor map…</p>}>
      <App arrivalFilmEnabled {...(client ? { client } : {})} />
    </Suspense>
  );
}
