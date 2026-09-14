// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import { createInitialWorldState, toClientView } from "@sim/core";
import { SystemToolPanel } from "../SystemToolPanel.js";
import { AccessibleMode } from "../AccessibleMode.js";

afterEach(cleanup);

it.each(["desk", "structured"] as const)(
  "offers the canonical more-evidence path in %s mode",
  (mode) => {
    const state = createInitialWorldState(
      "case-ui",
      42,
      {},
      loadDefaultCybersecurityPack(),
    );
    const event = state.events.find((e) => e.id === "suspicious-login-1")!;
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
    )!;
    expect(action).toBeDefined();
    render(
      mode === "desk" ? (
        <SystemToolPanel
          view={view}
          systemId="knowledge_base"
          selectedEventId={event.id}
          actions={[action]}
          onAction={onAction}
        />
      ) : (
        <AccessibleMode view={view} onAction={onAction} />
      ),
    );
    const button = screen.getByRole("button", { name: /Need more evidence/ });
    expect(button).toHaveAttribute("data-action-id", "search_knowledge_base");
    expect(button).toHaveAttribute("data-event-id", event.id);
    fireEvent.click(button);
    expect(onAction).toHaveBeenCalledWith(action, "");
    expect(screen.queryByText(/V-218 maps to exit/)).toBeNull();
  },
);
