// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { TrustPage } from "../src/site/pages/TrustPage.js";

afterEach(cleanup);

describe("trust page proof", () => {
  it("shows current data flow and separates implemented routes from self-service controls", () => {
    const { container } = render(<TrustPage />);
    expect(
      screen.getByRole("heading", {
        name: "Collect less. Explain exactly what remains.",
      }),
    ).toBeVisible();
    for (const heading of [
      "What we keep",
      "Your controls",
      "How access is protected",
      "How workplace dialogue works",
      "No grades. No fit score.",
      "Current school-use status",
    ]) {
      expect(screen.getByRole("heading", { name: heading })).toBeVisible();
    }
    expect(
      screen.getByRole("list", { name: "How first-shift data moves" }).children,
    ).toHaveLength(3);
    expect(container.textContent).toContain("not yet self-service controls");
    expect(container.textContent).toContain(
      "not currently built for institutional enrollment",
    );
    expect(container.textContent).not.toMatch(
      /Verdaly (?:stores|remembers|keeps)|only you can ever|delete your account.*everything/i,
    );
  });

  it("keeps source excerpts secondary and matched to repository proof", () => {
    render(<TrustPage />);
    fireEvent.click(screen.getByText("See how this works"));
    const sql = readFileSync("apps/server/src/db/repository.ts", "utf8");
    const evidenceTest = readFileSync(
      "packages/evidence/test/evidence.test.ts",
      "utf8",
    );
    const dialogue = readFileSync("apps/web/src/world/dialogue/MorganDialogue.tsx", "utf8");
    expect(sql).toContain(
      "WHERE id = ${sessionId}::uuid AND owner_id = ${ownerId}::uuid",
    );
    expect(evidenceTest).toContain(
      'expect(signal).not.toHaveProperty("score");',
    );
    expect(evidenceTest).toContain(
      "expect(Object.keys(debrief.sections)).toHaveLength(8);",
    );
    expect(dialogue).toContain("managerRecap(view, action.eventId, choice)");
    expect(
      screen.getByText(/WHERE id = .*owner_id =/),
    ).toBeVisible();
  });
});
