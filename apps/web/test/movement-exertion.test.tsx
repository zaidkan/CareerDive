// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialWorldState, toClientView } from "@sim/core";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import { useMovementExertion } from "../src/world/useMovementExertion.js";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
const view = toClientView(
  createInitialWorldState("movement", 24, {}, loadDefaultCybersecurityPack()),
);

describe("canonical movement submission", () => {
  it("accumulates accepted distance, preserves remainder and never changes energy optimistically", async () => {
    vi.useFakeTimers();
    const submit = vi
      .fn()
      .mockResolvedValue({ view, sequence: 1, feedback: "movement_recorded" });
    const { result } = renderHook(() => useMovementExertion(view, submit, {}));
    act(() => {
      result.current.addDistance(2);
      result.current.addDistance(2.9);
    });
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(submit).not.toHaveBeenCalled();
    act(() => {
      result.current.addDistance(0.2);
    });
    await act(() => vi.advanceTimersByTimeAsync(100));
    expect(submit).toHaveBeenCalledExactlyOnceWith({
      type: "movement_exertion",
      distanceMeters: 5,
    });
    expect(view.workplace.energy.current).toBe(100);
    act(() => {
      result.current.addDistance(4.9);
    });
    await act(() => vi.advanceTimersByTimeAsync(1100));
    expect(submit).toHaveBeenCalledTimes(2);
  });

  it("serializes buckets below the server rate limit, including queued distance", async () => {
    vi.useFakeTimers();
    const times: number[] = [];
    const submit = vi.fn(async () => {
      times.push(Date.now());
      return { view, sequence: 1, feedback: "movement_recorded" as const };
    });
    const { result } = renderHook(() => useMovementExertion(view, submit, {}));
    act(() => {
      result.current.addDistance(20);
    });
    await act(() => vi.advanceTimersByTimeAsync(4100));
    expect(submit).toHaveBeenCalledTimes(4);
    for (const time of times)
      expect(
        times.filter((other) => other > time - 1000 && other <= time),
      ).toHaveLength(1);
  });

  it("waits for other mutations and discards only the fractional remainder on room exit", async () => {
    vi.useFakeTimers();
    const submit = vi
      .fn()
      .mockResolvedValue({ view, sequence: 1, feedback: "movement_recorded" });
    const { result, rerender } = renderHook(
      ({ busy }) =>
        useMovementExertion(
          view,
          submit,
          busy ? { pendingKey: "action:read" } : {},
        ),
      { initialProps: { busy: true } },
    );
    act(() => {
      result.current.addDistance(4.9);
    });
    await act(() => vi.advanceTimersByTimeAsync(2000));
    expect(submit).not.toHaveBeenCalled();
    act(() => {
      result.current.resetDistance();
    });
    rerender({ busy: false });
    await act(() => vi.advanceTimersByTimeAsync(1100));
    expect(submit).not.toHaveBeenCalled();
  });

  it("retains complete buckets when leaving the room while a different mutation is pending", async () => {
    vi.useFakeTimers();
    const submit = vi
      .fn()
      .mockResolvedValue({ view, sequence: 1, feedback: "movement_recorded" });
    const { result, rerender } = renderHook(
      ({ busy }) =>
        useMovementExertion(
          view,
          submit,
          busy ? { pendingKey: "action:read" } : {},
        ),
      { initialProps: { busy: true } },
    );
    act(() => {
      result.current.addDistance(5.2);
      result.current.resetDistance();
    });
    rerender({ busy: false });
    await act(() => vi.advanceTimersByTimeAsync(2000));
    expect(submit).toHaveBeenCalledTimes(1);
    act(() => {
      result.current.addDistance(4.8);
    });
    await act(() => vi.advanceTimersByTimeAsync(2000));
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it("does not resubmit failed buckets or submit at zero energy", async () => {
    vi.useFakeTimers();
    const submit = vi.fn().mockRejectedValue(new Error("offline"));
    const { result, rerender } = renderHook(
      ({ current }) => useMovementExertion(current, submit, {}),
      { initialProps: { current: view } },
    );
    act(() => {
      result.current.addDistance(5);
    });
    await act(() => vi.advanceTimersByTimeAsync(5000));
    expect(submit).toHaveBeenCalledTimes(1);
    rerender({
      current: {
        ...view,
        workplace: { ...view.workplace, energy: { current: 0, max: 100 } },
      },
    });
    act(() => {
      result.current.addDistance(5);
    });
    await act(() => vi.advanceTimersByTimeAsync(5000));
    expect(submit).toHaveBeenCalledTimes(1);
  });
});
