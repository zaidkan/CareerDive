// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { DecisionAcknowledgement } from "../src/components/DecisionAcknowledgement.js";

afterEach(cleanup);

it("shows only a newly committed receipt in a separate status channel", () => {
  const item = { id: "b1", decisionId: "b1", text: "Decision recorded. Follow-up pending.", simMinutes: 12 };
  const { rerender } = render(<DecisionAcknowledgement sessionId="shift-a" items={[]} />);
  expect(screen.queryByRole("status")).toBeNull();
  rerender(<DecisionAcknowledgement sessionId="shift-a" items={[item]} />);
  expect(screen.getByRole("status")).toHaveTextContent(item.text);
  rerender(<DecisionAcknowledgement sessionId="shift-b" items={[item]} />);
  expect(screen.queryByRole("status")).toBeNull();
});
