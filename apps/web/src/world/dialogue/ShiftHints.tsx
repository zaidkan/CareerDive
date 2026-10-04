import { useEffect, useRef, useState } from "react";
import type { ClientView } from "@sim/schemas";
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
            subtitle: "Your workstation is on the operations floor.",
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
            subtitle: `${incoming.at(-1)?.author === "morgan" ? "Morgan" : "A coworker"} sent additional context in Team Chat.`,
          });
        if (handoff && !before.handoff)
          hints.push({
            id: "handoff",
            title: "HANDOFF READY",
            subtitle: "Review what you are passing to the next analyst.",
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
  if (!current || paused || view.completed || phase === "floor_map")
    return null;
  return (
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
  );
}
