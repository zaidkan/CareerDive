import type { Debrief } from "@sim/schemas";

const DEBRIEF_LABELS: Array<[keyof Debrief["sections"], string]> = [
  ["whatHappened", "What happened"],
  ["whatYouDid", "What you did"],
  ["consequences", "Consequences"],
  ["earlyEvidence", "Early evidence"],
  ["yourExperience", "Your experience"],
  ["confidenceAndLimitations", "Confidence and limitations"],
  ["careerReality", "Career reality"],
  ["nextAction", "Next action"],
];

export function DebriefView({ debrief }: { debrief: Debrief }) {
  return (
    <section aria-labelledby="debrief-title">
      <p className="eyebrow">
        Confidence: {debrief.confidence.replaceAll("_", " ")}
      </p>
      <h2 id="debrief-title">Shift debrief</h2>
      <div className="debrief-grid">
        {DEBRIEF_LABELS.map(([key, label]) => (
          <article key={key}>
            <h3>{label}</h3>
            <p>{debrief.sections[key]}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
