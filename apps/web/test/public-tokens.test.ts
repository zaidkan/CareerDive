import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Base in a variable: vite rewrites inline new URL(literal, import.meta.url) to a dev-server URL.
const moduleBase = import.meta.url;
const css = readFileSync(fileURLToPath(new URL("../src/foundation.css", moduleBase)), "utf8");

function hexTokens(selector: string): Record<string, string> {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const block = new RegExp(`${escaped}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? "";
  return Object.fromEntries(
    [...block.matchAll(/(--[a-z-]+):\s*(#[0-9A-Fa-f]{6});/g)].map((match) => [match[1], match[2]]),
  ) as Record<string, string>;
}

describe("CHAT 04 public semantic colors", () => {
  it("keeps exact dark and light authority values", () => {
    expect(hexTokens(":root")).toMatchObject({
      "--canvas": "#0C0F14",
      "--surface-base": "#12171E",
      "--surface-subtle": "#181F28",
      "--surface-strong": "#202936",
      "--surface-raised": "#27313F",
      "--text-primary": "#F5F7FA",
      "--text-secondary": "#B9C2CF",
      "--text-muted": "#919DAE",
      "--border-subtle": "#2D3744",
      "--border-strong": "#5B697B",
      "--action-primary": "#8CB7FF",
      "--action-on-primary": "#08111F",
      "--focus-ring": "#A7C8FF",
      "--status-info-fg": "#8CB7FF",
      "--status-info-bg": "#152236",
      "--status-success-fg": "#72D6A3",
      "--status-success-bg": "#132A20",
      "--status-warning-fg": "#F2CA7A",
      "--status-warning-bg": "#2B2414",
      "--status-danger-fg": "#FF8A92",
      "--status-danger-bg": "#2C171B",
    });
    expect(hexTokens(':root[data-theme="light"]')).toMatchObject({
      "--canvas": "#F6F7F9",
      "--surface-base": "#FFFFFF",
      "--surface-subtle": "#EEF1F5",
      "--surface-strong": "#E4E9EF",
      "--surface-raised": "#FFFFFF",
      "--text-primary": "#171B22",
      "--text-secondary": "#495568",
      "--text-muted": "#596678",
      "--border-subtle": "#D6DCE4",
      "--border-strong": "#8996A7",
      "--action-primary": "#245EA8",
      "--action-on-primary": "#FFFFFF",
      "--focus-ring": "#1F5EA8",
      "--status-info-fg": "#245EA8",
      "--status-info-bg": "#EAF2FF",
      "--status-success-fg": "#176941",
      "--status-success-bg": "#E9F7EF",
      "--status-warning-fg": "#795100",
      "--status-warning-bg": "#FFF4D8",
      "--status-danger-fg": "#B42332",
      "--status-danger-bg": "#FDEBEC",
    });
    expect(css).toContain('--font-body: "Plus Jakarta Sans"');
  });
});
