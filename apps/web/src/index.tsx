import { useEffect, useState } from "react";
import { createTRPCUntypedClient, httpBatchLink } from "@trpc/client";
import {
  ClientViewSchema,
  DebriefSchema,
  SimulationActionIdSchema,
  type ClientView,
  type Debrief,
  type SimulationActionId,
} from "@sim/schemas";
import { z } from "zod";

export interface SimulationClient {
  createSession(input: {
    seed: number;
    sessionKind: "tutorial" | "assessed";
    pacingMode:
      | "standard"
      | "extended"
      | "pause_compatible"
      | "no_hard_timer"
      | "practice";
  }): Promise<{ sessionId: string; view: ClientView }>;
  performAction(
    sessionId: string,
    actionId: SimulationActionId,
  ): Promise<ClientView>;
  getDebrief(sessionId: string): Promise<Debrief>;
}

const SessionResultSchema = z.object({
  sessionId: z.string(),
  view: ClientViewSchema,
});
const TurnResultSchema = z.object({ view: ClientViewSchema });

export class HttpSimulationClient implements SimulationClient {
  readonly #client: ReturnType<typeof createTRPCUntypedClient>;

  constructor(baseUrl: string) {
    this.#client = createTRPCUntypedClient({
      links: [
        httpBatchLink({
          url: `${baseUrl}/trpc`,
          headers: { "x-user-id": "local-user" },
        }),
      ],
    });
  }

  async createSession(
    input: Parameters<SimulationClient["createSession"]>[0],
  ): Promise<{ sessionId: string; view: ClientView }> {
    return SessionResultSchema.parse(
      await this.#client.mutation("session.create", input),
    );
  }

  async performAction(
    sessionId: string,
    actionId: SimulationActionId,
  ): Promise<ClientView> {
    return TurnResultSchema.parse(
      await this.#client.mutation("simulation.performAction", {
        sessionId,
        actionId,
      }),
    ).view;
  }

  async getDebrief(sessionId: string): Promise<Debrief> {
    return DebriefSchema.parse(
      await this.#client.query("debrief.get", { sessionId }),
    );
  }
}

const configuredServerUrl: unknown = import.meta.env.VITE_SERVER_URL;
const defaultClient = new HttpSimulationClient(
  typeof configuredServerUrl === "string"
    ? configuredServerUrl
    : "http://localhost:3001",
);

type ModeProps = {
  view: ClientView;
  onAction: (actionId: SimulationActionId) => void;
};

export function WorkSurface({ view, onAction }: ModeProps) {
  return (
    <section className="work-surface" aria-labelledby="dashboard-title">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Alert dashboard</p>
          <h2 id="dashboard-title">Active queue</h2>
        </div>
        <time
          aria-label={`${String(view.simClock)} simulated minutes elapsed`}
        >
          Shift +{view.simClock}m
        </time>
      </div>

      <div className="event-list">
        {view.events.map((event) => (
          <article className="event-card" key={event.id}>
            <span className={`status status-${event.status}`}>
              {event.status.replaceAll("_", " ")}
            </span>
            <h3>{event.title}</h3>
            {event.resolution ? <p>{event.resolution}</p> : null}
          </article>
        ))}
      </div>

      <div className="action-grid" aria-label="Available actions">
        {view.availableActions.map((action) => (
          <button
            className="action-card"
            data-action-id={action.id}
            key={action.id}
            onClick={() => {
              onAction(action.id);
            }}
            type="button"
          >
            <span>{action.label}</span>
            <small>{action.description}</small>
            <small>{action.simulatedMinutes} simulated minutes</small>
          </button>
        ))}
      </div>
      <OperationalMessages messages={view.operationalMessages} />
    </section>
  );
}

export function AccessibleMode({ view, onAction }: ModeProps) {
  return (
    <section aria-labelledby="structured-title">
      <h2 id="structured-title">Structured workplace view</h2>
      <p>
        Location: {view.currentLocation.name}. Simulated time elapsed:{" "}
        {view.simClock} minutes.
      </p>
      <h3>Current events</h3>
      <ul>
        {view.events.map((event) => (
          <li key={event.id}>
            {event.title}: {event.status.replaceAll("_", " ")}
          </li>
        ))}
      </ul>
      <h3>Available actions</h3>
      <div className="accessible-actions">
        {view.availableActions.map((action) => (
          <button
            data-action-id={action.id}
            key={action.id}
            onClick={() => {
              onAction(action.id);
            }}
            type="button"
          >
            {action.label}. {action.description}
          </button>
        ))}
      </div>
      <OperationalMessages messages={view.operationalMessages} />
    </section>
  );
}

