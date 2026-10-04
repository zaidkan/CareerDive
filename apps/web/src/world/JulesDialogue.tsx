import type { JulesTopic, WorkSystemId } from "@sim/schemas";
import { useEffect, useRef } from "react";
import { DialogueLine } from "./dialogue/DialogueLine.js";
import { AudioToggle } from "./dialogue/AudioToggle.js";
import type { JulesDialogueReply } from "@sim/core";

const TOPICS: ReadonlyArray<{ id: JulesTopic; label: string }> = [
  { id: "first_day", label: "First day rhythm" },
  { id: "current_work", label: "Current work" },
  { id: "break_room", label: "Taking a break" },
  { id: "team_context", label: "Team context" },
];

const DESTINATION_LABELS: Partial<Record<WorkSystemId, string>> = {
  alert_dashboard: "Alerts",
  knowledge_base: "Guides",
  ticket_queue: "Tickets",
  email: "Email",
};

function topicChoices(seen: JulesTopic[]) {
  return seen.includes("first_day")
    ? TOPICS.filter(({ id }) => id !== "first_day")
    : TOPICS.slice(0, 3);
}

export function JulesDialogue({
  onClose,
  onTopic,
  pending,
  reply,
  seenTopics,
}: {
  onClose: () => void;
  onTopic: (topic: JulesTopic) => void;
  pending: boolean;
  reply?: JulesDialogueReply;
  seenTopics: JulesTopic[];
}) {
  const returnFocus = useRef(document.activeElement);
  useEffect(
    () => () => {
      if (
        returnFocus.current instanceof HTMLElement &&
        returnFocus.current.isConnected
      )
        returnFocus.current.focus();
    },
    [],
  );
  const destination = reply?.nextSystemId
    ? DESTINATION_LABELS[reply.nextSystemId]
    : undefined;
  const discussed = TOPICS.filter(({ id }) => seenTopics.includes(id));

  return (
    <section
      aria-label="Conversation with Jules"
      aria-modal="false"
      className="jules-dialogue"
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
      role="dialog"
    >
      <div className="jules-dialogue-heading">
        <div>
          <p className="eyebrow">Coworker</p>
          <h2 id="jules-dialogue-title">Jules</h2>
        </div>
        <button
          data-dialogue-immediate="true"
          aria-label="Close"
          className="jules-dialogue-close"
          onClick={onClose}
          type="button"
        >
          Close
        </button>
      </div>

      <AudioToggle />
      <DialogueLine
        key={reply?.text ?? "greeting"}
        text={reply?.text ?? "Morning. What are you carrying back to the desk?"}
        onAdvance={onClose}
      >
        <fieldset className="jules-dialogue-topics" disabled={pending}>
          <legend className="visually-hidden">Topics</legend>
          {topicChoices(seenTopics).map(({ id, label }, index) => (
            <button
              autoFocus={index === 0}
              disabled={pending}
              key={id}
              data-interaction-id="talk_to_jules"
              data-topic-id={id}
              onClick={() => {
                onTopic(id);
              }}
              type="button"
            >
              {label}
            </button>
          ))}
        </fieldset>
      </DialogueLine>
      {destination ? (
        <p className="jules-dialogue-destination">
          Back to {destination} at your desk
        </p>
      ) : null}

      {discussed.length > 0 ? (
        <div className="jules-dialogue-discussed">
          <span>Discussed</span>
          <ul>
            {discussed.map(({ id, label }) => (
              <li key={id}>{label} · Discussed</li>
            ))}
          </ul>
        </div>
      ) : null}
      {pending ? (
        <p aria-live="polite" className="jules-dialogue-pending">
          Jules is replying…
        </p>
      ) : null}
    </section>
  );
}
