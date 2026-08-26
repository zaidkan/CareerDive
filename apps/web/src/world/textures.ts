/**
 * Procedural canvas textures for the SOC — keep them small and shared.
 */
import * as THREE from "three";

/**
 * Textures that never vary per instance are shared. Without this, every
 * cubicle, painting and plaque uploaded its own copy of an identical bitmap.
 */
function memoizeTexture<A extends unknown[]>(
  build: (...args: A) => THREE.CanvasTexture,
): (...args: A) => THREE.CanvasTexture {
  const cache = new Map<string, THREE.CanvasTexture>();
  return (...args: A) => {
    const key = JSON.stringify(args);
    const hit = cache.get(key);
    if (hit) return hit;
    const made = build(...args);
    cache.set(key, made);
    return made;
  };
}

function canvasTexture(
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas unavailable");
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Two-by-two block of tiles, so a single tiled plane reproduces the
 * checkerboard that used to cost one mesh per tile.
 */
export function makeFloorTileTexture(): THREE.CanvasTexture {
  return canvasTexture(512, 512, (ctx, w, h) => {
    const cellW = w / 2;
    const cellH = h / 2;
    for (let ty = 0; ty < 2; ty += 1) {
      for (let tx = 0; tx < 2; tx += 1) {
        const x0 = tx * cellW;
        const y0 = ty * cellH;
        ctx.fillStyle = (tx + ty) % 2 === 0 ? "#2a221c" : "#363028";
        ctx.fillRect(x0, y0, cellW, cellH);

        for (let i = 0; i < 260; i += 1) {
          const n = Math.round(18 + Math.random() * 22);
          ctx.fillStyle = `rgba(${String(n + 20)},${String(n + 12)},${String(n)},0.32)`;
          ctx.fillRect(x0 + Math.random() * cellW, y0 + Math.random() * cellH, 2, 2);
        }
        ctx.strokeStyle = "rgba(20,14,10,0.6)";
        ctx.lineWidth = 5;
        ctx.strokeRect(x0 + 2.5, y0 + 2.5, cellW - 5, cellH - 5);
        ctx.strokeStyle = "rgba(70,55,42,0.22)";
        ctx.lineWidth = 2;
        ctx.strokeRect(x0 + 9, y0 + 9, cellW - 18, cellH - 18);
      }
    }
  });
}

export function makeCarpetTexture(hex = "#5a3a2e"): THREE.CanvasTexture {
  return canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = hex;
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 3) {
      for (let x = 0; x < w; x += 3) {
        const v = Math.floor(Math.random() * 40);
        ctx.fillStyle = `rgba(${String(v)},${String(Math.round(v * 0.7))},${String(Math.round(v * 0.5))},0.28)`;
        ctx.fillRect(x, y, 2, 2);
      }
    }
    ctx.strokeStyle = "rgba(30,18,12,0.45)";
    ctx.lineWidth = 10;
    ctx.strokeRect(4, 4, w - 8, h - 8);
  });
}

export function makeWallTexture(base = "#2a221c"): THREE.CanvasTexture {
  return canvasTexture(512, 256, (ctx, w, h) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 1800; i += 1) {
      const g = Math.round(28 + Math.random() * 18);
      ctx.fillStyle = `rgba(${String(g + 8)},${String(g)},${String(g - 4)},0.22)`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 3, 3);
    }
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    for (let y = 0; y < h; y += 48) {
      ctx.fillRect(0, y, w, 1);
    }
  });
}

export const makeCubicleFabricTexture = memoizeTexture((): THREE.CanvasTexture =>
  canvasTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = "#3d342a";
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 2) {
      for (let x = 0; x < w; x += 2) {
        if ((x + y) % 4 === 0) {
          ctx.fillStyle = "rgba(55,48,40,0.55)";
          ctx.fillRect(x, y, 2, 2);
        }
      }
    }
  }),
);

export const makeWoodTexture = memoizeTexture((base: string = "#2c241c"): THREE.CanvasTexture =>
  canvasTexture(256, 128, (ctx, w, h) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 28; i += 1) {
      const y = (i / 28) * h;
      ctx.strokeStyle = `rgba(20,12,8,${String(0.12 + Math.random() * 0.2)})`;
      ctx.lineWidth = 1 + Math.random() * 2;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(w * 0.3, y + 4, w * 0.7, y - 3, w, y + 2);
      ctx.stroke();
    }
  }),
);

export const makeMonitorGlowTexture = memoizeTexture((tint: string): THREE.CanvasTexture =>
  canvasTexture(128, 96, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#0a1214");
    g.addColorStop(0.4, tint);
    g.addColorStop(1, "#050808");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    for (let y = 0; y < h; y += 3) {
      ctx.fillRect(0, y, w, 1);
    }
  }),
);

