import { useCallback, useRef, useState } from "react";
import type {
  AvailableAction,
  ClientNotification,
  ClientTaskView,
  ClientView,
  NotificationResponse,
  WorkplaceInteraction,
} from "@sim/schemas";

export type MutationState = {
  pendingKey?: string;
  error?: string;
  success?: string;
};

export type MutationOutcome<Result> = {
  result: Result;
  view: ClientView;
  success?: string;
  onApplied?: () => void;
};

type MutationOperation<Result> = () => Promise<MutationOutcome<Result>>;

type PendingMutation = {
  key: string;
  sequence: number;
  promise: Promise<unknown>;
};

type FailedMutation = {
  key: string;
  operation: MutationOperation<unknown>;
};

export const EMPTY_MUTATION_STATE: MutationState = {};

export function actionMutationKey(action: AvailableAction): string {
  return `action:${action.eventId}:${action.id}`;
}

export function taskMutationKey(task: ClientTaskView): string {
  return `task:${task.id}:${String(task.stepIndex)}`;
}

export function notificationMutationKey(
  notification: ClientNotification,
  response: NotificationResponse["response"],
): string {
  return `notification:${notification.id}:${response}`;
}

export function workplaceMutationKey(
  interaction: WorkplaceInteraction,
): string {
  return interaction.type === "talk_to_jules"
    ? `workplace:${interaction.type}:${interaction.topic}`
    : interaction.type === "open_artifact"
      ? `workplace:${interaction.type}:${interaction.artifactId}`
      : `workplace:${interaction.type}`;
}

function errorMessage(cause: unknown): string {
  return cause instanceof Error && cause.message
    ? cause.message
    : "That change could not be completed.";
}

export function useMutationCoordinator(applyView: (view: ClientView) => void) {
  const [mutationState, setMutationState] =
    useState<MutationState>(EMPTY_MUTATION_STATE);
  const sequenceRef = useRef(0);
  const pendingRef = useRef<PendingMutation | undefined>(undefined);
  const failedRef = useRef<FailedMutation | undefined>(undefined);

  const runMutation = useCallback(
    <Result>(
      key: string,
      operation: MutationOperation<Result>,
    ): Promise<Result> => {
      const pending = pendingRef.current;
      if (pending) {
        if (pending.key === key) {
          return pending.promise as Promise<Result>;
        }
        return Promise.reject(
          new Error("Another workplace change is pending."),
        );
      }

      const sequence = ++sequenceRef.current;
      setMutationState((current) => ({
        ...(current.error ? { error: current.error } : {}),
        ...(current.success ? { success: current.success } : {}),
        pendingKey: key,
      }));

      const promise = Promise.resolve()
        .then(operation)
        .then((outcome) => {
          if (sequence === sequenceRef.current) {
            applyView(outcome.view);
            failedRef.current = undefined;
            setMutationState(
              outcome.success ? { success: outcome.success } : {},
            );
            outcome.onApplied?.();
          }
          return outcome.result;
        })
        .catch((cause: unknown) => {
          if (sequence === sequenceRef.current) {
            failedRef.current = {
              key,
              operation,
            };
            setMutationState((current) => ({
              error: errorMessage(cause),
              ...(current.success ? { success: current.success } : {}),
            }));
          }
          throw cause;
        })
        .finally(() => {
          if (pendingRef.current?.sequence === sequence) {
            pendingRef.current = undefined;
          }
        });

      pendingRef.current = { key, sequence, promise };
      return promise;
    },
    [applyView],
  );

  const retryMutation = useCallback((): Promise<unknown> => {
    const failed = failedRef.current;
    if (!failed || pendingRef.current) return Promise.resolve(undefined);
    failedRef.current = undefined;
    return runMutation(failed.key, failed.operation);
  }, [runMutation]);

  const invalidateMutations = useCallback(() => {
    sequenceRef.current += 1;
    pendingRef.current = undefined;
    failedRef.current = undefined;
    setMutationState(EMPTY_MUTATION_STATE);
  }, []);

  return {
    invalidateMutations,
    mutationState,
    retryMutation,
    runMutation,
  };
}
