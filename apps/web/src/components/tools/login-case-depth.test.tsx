// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import { createInitialWorldState, toClientView } from "@sim/core";
import { SystemToolPanel } from "../SystemToolPanel.js";
afterEach(cleanup);
it.each(["desk"] as const)(
  "offers the canonical more-evidence path in %s mode",
  () => {
    const state = createInitialWorldState(
      "case-ui",
      42,
      {},
      loadDefaultCybersecurityPack(),
    );
    const event = state.events.find((e) => e.id === "suspicious-login-1");
    if (!event) throw new Error("Missing login case");
    event.completedActionIds = [
      "review_alert",
      "inspect_login_context",
      "inspect_account_history",
      "check_device_inventory",
      "document_ticket",
    ];
    const view = toClientView(state);
    const onAction = vi.fn();
    const action = view.availableActions.find(
      (a) => a.id === "search_knowledge_base" && a.eventId === event.id,
    );
    if (!action) throw new Error("Missing follow-up action");
    expect(action).toBeDefined();
    render(
      <SystemToolPanel
        view={view}
        systemId="knowledge_base"
        selectedEventId={event.id}
        actions={[action]}
        onAction={onAction}
      />,
    );
    const button = screen.getByRole("button", { name: /Need more evidence/ });
    expect(button).toHaveAttribute("data-action-id", "search_knowledge_base");
    expect(button).toHaveAttribute("data-event-id", event.id);
    expect(button).toBeDisabled();
    fireEvent.change(screen.getByRole("searchbox", { name: "Find a guide" }), {
      target: { value: "vpn" },
    });
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(onAction).toHaveBeenCalledWith(action, "vpn");
    expect(screen.queryByText(/V-218 maps to exit/)).toBeNull();
  },
);
