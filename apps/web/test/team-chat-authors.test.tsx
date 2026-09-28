// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen, within } from "@testing-library/react";
import { expect, it } from "vitest";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import { createInitialWorldState, toClientView } from "@sim/core";
import { TeamChatTool } from "../src/components/tools/TeamChatTool.js";

it("labels authored reviewer and employee replies", () => {
  const state = createInitialWorldState("authors", 7, {}, loadDefaultCybersecurityPack());
  state.teamMessages = [
    { id: "review", eventId: "suspicious-login-1", author: "reviewer", body: "Review underway.", actionId: "dismiss_alert", simMinutes: 1 },
    { id: "employee", eventId: "suspicious-login-1", author: "employee", body: "Session still unclear.", actionId: "dismiss_alert", simMinutes: 2 },
  ];
  render(<TeamChatTool view={toClientView(state)} />);
  const replies = within(screen.getByRole("list", { name: "Team conversation" })).getAllByRole("listitem");
  expect(replies[0]).toHaveTextContent(/Reviewer.*Review underway/);
  expect(replies[1]).toHaveTextContent(/Employee.*Session still unclear/);
});
