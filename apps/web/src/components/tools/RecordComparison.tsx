import type { ClientArtifact, ClientTaskView } from "@sim/schemas";
import { SourceEvidence } from "./SourceEvidence.js";
import "./record-comparison.css";

/** Displays only observed public records; canonical evaluation stays in core. */
export function RecordComparison({
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
  const records = task.relatedArtifactIds.flatMap((id) => {
    const record = artifacts.find(
      (artifact) => artifact.id === id && artifact.observed && artifact.body,
    );
    return record ? [record] : [];
  });
  const sourced = task.options.every(({ source }) => source);
  const findings = task.options.flatMap((option) => {
    if (!selected.includes(option.id) || !option.source?.quote) return [];
    const record = records.find(({ id }) => id === option.source?.artifactId);
    return record
      ? [{ id: option.id, quote: option.source.quote, title: record.title }]
      : [];
  });
  const terms = task.options.filter(({ term, termHelp }) => term && termHelp);
  return (
    <section className="record-comparison" aria-label="Compare source records">
      <p>
        Compare what usually happens with the session being investigated. A
        difference is a reason to check, not proof of an attack.
      </p>
      {records.length < task.relatedArtifactIds.length ? (
        <p role="status">
          Open the remaining source above to compare both records.
        </p>
      ) : null}
      {sourced ? (
        <SourceEvidence
          task={task}
          artifacts={records}
          selected={selected}
          onToggle={onToggle}
          disabled={disabled}
        />
      ) : (
        <div className="comparison-records">
          {records.map((record) => (
            <article key={record.id} aria-label={record.title}>
              <h5>{record.title}</h5>
              <p>{record.body}</p>
            </article>
          ))}
        </div>
      )}
      {terms.length ? (
        <details>
          <summary>Plain-language help</summary>
          <dl>
            {terms.map(({ id, term, termHelp }) => (
              <div key={id}>
                <dt>{term}</dt>
                <dd>{termHelp}</dd>
              </div>
            ))}
          </dl>
        </details>
      ) : null}
      {sourced ? (
        <section
          className="comparison-findings"
          aria-label="Selected findings"
          aria-live="polite"
        >
          <h5>
            Your findings ({findings.length}/{task.maxSelections})
          </h5>
          {findings.length ? (
            <ul>
              {findings.map((finding) => (
                <li key={finding.id}>
                  <q>{finding.quote}</q>
                  <small>{finding.title}</small>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      onToggle(finding.id);
                    }}
                  >
                    Remove finding: {finding.quote}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p>
              No passages marked yet. Start with the record describing usual
              activity.
            </p>
          )}
        </section>
      ) : null}
    </section>
  );
}
