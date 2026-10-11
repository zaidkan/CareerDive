// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import { applyWorkplaceInteraction, createInitialWorldState, toClientView, } from "@sim/core";
import type { WorkplaceInteraction } from "@sim/schemas";
import { SystemApp } from "../src/world/deskOs/SystemApp.js";
afterEach(cleanup);
it.each(["visual"] as const)("finds an exact device before and after canonical opening in %s mode", async () => {
    const user = userEvent.setup();
    let state = createInitialWorldState("inventory", 24, {}, loadDefaultCybersecurityPack());
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
        return (<SystemApp {...props} systemId="knowledge_base" guidance={null}/>);
    };
    const { rerender } = render(tree());
    const lookup = within(screen.getByRole("region", { name: "Device inventory lookup" }));
    const query = lookup.getByRole("combobox", {
        name: "Find an exact device",
    });
    await user.selectOptions(query, "unknown-laptop-17");
    expect(lookup.getByRole("heading", { name: "Device inventory · j.patel" })).toBeVisible();
    const preview = toClientView(state).artifacts.find(({ id }) => id === "device-inventory-1");
    expect(preview).toMatchObject({
        observed: false,
        lookupKeys: ["unknown-laptop-17"],
    });
    expect(preview).not.toHaveProperty("body");
    expect(preview).not.toHaveProperty("metadata");
    await user.click(lookup.getByRole("button", { name: "Open Device inventory · j.patel" }));
    expect(onOpen).toHaveBeenCalledExactlyOnceWith({
        type: "open_artifact",
        artifactId: "device-inventory-1",
    });
    rerender(tree());
    expect(lookup.getByRole("heading", { name: "Device inventory · j.patel" })).toBeVisible();
    const opened = toClientView(state).artifacts.find(({ id }) => id === "device-inventory-1");
    expect(opened?.observed).toBe(true);
    expect(opened?.body).toContain("no enrollment or MDM check-in record");
    expect(lookup.queryByRole("searchbox")).toBeNull();
    for (const invalid of ["unknown-laptop", "unknown-laptop-170", "enrolled", "j.patel"]) {
        expect(lookup.queryByRole("option", { name: (name) => name === invalid })).toBeNull();
    }
    await user.selectOptions(query, "");
    expect(query).toHaveValue("");
    await user.selectOptions(query, "unknown-laptop-17");
    expect(lookup.getByRole("heading", { name: "Device inventory · j.patel" })).toBeVisible();
    expect(onOpen).toHaveBeenCalledTimes(1);
});
