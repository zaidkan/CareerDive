import { describe, expect, it } from "vitest";
import {
  buildDebrief,
  detectReflectionMismatch,
  recordEvidence,
} from "../src/index.js";

describe("evidence and debrief", () => {
  it("records raw evidence with provenance and no interpretation", () => {
    const signal = recordEvidence({
      id: "signal-1",
      sessionId: "session-1",
      actionId: "escalate_alert",
      eventId: "suspicious-login-1",
      rhythm: "routine_monitoring",
      pacingMode: "standard",
      category: "behavioral",
      dimension: "prioritization",
      observation: "Escalated after reviewing available context.",
      occurredAt: "2026-06-22T10:00:00.000Z",
    });

    expect(signal).not.toHaveProperty("score");
    expect(signal.observation).toContain("Escalated");
  });

  it("treats reflection mismatch as a question needing evidence", () => {
    const mismatch = detectReflectionMismatch({
      reflection: {
        enjoyment: "energizing",
        confidence: "comfortable",
      },
      observations: ["delayed_engagement", "requested_help"],
    });

    expect(mismatch?.claim).toContain("More situations");
    expect(mismatch?.claim).not.toContain("wrong");
  });

  it("builds eight confidence-bounded, non-numeric sections", () => {
    const debrief = buildDebrief({
      sessionId: "session-1",
      careerTitle: "Junior Cybersecurity Analyst",
      signals: [
        recordEvidence({
          id: "signal-1",
          sessionId: "session-1",
          actionId: "escalate_alert",
          eventId: "suspicious-login-1",
          rhythm: "routine_monitoring",
          pacingMode: "standard",
          category: "behavioral",
          dimension: "prioritization",
          observation: "Escalated after checking context.",
          occurredAt: "2026-06-22T10:00:00.000Z",
        }),
      ],
      reflections: [],
      consequences: ["The senior analyst received the documented alert."],
    });

    expect(Object.keys(debrief.sections)).toHaveLength(8);
    expect(debrief.confidence).toBe("early_signal");
    expect(JSON.stringify(debrief)).not.toMatch(/\b\d+%/);
    expect(JSON.stringify(debrief).toLowerCase()).not.toContain(
      "you should become",
    );
  });
});
