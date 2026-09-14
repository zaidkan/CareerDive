import { Fragment } from "react";
import type { ClientArtifact, ClientTaskView } from "@sim/schemas";
import "./source-evidence.css";

/** Presentation only: passage buttons retain the pack's canonical option IDs. */
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
    <div className="source-evidence">
      <p>
        Keep the source beside your finding: select highlighted text in the
        records below. Select it again to remove it from your findings.
      </p>
      {artifacts
        .filter(({ observed, body }) => observed && body)
        .map((artifact) => {
          const body = artifact.body ?? "";
          const passages = task.options
            .flatMap(({ id, source }) => {
              if (source?.artifactId !== artifact.id || !source.quote)
                return [];
              const start = body.indexOf(source.quote);
              return start < 0 ? [] : [{ id, quote: source.quote, start }];
            })
            .sort((a, b) => a.start - b.start);
          let cursor = 0;
          return (
            <article key={artifact.id} aria-label={artifact.title}>
              <h5>{artifact.title}</h5>
              <p className="source-evidence-body">
                {passages.map((passage) => {
                  const before = body.slice(cursor, passage.start);
                  cursor = passage.start + passage.quote.length;
                  return (
                    <Fragment key={passage.id}>
                      {before}
                      <button
                        type="button"
                        data-option-id={passage.id}
                        className="source-passage"
                        aria-pressed={selected.includes(passage.id)}
                        disabled={disabled}
                        onClick={() => {
                          onToggle(passage.id);
                        }}
                      >
                        {passage.quote}
                      </button>
                    </Fragment>
                  );
                })}
                {body.slice(cursor)}
              </p>
            </article>
          );
        })}
    </div>
  );
}
