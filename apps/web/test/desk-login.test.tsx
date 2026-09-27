// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ClientView } from "@sim/schemas";
import { LaptopOverlay } from "../src/world/deskOs/LaptopOverlay.js";
import { LockScreen } from "../src/world/deskOs/LockScreen.js";
import { OsSessionProvider } from "../src/world/deskOs/osSession.js";
import { DESK_LOGIN } from "../src/world/deskLogin.js";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function stubReducedMotion() {
  vi.stubGlobal(
    "matchMedia",
    (query: string): MediaQueryList =>
      ({
        matches: query.includes("prefers-reduced-motion"),
        media: query,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
      }),
  );
}

/** Deterministic clock: wake, curtain, and auth timers run under fake timers. */
function setup() {
  vi.useFakeTimers();
  const onLoginSuccess = vi.fn();
  render(<LockScreen onLoginSuccess={onLoginSuccess} />);
  return { onLoginSuccess };
}

/** Repeat attempt while pending — what pressing Enter again would do. */
function submitForm() {
  fireEvent.submit(document.querySelector("form") as HTMLFormElement);
}

const view: ClientView = {
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

/** A fresh overlay mount at seated_monitor is exactly the same-session re-sit. */
function renderWorkstation(phase: "desk_login" | "seated_monitor") {
  const onLoginSuccess = vi.fn();
  render(
    <OsSessionProvider>
      <LaptopOverlay
        onAction={() => undefined}
        onLoginSuccess={onLoginSuccess}
        onStand={() => undefined}
        phase={phase}
        view={view}
      />
    </OsSessionProvider>,
  );
  return { onLoginSuccess };
}

describe("monitor wake, lock curtain, and sign-in", () => {
  it("wakes the monitor and rests at the lock curtain with clock, date, and slip", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 21, 10, 0, 0));
    const onLoginSuccess = vi.fn();
    render(<LockScreen onLoginSuccess={onLoginSuccess} />);
    const sample = new Date(2026, 8, 21, 10, 0, 0);
    expect(screen.getByTestId("login-wake")).toBeVisible();
    expect(screen.getByTestId("login-curtain")).toBeVisible();
    expect(screen.getByTestId("login-clock")).toHaveTextContent(
      sample.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      }),
    );
    expect(document.querySelector(".login-date")).toHaveTextContent(
      sample.toLocaleDateString(undefined, {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
    );
    // The slip is already the single credential source, on the curtain.
    expect(screen.getByTestId("login-post-it")).toHaveTextContent(
      DESK_LOGIN.username,
    );
    expect(screen.getByTestId("login-post-it")).toHaveTextContent(
      DESK_LOGIN.password,
    );
    expect(
      screen.getByText(/Press any key or click to sign in/i),
    ).toBeVisible();
    // The curtain is observation-only: no sign-in before dismissal.
    expect(screen.queryByRole("heading", { name: /Sign in/i })).toBeNull();
    act(() => {
      vi.advanceTimersByTime(320);
    });
    expect(screen.queryByTestId("login-wake")).toBeNull();
  });

  it("keeps the clock live while the curtain is up", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 21, 10, 0, 0));
    render(<LockScreen onLoginSuccess={vi.fn()} />);
    expect(screen.getByTestId("login-clock")).toHaveTextContent(
      new Date(2026, 8, 21, 10, 0, 0).toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      }),
    );
    act(() => {
      vi.advanceTimersByTime(300_000);
    });
    expect(screen.getByTestId("login-clock")).toHaveTextContent(
      new Date(2026, 8, 21, 10, 5, 0).toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      }),
    );
  });

  it("dismisses the curtain with a pointer and reveals the sign-in", () => {
    setup();
    fireEvent.click(screen.getByTestId("login-surface"));
    expect(
      screen.getByRole("heading", { name: /Sign in to Verdaly/i }),
    ).toBeVisible();
    expect(screen.getByLabelText(/Username/i)).toHaveValue(DESK_LOGIN.username);
    expect(screen.getByRole("button", { name: /^Sign in$/i })).toBeEnabled();
    // The dismissed curtain lingers a moment while lifting away.
    expect(screen.getByTestId("login-curtain")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.queryByTestId("login-curtain")).toBeNull();
    expect(
      screen.getByRole("button", { name: /Where are my credentials/i }),
    ).toBeEnabled();
  });

  it("dismisses the curtain with any key and moves focus to the password field", () => {
    setup();
    fireEvent.keyDown(window, { key: "x" });
    expect(
      screen.getByRole("heading", { name: /Sign in to Verdaly/i }),
    ).toBeVisible();
    expect(screen.getByLabelText(/^Password$/i)).toHaveFocus();
  });

  it("ignores modifier-only keys on the curtain", () => {
    setup();
    fireEvent.keyDown(window, { key: "Shift" });
    expect(screen.getByTestId("login-curtain")).toBeVisible();
    expect(screen.queryByRole("heading", { name: /Sign in/i })).toBeNull();
    fireEvent.keyDown(window, { key: "Enter" });
    expect(
      screen.getByRole("heading", { name: /Sign in to Verdaly/i }),
    ).toBeVisible();
  });

  it("renders the known account with a masked, toggleable password", () => {
    setup();
    fireEvent.click(screen.getByTestId("login-surface"));
    const username = screen.getByLabelText(/Username/i);
    expect(username).toHaveAttribute("type", "text");
    expect(username).toHaveValue(DESK_LOGIN.username);
    expect(screen.getByLabelText(/^Password$/i)).toHaveAttribute(
      "type",
      "password",
    );
    fireEvent.change(screen.getByLabelText(/^Password$/i), {
      target: { value: "typed" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Show password/i }));
    expect(screen.getByLabelText(/^Password$/i)).toHaveAttribute("type", "text");
    fireEvent.click(screen.getByRole("button", { name: /Hide password/i }));
    expect(screen.getByLabelText(/^Password$/i)).toHaveAttribute(
      "type",
      "password",
    );
  });

  it("stays locked on invalid credentials and announces the error", () => {
    const { onLoginSuccess } = setup();
    fireEvent.click(screen.getByTestId("login-surface"));
    fireEvent.change(screen.getByLabelText(/^Password$/i), {
      target: { value: "wrong-pass" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Sign in$/i }));
    expect(screen.getByRole("alert")).toHaveTextContent(/didn.t work/i);
    expect(screen.getByLabelText(/Username/i)).toHaveValue(DESK_LOGIN.username);
    expect(screen.getByLabelText(/^Password$/i)).toHaveValue("");
    expect(screen.getByLabelText(/^Password$/i)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByLabelText(/^Password$/i)).toHaveFocus();
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(onLoginSuccess).not.toHaveBeenCalled();
  });

  it("fills credentials from the provisioning slip and keeps it keyboard reachable", () => {
    setup();
    fireEvent.click(screen.getByTestId("login-surface"));
    const slip = screen.getByLabelText(/Verdaly IT provisioning slip/i);
    expect(slip).toHaveTextContent(DESK_LOGIN.username);
    expect(slip).toHaveTextContent(DESK_LOGIN.password);
    fireEvent.change(screen.getByLabelText(/^Password$/i), {
      target: { value: "typed" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /Use these credentials/i }),
    );
    expect(screen.getByLabelText(/Username/i)).toHaveValue(DESK_LOGIN.username);
    expect(screen.getByLabelText(/^Password$/i)).toHaveValue(DESK_LOGIN.password);
    expect(screen.getByLabelText(/^Password$/i)).toHaveFocus();
    // The secondary affordance hands focus to the slip itself.
    fireEvent.click(
      screen.getByRole("button", { name: /Where are my credentials/i }),
    );
    expect(screen.getByLabelText(/Verdaly IT provisioning slip/i)).toHaveFocus();
  });

  it("verifies briefly, unlocks exactly once, and ignores repeat submissions", () => {
    const { onLoginSuccess } = setup();
    fireEvent.click(screen.getByTestId("login-surface"));
    fireEvent.change(screen.getByLabelText(/^Password$/i), {
      target: { value: DESK_LOGIN.password },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Sign in$/i }));
    expect(screen.getByTestId("login-surface")).toHaveAttribute(
      "data-stage",
      "verifying",
    );
    expect(screen.getByRole("button", { name: /Signing in/i })).toBeDisabled();
    submitForm();
    submitForm();
    act(() => {
      vi.advanceTimersByTime(220);
    });
    expect(screen.getByTestId("login-surface")).toHaveAttribute(
      "data-stage",
      "unlocking",
    );
    act(() => {
      vi.advanceTimersByTime(180);
    });
    expect(onLoginSuccess).toHaveBeenCalledTimes(1);
    // A late repeat cannot fire it again.
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    submitForm();
    expect(onLoginSuccess).toHaveBeenCalledTimes(1);
  });

  it("submits with Enter from the password field", async () => {
    // Real timers here: genuine keyboard semantics, no arbitrary sleeps —
    // waitFor polls until the unlock completes.
    const user = userEvent.setup();
    const onLoginSuccess = vi.fn();
    render(<LockScreen onLoginSuccess={onLoginSuccess} />);
    await user.click(screen.getByTestId("login-surface"));
    await user.type(
      screen.getByLabelText(/^Password$/i),
      `${DESK_LOGIN.password}{enter}`,
    );
    await waitFor(
      () => {
        expect(onLoginSuccess).toHaveBeenCalledTimes(1);
      },
      { timeout: 2500 },
    );
  });

  it("skips wake theater and staged transitions under reduced motion", () => {
    stubReducedMotion();
    const { onLoginSuccess } = setup();
    expect(screen.queryByTestId("login-wake")).toBeNull();
    fireEvent.keyDown(window, { key: "Enter" });
    // The curtain lifts instantly: no leaving element remains.
    expect(screen.queryByTestId("login-curtain")).toBeNull();
    expect(
      screen.getByRole("heading", { name: /Sign in to Verdaly/i }),
    ).toBeVisible();
    fireEvent.change(screen.getByLabelText(/^Password$/i), {
      target: { value: DESK_LOGIN.password },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Sign in$/i }));
    act(() => {
      vi.advanceTimersByTime(200);
    });
    // 200ms covers the 150ms auth feedback — no unlock fade in the way.
    expect(onLoginSuccess).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("login-surface")).toHaveAttribute(
      "data-stage",
      "unlocking",
    );
  });
});

