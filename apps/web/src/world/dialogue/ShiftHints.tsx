import { useEffect, useId, useRef, useState } from "react";
import type { ClientView } from "@sim/schemas";
import { getOptionalShiftHints } from "../../guidance.js";
import { useOptionalOsSession } from "../deskOs/osSession.js";
export type ShiftHint = { id: string; title: string; subtitle?: string };
/** A bounded latest-work queue. Never interrupt a decision acknowledgement. */
export function enqueueHint(queue: ShiftHint[], next: ShiftHint): ShiftHint[] {
  return [...queue.filter((h) => h.id !== next.id), next].slice(-3);
}
export function ShiftHints({
  view,
  phase,
  paused = false,
}: {
  view: ClientView;
  phase: string;
  paused?: boolean;
}) {
  const osSession = useOptionalOsSession();
  const eventId = osSession?.state.workspace?.eventId;
  const optionalHints = getOptionalShiftHints(view, phase, eventId);
  const [hintIndex, setHintIndex] = useState<number | null>(null);
  const hintId = useId();
  const hintButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    setHintIndex(null);
  }, [view.sessionId, phase, eventId]);
  useEffect(() => {
    if (paused || !optionalHints.length) return;
    const onHint = (event: KeyboardEvent) => {
      if (
        event.key.toLowerCase() !== "h" ||
        event.repeat ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        (event.target instanceof HTMLElement &&
          (event.target.isContentEditable ||
            event.target.closest('input, textarea, select, [role="textbox"]')))
      )
        return;
      event.preventDefault();
      setHintIndex((index) =>
        index === null ? 0 : (index + 1) % optionalHints.length,
      );
    };
    window.addEventListener("keydown", onHint);
    return () => {
      window.removeEventListener("keydown", onHint);
    };
  }, [paused, optionalHints.length]);
  const previous = useRef({
    session: view.sessionId,
    phase,
    events: new Set(
      view.events.filter((e) => e.status !== "pending").map((e) => e.id),
    ),
    messages: new Set(view.teamMessages?.map((m) => m.id)),
    handoff: view.availableActions.some((a) => a.id === "submit_shift_handoff"),
  });
  const [queue, setQueue] = useState<ShiftHint[]>([]);
  useEffect(() => {
    const before = previous.current;
    const active = view.events.filter((e) => e.status === "active");
    const handoff = view.availableActions.some(
      (a) => a.id === "submit_shift_handoff",
    );
    const hints: ShiftHint[] = [];
    setQueue((q) => {
      const kept = q.filter((h) =>
        h.id.startsWith("work:")
          ? active.some((e) => h.id === `work:${e.id}`)
          : h.id !== "handoff" || handoff,
      );
      return kept.length === q.length ? q : kept;
    });
    if (before.session !== view.sessionId) setQueue([]);
    else {
      if (phase !== before.phase) {
        setQueue([]);
        if (phase === "room_walk" && before.phase === "floor_map")
          hints.push({
            id: "arrival",
            title: "YOUR FIRST SHIFT",
            subtitle:
              "Follow the workstation marker through the open aisle to your chair.",
          });
        if (phase === "seated_monitor" && before.phase === "desk_login")
          hints.push({
            id: "login",
            title: "SHIFT STARTED",
          });
      }
      if (phase !== "floor_map" && !view.completed) {
        for (const event of active.filter((e) => !before.events.has(e.id)))
          hints.push({
            id: `work:${event.id}`,
            title: "NEW WORK",
            subtitle: event.title,
          });
        const incoming = view.teamMessages?.filter(
          (m) =>
            m.author !== "player" &&
            m.actionId !== "ask_manager" &&
            !before.messages.has(m.id),
        );
        if (incoming?.length)
          hints.push({
            id: "inbox",
            title: "CHECK YOUR INBOX",
            subtitle: `${incoming.at(-1)?.author === "morgan" ? "Morgan" : "A coworker"} sent a message. Open Team chat to read it; a new message is context, not a new decision.`,
          });
        if (handoff && !before.handoff)
          hints.push({
            id: "handoff",
            title: "HANDOFF READY",
            subtitle:
              "Open Team chat to select the open work and sources the next analyst needs.",
          });
      }
    }
    previous.current = {
      session: view.sessionId,
      phase,
      events: new Set(
        view.events.filter((e) => e.status !== "pending").map((e) => e.id),
      ),
      messages: new Set(view.teamMessages?.map((m) => m.id)),
      handoff,
    };
    if (hints.length && !document.hidden)
      setQueue((q) => hints.reduce(enqueueHint, q));
  }, [view, phase]);
  const current = queue[0];
  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(() => {
      setQueue((q) => q.filter((h) => h.id !== current.id));
    }, 2600);
    const hide = () => {
      if (document.hidden) setQueue([]);
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", hide);
    };
  }, [current]);
  if (paused || view.completed) return null;
  return (
    <>
      {optionalHints.length ? (
        <aside className="optional-shift-hint" aria-label="Optional shift hint">
          <button
            type="button"
            ref={hintButton}
            aria-controls={hintId}
            aria-expanded={hintIndex !== null}
            title="Show optional help for your current case. Press H to show or cycle hints."
            aria-keyshortcuts="H"
            onClick={() => {
              setHintIndex((index) => (index === null ? 0 : null));
            }}
          >
            {hintIndex === null ? "Need a hint? (H)" : "Hide hint (H for next)"}
          </button>
          {hintIndex !== null ? (
            <div
              id={hintId}
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              <strong>Optional hint</strong>
              <p>{optionalHints[hintIndex % optionalHints.length]}</p>
              {optionalHints.length > 1 ? (
                <button
                  type="button"
                  onClick={() => {
                    setHintIndex(
                      (index) => ((index ?? 0) + 1) % optionalHints.length,
                    );
                  }}
                >
                  Next hint
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  setHintIndex(null);
                  hintButton.current?.focus();
                }}
              >
                Dismiss hint
              </button>
            </div>
          ) : null}
        </aside>
      ) : null}
      {current && phase !== "floor_map" ? (
        <div
          className="shift-title-hint"
          key={current.id}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <strong>{current.title}</strong>
          {current.subtitle ? <span>{current.subtitle}</span> : null}
        </div>
      ) : null}
    </>
  );
}
