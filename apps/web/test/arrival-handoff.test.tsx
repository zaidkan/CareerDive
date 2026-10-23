// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setSimulationMuted } from "../src/world/dialogue/audio.js";
import { ArrivalFilm } from "../src/site/ArrivalFilm.js";

let reduced = false;
const play = vi.fn<() => Promise<void>>();
beforeEach(() => {
  reduced = false;
  setSimulationMuted(false);
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: reduced,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
  play.mockReset().mockResolvedValue(undefined);
  vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(play);
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(
    () => undefined,
  );
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function video(): HTMLVideoElement {
  const el = document.querySelector("video");
  if (!el) throw new Error("Arrival handoff video missing");
  return el;
}

describe("arrival handoff presentation", () => {
  it("keeps keyboard focus on the active film control rather than the covered page", async () => {
    const user = userEvent.setup();
    render(
      <>
        <button>Covered page control</button>
        <ArrivalFilm sceneReady={false} onComplete={vi.fn()} />
      </>,
    );
    const skip = screen.getByRole("button", { name: "Skip film" });
    expect(skip).toHaveFocus();
    await user.tab();
    expect(skip).toHaveFocus();
    await user.tab({ shift: true });
    expect(skip).toHaveFocus();
  });
  it("ignores an obsolete StrictMode play rejection after the current playback starts", async () => {
    let rejectFirst!: (reason: Error) => void;
    play.mockImplementationOnce(
      () =>
        new Promise<void>((_resolve, reject) => {
          rejectFirst = reject;
        }),
    );
    render(
      <StrictMode>
        <ArrivalFilm sceneReady onComplete={vi.fn()} />
      </StrictMode>,
    );
    await act(async () => {
      rejectFirst(new Error("The play() request was interrupted by pause"));
      await Promise.resolve();
    });
    expect(screen.getByRole("button", { name: "Skip film" })).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Enter Security Operations" }),
    ).toBeNull();
  });
  it("autoplays with sound inline, then dissolves only after the live scene is ready", async () => {
    const onComplete = vi.fn();
    const { rerender } = render(
      <ArrivalFilm sceneReady={false} onComplete={onComplete} />,
    );
    expect(video()).toHaveAttribute("autoplay");
    expect(video().muted).toBe(false);
    expect(
      screen.getByText("Switching to fullscreen… Press Esc to exit."),
    ).toBeVisible();
    expect(video()).toHaveAttribute("playsinline");
    expect(video()).toHaveAttribute("src", "/arrival-film.mp4");
    expect(play).toHaveBeenCalled();
    fireEvent.ended(video());
    expect(screen.getByRole("status")).toHaveTextContent(
      "Entering Security Operations…",
    );
    expect(onComplete).not.toHaveBeenCalled();
    rerender(<ArrivalFilm sceneReady onComplete={onComplete} />);
    expect(screen.getByRole("dialog")).toHaveAttribute("data-phase", "fading");
    // Once a slow scene needed the veil, dissolve that veil directly into
    // gameplay rather than flashing back to the movie's last frame.
    expect(screen.getByRole("status")).toHaveTextContent(
      "Entering Security Operations…",
    );
    expect(onComplete).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(onComplete).toHaveBeenCalledWith(true);
    });
  });

  it("preserves the last film frame for a ready scene instead of flashing a loading veil", async () => {
    const onComplete = vi.fn();
    render(<ArrivalFilm sceneReady onComplete={onComplete} />);
    fireEvent.ended(video());
    expect(screen.queryByRole("status")).toBeNull();
    expect(video()).toBeInTheDocument();
    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(onComplete).toHaveBeenCalledWith(true);
    });
  });

  it.each([false, true])(
    "provides one Enter button when autoplay is blocked (retry also blocked: %s)",
    async (retryBlocked) => {
      play.mockRejectedValueOnce(new Error("Autoplay denied"));
      play.mockRejectedValueOnce(new Error("Muted autoplay denied"));
      if (retryBlocked) play.mockRejectedValueOnce(new Error("Still denied"));
      const onComplete = vi.fn();
      render(<ArrivalFilm sceneReady onComplete={onComplete} />);
      const enter = await screen.findByRole("button", {
        name: "Enter Security Operations",
      });
      expect(enter).toHaveFocus();
      expect(screen.getAllByRole("button")).toHaveLength(1);
      expect(screen.getByAltText("Verdaly arrival film poster")).toBeVisible();
      fireEvent.click(enter);
      if (!retryBlocked) {
        await waitFor(() => {
          expect(
            screen.getByRole("button", { name: "Skip film" }),
          ).toBeVisible();
        });
        fireEvent.ended(video());
      }
      await waitFor(() => {
        expect(onComplete).toHaveBeenCalledTimes(1);
      });
    },
  );

  it("skips a failed media file, waiting for the actual scene rather than revealing an empty canvas", async () => {
    const onComplete = vi.fn();
    const { rerender } = render(
      <ArrivalFilm sceneReady={false} onComplete={onComplete} />,
    );
    fireEvent.error(video());
    expect(screen.getByRole("status")).toHaveTextContent(
      "Entering Security Operations…",
    );
    expect(onComplete).not.toHaveBeenCalled();
    rerender(<ArrivalFilm sceneReady onComplete={onComplete} />);
    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith(false);
    });
  });

  it("skips all video and fades under reduced motion, but still waits for the scene", async () => {
    reduced = true;
    const onComplete = vi.fn();
    const { rerender } = render(
      <ArrivalFilm sceneReady={false} onComplete={onComplete} />,
    );
    expect(document.querySelector("video")).toBeNull();
    expect(play).not.toHaveBeenCalled();
    expect(onComplete).not.toHaveBeenCalled();
    rerender(<ArrivalFilm sceneReady onComplete={onComplete} />);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("lets keyboard users skip playback without changing scene readiness", async () => {
    const onComplete = vi.fn();
    render(<ArrivalFilm sceneReady onComplete={onComplete} />);
    fireEvent.click(screen.getByRole("button", { name: "Skip film" }));
    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  it("does not leave stalled media as a permanent gate", async () => {
    vi.useFakeTimers();
    try {
      const onComplete = vi.fn();
      render(<ArrivalFilm sceneReady onComplete={onComplete} />);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(30_000);
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(300);
      });
      expect(onComplete).toHaveBeenCalledWith(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("completes once under StrictMode and cancels completion when unmounted", async () => {
    const onComplete = vi.fn();
    const { unmount } = render(
      <StrictMode>
        <ArrivalFilm sceneReady onComplete={onComplete} />
      </StrictMode>,
    );
    fireEvent.ended(video());
    unmount();
    await new Promise((resolve) => setTimeout(resolve, 350));
    expect(onComplete).not.toHaveBeenCalled();
  });
});

it("falls back to muted playback when audible autoplay is denied without adding an entry gate", async () => {
  play.mockRejectedValueOnce(new Error("Audible autoplay denied"));
  const onComplete = vi.fn();
  render(<ArrivalFilm sceneReady onComplete={onComplete} />);
  await waitFor(() => { expect(play).toHaveBeenCalledTimes(2); });
  expect(video().muted).toBe(true);
  expect(screen.queryByRole("button", { name: "Enter Security Operations" })).toBeNull();
  fireEvent.ended(video());
  await waitFor(() => { expect(onComplete).toHaveBeenCalledTimes(1); });
});

it("honors persisted sound preference and live mute changes", async () => {
  setSimulationMuted(true);
  render(<ArrivalFilm sceneReady onComplete={vi.fn()} />);
  expect(video().muted).toBe(true);
  await act(async () => { setSimulationMuted(false); });
  expect(video().muted).toBe(false);
  await act(async () => { setSimulationMuted(true); });
  expect(video().muted).toBe(true);
});

it("never restarts a skipped or unmounted film after a late audible rejection", async () => {
  let reject!: (reason: Error) => void;
  play.mockImplementationOnce(() => new Promise<void>((_resolve, fail) => { reject = fail; }));
  render(<ArrivalFilm sceneReady onComplete={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Skip film" }));
  await act(async () => { reject(new Error("Late rejection")); });
  expect(play).toHaveBeenCalledTimes(1);
});