describe("same-session return veil", () => {
  it("shows a brief wake veil on re-sit — no lock screen, no second login", () => {
    vi.useFakeTimers();
    const { onLoginSuccess } = renderWorkstation("seated_monitor");
    expect(screen.getByTestId("login-veil")).toBeVisible();
    expect(screen.queryByTestId("login-surface")).toBeNull();
    expect(screen.queryByRole("heading", { name: /Sign in/i })).toBeNull();
    // The veil lives its whole life within 200ms.
    act(() => {
      vi.advanceTimersByTime(199);
    });
    expect(screen.getByTestId("login-veil")).toBeVisible();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.queryByTestId("login-veil")).toBeNull();
    expect(screen.getByRole("toolbar", { name: "Taskbar" })).toBeVisible();
    expect(onLoginSuccess).not.toHaveBeenCalled();
  });

  it("shows no veil on the first sign-in surface", () => {
    vi.useFakeTimers();
    renderWorkstation("desk_login");
    expect(screen.queryByTestId("login-veil")).toBeNull();
    expect(screen.getByTestId("login-surface")).toBeVisible();
  });

  it("renders no veil under reduced motion", () => {
    stubReducedMotion();
    vi.useFakeTimers();
    renderWorkstation("seated_monitor");
    expect(screen.queryByTestId("login-veil")).toBeNull();
    expect(screen.getByRole("toolbar", { name: "Taskbar" })).toBeVisible();
  });
});
