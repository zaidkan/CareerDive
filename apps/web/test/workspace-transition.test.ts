// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { updateWorkspacePresentation } from "../src/world/deskOs/workspaceTransition.js";
afterEach(() => {
  document.body.replaceChildren();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  delete (document as { startViewTransition?: unknown }).startViewTransition;
});
it("waits only for DOM update and commits once even when the snapshot is skipped", async () => {
  document.body.innerHTML =
    '<div class="desk-workspace"><div class="workspace-panel"></div></div>';
  const update = vi.fn();
  Object.defineProperty(document, "startViewTransition", {
    configurable: true,
    value: (commit: () => void) => {
      commit();
      return {
        updateCallbackDone: Promise.reject(new Error("Snapshot skipped")),
        ready: Promise.reject(new Error("Skipped")),
        finished: Promise.resolve(),
      };
    },
  });
  await updateWorkspacePresentation(update);
  expect(update).toHaveBeenCalledOnce();
});
it.each(["reduced", "unsupported", "outside-workspace"])(
  "updates immediately with %s",
  async (mode) => {
    if (mode !== "outside-workspace")
      document.body.innerHTML =
        '<div class="desk-workspace"><div class="workspace-panel"></div></div>';
    vi.stubGlobal("matchMedia", () => ({ matches: mode === "reduced" }));
    const transition = vi.fn();
    if (mode !== "unsupported")
      Object.defineProperty(document, "startViewTransition", {
        configurable: true,
        value: transition,
      });
    const update = vi.fn();
    await updateWorkspacePresentation(update);
    expect(update).toHaveBeenCalledOnce();
    expect(transition).not.toHaveBeenCalled();
  },
);
