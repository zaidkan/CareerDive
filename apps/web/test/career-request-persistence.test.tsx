// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
const apiPost = vi.hoisted(() => vi.fn());
vi.mock("../src/transport.js", () => ({ apiPost }));
import { CareerRequestToggle } from "../src/site/careers/CareerRequestToggle.js";
afterEach(() => {
  cleanup();
  apiPost.mockReset();
});
it("restores owner state, rolls back failed write, then confirms retry and reload", async () => {
  const user = userEvent.setup();
  apiPost.mockResolvedValueOnce({ requestedCareerIds: ["electrician"] });
  const rendered = render(
    <CareerRequestToggle careerId="electrician" careerTitle="Electrician" />,
  );
  const button = screen.getByRole("button", { name: "Request Electrician" });
  await waitFor(() => {
    expect(button).toBeEnabled();
  });
  expect(button).toHaveAttribute("aria-pressed", "true");
  apiPost.mockRejectedValueOnce(new Error("offline"));
  await user.click(button);
  await waitFor(() => {
    expect(screen.getByRole("alert")).toBeVisible();
  });
  expect(button).toHaveAttribute("aria-pressed", "true");
  apiPost.mockResolvedValueOnce({
    careerId: "electrician",
    requested: false,
    saved: true,
  });
  await user.click(button);
  await waitFor(() => {
    expect(button).toBeEnabled();
  });
  expect(button).toHaveAttribute("aria-pressed", "false");
  expect(apiPost).toHaveBeenLastCalledWith("/api/career-requests", {
    careerId: "electrician",
    requested: false,
  });
  rendered.unmount();
  apiPost.mockResolvedValueOnce({ requestedCareerIds: [] });
  render(
    <CareerRequestToggle careerId="electrician" careerTitle="Electrician" />,
  );
  await waitFor(() => {
    expect(
      screen.getByRole("button", { name: "Request Electrician" }),
    ).toBeEnabled();
  });
  expect(
    screen.getByRole("button", { name: "Request Electrician" }),
  ).toHaveAttribute("aria-pressed", "false");
});
it("failed hydration cannot claim a local request; connection retry restores state", async () => {
  const user = userEvent.setup();
  apiPost.mockRejectedValueOnce(new Error("offline"));
  render(
    <CareerRequestToggle careerId="electrician" careerTitle="Electrician" />,
  );
  await screen.findByRole("alert");
  expect(
    screen.getByRole("button", { name: "Request Electrician" }),
  ).toBeDisabled();
  apiPost.mockResolvedValueOnce({ requestedCareerIds: ["electrician"] });
  await user.click(screen.getByRole("button", { name: "Retry connection" }));
  await waitFor(() => {
    expect(
      screen.getByRole("button", { name: "Request Electrician" }),
    ).toBeEnabled();
  });
  expect(
    screen.getByRole("button", { name: "Request Electrician" }),
  ).toHaveAttribute("aria-pressed", "true");
});