function OperationalMessages({ messages }: { messages: string[] }) {
  return (
    <div aria-live="polite" aria-atomic="false" className="activity-log">
      <h3>Workplace updates</h3>
      {messages.length === 0 ? (
        <p>No new workplace update.</p>
      ) : (
        <ul>
          {messages.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Tutorial() {
  return (
    <section className="tutorial" aria-labelledby="tutorial-title">
      <p className="eyebrow">Before assessed play</p>
      <h2 id="tutorial-title">Practice tutorial</h2>
      <p>
        Practice opening systems, reviewing events, choosing actions, asking
        for context, pausing, and changing pacing. This tutorial does not
        record evidence.
      </p>
      <ol>
        <li>Read current event and operational details.</li>
        <li>Choose one available workplace action.</li>
        <li>Review consequences before continuing.</li>
      </ol>
    </section>
  );
}

const DEBRIEF_LABELS: Array<[keyof Debrief["sections"], string]> = [
  ["whatHappened", "What happened"],
  ["whatYouDid", "What you did"],
  ["consequences", "Consequences"],
  ["earlyEvidence", "Early evidence"],
  ["yourExperience", "Your experience"],
  ["confidenceAndLimitations", "Confidence and limitations"],
  ["careerReality", "Career reality"],
  ["nextAction", "Next action"],
];

export function DebriefView({ debrief }: { debrief: Debrief }) {
  return (
    <section aria-labelledby="debrief-title">
      <p className="eyebrow">
        Confidence: {debrief.confidence.replaceAll("_", " ")}
      </p>
      <h2 id="debrief-title">Shift debrief</h2>
      <div className="debrief-grid">
        {DEBRIEF_LABELS.map(([key, label]) => (
          <article key={key}>
            <h3>{label}</h3>
            <p>{debrief.sections[key]}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function App({
  client = defaultClient,
}: {
  client?: SimulationClient;
}) {
  const [view, setView] = useState<ClientView>();
  const [sessionId, setSessionId] = useState<string>();
  const [mode, setMode] = useState<"work" | "accessible">("work");
  const [debrief, setDebrief] = useState<Debrief>();
  const [error, setError] = useState<string>();
  const [phase, setPhase] = useState<"tutorial" | "assessed">("tutorial");

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
    } catch {
      setError("Assessed shift could not start. Try again shortly.");
    }
  }

  async function perform(actionId: SimulationActionId) {
    if (!sessionId) return;
    try {
      const nextView = await client.performAction(sessionId, actionId);
      setView(nextView);
      if (actionId === "complete_shift") {
        setDebrief(await client.getDebrief(sessionId));
      }
    } catch {
      setError("That action could not be completed.");
    }
  }

  return (
    <main>
      <header className="site-header">
        <div>
          <p className="eyebrow">Career Expo</p>
          <h1>Junior Cybersecurity Analyst</h1>
          <p>Ordinary monitoring. Careful investigation. Clear communication.</p>
        </div>
        <div className="mode-switch" aria-label="Interaction mode">
          <button
            aria-pressed={mode === "work"}
            onClick={() => {
              setMode("work");
            }}
            type="button"
          >
            Work surface
          </button>
          <button
            aria-pressed={mode === "accessible"}
            onClick={() => {
              setMode("accessible");
            }}
            type="button"
          >
            Structured mode
          </button>
        </div>
      </header>
      {error ? <p role="alert">{error}</p> : null}
      {phase === "tutorial" ? (
        <>
          <Tutorial />
          <button
            className="start-shift"
            onClick={() => {
              void startAssessedShift();
            }}
            type="button"
          >
            Start assessed shift
          </button>
        </>
      ) : null}
      {!view ? (
        <p aria-live="polite">Preparing workplace…</p>
      ) : debrief ? (
        <DebriefView debrief={debrief} />
      ) : mode === "work" ? (
        <WorkSurface
          view={view}
          onAction={(id) => {
            void perform(id);
          }}
        />
      ) : (
        <AccessibleMode
          view={view}
          onAction={(id) => {
            void perform(id);
          }}
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
