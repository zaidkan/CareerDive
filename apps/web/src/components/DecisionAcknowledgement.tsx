import { useEffect, useRef, useState } from "react";
import type { ClientView } from "@sim/schemas";

type Acknowledgement = NonNullable<ClientView["acknowledgements"]>[number];

/** A short, neutral receipt for a committed decision with a queued callback. */
export function DecisionAcknowledgement({
  sessionId,
  items,
}: {
  sessionId: string;
  items: Acknowledgement[];
}) {
  const seen = useRef<{ sessionId: string; ids: Set<string> } | undefined>(undefined);
  const [current, setCurrent] = useState<Acknowledgement>();

  useEffect(() => {
    if (!seen.current || seen.current.sessionId !== sessionId) {
      seen.current = { sessionId, ids: new Set(items.map(({ id }) => id)) };
      setCurrent(undefined);
      return;
    }
    const fresh = items.findLast(({ id }) => !seen.current?.ids.has(id));
    for (const { id } of items) seen.current.ids.add(id);
    if (fresh) setCurrent(fresh);
  }, [items, sessionId]);

  useEffect(() => {
    if (!current) return;
    const timeout = window.setTimeout(() => { setCurrent(undefined); }, 4500);
    return () => { window.clearTimeout(timeout); };
  }, [current]);

  return current ? (
    <div className="decision-acknowledgement" role="status" aria-live="polite">
      {current.text}
    </div>
  ) : null;
}
