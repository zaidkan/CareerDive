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

// Reading guidance supplements the server account; it never infers a decision
// from display text or replaces recorded actions and applied consequences.
const DEBRIEF_CONTEXT: Record<keyof Debrief["sections"], string> = {
  whatHappened:
    "This was one short, fictional workplace experience. Use the account below to recall the situation before judging how you handled it.",
  whatYouDid:
    "These are the workplace actions recorded during this shift. Consider what you checked, what you documented, and where you asked for help; an action by itself does not explain your reasons.",
  consequences:
    "Read the recorded outcome alongside your decision. Escalation requests a review; it does not prove who signed in. Dismissal closes an item, but does not by itself establish that the activity was expected. Only consequences that have occurred appear below.",
  earlyEvidence:
    "An early observation is a starting point for a question about this attempt, not a lasting label. One choice cannot establish how you would handle every situation.",
  yourExperience:
    "How the work felt is yours to describe. Enjoyment, effort, and confidence can differ from one another and from the recorded actions. Reflection is optional and private by default; sharing requires explicit permission. It does not rewrite the action record.",
  confidenceAndLimitations:
    "This experience cannot determine whether a career is right for you. Language, accessibility barriers, unfamiliar controls, prior knowledge, and the pacing mode can affect an attempt. Walking speed and pointer skill are not career evidence.",
  careerReality:
    "Think about the everyday parts you tried: reading incomplete information, comparing records, keeping notes, and communicating uncertainty. This scenario represents only a small part of the role; teams and workplaces vary.",
  nextAction:
    "Pick one moment to revisit: what interested you, what felt tiring, or what you would ask a working analyst. You can leave the career question open while you learn more.",
};

export function DebriefView({ debrief }: { debrief: Debrief }) {
  return (
    <section className="debrief-shell" aria-labelledby="debrief-title">
      <p className="eyebrow">
        Confidence: {debrief.confidence.replaceAll("_", " ")}
      </p>
      <h2 id="debrief-title">Shift debrief</h2>
      <p className="debrief-lede">
        Take a breath and look back at your shift. This recap keeps the recorded
        work, its consequences, and your own experience separate. You do not
        need to make a career decision today.
      </p>
      <div className="debrief-grid">
        {DEBRIEF_LABELS.map(([key, label]) => (
          <article key={key}>
            <h3>{label}</h3>
            <p>{DEBRIEF_CONTEXT[key]}</p>
            <p>{debrief.sections[key]}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
