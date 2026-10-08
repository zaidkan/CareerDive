import { useEffect, useRef, useState } from "react";
import type { ClientView } from "@sim/schemas";

/** Delivery receipts only: no timers or simulation mutations. History survives remount. */
export function ConsequenceUpdates({ view }: { view: ClientView }) {
  const updates = view.consequenceUpdates ?? [];
  const previous = useRef({
    session: view.sessionId,
    ids: new Set(updates.map(({ id }) => id)),
  });
  const [delivered, setDelivered] = useState<string[]>([]);
  useEffect(() => {
    if (previous.current.session !== view.sessionId) setDelivered([]);
    else {
      const fresh = updates.filter(({ id }) => !previous.current.ids.has(id));
      if (fresh.length)
        setDelivered((ids) => [...ids, ...fresh.map(({ id }) => id)]);
    }
    previous.current = {
      session: view.sessionId,
      ids: new Set(updates.map(({ id }) => id)),
    };
  }, [view.sessionId, view.consequenceUpdates]);
  if (!updates.length) return null;
  return (
    <section
      className="consequence-updates"
      aria-label="Follow-up from earlier decisions"
    >
      {delivered.length ? (
        <div role="status" aria-live="polite" aria-atomic="true">
          <strong>Follow-up from your earlier work</strong>
          {updates
            .filter(({ id }) => delivered.includes(id))
            .map((update) => (
              <div key={update.id}>
                <p>
                  {update.eventTitle} · Earlier action: {update.actionLabel}
                </p>
                <p>{update.body}</p>
              </div>
            ))}
          <button
            type="button"
            onClick={() => {
              setDelivered([]);
            }}
          >
            Acknowledge follow-up
          </button>
        </div>
      ) : null}
      <details>
        <summary>Earlier-decision follow-ups ({updates.length})</summary>
        {updates.map((update) => (
          <p key={update.id}>
            <strong>
              {update.eventTitle} · {update.actionLabel}
            </strong>
            <br />
            {update.body}
          </p>
        ))}
      </details>
    </section>
  );
}