/**
 * Largest font size at which the measured string still fits `maxWidth`. Canvas
 * silently overflows its bitmap, so signage has to be measured down or it
 * renders clipped to the middle characters.
 */
export function fitFontSize({
  measure,
  maxWidth,
  startPx,
  minPx = 7,
}: {
  measure: (px: number) => number;
  maxWidth: number;
  startPx: number;
  minPx?: number;
}): number {
  let size = Math.floor(startPx);
  while (size > minPx && measure(size) > maxWidth) {
    size -= 1;
  }
  return size;
}

const buildPortrait = memoizeTexture(
  (
    skin: string,
    hair: string,
    top: string,
    longHair: boolean,
  ): THREE.CanvasTexture =>
    canvasTexture(192, 224, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#cfd8d4");
    g.addColorStop(1, "#9aa8a4");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2;
    if (longHair) {
      ctx.fillStyle = hair;
      ctx.beginPath();
      ctx.ellipse(cx, h * 0.5, w * 0.3, h * 0.34, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = top;
    ctx.beginPath();
    ctx.ellipse(cx, h * 1.02, w * 0.42, h * 0.3, 0, Math.PI, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.ellipse(cx, h * 0.72, w * 0.1, h * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx, h * 0.46, w * 0.21, h * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.ellipse(cx, h * 0.31, w * 0.23, h * 0.14, 0, Math.PI, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#2a2018";
    ctx.beginPath();
    ctx.ellipse(cx - w * 0.08, h * 0.45, w * 0.022, h * 0.016, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + w * 0.08, h * 0.45, w * 0.022, h * 0.016, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(60,40,32,0.75)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, h * 0.5, w * 0.07, 0.25 * Math.PI, 0.75 * Math.PI);
    ctx.stroke();
    }),
);

/** Stylized head-and-shoulders portrait for wall plaques. */
export function makePortraitTexture({
  skin = "#d9a97f",
  hair = "#2b1b12",
  top = "#3a5a68",
  longHair = false,
}: {
  skin?: string;
  hair?: string;
  top?: string;
  longHair?: boolean;
} = {}): THREE.CanvasTexture {
  return buildPortrait(skin, hair, top, longHair);
}

/** Framed abstract art — cheap procedural stand-in for office decor. */
export const makePaintingTexture = memoizeTexture((variant: number = 0): THREE.CanvasTexture =>
  canvasTexture(256, 192, (ctx, w, h) => {
    if (variant === 0) {
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, "#1d3a4a");
      sky.addColorStop(0.55, "#8a6a4a");
      sky.addColorStop(1, "#2a1d16");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#e8b84a";
      ctx.beginPath();
      ctx.arc(w * 0.68, h * 0.44, w * 0.07, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#22303a";
      for (const [x, peak] of [
        [0.1, 0.55],
        [0.35, 0.42],
        [0.62, 0.58],
        [0.88, 0.48],
      ] as const) {
        ctx.beginPath();
        ctx.moveTo(w * (x - 0.22), h);
        ctx.lineTo(w * x, h * peak);
        ctx.lineTo(w * (x + 0.22), h);
        ctx.closePath();
        ctx.fill();
      }
      return;
    }
    ctx.fillStyle = "#20302e";
    ctx.fillRect(0, 0, w, h);
    const bands = ["#4fd0c8", "#e8b84a", "#c45c48", "#7dba6a"];
    bands.forEach((color, i) => {
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.75;
      ctx.fillRect(w * (0.08 + i * 0.22), h * (0.18 + (i % 2) * 0.12), w * 0.14, h * 0.5);
    });
    ctx.globalAlpha = 1;
  }),
);

/** Soft radial sprite for steam wisps and dust motes. Shared via memoizeTexture. */
export const makeSoftParticleTexture = memoizeTexture((): THREE.CanvasTexture => {
  const tex = canvasTexture(64, 64, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, "rgba(255,255,255,0.7)");
    g.addColorStop(0.45, "rgba(255,255,255,0.22)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
});

export function makePostItTexture(
  lines: string[],
): THREE.CanvasTexture {
  return canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = "#f0e090";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "rgba(200,170,60,0.35)";
    ctx.fillRect(0, 0, w, 18);
    ctx.fillStyle = "#3a2c14";
    ctx.font = "bold 28px ui-monospace, monospace";
    ctx.fillText(lines[0] ?? "", 24, 70);
    ctx.font = "24px ui-monospace, monospace";
    lines.slice(1).forEach((line, i) => {
      ctx.fillText(line, 24, 120 + i * 40);
    });
  });
}
