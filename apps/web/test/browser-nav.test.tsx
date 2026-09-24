// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ClientView } from "@sim/schemas";
import { DeskOs } from "../src/world/deskOs/DeskOs.js";
import { OsSessionProvider } from "../src/world/deskOs/osSession.js";
import { resolveAddress } from "../src/world/deskOs/os/browserState.js";

afterEach(cleanup);

function makeView(): ClientView {
  return {
    sessionId: "session-1",
    sessionKind: "assessed",
    simClock: 42,
    currentLocation: {
      id: "operations-center",
      name: "Security Operations Center",
      connectedLocationIds: [],
      interactableIds: [],
    },
    events: [],
    availableActions: [],
    operationalMessages: [],
    pacingMode: "standard",
    artifacts: [],
    ticketNotes: {},
    notebook: "",
    kbQuery: "",
    tasks: [],
    notifications: [],
    queryResults: [],
    workplace: {
      energy: { current: 80, max: 100 },
      carriedSnackBites: 0,
      fridgeSnackBars: 2,
      fridgeOpen: false,
      coffeeServings: 2,
      coffeeStage: "idle",
      julesTopicsSeen: [],
      emergencyRecoveryUsed: false,
    },
  };
}

function SessionHarness({
  mounted = true,
  onAction,
}: {
  mounted?: boolean;
  onAction?: ReturnType<typeof vi.fn>;
}) {
  return (
    <OsSessionProvider>
      {mounted ? (
        <DeskOs
          phase="seated_monitor"
          view={makeView()}
          onAction={onAction ?? vi.fn()}
          onLoginSuccess={() => undefined}
          onStand={() => undefined}
          onOsFullscreen={() => undefined}
        />
      ) : (
        <p>Desk unmounted</p>
      )}
    </OsSessionProvider>
  );
}

function addressBar(): HTMLInputElement {
  return screen.getByLabelText("Address bar");
}

async function go(
  user: ReturnType<typeof userEvent.setup>,
  url: string,
): Promise<void> {
  const input = addressBar();
  await user.clear(input);
  await user.type(input, url);
  await user.keyboard("{Enter}");
}

