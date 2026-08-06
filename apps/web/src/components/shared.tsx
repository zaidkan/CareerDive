import type { AvailableAction, ClientView } from "@sim/schemas";

export type ModeProps = {
  view: ClientView;
  onAction: (action: AvailableAction, freeText?: string) => void;
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
