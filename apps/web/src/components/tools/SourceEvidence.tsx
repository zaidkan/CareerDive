import type { ClientArtifact, ClientTaskView } from "@sim/schemas";
import "./source-evidence.css";

export function SourceEvidence({
  task,
  artifacts,
  selected,
  onToggle,
  disabled,
}: {
  task: ClientTaskView;
  artifacts: ClientArtifact[];
  selected: string[];
  onToggle: (id: string) => void;
  disabled: boolean;
}) {
  return (
    <fieldset className="source-evidence" disabled={disabled}>
      <legend>
        {task.kind === "choose_response"
          ? "Choose your response"
          : "Choose what to include"}
      </legend>
      {task.options.map((option) => {
        const source = artifacts.find(
          ({ id }) => id === option.source?.artifactId,
        );
        return (
          <label key={option.id} className="work-task-choice">
            <input
              type={task.maxSelections === 1 ? "radio" : "checkbox"}
              name={`choice-${task.id}-${String(task.stepIndex)}`}
              checked={selected.includes(option.id)}
              data-option-id={option.id}
              onChange={() => {
                onToggle(option.id);
              }}
            />
            <span>
              <strong>{option.label}</strong>
              <small>
                {option.detail ??
                  (task.kind === "choose_response"
                    ? "Submitting applies this response to the case."
                    : "Include this statement in your findings.")}
              </small>
              {source ? <small>Source: {source.title}</small> : null}
              {option.source?.quote ? (
                <blockquote>{option.source.quote}</blockquote>
              ) : null}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
