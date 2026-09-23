// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { StrictMode } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import { createInitialWorldState, toClientView } from "@sim/core";
import { HttpSimulationClient } from "../src/client.js";
import { StartPage } from "../src/site/pages/StartPage.js";

vi.mock("../src/world/RoomCanvas.js", () => ({
  RoomCanvas: ({ onAcceptedDistance, onInteract }: {
    onAcceptedDistance: (meters: number) => void;
    onInteract: (id: string) => void;
  }) => <>
    <button onClick={() => { onAcceptedDistance(5); }}>Move through office</button>
    <button onClick={() => { onInteract("desk_player"); }}>Sit at desk</button>
  </>,
}));
afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
  vi.unstubAllGlobals();
});

it("creates exactly one assessed session after arrival and preserves class-client methods through movement and Desk OS", async () => {
  const user = userEvent.setup();
  const view = toClientView(createInitialWorldState("entry", 24, {}, loadDefaultCybersecurityPack()));
  const moved = { ...view, workplace: { ...view.workplace, energy: { current: 99, max: 100 } } };
  const requests: { url: string; body: unknown }[] = [];
  vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = input instanceof Request ? input.url : input.toString();
    if (typeof init?.body !== "string") throw new Error("Expected JSON request body");
    const body: unknown = JSON.parse(init.body);
    requests.push({ url, body });
    const data = url.endsWith("session.create")
      ? { sessionId: view.sessionId, view }
      : url.endsWith("simulation.performWorkplaceInteraction")
        ? { view: moved, sequence: 1, feedback: "movement_recorded" }
        : { view: { ...moved, simClock: 5 } };
    return new Response(JSON.stringify({ result: { data } }), {
      headers: { "content-type": "application/json" },
    });
  }));
  const client = new HttpSimulationClient("http://localhost:3001");
  render(<StrictMode><StartPage client={client} /></StrictMode>);
  expect(requests).toEqual([]);
  await user.click(screen.getByRole("button", { name: /Play arrival film/i }));
  const video = document.querySelector("video");
  if (!video) throw new Error("Arrival video missing");
  fireEvent.ended(video);
  await user.click(await screen.findByRole("button", { name: /Start your first day/i }));
  await user.click(await screen.findByRole("button", { name: /Security Operations/ }));
  expect(requests.filter(({ url }) => url.endsWith("session.create"))).toHaveLength(1);
  expect(requests[0]?.body).toMatchObject({ sessionKind: "assessed", pacingMode: "standard" });
  expect(screen.queryByRole("navigation", { name: /Choose how/ })).toBeNull();
  expect(screen.queryByText(/Skip practice|Practice shift|Walk the office|Desk only|Simple list/)).toBeNull();
  await user.click(await screen.findByRole("button", { name: "Move through office" }, { timeout: 6000 }));
  await waitFor(() => { expect(screen.getByTestId("energy-meter")).toHaveAttribute("aria-valuenow", "99"); });
  expect(requests[1]).toEqual({
    url: "http://localhost:3001/trpc/simulation.performWorkplaceInteraction",
    body: { sessionId: "entry", interaction: { type: "movement_exertion", distanceMeters: 5 } },
  });
  await user.click(screen.getByRole("button", { name: "Sit at desk" }));
  await user.type(await screen.findByLabelText(/Username/), "day1.analyst");
  await user.type(screen.getByLabelText(/Password/), "FirstDay!");
  await user.click(screen.getByRole("button", { name: /^Login$/ }));
  await user.click(await screen.findByRole("tab", { name: /^Email/ }));
  await user.click(screen.getByRole("button", { name: /Read shift handoff/ }));
  await waitFor(() => { expect(requests.some(({ url }) => url.endsWith("simulation.performAction"))).toBe(true); });
  expect(screen.queryByText("That workplace interaction could not be completed.")).toBeNull();
  expect(requests.filter(({ url }) => url.endsWith("session.create"))).toHaveLength(1);
}, 15000);
