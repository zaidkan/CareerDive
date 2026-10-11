import { deferred } from "./helpers/deferred.js";
import { afterEach, expect, it, vi } from "vitest";
import { RETENTION_INTERVAL_MS, runSessionRetention, startSessionRetention } from "../src/db/retention.js";

afterEach(() => { vi.useRealTimers(); });
it("drains expired batches, and caps a large backlog without an unbounded loop", async () => {
  const purge = vi.fn().mockResolvedValueOnce(100).mockResolvedValueOnce(25);
  expect(await runSessionRetention(purge)).toEqual({ deleted: 125, more: false });
  expect(purge).toHaveBeenCalledTimes(2);
  const backlog = vi.fn().mockResolvedValue(100);
  expect(await runSessionRetention(backlog)).toEqual({ deleted: 10000, more: true });
  expect(backlog).toHaveBeenCalledTimes(100);
});
it("runs immediately and hourly, avoids overlap, and retries a failed run next hour", async () => {
  vi.useFakeTimers();
  const pending = deferred<number>();
  const purge = vi.fn().mockReturnValueOnce(pending.promise).mockRejectedValueOnce(new Error("offline")).mockResolvedValue(0);
  const result = vi.fn();
  const error = vi.fn();
  const stop = startSessionRetention(purge, result, error);
  try {
    expect(purge).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(RETENTION_INTERVAL_MS * 2);
    expect(purge).toHaveBeenCalledTimes(1);
    pending.resolve(0);
    await vi.advanceTimersByTimeAsync(0);
    expect(result).toHaveBeenCalledWith({ deleted: 0, more: false });
    await vi.advanceTimersByTimeAsync(RETENTION_INTERVAL_MS);
    expect(error).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(RETENTION_INTERVAL_MS);
    expect(result).toHaveBeenCalledTimes(2);
  } finally { await stop(); }
  await vi.advanceTimersByTimeAsync(RETENTION_INTERVAL_MS);
  expect(purge).toHaveBeenCalledTimes(3);
});
it("shutdown waits for the current batch and stops further deletion and timers", async () => {
  vi.useFakeTimers();
  const pending = deferred<number>();
  const purge = vi.fn().mockReturnValue(pending.promise);
  const stop = startSessionRetention(purge, vi.fn(), vi.fn());
  const closing = stop();
  pending.resolve(100);
  await closing;
  await vi.advanceTimersByTimeAsync(RETENTION_INTERVAL_MS * 2);
  expect(purge).toHaveBeenCalledTimes(1);
  expect(vi.getTimerCount()).toBe(0);
});
