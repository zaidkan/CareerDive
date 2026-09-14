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
    <section className="debrief-shell" aria-labelledby="debrief-title">
      <p className="eyebrow">
        Confidence: {debrief.confidence.replaceAll("_", " ")}
      </p>
      <h2 id="debrief-title">Shift debrief</h2>
      <p className="debrief-lede">
        A plain-language wrap of what showed up, what you did, and what that
        suggests about the work.
      </p>
      <div className="debrief-grid">
        {DEBRIEF_LABELS.map(([key, label]) => (
          <article key={key}>
            <h3>{label}</h3>
            <p>{debrief.sections[key]}</p>
            {key === "consequences" ? (
              <details>
                <summary>Reflect on the investigation</summary>
                <p>
                  Consider the path you took: requesting review with evidence,
                  closing the item, or keeping it open to check a gap. Which
                  comparison supported that choice, and what did it leave
                  unknown? A location estimate, an employee report, and an
                  administrative record each have different limits.
                </p>
                <p>
                  What could the next analyst verify from your note without
                  repeating your work? There is no need to turn uncertainty into
                  certainty to write a useful handoff.
                </p>
              </details>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
