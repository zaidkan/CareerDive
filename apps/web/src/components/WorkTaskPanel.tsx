import { useEffect, useState } from "react";
import type { ClientArtifact, ClientTaskView } from "@sim/schemas";
import type { TaskAttemptHandler } from "./shared.js";
import { SourceEvidence } from "./tools/SourceEvidence.js";
import { RecordComparison } from "./tools/RecordComparison.js";
import {
  EMPTY_MUTATION_STATE,
  taskMutationKey,
  type MutationState,
} from "../useMutationCoordinator.js";

export function WorkTaskPanel({
  task,
  onTaskAttempt,
  relatedArtifacts = [],
  mutationState = EMPTY_MUTATION_STATE,
}: {
  task: ClientTaskView;
  onTaskAttempt?: TaskAttemptHandler;
  relatedArtifacts?: ClientArtifact[];
  mutationState?: MutationState;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<{
    accepted: boolean;
    key: string;
    message: string;
    taskId: string;
  }>();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setSelected([]);
  }, [task.id, task.stepIndex]);

  const validCount =
    selected.length >= task.minSelections &&
    selected.length <= task.maxSelections;
  const single = task.maxSelections === 1;
  const comparison =
    task.kind === "compare_records" && task.relatedArtifactIds.length > 1;
  const sourceBased =
    task.options.length > 0 && task.options.every(({ source }) => source);
  const sourceReady =
    !sourceBased ||
    task.options.every(({ source }) => {
      const quote = source?.quote;
      return (
        quote &&
        relatedArtifacts.some(
          ({ id, observed, body }) =>
            id === source.artifactId && observed && body?.includes(quote),
        )
      );
    });
  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : single
          ? [id]
          : current.length < task.maxSelections
            ? [...current, id]
            : current,
    );
  }
  const mutationKey = taskMutationKey(task);
  const globallyPending = Boolean(mutationState.pendingKey);
  const submittingThisTask =
    submitting || mutationState.pendingKey === mutationKey;
  const summaryGroup = task.kind === "build_summary"
    ? task.id.includes("evidence") ? "Verified evidence" : task.id.includes("uncertainty") ? "Uncertainty" : task.id.includes("next") ? "Next step" : task.title
    : undefined;

  return (
    <section
      aria-labelledby={`task-${task.id}-title`}
      className="work-task"
      data-action-id={task.actionId}
      data-event-id={task.eventId}
    >
      <header className="work-task-header">
        <div>
          <p className="eyebrow">
            Work step {task.stepIndex + 1} of {task.stepCount}
          </p>
          <h4 id={`task-${task.id}-title`}>{task.title}</h4>
        </div>
        <span className="work-task-kind">{task.kind.replaceAll("_", " ")}</span>
      </header>
      <p className="work-task-prompt">{task.prompt}</p>
      <p className="work-task-instruction">{task.instruction}</p>
      {summaryGroup ? <h5 className="ticket-composer-group">{summaryGroup}</h5> : null}
      {comparison ? (
        <RecordComparison
          task={task}
          artifacts={relatedArtifacts}
          selected={selected}
          onToggle={toggle}
          disabled={submitting || globallyPending || !sourceReady}
        />
      ) : null}
      {!comparison && !sourceBased && relatedArtifacts.length > 0 ? (
        <details className="work-task-sources" open>
          <summary>Evidence available for this step</summary>
          {relatedArtifacts.map((artifact) => (
            <article key={artifact.id}>
              <strong>{artifact.title}</strong>
              <small>{artifact.summary}</small>
              <p>{artifact.body}</p>
            </article>
          ))}
        </details>
      ) : null}
      {sourceBased ? (
        comparison ? null : (
          <SourceEvidence
            task={task}
            artifacts={relatedArtifacts}
            selected={selected}
            onToggle={toggle}
            disabled={submitting || globallyPending || !sourceReady}
          />
        )
      ) : (
        <fieldset
          className="work-task-options"
          disabled={submitting || globallyPending}
        >
          <legend className="visually-hidden">{task.instruction}</legend>
          {task.options.map((option) => {
            const checked = selected.includes(option.id);
            return (
              <label
                key={option.id}
                className={checked ? "selected" : undefined}
              >
                <input
                  checked={checked}
                  name={`task-${task.id}`}
                  onChange={() => {
                    if (single) {
                      setSelected([option.id]);
                      return;
                    }
                    setSelected((current) =>
                      current.includes(option.id)
                        ? current.filter((id) => id !== option.id)
                        : current.length < task.maxSelections
                          ? [...current, option.id]
                          : current,
                    );
                  }}
                  type={single ? "radio" : "checkbox"}
                  value={option.id}
                />
                <span>
                  <strong>{option.label}</strong>
                  {option.detail ? <small>{option.detail}</small> : null}
                  {option.term && option.termHelp ? (
                    <small>
                      <dfn>{option.term}</dfn>: {option.termHelp}
                    </small>
                  ) : null}
                </span>
              </label>
            );
          })}
        </fieldset>
      )}
      <div className="work-task-footer">
        {task.kind === "build_summary" && selected.length > 0 ? (
          <section aria-label="Generated ticket preview" className="ticket-preview">
            <strong>Generated ticket preview</strong>
            <ul>{task.options.filter((option) => selected.includes(option.id)).map((option) => <li key={option.id}>{option.label}</li>)}</ul>
          </section>
        ) : null}
        <p>
          <strong>Why this matters:</strong> {task.whyItMatters}
        </p>
        <button
          className="action-primary"
          disabled={
            !validCount ||
            !sourceReady ||
            !onTaskAttempt ||
            submitting ||
            globallyPending
          }
          onClick={() => {
            if (!onTaskAttempt) return;
            setSubmitting(true);
            void onTaskAttempt(task, selected)
              .then((result) => {
                setFeedback({
                  accepted: result.accepted,
                  key: mutationKey,
                  message: result.feedback,
                  taskId: task.id,
                });
                if (!result.accepted) setSelected([]);
              })
              .catch(() => {
                setFeedback({
                  accepted: false,
                  key: mutationKey,
                  message: "Could not submit findings. Try again.",
                  taskId: task.id,
                });
              })
              .finally(() => {
                setSubmitting(false);
              });
          }}
          type="button"
        >
          {submittingThisTask
            ? "Checking…"
            : sourceBased
              ? "Submit findings"
              : "Check my work"}
        </button>
      </div>
      {feedback?.taskId === task.id &&
      (feedback.accepted || feedback.key === mutationKey) ? (
        <p className="work-task-feedback" aria-live="polite" key={feedback.key}>
          {feedback.message}
        </p>
      ) : null}
    </section>
  );
}
