// DOM probe for UI-2 homepage: media integrity, theme swap, pending slots, overlays.
import { chromium } from "@playwright/test";

const BASE = process.env.QA_BASE ?? "http://localhost:5178/";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
await page.goto(BASE, { waitUntil: "networkidle" });
await page.evaluate(async () => {
  const step = window.innerHeight / 2;
  for (let y = 0; y < document.body.scrollHeight; y += step) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 40));
  }
});
await page.waitForTimeout(600);

const media = await page.evaluate(() => {
  const imgs = [...document.querySelectorAll("img")].map((img) => ({
    src: img.currentSrc.split("/").pop(),
    loaded: img.naturalWidth > 0,
  }));
  return {
    imgs,
    slots: [...document.querySelectorAll("[data-media-slot]")].map((el) => ({
      slot: el.getAttribute("data-media-slot"),
      pending: el.getAttribute("data-media-pending"),
    })),
    overlay: document.querySelector("vite-error-overlay") !== null,
    sections: [...document.querySelectorAll("main section")].map(
      (s) => s.getAttribute("aria-labelledby") ?? "?",
    ),
  };
});

const themeSwap = await page.evaluate(() => {
  const root = document.documentElement;
  root.setAttribute("data-theme", "light");
  const cap = document.querySelector('[data-media-slot="home-case-a1042"]');
  const light = cap?.querySelector(".home-capture-theme--light");
  const dark = cap?.querySelector(".home-capture-theme--dark");
  const lightDisplay = light ? getComputedStyle(light).display : "n/a";
  const darkDisplay = dark ? getComputedStyle(dark).display : "n/a";
  const cap11 = document.querySelector('[data-media-slot="home-hero-workplace"]');
  const darkOnly = cap11?.querySelector(".home-capture-theme--dark");
  const darkOnlyDisplay = darkOnly ? getComputedStyle(darkOnly).display : "n/a";
  root.setAttribute("data-theme", "dark");
  return { lightDisplay, darkDisplay, darkOnlyDisplay };
});

const brokenImgs = media.imgs.filter((i) => !i.loaded);
console.log("OVERLAY:", media.overlay);
console.log("SECTIONS:", media.sections.join(" | "));
console.log("IMAGES:", media.imgs.length, "broken:", JSON.stringify(brokenImgs));
console.log("SLOTS:", JSON.stringify(media.slots, null, 1));
console.log("THEME SWAP:", JSON.stringify(themeSwap));
await browser.close();
