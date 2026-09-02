import { useEffect, useState } from "react";
import type { ClientArtifact, ClientTaskView } from "@sim/schemas";
import type { TaskAttemptHandler } from "./shared.js";
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
  const mutationKey = taskMutationKey(task);
  const globallyPending = Boolean(mutationState.pendingKey);
  const submittingThisTask =
    submitting || mutationState.pendingKey === mutationKey;

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
      {relatedArtifacts.length > 0 ? (
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
      <fieldset className="work-task-options">
        <legend className="visually-hidden">{task.instruction}</legend>
        {task.options.map((option) => {
          const checked = selected.includes(option.id);
          return (
            <label key={option.id} className={checked ? "selected" : undefined}>
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
      <div className="work-task-footer">
        <p>
          <strong>Why this matters:</strong> {task.whyItMatters}
        </p>
        <button
          className="action-primary"
          disabled={
            !validCount || !onTaskAttempt || submitting || globallyPending
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
              .finally(() => {
                setSubmitting(false);
              });
          }}
          type="button"
        >
          {submittingThisTask ? "Checking…" : "Check my work"}
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
