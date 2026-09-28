import type { ReactNode } from "react";
import { ProvenanceLabel } from "../ArtDirection.js";
import "./workshop-artifacts.css";

export type WorkshopCareer =
  | "Registered Nurse"
  | "Mechanical Engineer"
  | "Electrician"
  | "Lawyer";

const careerSlug: Record<WorkshopCareer, string> = {
  "Registered Nurse": "registered-nurse",
  "Mechanical Engineer": "mechanical-engineer",
  Electrician: "electrician",
  Lawyer: "lawyer",
};

/** Shared document shell for representative workshop artifacts. */
export function WorkshopSheet({
  id,
  career,
  kicker,
  name,
  stamp,
  children,
}: {
  id: string;
  career: WorkshopCareer;
  kicker: string;
  name: string;
  stamp: string;
  children: ReactNode;
}) {
  return (
    <article
      className="wa-sheet"
      data-workshop-artifact={id}
      data-workshop-career={careerSlug[career]}
      aria-label={`${career} sample artifact: ${name}`}
    >
      <header className="wa-head">
        <div>
          <p className="wa-kicker">{kicker}</p>
          <p className="wa-name">{name}</p>
        </div>
        <p className="wa-stamp">{stamp}</p>
      </header>
      <div className="wa-body">{children}</div>
      <footer className="wa-foot">
        <ProvenanceLabel provenance={{ career, kind: "workshop" }} />
        <span className="wa-meta">Synthetic sample</span>
      </footer>
    </article>
  );
}
