// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { ArtifactOpenButton } from "../src/components/tools/ArtifactOpenButton.js";
afterEach(cleanup);

it("contains an opening failure and permits retry without revealing content", async () => {
  const open = vi
    .fn()
    .mockRejectedValueOnce(new Error("Network unavailable"))
    .mockResolvedValueOnce(undefined);
  const user = userEvent.setup();
  render(
    <ArtifactOpenButton
      artifactId="handoff-email"
      label="Open message"
      onOpenArtifact={open}
    />,
  );
  await user.click(screen.getByRole("button", { name: "Open message" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Could not open this item. Try again.",
  );
  expect(screen.getByRole("button", { name: "Open message" })).toBeEnabled();
  await user.click(screen.getByRole("button", { name: "Open message" }));
  expect(open).toHaveBeenCalledTimes(2);
  expect(open).toHaveBeenLastCalledWith("handoff-email");
  expect(screen.queryByRole("alert")).toBeNull();
});

it("blocks repeat opens while request remains pending", async () => {
  const open = vi.fn(() => new Promise<unknown>(() => undefined));
  const user = userEvent.setup();
  render(
    <ArtifactOpenButton
      artifactId="alert-1"
      label="Open alert"
      onOpenArtifact={open}
    />,
  );
  await user.dblClick(screen.getByRole("button", { name: "Open alert" }));
  expect(open).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("button", { name: "Opening…" })).toBeDisabled();
});
