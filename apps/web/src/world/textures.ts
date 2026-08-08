/**
 * Procedural canvas textures for the SOC — keep them small and shared.
 */
import * as THREE from "three";

function canvasTexture(
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

export function makeFloorTileTexture(): THREE.CanvasTexture {
  return canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = "#2c241c";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i += 1) {
      const n = 18 + Math.random() * 22;
      ctx.fillStyle = `rgba(${n + 20},${n + 12},${n},0.35)`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
    ctx.strokeStyle = "rgba(20,14,10,0.55)";
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, w - 6, h - 6);
    ctx.strokeStyle = "rgba(70,55,42,0.25)";
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, w - 20, h - 20);
  });
}

export function makeCarpetTexture(hex = "#5a3a2e"): THREE.CanvasTexture {
  return canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = hex;
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 3) {
      for (let x = 0; x < w; x += 3) {
        const v = (Math.random() * 40) | 0;
        ctx.fillStyle = `rgba(${v},${v * 0.7},${v * 0.5},0.28)`;
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
      const g = 28 + Math.random() * 18;
      ctx.fillStyle = `rgba(${g + 8},${g},${g - 4},0.22)`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 3, 3);
    }
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    for (let y = 0; y < h; y += 48) {
      ctx.fillRect(0, y, w, 1);
    }
  });
}

export function makeCubicleFabricTexture(): THREE.CanvasTexture {
  return canvasTexture(128, 128, (ctx, w, h) => {
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
  });
}

export function makeWoodTexture(base = "#2c241c"): THREE.CanvasTexture {
  return canvasTexture(256, 128, (ctx, w, h) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 28; i += 1) {
      const y = (i / 28) * h;
      ctx.strokeStyle = `rgba(20,12,8,${0.12 + Math.random() * 0.2})`;
      ctx.lineWidth = 1 + Math.random() * 2;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(w * 0.3, y + 4, w * 0.7, y - 3, w, y + 2);
      ctx.stroke();
    }
  });
}

export function makeMonitorGlowTexture(tint: string): THREE.CanvasTexture {
  return canvasTexture(128, 96, (ctx, w, h) => {
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
  });
}

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
