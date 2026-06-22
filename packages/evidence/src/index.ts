import {
  DebriefSchema,
  EvidenceSignalSchema,
  type Debrief,
  type EvidenceSignal,
  type Reflection,
} from "@sim/schemas";
import { validateUserFacingText } from "@sim/safety";

export function recordEvidence(signal: EvidenceSignal): EvidenceSignal {
  return EvidenceSignalSchema.parse(signal);
}

export function detectReflectionMismatch(input: {
  reflection: {
    enjoyment: "draining" | "neutral" | "energizing";
    confidence: "uncertain" | "comfortable";
  };
  observations: string[];
}): { claim: string; reasons: string[] } | undefined {
  const reasons: string[] = [];
  if (
    input.reflection.enjoyment === "energizing" &&
    input.observations.includes("delayed_engagement")
  ) {
    reasons.push("reported enjoyment differed from delayed engagement");
  }
  if (
    input.reflection.confidence === "comfortable" &&
    input.observations.includes("requested_help")
  ) {
    reasons.push("reported comfort appeared alongside help-seeking");
  }
  if (reasons.length === 0) {
    return undefined;
  }
  return {
    reasons,
    claim:
      "These signals may reflect initial uncertainty, interface difficulty, or a difference between anticipating and experiencing the work. More situations are needed before drawing a conclusion.",
  };
}

export function buildDebrief(input: {
  sessionId: string;
  careerTitle: string;
  signals: EvidenceSignal[];
  reflections: Reflection[];
  consequences: string[];
}): Debrief {
  const observations = input.signals.map(({ observation }) => observation);
  const sections = {
    whatHappened: `You worked through a ${input.careerTitle} shift involving routine monitoring and investigation.`,
    whatYouDid:
      observations.length > 0
        ? observations.join(" ")
        : "No assessed action evidence was recorded.",
    consequences:
      input.consequences.length > 0
        ? input.consequences.join(" ")
        : "No material consequence was recorded.",
    earlyEvidence:
      observations.length > 0
        ? `One early signal appeared: ${observations[0] ?? "an observed workplace action."}`
        : "There is insufficient evidence for an early observation.",
    yourExperience:
      input.reflections.length > 0
        ? "Your optional reflection is stored separately from observed behavior."
        : "You did not add an optional reflection for this shift.",
    confidenceAndLimitations:
      "This is an early signal from one simulation. Interface familiarity, prior knowledge, and context may have influenced what happened.",
    careerReality:
      "Cybersecurity analysis includes ordinary monitoring, documentation, quiet investigation, and communication—not only emergency response.",
    nextAction:
      "Explore another shift, review current pathway information, or discuss the experience with a trusted mentor.",
  };
  for (const text of Object.values(sections)) {
    validateUserFacingText(text);
  }
  return DebriefSchema.parse({
    sessionId: input.sessionId,
    confidence:
      input.signals.length === 0 ? "insufficient_evidence" : "early_signal",
    sections,
    evidenceIds: input.signals.map(({ id }) => id),
  });
}
