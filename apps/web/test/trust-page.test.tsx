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
        name: "Privacy and safety",
      }),
    ).toBeVisible();
    for (const heading of [
      "What we collect",
      "Why we use it",
      "What we do not do",
      "Services and processors",
      "Retention",
      "AI and generated content",
      "Safety and reporting",
      "Questions and controls",
    ]) {
      expect(screen.getByRole("heading", { name: heading })).toBeVisible();
    }
    expect(container.textContent).toContain("not yet self-service controls");
    expect(container.textContent).toContain(
      "institutional enrollment is not supported",
    );
    expect(container.textContent).toContain(
      "Persistent report storage is not implemented",
    );
    expect(container.textContent).toContain(
      "There is no single fixed retention period",
    );
    expect(container.textContent).toContain("To be confirmed before launch");
    expect(container.textContent).not.toMatch(
      /Verdaly (?:stores|remembers|keeps)|only you can ever|delete your account.*everything/i,
    );
  });

  it("keeps access limits secondary and vendor claims matched to repository proof", () => {
    render(<TrustPage />);
    fireEvent.click(screen.getByText("Access and data-control details"));
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
      screen.getByText(/database protection depends on correct deployment/),
    ).toBeVisible();
    const server = readFileSync("apps/server/src/main.ts", "utf8");
    const deployment = readFileSync("render.yaml", "utf8");
    expect(server).toContain("ANTHROPIC_API_KEY");
    expect(server).toContain("SUPABASE_URL");
    expect(deployment).toContain("type: web");
    expect(screen.getByText("Anthropic")).toBeVisible();
    expect(screen.getByText("Supabase")).toBeVisible();
  });
});
