import { useEffect, useRef, useState } from "react";
import type { AvailableAction, ClientView } from "@sim/schemas";
import { DialogueLine } from "./DialogueLine.js";
import { AudioToggle } from "./AudioToggle.js";
import { unlockDialogueAudio } from "./audio.js";
export const MORGAN_CHOICES = [
  "What case context do we have?",
  "What remains uncertain?",
  "What should the next analyst know?",
] as const;
export function MorganDialogue({
  view,
  actions,
  onAction,
  pending,
  onClose,
}: {
  view: ClientView;
  actions: AvailableAction[];
  onAction: (action: AvailableAction, freeText?: string) => void;
  pending: boolean;
  onClose: () => void;
}) {
  const source = view.artifacts.find(
    (a) => a.id === view.workplace.lastInspectedArtifactId,
  );
  const [selected, setSelected] = useState(
    () =>
      actions.find((a) => source?.eventIds.includes(a.eventId))?.eventId ??
      actions.find((a) => a.eventId === "suspicious-login-1")?.eventId ??
      actions[0]?.eventId ??
      "",
  );
  const action = actions.find((a) => a.eventId === selected) ?? actions[0];
  const initialMessages = useRef(new Set(view.teamMessages?.map((m) => m.id)));
  const reply = view.teamMessages?.findLast(
    (m) =>
      m.eventId === action?.eventId &&
      m.author === "morgan" &&
      !initialMessages.current.has(m.id),
  );
  const focus = useRef(document.activeElement);
  useEffect(
    () => () => {
      if (focus.current instanceof HTMLElement && focus.current.isConnected)
        focus.current.focus();
    },
    [],
  );
  return (
    <section
      className="jules-dialogue coworker-dialogue"
      role="dialog"
      aria-label="Conversation with Morgan"
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div className="jules-dialogue-heading">
        <div>
          <p className="eyebrow">Shift lead</p>
          <h2>Morgan</h2>
        </div>
        <button data-dialogue-immediate="true" type="button" onClick={onClose}>
          Close
        </button>
      </div>
      <AudioToggle />
      <label>
        Discussing
        <select
          aria-label="Case to discuss with Morgan"
          value={action?.eventId ?? ""}
          onChange={(e) => {
            setSelected(e.target.value);
          }}
        >
          {actions.map((a) => (
            <option key={a.eventId} value={a.eventId}>
              {view.events.find((ev) => ev.id === a.eventId)?.title ??
                a.eventId}
            </option>
          ))}
        </select>
      </label>
      <DialogueLine
        key={reply?.id ?? action?.eventId}
        text={
          reply?.body ??
          "Which part of this work do you want to discuss? I can help with context, not guess who used a session."
        }
        onAdvance={onClose}
      >
        <div className="jules-dialogue-topics">
          {MORGAN_CHOICES.map((choice, index) => (
            <button
              autoFocus={index === 0}
              type="button"
              disabled={pending || !action}
              key={choice}
              onClick={() => {
                unlockDialogueAudio();
                if (action) onAction(action, choice);
              }}
            >
              {choice}
            </button>
          ))}
        </div>
      </DialogueLine>
      {!action ? (
        <p>
          No active work needs consultation right now. The saved follow-up is in
          Team Chat.
        </p>
      ) : null}
    </section>
  );
}
