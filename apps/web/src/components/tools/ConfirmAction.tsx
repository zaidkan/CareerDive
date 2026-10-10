import { useEffect, useRef, useState, type ReactNode } from "react";

/** Local review only. No canonical action until the explicit confirmation. */
export function ConfirmAction({
  label,
  children,
  onConfirm,
  disabled = false,
  pending = false,
  actionId,
  eventId,
  resetKey,
}: {
  label: string;
  children?: ReactNode;
  onConfirm: () => void;
  disabled?: boolean;
  pending?: boolean;
  actionId?: string;
  eventId?: string;
  resetKey?: string;
}) {
  const [reviewing, setReviewing] = useState(false);
  const reviewRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  // Edits invalidate the reviewed selection; a new save needs a new review.
  useEffect(() => {
    setReviewing(false);
  }, [resetKey]);
  useEffect(() => {
    if (reviewing) reviewRef.current?.focus();
  }, [reviewing]);
  return (
    <div className="decision-confirmation">
      <button
        ref={triggerRef}
        className="action-primary"
        type="button"
        data-action-id={actionId}
        data-event-id={eventId}
        disabled={disabled || pending}
        aria-expanded={reviewing}
        onClick={() => {
          setReviewing(true);
        }}
      >
        {pending ? "Saving…" : label}
      </button>
      {reviewing ? (
        <div
          ref={reviewRef}
          className="decision-review"
          role="group"
          aria-label="Review before confirming"
          tabIndex={-1}
        >
          <strong>Review before confirming</strong>
          {children}
          <p>
            This will record your choice and advance simulation time. Cancel to
            change your selections.
          </p>
          <button
            type="button"
            disabled={disabled || pending}
            onClick={() => {
              setReviewing(false);
              onConfirm();
            }}
          >
            {label.startsWith("Confirm ")
              ? "Confirm and send"
              : `Confirm ${label}`}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setReviewing(false);
              triggerRef.current?.focus();
            }}
          >
            Cancel
          </button>
        </div>
      ) : null}
    </div>
  );
}
