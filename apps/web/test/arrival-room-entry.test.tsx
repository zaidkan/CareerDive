// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { useEffect } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import { createInitialWorldState, toClientView } from "@sim/core";
import { SpatialShell } from "../src/world/SpatialShell.js";
import { StartPage } from "../src/site/pages/StartPage.js";

let reportReady: (() => void) | undefined;
vi.mock("../src/world/RoomCanvas.js", () => ({
  RoomCanvas: ({
    onReady,
    enabled,
  }: {
    onReady: () => void;
    enabled: boolean;
  }) => {
    useEffect(() => {
      reportReady = onReady;
    }, [onReady]);
    return <button disabled={!enabled}>Live room control</button>;
  },
}));
const view = toClientView(
  createInitialWorldState("film-entry", 24, {}, loadDefaultCybersecurityPack()),
);
beforeEach(() => {
  reportReady = undefined;
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(
    () => undefined,
  );
});
afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
  vi.restoreAllMocks();
});

it("mounts the room under the film, waits for a ready frame, and retains the same fullscreen target throughout", async () => {
  let fullscreen: Element | null = null;
  const original = Object.getOwnPropertyDescriptor(
    document,
    "fullscreenElement",
  );
  Object.defineProperty(document, "fullscreenElement", {
    configurable: true,
    get: () => fullscreen,
  });
  const request = vi.fn(function (this: HTMLElement) {
    // Native fullscreen reports the element receiving the request.
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    fullscreen = this;
    document.dispatchEvent(new Event("fullscreenchange"));
    return Promise.resolve();
  });
  const oldRequest = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    "requestFullscreen",
  );
  Object.defineProperty(HTMLElement.prototype, "requestFullscreen", {
    configurable: true,
    value: request,
  });
  try {
    const { container } = render(
      <SpatialShell arrivalFilmEnabled view={view} onAction={vi.fn()} />,
    );
    const stage = container.querySelector(".room-stage");
    expect(document.querySelector("video")).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: /Security Operations/i }),
    );
    expect(fullscreen).toBe(stage);
    // The mocked RoomCanvas still crosses a real lazy import/Suspense boundary.
    await waitFor(() => {
      expect(reportReady).toBeDefined();
    }, { timeout: 6000 });
    const live = screen.getByRole("button", {
      name: "Live room control",
      hidden: true,
    });
    expect(live).toBeDisabled();
    expect(live.closest(".room-live")).toHaveAttribute("inert");
    const video = container.querySelector("video");
    if (!video) throw new Error("Film missing after SOC click");
    fireEvent.ended(video);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Entering Security Operations…",
    );
    act(() => {
      reportReady?.();
    });
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
    expect(
      screen.getByRole("button", { name: "Live room control" }),
    ).toBeEnabled();
    expect(fullscreen).toBe(stage);
    expect(request).toHaveBeenCalledTimes(1);
    expect(stage).toHaveFocus();
  } finally {
    if (original)
      Object.defineProperty(document, "fullscreenElement", original);
    else Reflect.deleteProperty(document, "fullscreenElement");
    if (oldRequest)
      Object.defineProperty(
        HTMLElement.prototype,
        "requestFullscreen",
        oldRequest,
      );
    else Reflect.deleteProperty(HTMLElement.prototype, "requestFullscreen");
  }
});

it("does not replay on a repeat room visit and exposes a removable presentation flag", async () => {
  render(<SpatialShell arrivalFilmEnabled view={view} onAction={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: /Security Operations/i }));
  await waitFor(() => {
    expect(reportReady).toBeDefined();
  }, { timeout: 6000 });
  act(() => {
    reportReady?.();
  });
  fireEvent.click(screen.getByRole("button", { name: "Skip film" }));
  await waitFor(() => {
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  fireEvent.click(screen.getByRole("button", { name: "Floor map" }));
  fireEvent.click(
    await screen.findByRole("button", { name: /Security Operations/i }),
  );
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(
    screen.getByRole("button", { name: "Live room control" }),
  ).toBeEnabled();
});

it("disables film completely without changing entry into the same room", async () => {
  render(
    <SpatialShell arrivalFilmEnabled={false} view={view} onAction={vi.fn()} />,
  );
  fireEvent.click(screen.getByRole("button", { name: /Security Operations/i }));
  expect(
    await screen.findByRole("button", { name: "Live room control" }, { timeout: 6000 }),
  ).toBeEnabled();
  expect(document.querySelector("video")).toBeNull();
});

it.each(["sim", "briefing"])(
  "does not replay the film when StartPage resumes the saved %s gate",
  async (gate) => {
    window.sessionStorage.setItem("first-shift-start-gate", gate);
    const client = {
      createSession: vi.fn(async () => ({ sessionId: view.sessionId, view })),
      performAction: vi.fn(),
      performWorkplaceInteraction: vi.fn(),
      submitTaskAttempt: vi.fn(),
      respondToNotification: vi.fn(),
      getDebrief: vi.fn(),
    };
    render(<StartPage client={client} />);
    fireEvent.click(screen.getByRole("button", { name: "Start your first day" }));
    fireEvent.click(
      await screen.findByRole("button", { name: /Security Operations/i }, { timeout: 6000 }),
    );
    expect(
      await screen.findByRole("button", { name: "Live room control" }, { timeout: 6000 }),
    ).toBeEnabled();
    expect(document.querySelector("video")).toBeNull();
    expect(
      screen.queryByRole("button", { name: /continue to floor/i }),
    ).toBeNull();
    expect(client.createSession).toHaveBeenCalledTimes(1);
  },
);
