import { useId, useState } from "react";
import type { PublicCareer } from "../../careers/types.js";

export function CareerPreview({ career }: { career: PublicCareer }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className="career-preview">
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
      <div id={panelId} hidden={!open} className="career-preview-panel">
        <p>{career.workplaceSummary}</p>
        <p className="career-preview-label">Work you might explore</p>
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
