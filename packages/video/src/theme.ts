/** Single source of truth for video motion graphics — mirrors the web theme. */

export const FPS = 30;

export const COLORS = {
  ink: "#0d0f12",
  inkLift: "#14171b",
  panel: "#1e2227",
  paper: "#e6e8eb",
  fog: "#c3c9d1",
  mute: "#9aa0a6",
  phosphor: "#6ea8fe",
  signal: "#2dd4bf",
  signalHot: "#f26d5f",
  doorGlow: "#e8c97a",
} as const;

export const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/** Stagger steps in frames — 3–6f per the motion rules. */
export const STAGGER_FRAMES = 5;

/** 5-layer stack order: mesh → assets → graphics → grade → grain+vignette. */
export const LAYERS = {
  mesh: 0,
  assets: 1,
  graphics: 2,
  grade: 3,
  grain: 4,
} as const;
