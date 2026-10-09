import type { AvailableAction, ClientView } from "@sim/schemas";
import { useTabDraft } from "../../useTabDraft.js";
import { OptionGroup } from "./OptionGroup.js";
import { ConfirmAction } from "./ConfirmAction.js";

// Only facts stated in the inspected incoming handoff; no assessment or new outcome.
const OPTIONS = [
  { id: "open-owner", label: "A-1042's session owner is still unconfirmed." },
  {
    id: "open-device",
    label: "The previous analyst did not finish the device inventory check.",
  },
  {
    id: "open-scanner",
    label:
      "The scanner's approved schedule reference is missing from the incoming handoff.",
  },
];
export function InitialHandoff({
  view,
  action,
  onAction,
  pending,
}: {
  view: ClientView;
  action: AvailableAction;
  onAction?: ((action: AvailableAction, text?: string) => void) | undefined;
  pending: boolean;
}) {
  const [selected, setSelected] = useTabDraft<string[]>(
    `handoff:${view.sessionId}:incoming-v1`,
    [],
  );
  const body = selected
    .map((id) => OPTIONS.find((o) => o.id === id)?.label)
    .filter(Boolean)
    .join(" ");
  return (
    <section className="handoff-builder" aria-label="Handoff to Morgan">
      <h4>Confirm the incoming handoff</h4>
      <p>
        Choose the open questions you are carrying forward. This is a team
        acknowledgement, not the end-of-shift review.
      </p>
      <OptionGroup
        prompt="What remains open in the handoff you read?"
        options={OPTIONS}
        selected={selected}
        onChange={setSelected}
        pending={pending}
      />
      <ConfirmAction
        label={action.label}
        actionId={action.id}
        eventId={action.eventId}
        pending={pending}
        disabled={!onAction}
        resetKey={JSON.stringify(selected)}
        onConfirm={() => {
          onAction?.(
            action,
            body ||
              "I have read the incoming handoff. No open questions were included in this acknowledgement.",
          );
        }}
      >
        <p>{body || "No open questions selected."}</p>
      </ConfirmAction>
    </section>
  );
}
