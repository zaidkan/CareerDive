// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { afterEach, expect, it } from "vitest";
import type { Debrief } from "@sim/schemas";
import { DebriefView } from "../src/components/DebriefView.js";

afterEach(cleanup);

const debrief: Debrief = {
  sessionId: "shift-1",
  confidence: "early_signal",
  evidenceIds: [],
  sections: {
    whatHappened: "A shift happened.",
    whatYouDid: "You checked a record.",
    consequences: "The reviewer received a case.",
    earlyEvidence: "One signal.",
    yourExperience: "Your private reflection remains separate.",
    confidenceAndLimitations: "One shift has limits.",
    careerReality: "Routine monitoring matters.",
    nextAction: "Discuss the experience.",
  },
  decisionReview: {
    careerVersion: "1.0.0",
    decisions: [
      {
        decisionId: "suspicious_login",
        userChoiceId: "escalate_alert",
        availableChoiceIds: ["escalate_alert", "dismiss_alert"],
        comparisonEligible: true,
        evidenceUsedIds: ["device-inventory-1"],
        rubricSignals: [
          { id: "checked_device", supported: true },
          { id: "documented_uncertainty", supported: false },
        ],
        outcomeLabel: "partially_supported",
        explanation:
          "The saved record supports review, with an open documentation gap.",
        cohort: { status: "insufficient" },
      },
    ],
    profile: [
      {
        dimension: "Evidence review",
        state: "developing",
        explanation: "One record opened.",
      },
    ],
  },
};

it("keeps small cohorts private and offers a keyboard-readable personal review", async () => {
  const user = userEvent.setup();
  const { container } = render(<DebriefView debrief={debrief} />);
  expect(
    screen.getByRole("heading", { name: "Your shift in review" }),
  ).toBeVisible();
  expect(screen.getByText("Requested senior review")).toBeVisible();
  expect(screen.queryByRole("heading", { name: "How other completed shifts handled this" })).toBeNull();
  expect(container.textContent).not.toMatch(/29%|56%/);
  expect(container.textContent).not.toMatch(/career.fit score|pass\/fail|ranking|performance grade|\bscore\b/i);
  await user.tab();
  expect(
    screen.getByRole("link", { name: /The unfamiliar sign-in/ }),
  ).toHaveFocus();
  await user.click(screen.getByText("Consider another path"));
  expect(
    screen.getByText(/which independent record would you need/i),
  ).toBeVisible();
  expect(
    (await axe(container, { rules: { "color-contrast": { enabled: false } } }))
      .violations,
  ).toEqual([]);
});

it("shows server-derived percentages only for a ready cohort and handles service failure", () => {
  const ready: Debrief = structuredClone(debrief);
  const decision = ready.decisionReview?.decisions[0];
  if (!decision) throw new Error("Missing decision fixture");
  decision.cohort = {
    status: "ready",
    sampleSize: 30,
    counts: { escalate_alert: 20, dismiss_alert: 10 },
    percentages: { escalate_alert: 67, dismiss_alert: 33 },
  };
  const { rerender } = render(<DebriefView debrief={ready} />);
  expect(screen.getByText("67%")).toBeVisible();
  expect(screen.getByText("33%")).toBeVisible();
  expect(
    screen.getByText(/Based on 30 completed shifts with this decision/),
  ).toBeVisible();
  decision.cohort = { status: "unavailable" };
  rerender(<DebriefView debrief={ready} />);
  expect(screen.queryByRole("heading", { name: "How other completed shifts handled this" })).toBeNull();
  expect(screen.getByText("Requested senior review")).toBeVisible();
});

it("suppresses community comparison for a single completion route", () => {
  const single: Debrief = structuredClone(debrief);
  const decision = single.decisionReview?.decisions[0];
  if (!decision) throw new Error("Missing decision fixture");
  decision.decisionId = "finance_access";
  decision.userChoiceId = "route_access_request";
  decision.availableChoiceIds = ["route_access_request"];
  decision.comparisonEligible = false;
  decision.cohort = { status: "ready", sampleSize: 30,
    counts: { route_access_request: 30 }, percentages: { route_access_request: 100 } };
  render(<DebriefView debrief={single} />);
  expect(screen.queryByRole("heading", { name: "How other completed shifts handled this" })).toBeNull();
  expect(screen.queryByText("100%")).toBeNull();
});
