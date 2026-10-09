import { OptionGroup } from "./OptionGroup.js";
import { ConfirmAction } from "./ConfirmAction.js";
import { handoffCaseLines, handoffFollowUps, sourceBundle } from "@sim/core";
import type { AvailableAction, ClientView, HandoffPayload } from "@sim/schemas";
import { useTabDraft } from "../../useTabDraft.js";

export function HandoffBuilder({
  view,
  action,
  onAction,
  pending,
  onOpenArtifact,
}: {
  view: ClientView;
  action: AvailableAction;
  onAction: (action: AvailableAction) => void;
  pending: boolean;
  onOpenArtifact?: ((id: string) => Promise<unknown>) | undefined;
}) {
  const offered = view.handoffOptions;
  const [selected, setSelected] = useTabDraft<string[]>(
    `handoff:${view.sessionId}:carry-v1`,
    [],
  );
  const [followUp, setFollowUp] = useTabDraft<HandoffPayload["followUp"]>(
    `handoff:${view.sessionId}:owner-v1`,
    "senior-review",
  );
  const cases = handoffCaseLines(view.events, view.structuredTickets);
  const next = {
    "senior-review":
      "More experienced analyst: check who used the session and the missing activity",
    "verify-employee":
      "Next analyst: check the employee’s account through the usual contact method",
    "review-device":
      "Next analyst: check flagged device and missing session activity",
    monitor: "Next analyst: monitor and reassess new evidence",
  };
  const validIds = selected.filter((id) =>
    offered?.options.some((o) => o.id === id),
  );
  const inspected = [
    ...view.artifacts.filter((a) => a.observed).map((a) => a.id),
    ...(view.workplace.inspectedRecordIds ?? []),
  ];
  const refs = [
    ...new Set(
      offered?.options
        .filter((o) => validIds.includes(o.id))
        .flatMap((o) =>
          o.sourceArtifactIds.flatMap((id) => sourceBundle(id, inspected)),
        ) ?? [],
    ),
  ];
  const sources = refs.filter((id) => view.artifacts.some((a) => a.id === id));
  const recordSources = refs.filter(
    (id) => !view.artifacts.some((a) => a.id === id),
  );
  return (
    <section aria-label="Build shift handoff" className="handoff-builder">
      <h4>Hand your work forward</h4>
      <OptionGroup
        prompt="What must carry into the next shift?"
        artifacts={view.artifacts}
        options={offered?.options ?? []}
        selected={validIds}
        onChange={setSelected}
        pending={pending}
        onOpenArtifact={onOpenArtifact}
        sourceTitles={Object.fromEntries(
          view.artifacts.map((a) => [a.id, a.title]),
        )}
      />
      <fieldset>
        <legend>Who should check next, and what should they check?</legend>
        {Object.entries(next).map(([id, label]) => (
          <label key={id}>
            <input
              type="radio"
              disabled={pending}
              name="handoff-follow-up"
              checked={followUp === id}
              onChange={() => {
                setFollowUp(id as HandoffPayload["followUp"]);
              }}
            />
            {label}
          </label>
        ))}
      </fieldset>
      <section aria-label="Handoff preview">
        <h5>Handoff preview</h5>
        <ul>
          {cases.map((c) => (
            <li key={c.eventId}>
              <strong>
                {c.title}: {c.label}
              </strong>
              {c.memo && (
                <details>
                  <summary>
                    Reuse saved memo · revision {c.memo.revision}
                  </summary>
                  <ul>
                    {c.memo.claims.map((claim, i) => (
                      <li key={i}>{claim}</li>
                    ))}
                  </ul>
                  <p>Recorded unknowns: {c.memo.unknowns}</p>
                  <p>Requested next check: {c.memo.nextCheck}</p>
                  <p>
                    References from this memo:{" "}
                    {c.memo.sourceIds
                      .map(
                        (id) =>
                          view.artifacts.find((a) => a.id === id)?.title ?? id,
                      )
                      .join(" · ") || "None"}
                  </p>
                </details>
              )}
              {c.detail ? (
                <details>
                  <summary>Recorded result</summary>
                  <p>{c.detail}</p>
                </details>
              ) : null}
            </li>
          ))}
        </ul>
        {handoffFollowUps(view.events.filter((e) => e.status !== "active")).map(
          (text) => (
            <p key={text}>{text}</p>
          ),
        )}
        <details>
          <summary>Selected source references ({refs.length})</summary>
          <ul>
            {refs.map((id) => (
              <li key={id}>
                {view.artifacts.find((a) => a.id === id)?.title ?? id}
              </li>
            ))}
          </ul>
        </details>
        <p>
          {validIds
            .map((id) => offered?.options.find((o) => o.id === id)?.label)
            .join(" ") || "No continuity statements selected."}
        </p>
      </section>
      <ConfirmAction
        label="Send handoff to next analyst"
        actionId={action.id}
        eventId={action.eventId}
        pending={pending}
        disabled={!offered}
        resetKey={JSON.stringify([validIds, followUp, offered?.stateKey])}
        onConfirm={() => {
          if (offered)
            onAction({
              ...action,
              handoffPayload: {
                sourceArtifactIds: sources,
                sourceRecordIds: recordSources,
                followUp,
                selections: {
                  version: "desk-options-v1",
                  stateKey: offered.stateKey,
                  optionIds: validIds,
                },
              },
            });
        }}
      >
        <p>{validIds.length} continuity statement(s) selected.</p>
        <p>Next owner / check: {next[followUp]}</p>
        <ul>
          {validIds.map((id) => (
            <li key={id}>{offered?.options.find((o) => o.id === id)?.label}</li>
          ))}
        </ul>
      </ConfirmAction>
    </section>
  );
}
