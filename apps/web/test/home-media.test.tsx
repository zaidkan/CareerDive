// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  HomeMediaSlot,
  homeMedia,
  resolveHomeMediaSource,
  type HomeMediaSlotId,
} from "../src/site/homeMedia.js";

const SLOT_IDS: readonly HomeMediaSlotId[] = [
  "home-media-arrival",
  "home-media-workplace",
  "home-media-story",
];

afterEach(() => {
  cleanup();
  for (const id of SLOT_IDS) {
    delete homeMedia[id].source;
  }
});

describe("homepage media slots", () => {
  it("every slot resolves real fallback media — no empty placeholders", () => {
    for (const id of SLOT_IDS) {
      const source = resolveHomeMediaSource(homeMedia[id]);
      expect(source).toBeTruthy();
      if (source.kind === "product") {
        expect(source.id).toMatch(/^a-\d\d$/);
      }
    }
  });

  it("renders the audited fallback capture when no custom source is set", () => {
    const { container } = render(<HomeMediaSlot slotId="home-media-arrival" />);
    const frame = container.querySelector(
      '[data-media-slot="home-media-arrival"]',
    );
    expect(frame).not.toBeNull();
    const img = frame?.querySelector("img");
    expect(img?.getAttribute("src")).toContain("a-11-desktop-dark.webp");
  });

  it("one registry entry swaps the rendered media without JSX changes", () => {
    homeMedia["home-media-story"].source = {
      kind: "image",
      src: "/custom/story-dark.webp",
      srcLight: "/custom/story-light.webp",
      width: 1600,
      height: 900,
    };
    const { container } = render(<HomeMediaSlot slotId="home-media-story" />);
    const imgs = Array.from(
      container.querySelectorAll('[data-media-slot="home-media-story"] img'),
    );
    const sources = imgs.map((img) => img.getAttribute("src"));
    expect(sources).toContain("/custom/story-dark.webp");
    expect(sources).toContain("/custom/story-light.webp");
    expect(sources.join()).not.toContain("a-11");
  });

  it("accepts a video source with poster", () => {
    homeMedia["home-media-workplace"].source = {
      kind: "video",
      src: "/custom/workplace-loop.mp4",
      poster: "/custom/workplace-poster.webp",
      width: 1920,
      height: 1080,
    };
    const { container } = render(<HomeMediaSlot slotId="home-media-workplace" />);
    const video = container.querySelector("video");
    expect(video?.getAttribute("src")).toBe("/custom/workplace-loop.mp4");
    expect(video?.getAttribute("poster")).toBe("/custom/workplace-poster.webp");
  });
});
