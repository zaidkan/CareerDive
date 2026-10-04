import { useEffect, useRef } from "react";
import type { MutationState } from "../useMutationCoordinator.js";

export function MutationStatus({
  state,
  onRetry,
  compact = false,
}: {
  state: MutationState;
  compact?: boolean;
  onRetry?: () => void;
}) {
  const messageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.error || state.success) messageRef.current?.focus();
  }, [state.error, state.requestSequence, state.success]);

  if (state.error) {
    return (
      <div
        className="mutation-status mutation-status-error"
        key={state.requestSequence}
        ref={messageRef}
        role="alert"
        tabIndex={-1}
      >
        <span>{state.error}</span>
        {onRetry ? (
          <button
            disabled={Boolean(state.pendingKey)}
            onClick={onRetry}
            type="button"
          >
            Retry
          </button>
        ) : null}
      </div>
    );
  }

  if (state.pendingKey) {
    return (
      <div
        aria-live="polite"
        className="mutation-status mutation-status-pending"
        ref={messageRef}
      >
        Saving…
      </div>
    );
  }

  if (state.success) {
    return (
      <div
        aria-live="polite"
        className="mutation-status mutation-status-success"
        ref={messageRef}
        tabIndex={-1}
      >
        {compact &&
        /^(Task complete\.|Step \d+ complete\.)/.test(state.success) ? (
          <>
            <span>Case update saved.</span>
            <details>
              <summary>Update details</summary>
              <p>
                {state.success
                  .replace(/^(Task complete\.|Step \d+ complete\.)\s*/, "")
                  .replace(" without revealing an answer", "")}
              </p>
            </details>
          </>
        ) : (
          state.success
        )}
      </div>
    );
  }

  return null;
}
