import type { AvailableAction } from "@sim/schemas";
import {
  ArtifactDetail,
  NotesEditor,
  filterKnowledgeBase,
  filterSystemArtifacts,
} from "./artifacts.js";
import { OperationalMessages, type ModeProps } from "./shared.js";
import {
  WORK_SYSTEMS,
  primaryActions,
  utilityActions,
} from "../systems.js";

export function AccessibleMode({ view, onAction }: ModeProps) {
  return (
    <section
      className="accessible-shell"
      aria-labelledby="structured-title"
    >
      <h2 id="structured-title">Structured workplace view</h2>
      <p className="accessible-lede">
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
        const utilities = utilityActions(actions);
        const primary = primaryActions(actions);
        return (
          <section className="structured-system" key={system.id}>
            <h3>{system.label}</h3>
            <ul>
              {events.map((event) => (
                <li key={event.id}>
                  <strong>{event.title}</strong>: {event.summary} Status:{" "}
                  {event.status.replaceAll("_", " ")}.
                  <StructuredArtifacts
                    artifacts={filterSystemArtifacts(
                      view,
                      system.id,
                      event.id,
                    )}
                  />
                  {system.id === "ticket_queue" ? (
                    <>
                      <NotesEditor
                        action={utilities.find(
                          ({ id, eventId }) =>
                            id === "update_ticket_notes" &&
                            eventId === event.id,
                        )}
                        label={`Investigation notes for ${event.title}`}
                        onSave={onAction}
                        value={view.ticketNotes[event.id] ?? ""}
                      />
                      <NotesEditor
                        action={utilities.find(
                          ({ id }) => id === "update_notebook",
                        )}
                        label="Case notebook"
                        onSave={onAction}
                        value={view.notebook}
                      />
                    </>
                  ) : null}
                </li>
              ))}
            </ul>
            {system.id === "knowledge_base" ? (
              <StructuredArtifacts
                artifacts={filterKnowledgeBase(view, view.kbQuery)}
              />
            ) : null}
            <div className="accessible-actions">
              {primary.map((action) => (
                <StructuredActionButton
                  action={action}
                  key={`${action.id}:${action.eventId}`}
                  onAction={onAction}
                />
              ))}
              {utilities
                .filter(({ id }) => id !== "update_ticket_notes" && id !== "update_notebook")
                .map((action) => (
                  <StructuredActionButton
                    action={action}
                    key={`${action.id}:${action.eventId}`}
                    onAction={onAction}
                  />
                ))}
            </div>
          </section>
        );
      })}
      <OperationalMessages messages={view.operationalMessages} />
    </section>
  );
}

function StructuredArtifacts({
  artifacts,
}: {
  artifacts: ReturnType<typeof filterSystemArtifacts>;
}) {
  if (artifacts.length === 0) return null;
  return (
    <div className="structured-artifacts">
      {artifacts.map((artifact) => (
        <ArtifactDetail artifact={artifact} key={artifact.id} />
      ))}
    </div>
  );
}

function StructuredActionButton({
  action,
  onAction,
}: {
  action: AvailableAction;
  onAction: ModeProps["onAction"];
}) {
  return (
    <button
      data-action-id={action.id}
      data-event-id={action.eventId}
      onClick={() => {
        onAction(action);
      }}
      type="button"
    >
      {action.label}. {action.description}
    </button>
  );
}
