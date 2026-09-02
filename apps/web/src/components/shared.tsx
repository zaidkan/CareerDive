import type {
  AvailableAction,
  ClientNotification,
  ClientTaskView,
  ClientView,
  NotificationResponse,
  WorkplaceInteraction,
} from "@sim/schemas";
import type { WorkplaceInteractionResult } from "../client.js";
import type { MutationState } from "../useMutationCoordinator.js";

export type TaskAttemptFeedback = {
  accepted: boolean;
  completed: boolean;
  feedback: string;
};
export type TaskAttemptHandler = (
  task: ClientTaskView,
  selectedOptionIds: string[],
) => Promise<TaskAttemptFeedback>;
export type NotificationHandler = (
  notification: ClientNotification,
  response: NotificationResponse["response"],
) => Promise<void>;
export type WorkplaceInteractionHandler = (
  interaction: WorkplaceInteraction,
) => Promise<WorkplaceInteractionResult>;

export type ModeProps = {
  view: ClientView;
  onAction: (action: AvailableAction, freeText?: string) => void;
  onTaskAttempt?: TaskAttemptHandler;
  onNotification?: NotificationHandler;
  onWorkplaceInteraction?: WorkplaceInteractionHandler;
  mutationState?: MutationState;
  onRetryMutation?: () => void;
};

export function OperationalMessages({ messages }: { messages: string[] }) {
  return (
    <div aria-live="polite" aria-atomic="false" className="activity-log">
      <h3>Floor ticker</h3>
      {messages.length === 0 ? (
        <p>Quiet on the floor.</p>
      ) : (
        <ul>
          {messages.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
