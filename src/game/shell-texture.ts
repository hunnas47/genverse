import type Phaser from "phaser";

export const SHELL_TEXTURE = "quest-shell";
export const SHELL_GLOW_TEXTURE = "quest-shell-glow";

/** World units the shell sprite is drawn at. */
export const SHELL_DISPLAY_SIZE = 30;

/** Canvas pixels per world unit, so the sprite stays sharp when zoomed in. */
const TEXTURE_SCALE = 4;
/** The drawing below fits a 24-unit box centered on the origin. */
const DRAWING_SIZE = 24;
const GLOW_RADIUS = 24;

/**
 * A spiral sea-snail shell in sand and coral tones with a navy outline.
 * Earlier versions were a fan scallop (read as a beach umbrella) and a navy
 * spiral on a lime disc (read as a UI button); a whorled shell reads as an
 * object lying on the ground.
 */
function drawShell(ctx: CanvasRenderingContext2D): void {
  // Whorls from the body outward to the apex: [x, y, radius].
  const whorls: Array<[number, number, number]> = [
    [2.6, 2.4, 8.6],
    [-2.6, -0.6, 6.2],
    [-0.4, -4.6, 4.3],
    [2.6, -3.6, 2.9],
    [2.4, -1.4, 1.7],
  ];

  ctx.lineJoin = "round";

  // A navy silhouette keeps the shell legible on sand, paving, and grass.
  ctx.fillStyle = "#2c2d6f";
  for (const [x, y, r] of whorls) {
    ctx.beginPath();
    ctx.arc(x, y, r + 1.4, 0, Math.PI * 2);
    ctx.fill();
  }

  whorls.forEach(([x, y, r], index) => {
    const fill = ctx.createRadialGradient(
      x - r * 0.35,
      y - r * 0.4,
      r * 0.1,
      x,
      y,
      r,
    );
    fill.addColorStop(0, "#fffaf0");
    fill.addColorStop(0.55, index % 2 ? "#f7d9b8" : "#fbe6cc");
    fill.addColorStop(1, "#e9967a");

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = 0.9;
    ctx.strokeStyle = "#b5654c";
    ctx.stroke();
  });

  // Growth ridges on the body whorl.
  ctx.strokeStyle = "rgba(181, 101, 76, 0.55)";
  ctx.lineWidth = 0.8;
  for (const step of [0.5, 1.1, 1.7]) {
    ctx.beginPath();
    ctx.arc(2.6, 2.4, (8.6 * step) / 1.9 + 1.5, -0.2, 1.9);
    ctx.stroke();
  }

  // Aperture.
  ctx.beginPath();
  ctx.ellipse(6.6, 6.4, 3.1, 2.1, 0.75, 0, Math.PI * 2);
  ctx.fillStyle = "#c96a5a";
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(6.9, 6.7, 1.8, 1.1, 0.75, 0, Math.PI * 2);
  ctx.fillStyle = "#7d3a36";
  ctx.fill();

  // Highlight.
  ctx.beginPath();
  ctx.ellipse(-0.5, 0.5, 2.2, 1, -0.6, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
  ctx.fill();
}

let shellDataUrl: string | null = null;

/**
 * The same shell as a PNG data URL for the React HUD, so the counter and the
 * fly-to-counter effect match the map. Browser-only; null on the server.
 */
export function getShellDataUrl(): string | null {
  if (shellDataUrl || typeof document === "undefined") {
    return shellDataUrl;
  }

  const scale = 4;
  const size = DRAWING_SIZE * scale;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return null;
  }

  ctx.translate(size / 2, size / 2);
  ctx.scale(scale * 0.9, scale * 0.9);
  drawShell(ctx);
  shellDataUrl = canvas.toDataURL("image/png");

  return shellDataUrl;
}

/** Creates the shell and glow textures once per game. */
export function ensureShellTextures(scene: Phaser.Scene): void {
  if (!scene.textures.exists(SHELL_TEXTURE)) {
    const size = DRAWING_SIZE * TEXTURE_SCALE;
    const texture = scene.textures.createCanvas(SHELL_TEXTURE, size, size);
    const ctx = texture?.getContext();

    if (texture && ctx) {
      ctx.save();
      ctx.translate(size / 2, size / 2);
      // Leave room for the outline at the edges of the 24-unit box.
      ctx.scale(TEXTURE_SCALE * 0.9, TEXTURE_SCALE * 0.9);
      drawShell(ctx);
      ctx.restore();
      texture.refresh();
    }
  }

  if (!scene.textures.exists(SHELL_GLOW_TEXTURE)) {
    const size = GLOW_RADIUS * 2 * TEXTURE_SCALE;
    const texture = scene.textures.createCanvas(SHELL_GLOW_TEXTURE, size, size);
    const ctx = texture?.getContext();

    if (texture && ctx) {
      const center = size / 2;
      const glow = ctx.createRadialGradient(
        center,
        center,
        size * 0.05,
        center,
        center,
        center,
      );
      // A soft lime halo with no hard edge, so it reads as light, not a disc.
      glow.addColorStop(0, "rgba(237, 242, 181, 0.95)");
      glow.addColorStop(0.5, "rgba(237, 242, 181, 0.5)");
      glow.addColorStop(1, "rgba(237, 242, 181, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, size, size);
      texture.refresh();
    }
  }
}

export const SHELL_GLOW_DISPLAY_SIZE = GLOW_RADIUS * 2;
