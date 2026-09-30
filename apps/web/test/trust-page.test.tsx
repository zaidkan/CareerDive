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
      "What AI can and cannot do",
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
    const sql = readFileSync("apps/server/drizzle/0001_initial.sql", "utf8");
    const evidenceTest = readFileSync(
      "packages/evidence/test/evidence.test.ts",
      "utf8",
    );
    const ai = readFileSync("packages/ai/src/index.ts", "utf8");
    expect(sql).toContain(
      "CREATE POLICY simulation_sessions_owner_all ON simulation_sessions",
    );
    expect(sql).toContain("FOR ALL USING (auth.uid() = owner_id)");
    expect(evidenceTest).toContain(
      'expect(signal).not.toHaveProperty("score");',
    );
    expect(evidenceTest).toContain(
      "expect(Object.keys(debrief.sections)).toHaveLength(8);",
    );
    expect(ai).toContain("speakerMayKnow(fact, npcId)");
    expect(
      screen.getByText(/CREATE POLICY simulation_sessions_owner_all/),
    ).toBeVisible();
  });
});
