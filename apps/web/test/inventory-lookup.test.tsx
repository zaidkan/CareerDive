// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import {
  applyWorkplaceInteraction,
  createInitialWorldState,
  toClientView,
} from "@sim/core";
import type { WorkplaceInteraction } from "@sim/schemas";
import { AccessibleMode } from "../src/components/AccessibleMode.js";
import { SystemApp } from "../src/world/deskOs/SystemApp.js";

afterEach(cleanup);
it.each(["visual", "structured"] as const)(
  "finds an exact device before and after canonical opening in %s mode",
  async (mode) => {
    const user = userEvent.setup();
    let state = createInitialWorldState(
      "inventory",
      24,
      {},
      loadDefaultCybersecurityPack(),
    );
    const onOpen = vi.fn(async (interaction: WorkplaceInteraction) => {
      const turn = applyWorkplaceInteraction(state, interaction);
      state = turn.state;
      return {
        view: toClientView(state),
        sequence: 1,
        feedback: turn.feedbackCode,
      };
    });
    const tree = () => {
      const view = toClientView(state);
      const props = { view, onAction: vi.fn(), onWorkplaceInteraction: onOpen };
      return mode === "visual" ? (
        <SystemApp {...props} systemId="knowledge_base" guidance={null} />
      ) : (
        <AccessibleMode {...props} />
      );
    };
    const { rerender } = render(tree());
    const lookup = within(
      screen.getByRole("region", { name: "Device inventory lookup" }),
    );
    const query = lookup.getByRole("searchbox", {
      name: "Find an exact device",
    });
    await user.type(query, "unknown-laptop-17");
    expect(
      lookup.getByRole("heading", { name: "Device inventory · j.patel" }),
    ).toBeVisible();
    const preview = toClientView(state).artifacts.find(
      ({ id }) => id === "device-inventory-1",
    );
    expect(preview).toMatchObject({
      observed: false,
      lookupKeys: ["unknown-laptop-17"],
    });
    expect(preview).not.toHaveProperty("body");
    expect(preview).not.toHaveProperty("metadata");
    await user.click(
      lookup.getByRole("button", { name: "Open Device inventory · j.patel" }),
    );
    expect(onOpen).toHaveBeenCalledExactlyOnceWith({
      type: "open_artifact",
      artifactId: "device-inventory-1",
    });
    rerender(tree());
    expect(
      lookup.getByRole("heading", { name: "Device inventory · j.patel" }),
    ).toBeVisible();
    const opened = toClientView(state).artifacts.find(
      ({ id }) => id === "device-inventory-1",
    );
    expect(opened?.observed).toBe(true);
    expect(opened?.body).toContain("has never checked into MDM");
    await user.clear(query);
    await user.type(query, " UNKNOWN-LAPTOP-17 ");
    expect(
      lookup.getByRole("heading", { name: "Device inventory · j.patel" }),
    ).toBeVisible();
    for (const invalid of [
      "unknown-laptop",
      "unknown-laptop-170",
      "enrolled",
      "j.patel",
    ]) {
      await user.clear(query);
      await user.type(query, invalid);
      expect(
        lookup.queryByRole("heading", { name: "Device inventory · j.patel" }),
      ).toBeNull();
      expect(lookup.getByRole("status")).toHaveTextContent(
        "No inventory records match",
      );
    }
  },
);
