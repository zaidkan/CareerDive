import { useEffect, useState } from "react";
import { createTRPCUntypedClient, httpBatchLink } from "@trpc/client";
import {
  ClientViewSchema,
  DebriefSchema,
  SimulationActionIdSchema,
  type ClientView,
  type Debrief,
  type AvailableAction,
  type SimulationActionId,
  type WorkSystemId,
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
    eventId: string,
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
    eventId: string,
  ): Promise<ClientView> {
    return TurnResultSchema.parse(
      await this.#client.mutation("simulation.performAction", {
        sessionId,
        actionId,
        eventId,
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
  onAction: (action: AvailableAction) => void;
};

export function WorkSurface({ view, onAction }: ModeProps) {
  const initialSystem: WorkSystemId = view.events.some(
    ({ systemId }) => systemId === "email",
  )
    ? "email"
    : (view.events[0]?.systemId ?? "alert_dashboard");
  const [systemId, setSystemId] = useState<WorkSystemId>(initialSystem);
  const [selectedEventId, setSelectedEventId] = useState<string>();
  const visibleEvents = view.events.filter(
    ({ status }) => status !== "pending",
  );
  const systemEvents = visibleEvents.filter(
    (event) =>
      event.systemId === systemId ||
      view.availableActions.some(
        (action) => action.eventId === event.id && action.systemId === systemId,
      ),
  );
  const selectedEvent =
    systemEvents.find(({ id }) => id === selectedEventId) ?? systemEvents[0];
  const contextualActions = view.availableActions.filter(
    (action) =>
      action.systemId === systemId &&
      (action.eventId === selectedEvent?.id || action.eventId === "shift"),
  );

  return (
    <section className="workplace-shell" aria-labelledby="workspace-title">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">Security operations workstation</p>
          <h2 id="workspace-title">Analyst workspace</h2>
        </div>
        <time aria-label={`${String(view.simClock)} simulated minutes elapsed`}>
          Shift +{view.simClock}m
        </time>
      </header>

      <nav className="system-dock" aria-label="Work systems">
        {WORK_SYSTEMS.map((system) => {
          const count = visibleEvents.filter(
            (event) =>
              event.systemId === system.id ||
              view.availableActions.some(
                (action) =>
                  action.eventId === event.id && action.systemId === system.id,
              ),
          ).length;
          return (
            <button
              aria-pressed={systemId === system.id}
              key={system.id}
              onClick={() => {
                setSystemId(system.id);
                setSelectedEventId(undefined);
              }}
              type="button"
            >
              <span>{system.label}</span>
              <small>
                {count > 0 ? `${String(count)} open` : "No open work"}
              </small>
            </button>
          );
        })}
      </nav>

      <div className="workspace-grid">
        <aside
          className="work-queue"
          aria-label={`${systemLabel(systemId)} items`}
        >
          <p className="eyebrow">{systemLabel(systemId)}</p>
          {systemEvents.length === 0 ? (
            <p>No current item in this system.</p>
          ) : (
            systemEvents.map((event) => (
              <button
                aria-pressed={selectedEvent?.id === event.id}
                key={event.id}
                onClick={() => {
                  setSelectedEventId(event.id);
                }}
                type="button"
              >
                <span>{event.title}</span>
                <small>
                  {event.priority} priority ·{" "}
                  {event.status.replaceAll("_", " ")}
                </small>
              </button>
            ))
          )}
        </aside>

        <article className="work-detail">
          {selectedEvent ? (
            <>
              <div className="detail-meta">
                <span className={`status status-${selectedEvent.status}`}>
                  {selectedEvent.status.replaceAll("_", " ")}
                </span>
                <span>Due by shift +{selectedEvent.deadlineAt}m</span>
              </div>
              <h3>{selectedEvent.title}</h3>
              <p>{selectedEvent.summary}</p>
              {selectedEvent.resolution ? (
                <p className="resolution-note">{selectedEvent.resolution}</p>
              ) : null}
              <div
                className="context-actions"
                aria-label={`Actions for ${selectedEvent.title}`}
              >
                {contextualActions.length === 0 ? (
                  <p>
                    Continue this work in another system or review another item.
                  </p>
                ) : (
                  contextualActions.map((action) => (
                    <button
                      data-action-id={action.id}
                      data-event-id={action.eventId}
                      key={`${action.id}:${action.eventId}`}
                      onClick={() => {
                        onAction(action);
                      }}
                      type="button"
                    >
                      <span>{action.label}</span>
                      <small>{action.description}</small>
                      <small>{action.simulatedMinutes} simulated minutes</small>
                    </button>
                  ))
                )}
              </div>
            </>
          ) : (
            <>
              <h3>{systemLabel(systemId)}</h3>
              <p>
                {contextualActions.length > 0
                  ? "Your assigned work is ready for final handoff."
                  : "Select another system or wait for new assigned work."}
              </p>
              {contextualActions.map((action) => (
                <div className="context-actions" key={action.id}>
                  <button
                    data-action-id={action.id}
                    data-event-id={action.eventId}
                    onClick={() => {
                      onAction(action);
                    }}
                    type="button"
                  >
                    <span>{action.label}</span>
                    <small>{action.description}</small>
                  </button>
                </div>
              ))}
            </>
          )}
        </article>
      </div>

      <OperationalMessages messages={view.operationalMessages} />
    </section>
  );
}

const WORK_SYSTEMS: Array<{ id: WorkSystemId; label: string }> = [
  { id: "alert_dashboard", label: "Alerts" },
  { id: "email", label: "Email" },
  { id: "ticket_queue", label: "Tickets" },
  { id: "knowledge_base", label: "Knowledge Base" },
  { id: "team_chat", label: "Team Chat" },
];

function systemLabel(systemId: WorkSystemId): string {
  return WORK_SYSTEMS.find(({ id }) => id === systemId)?.label ?? "Work system";
}

export function AccessibleMode({ view, onAction }: ModeProps) {
  return (
    <section aria-labelledby="structured-title">
      <h2 id="structured-title">Structured workplace view</h2>
      <p>
        Location: {view.currentLocation.name}. Simulated time elapsed:{" "}
        {view.simClock} minutes.
      </p>
      {WORK_SYSTEMS.map((system) => {
        const actions = view.availableActions.filter(
          ({ systemId }) => systemId === system.id,
        );
        const events = view.events.filter(
          (event) =>
            event.systemId === system.id ||
            actions.some(({ eventId }) => eventId === event.id),
        );
        if (actions.length === 0 && events.length === 0) return null;
        return (
          <section className="structured-system" key={system.id}>
            <h3>{system.label}</h3>
            <ul>
              {events.map((event) => (
                <li key={event.id}>
                  <strong>{event.title}</strong>: {event.summary} Status:{" "}
                  {event.status.replaceAll("_", " ")}.
                </li>
              ))}
            </ul>
            <div className="accessible-actions">
              {actions.map((action) => (
                <button
                  data-action-id={action.id}
                  data-event-id={action.eventId}
                  key={`${action.id}:${action.eventId}`}
                  onClick={() => {
                    onAction(action);
                  }}
                  type="button"
                >
                  {action.label}. {action.description}
                </button>
              ))}
            </div>
          </section>
        );
      })}
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

export function ManagerContext({
  message,
  onReturn,
}: {
  message: string;
  onReturn: () => void;
}) {
  return (
    <section className="manager-context" aria-labelledby="manager-title">
      <div className="manager-profile" aria-hidden="true">
        <span>M</span>
      </div>
      <div>
        <p className="eyebrow">Security Operations Manager</p>
        <h2 id="manager-title">Manager context</h2>
        <p className="manager-name">Morgan</p>
        <blockquote>
          <p>{message}</p>
        </blockquote>
        <button className="start-shift" onClick={onReturn} type="button">
          Return to alert dashboard
        </button>
      </div>
    </section>
  );
}

export function ShiftBriefing({ onOpen }: { onOpen: () => void }) {
  return (
    <section className="shift-briefing" aria-labelledby="briefing-title">
      <div className="manager-profile" aria-hidden="true">
        <span>M</span>
      </div>
      <div>
        <p className="eyebrow">07:55 · Security Operations Center</p>
        <h2 id="briefing-title">Welcome to your shift</h2>
        <p className="manager-name">Morgan · Security Operations Manager</p>
        <p>
          Morning. The previous analyst left a handoff in your inbox. An alert
          also arrived as you signed in. Read what is available, keep notes, and
          use the team channel when you need context. More routine work may
          arrive while you investigate.
        </p>
        <button className="start-shift" onClick={onOpen} type="button">
          Open workstation
        </button>
      </div>
    </section>
  );
}

export function Tutorial() {
  return (
    <section className="tutorial" aria-labelledby="tutorial-title">
      <p className="eyebrow">Before assessed play</p>
      <h2 id="tutorial-title">Practice tutorial</h2>
      <p>
        Practice opening systems, reviewing events, choosing actions, asking for
        context, pausing, and changing pacing. This tutorial does not record
        evidence.
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

  async function perform(action: AvailableAction) {
    if (!sessionId) return;
    try {
      const nextView = await client.performAction(
        sessionId,
        action.id,
        action.eventId,
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

  return (
    <main>
      <header className="site-header">
        <div>
          <p className="eyebrow">Career Expo</p>
          <h1>Junior Cybersecurity Analyst</h1>
          <p>
            Ordinary monitoring. Careful investigation. Clear communication.
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
        <WorkSurface
          view={view}
          onAction={(action) => {
            void perform(action);
          }}
        />
      ) : (
        <AccessibleMode
          view={view}
          onAction={(action) => {
            void perform(action);
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