describe("managed browser routing", () => {
  it("maps allowlist and shift-required destinations to the correct page", () => {
    expect(resolveAddress("verdaly://ops")).toEqual({
      kind: "page",
      page: "ops",
    });
    expect(resolveAddress(" verdaly://intranet ")).toEqual({
      kind: "page",
      page: "intranet",
    });
    expect(resolveAddress("VERDALY://mail/inbox")).toEqual({
      kind: "page",
      page: "ops",
    });
    expect(resolveAddress("verdaly://cases")).toEqual({
      kind: "page",
      page: "ops",
    });
    expect(resolveAddress("https://example.com")).toEqual({
      kind: "blocked",
      url: "https://example.com",
    });
    expect(resolveAddress("verdaly://intranet/secret")).toEqual({
      kind: "blocked",
      url: "verdaly://intranet/secret",
    });
  });

  it("loads an allowlisted page from the address bar", async () => {
    const user = userEvent.setup();
    render(<SessionHarness />);

    expect(screen.getByRole("tab", { name: "Dashboard" })).toBeVisible();
    await go(user, "verdaly://intranet");
    expect(screen.getByRole("article", { name: "Company intranet" })).toBeVisible();
    expect(addressBar()).toHaveValue("verdaly://intranet");
    expect(screen.queryByRole("tab", { name: "Dashboard" })).toBeNull();
  });

  it("shows a blocked organization policy state for unsupported addresses", async () => {
    const user = userEvent.setup();
    render(<SessionHarness />);

    await go(user, "https://example.com");
    const blocked = screen.getByRole("article", { name: "Address unavailable" });
    expect(blocked).toBeVisible();
    expect(blocked).toHaveTextContent("blocked by organization policy");
    expect(screen.getByText("https://example.com")).toBeVisible();
    expect(addressBar()).toHaveValue("https://example.com");
    expect(screen.queryByRole("tab", { name: "Dashboard" })).toBeNull();
    expect(document.querySelector("iframe")).toBeNull();
  });

  it("navigates address entries, supports back and forward deterministically", async () => {
    const user = userEvent.setup();
    render(<SessionHarness />);

    await go(user, "verdaly://intranet");
    expect(screen.getByRole("article", { name: "Company intranet" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Go back" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Go forward" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Go back" }));
    expect(addressBar()).toHaveValue("verdaly://ops");
    expect(screen.getByRole("tab", { name: "Dashboard" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Go forward" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Go forward" }));
    expect(addressBar()).toHaveValue("verdaly://intranet");
    expect(screen.getByRole("article", { name: "Company intranet" })).toBeVisible();
  });

  it("reloads without leaving the current page or touching canonical state", async () => {
    const restoreMotion = (() => {
      const original = window.matchMedia;
      window.matchMedia = (query: string) =>
        ({
          matches: false,
          media: query,
          onchange: null,
          addEventListener: () => undefined,
          removeEventListener: () => undefined,
          addListener: () => undefined,
          removeListener: () => undefined,
          dispatchEvent: () => false,
        }) as MediaQueryList;
      return () => {
        window.matchMedia = original;
      };
    })();
    const onAction = vi.fn();
    try {
      const user = userEvent.setup();
      render(<SessionHarness onAction={onAction} />);

      await user.click(screen.getByRole("button", { name: "Reload page" }));
      expect(screen.getByRole("button", { name: "Reload page" })).toBeDisabled();
      expect(screen.getByText("Reloading page.")).toBeVisible();
      expect(screen.getByRole("tab", { name: "Dashboard" })).toBeVisible();
      expect(addressBar()).toHaveValue("verdaly://ops");
      expect(onAction).not.toHaveBeenCalled();
    } finally {
      restoreMotion();
    }
  });

  it("persists browser history across DeskOs remounts", async () => {
    const user = userEvent.setup();
    const view = render(<SessionHarness />);

    await go(user, "verdaly://intranet");
    expect(screen.getByRole("article", { name: "Company intranet" })).toBeVisible();

    view.rerender(<SessionHarness mounted={false} />);
    expect(screen.getByText("Desk unmounted")).toBeVisible();

    view.rerender(<SessionHarness />);
    expect(addressBar()).toHaveValue("verdaly://intranet");
    expect(screen.getByRole("article", { name: "Company intranet" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Go back" })).toBeEnabled();
  });

  it("never fetches or iframes arbitrary external destinations", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response());
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchSpy;
    try {
      const user = userEvent.setup();
      render(<SessionHarness />);

      await go(user, "https://example.com");
      expect(screen.getByRole("article", { name: "Address unavailable" })).toBeVisible();
      expect(document.querySelector("iframe")).toBeNull();
      expect(fetchSpy).not.toHaveBeenCalled();

      await go(user, "http://evil.test/path");
      expect(screen.getByRole("article", { name: "Address unavailable" })).toBeVisible();
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("keeps shift-required resources reachable through the allowlist", async () => {
    const user = userEvent.setup();
    render(<SessionHarness />);

    await go(user, "verdaly://mail/inbox");
    expect(addressBar()).toHaveValue("verdaly://ops");
    expect(screen.getByRole("tab", { name: "Dashboard" })).toBeVisible();

    const bookmarks = screen.getByRole("navigation", { name: "Bookmarks" });
    await user.click(within(bookmarks).getByRole("button", { name: "Company intranet" }));
    expect(screen.getByRole("article", { name: "Company intranet" })).toBeVisible();
    await user.click(
      within(bookmarks).getByRole("button", { name: "SOC Ops Console" }),
    );
    expect(screen.getByRole("tab", { name: "Dashboard" })).toBeVisible();
    expect(addressBar()).toHaveValue("verdaly://ops");
  });

  it("ignores empty Enter and restores the current address on Escape", async () => {
    const user = userEvent.setup();
    render(<SessionHarness />);

    const input = addressBar();
    await user.click(input);
    await user.keyboard("{Enter}");
    expect(addressBar()).toHaveValue("verdaly://ops");
    expect(screen.getByRole("tab", { name: "Dashboard" })).toBeVisible();

    await user.clear(input);
    await user.type(input, "https://example.com");
    await user.keyboard("{Escape}");
    expect(addressBar()).toHaveValue("verdaly://ops");
  });
});
