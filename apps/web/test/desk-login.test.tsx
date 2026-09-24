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
import { LockScreen } from "../src/world/deskOs/LockScreen.js";
import { DESK_LOGIN } from "../src/world/deskLogin.js";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function stubReducedMotion() {
  vi.stubGlobal(
    "matchMedia",      (query: string): MediaQueryList =>
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

/** Deterministic clock: all boot/auth timers run under fake timers. */
function setup() {
  vi.useFakeTimers();
  const onLoginSuccess = vi.fn();
  render(<LockScreen onLoginSuccess={onLoginSuccess} />);
  return { onLoginSuccess };
}

function typeCredentials(username: string, password: string) {
  fireEvent.change(screen.getByLabelText(/Username/i), {
    target: { value: username },
  });
  fireEvent.change(screen.getByLabelText(/Password/i), {
    target: { value: password },
  });
}

function submit() {
  fireEvent.click(screen.getByRole("button", { name: /^Login$/i }));
}

/** Repeat attempt while pending — what pressing Enter again would do. */
function submitAgain() {
  fireEvent.submit(document.querySelector("form") as HTMLFormElement);
}

describe("workstation boot and login", () => {
  it("shows wake/init atmosphere, then rests at the sign-in surface", () => {
    setup();
    // Atmosphere from the start; sign-in is already usable beneath it.
    expect(screen.getByTestId("login-boot")).toBeVisible();
    expect(screen.getByLabelText(/Username/i)).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(screen.queryByTestId("login-boot")).toBeNull();
    expect(screen.getByRole("heading", { name: /Sign in/i })).toBeVisible();
    expect(document.activeElement).toBe(screen.getByLabelText(/Username/i));
  });

  it("renders labeled username and masked password fields", () => {
    setup();
    expect(screen.getByLabelText(/Username/i)).toHaveAttribute("type", "text");
    expect(screen.getByLabelText(/Password/i)).toHaveAttribute(
      "type",
      "password",
    );
  });

  it("unlocks with the existing valid credentials", () => {
    const { onLoginSuccess } = setup();
    typeCredentials(DESK_LOGIN.username, DESK_LOGIN.password);
    submit();
    expect(screen.getByRole("button", { name: /Signing in/i })).toBeDisabled();
    expect(screen.getByTestId("login-surface")).toHaveAttribute(
      "data-stage",
      "verifying",
    );
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.getByTestId("login-surface")).toHaveAttribute(
      "data-stage",
      "unlocking",
    );
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(onLoginSuccess).toHaveBeenCalledTimes(1);
  });

  it("stays locked on invalid credentials and keeps the username", () => {
    const { onLoginSuccess } = setup();
    typeCredentials(DESK_LOGIN.username, "wrong-pass");
    submit();
    expect(screen.getByRole("alert")).toHaveTextContent(/incorrect/i);
    expect(screen.getByLabelText(/Username/i)).toHaveValue(DESK_LOGIN.username);
    expect(screen.getByLabelText(/Password/i)).toHaveValue("");
    expect(screen.getByRole("button", { name: /^Login$/i })).toBeEnabled();
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onLoginSuccess).not.toHaveBeenCalled();
  });

  it("submits with Enter from the password field", async () => {
    // Real timers here: genuine keyboard semantics, no arbitrary sleeps —
    // waitFor polls until the unlock completes.
    const user = userEvent.setup();
    const onLoginSuccess = vi.fn();
    render(<LockScreen onLoginSuccess={onLoginSuccess} />);
    await user.type(screen.getByLabelText(/Username/i), DESK_LOGIN.username);
    await user.type(
      screen.getByLabelText(/Password/i),
      `${DESK_LOGIN.password}{enter}`,
    );
    await waitFor(
      () => {
        expect(onLoginSuccess).toHaveBeenCalledTimes(1);
      },
      { timeout: 2500 },
    );
  });

  it("ignores repeat submissions while authenticating", () => {
    const { onLoginSuccess } = setup();
    typeCredentials(DESK_LOGIN.username, DESK_LOGIN.password);
    submit();
    submitAgain();
    submitAgain();
    submitAgain();
    expect(screen.getByRole("button", { name: /Signing in/i })).toBeDisabled();
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(onLoginSuccess).toHaveBeenCalledTimes(1);
  });

  it("announces errors accessibly and returns focus to the password field", () => {
    setup();
    typeCredentials(DESK_LOGIN.username, "wrong-pass");
    submit();
    const alert = screen.getByRole("alert");
    expect(alert).toBeVisible();
    expect(screen.getByLabelText(/Password/i)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByLabelText(/Password/i)).toHaveFocus();
    // Immediate retry is available.
    typeCredentials(DESK_LOGIN.username, DESK_LOGIN.password);
    expect(screen.queryByRole("alert")).toBeInTheDocument();
  });

  it("fires the success callback exactly once through the unlock", () => {
    const { onLoginSuccess } = setup();
    typeCredentials(DESK_LOGIN.username, DESK_LOGIN.password);
    submit();
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(onLoginSuccess).toHaveBeenCalledTimes(1);
    // A late repeat cannot fire it again.
    submitAgain();
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(onLoginSuccess).toHaveBeenCalledTimes(1);
  });

  it("skips boot theater and the unlock fade under reduced motion", () => {
    stubReducedMotion();
    const { onLoginSuccess } = setup();
    expect(screen.queryByTestId("login-boot")).toBeNull();
    expect(screen.getByLabelText(/Username/i)).toHaveFocus();
    typeCredentials(DESK_LOGIN.username, DESK_LOGIN.password);
    submit();
    act(() => {
      vi.advanceTimersByTime(300);
    });
    // 300ms covers auth feedback only — no unlock fade in the way.
    expect(onLoginSuccess).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("login-surface")).toHaveAttribute(
      "data-stage",
      "unlocking",
    );
  });
});
