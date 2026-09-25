import { useId, useState } from "react";
import type { PublicCareer } from "../../careers/types.js";
import {
  CareerRequestToggle,
  type SetCareerRequest,
} from "./CareerRequestToggle.js";

export function CareerPreview({
  career,
  setCareerRequest,
}: {
  career: PublicCareer;
  setCareerRequest?: SetCareerRequest | undefined;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className="career-preview">
      <div className="career-preview-actions">
        <button
          type="button"
          className="career-text-button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => {
            setOpen((value) => !value);
          }}
        >
          {open ? "Close preview" : `Preview ${career.title}`}
        </button>
        {career.requestable ? (
          <CareerRequestToggle
            careerId={career.id}
            careerTitle={career.title}
            setCareerRequest={setCareerRequest}
          />
        ) : null}
      </div>
      <div id={panelId} hidden={!open} className="career-preview-panel">
        <p className="career-preview-lead">
          You’d decide what the evidence supports — and what still needs
          checking.
        </p>
        <p className="career-preview-label">
          Possible decisions · {career.workplaceSummary}
        </p>
        <ul>
          {career.plannedTasks.map((task) => (
            <li key={task}>{task}</li>
          ))}
        </ul>
        <p className="career-preview-label">Skills in view</p>
        <ul>
          {career.skills.map((skill) => (
            <li key={skill}>{skill}</li>
          ))}
        </ul>
        <p className="career-caveat">
          <strong>Reality note</strong>{" "}
          {career.contentCaveats?.[0] ?? career.caveats[0]}
        </p>
      </div>
    </div>
  );
}
