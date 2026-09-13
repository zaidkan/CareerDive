import { useCallback, useEffect, useRef, useState } from "react";
import type { ClientView } from "@sim/schemas";
import type { WorkplaceInteractionHandler } from "../components/shared.js";
import type { MutationState } from "../useMutationCoordinator.js";

/** Presentation distance only. The existing mutation API owns energy and retry. */
export function useMovementExertion(
  view: ClientView,
  submit: WorkplaceInteractionHandler | undefined,
  mutation: MutationState,
) {
  const latest = useRef({ view, submit, mutation });
  latest.current = { view, submit, mutation };
  const distance = useRef(0);
  const sending = useRef(false);
  const nextSubmission = useRef(0);
  const [queued, setQueued] = useState(false);

  const resetDistance = useCallback(() => {
    // A completed five-meter bucket is still owed when changing rooms/modes;
    // only the fractional, presentation-only remainder is discarded.
    distance.current = Math.floor((distance.current + 1e-9) / 5) * 5;
    setQueued(sending.current || distance.current >= 5);
  }, []);
  const addDistance = useCallback((meters: number) => {
    if (
      !Number.isFinite(meters) ||
      meters <= 0 ||
      latest.current.view.workplace.energy.current === 0 ||
      !latest.current.submit
    )
      return;
    distance.current += meters;
    if (distance.current + 1e-9 >= 5) setQueued(true);
  }, []);

  useEffect(() => {
    let mounted = true;
    distance.current = 0;
    sending.current = false;
    setQueued(false);
    const timer = window.setInterval(() => {
      const current = latest.current;
      if (current.mutation.pendingKey || current.mutation.error) {
        // Also pace after a manually retried mutation completes. Waiting from
        // completion is conservative under variable network latency (max 2/s).
        nextSubmission.current = performance.now() + 1000;
        return;
      }
      if (
        sending.current ||
        !current.submit ||
        performance.now() < nextSubmission.current ||
        distance.current + 1e-9 < 5
      )
        return;
      if (current.view.workplace.energy.current === 0) {
        distance.current = 0;
        setQueued(false);
        return;
      }
      distance.current = Math.max(0, distance.current - 5);
      sending.current = true;
      void current
        .submit({ type: "movement_exertion", distanceMeters: 5 })
        .catch(() => {
          // Never automatically repeat an ambiguous failed mutation: the
          // existing inline error/retry control owns this attempted bucket.
          if (mounted) distance.current = 0;
        })
        .finally(() => {
          if (!mounted) return;
          sending.current = false;
          nextSubmission.current = performance.now() + 1000;
          setQueued(distance.current + 1e-9 >= 5);
        });
    }, 100);
    return () => {
      mounted = false;
      window.clearInterval(timer);
      distance.current = 0;
    };
  }, [view.sessionId]);

  return { addDistance, resetDistance, queued };
}
