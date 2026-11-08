import type Phaser from "phaser";

/**
 * Static map decorations drawn once into canvas textures.
 *
 * Phaser re-triangulates every Graphics object and Shape (circle, ellipse,
 * star, triangle) on the CPU each frame. With ~100 of them on the map that
 * kept a mid-range phone's main thread saturated, so everything that does not
 * change shape is baked here and shown as an Image, which costs one quad.
 *
 * Textures are drawn at FX_SCALE canvas pixels per world unit so they stay
 * sharp when the camera zooms in; images are shown at FX_BASE scale. Tweens
 * that scale an image must multiply by FX_BASE.
 */
export const FX_SCALE = 3;
export const FX_BASE = 1 / FX_SCALE;

type Paint = { color: string; alpha?: number };

export interface CircleSpec {
  radius: number;
  fill?: Paint;
  stroke?: Paint & { width: number };
}

function createCanvasTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
): string {
  if (scene.textures.exists(key)) {
    return key;
  }

  const texture = scene.textures.createCanvas(
    key,
    Math.max(1, Math.ceil(width * FX_SCALE)),
    Math.max(1, Math.ceil(height * FX_SCALE)),
  );
  const ctx = texture?.getContext();

  if (texture && ctx) {
    ctx.save();
    ctx.scale(FX_SCALE, FX_SCALE);
    draw(ctx);
    ctx.restore();
    texture.refresh();
  }

  return key;
}

function paint(ctx: CanvasRenderingContext2D, value: Paint): void {
  ctx.globalAlpha = value.alpha ?? 1;
}

export function circleTexture(scene: Phaser.Scene, spec: CircleSpec): string {
  const strokeWidth = spec.stroke?.width ?? 0;
  const size = (spec.radius + strokeWidth) * 2 + 2;
  const key = `fx-circle:${spec.radius}:${spec.fill?.color ?? ""}:${spec.fill?.alpha ?? ""}:${spec.stroke?.color ?? ""}:${spec.stroke?.alpha ?? ""}:${strokeWidth}`;

  return createCanvasTexture(scene, key, size, size, (ctx) => {
    const center = size / 2;

    ctx.beginPath();
    ctx.arc(center, center, spec.radius, 0, Math.PI * 2);

    if (spec.fill) {
      paint(ctx, spec.fill);
      ctx.fillStyle = spec.fill.color;
      ctx.fill();
    }

    if (spec.stroke) {
      paint(ctx, spec.stroke);
      ctx.lineWidth = spec.stroke.width;
      ctx.strokeStyle = spec.stroke.color;
      ctx.stroke();
    }
  });
}

/** A circle or ring image at its true world size. */
export function fxCircle(
  scene: Phaser.Scene,
  x: number,
  y: number,
  spec: CircleSpec,
): Phaser.GameObjects.Image {
  return scene.add.image(x, y, circleTexture(scene, spec)).setScale(FX_BASE);
}

/** A flat ellipse (used for ground shadows), stretched from a disc. */
export function fxEllipse(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  alpha: number,
): Phaser.GameObjects.Image {
  const key = circleTexture(scene, { radius: 16, fill: { color } });

  return scene.add
    .image(x, y, key)
    .setDisplaySize(width, height)
    .setAlpha(alpha);
}

/** The shell compass pointer: a navy wedge pointing along +x. */
export function pointerTexture(scene: Phaser.Scene): string {
  return createCanvasTexture(scene, "fx-pointer", 9, 12, (ctx) => {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(9, 6);
    ctx.lineTo(0, 12);
    ctx.closePath();
    ctx.fillStyle = "#2c2d6f";
    ctx.fill();
  });
}

/** A four-point sparkle for the shell glint. */
export function sparkleTexture(scene: Phaser.Scene): string {
  return createCanvasTexture(scene, "fx-sparkle", 10, 10, (ctx) => {
    ctx.translate(5, 5);
    ctx.beginPath();
    for (let index = 0; index < 8; index += 1) {
      const radius = index % 2 === 0 ? 5 : 1.2;
      const angle = (index / 8) * Math.PI * 2 - Math.PI / 2;
      const px = Math.cos(angle) * radius;
      const py = Math.sin(angle) * radius;

      if (index === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    ctx.fillStyle = "#ffffff";
    ctx.fill();
  });
}

export type MarkerShape = "disc" | "square" | "diamond";

export interface VenueMarkerSpec {
  id: string;
  shape: MarkerShape;
  size: number;
  isStage: boolean;
  fill: string;
  textColor: string;
  code: string;
  fontFamily: string;
  /** Bumped when the brand font finishes loading, to redraw the code. */
  version: number;
}

/** The venue marker: category shape, accent fill, and the map code (S1, R…). */
export function venueMarkerTexture(
  scene: Phaser.Scene,
  spec: VenueMarkerSpec,
): string {
  const { size } = spec;
  const box = size * 2 + 8;
  const key = `fx-venue-marker:${spec.id}:${spec.version}`;

  return createCanvasTexture(scene, key, box, box, (ctx) => {
    const center = box / 2;

    ctx.translate(center, center);
    ctx.beginPath();

    if (spec.shape === "square") {
      ctx.roundRect(-size, -size, size * 2, size * 2, 6);
    } else if (spec.shape === "diamond") {
      ctx.moveTo(0, -size - 2);
      ctx.lineTo(size + 2, 0);
      ctx.lineTo(0, size + 2);
      ctx.lineTo(-size - 2, 0);
      ctx.closePath();
    } else {
      ctx.arc(0, 0, size, 0, Math.PI * 2);
    }

    ctx.fillStyle = spec.fill;
    ctx.fill();
    ctx.lineWidth = spec.isStage ? 3 : 2;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
    ctx.stroke();

    if (spec.isStage) {
      // A thin navy inner ring gives stages a badge-like finish.
      ctx.beginPath();
      ctx.arc(0, 0, size - 4, 0, Math.PI * 2);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "rgba(44, 45, 111, 0.35)";
      ctx.stroke();
    }

    ctx.fillStyle = spec.textColor;
    ctx.font = `bold ${spec.isStage ? 12 : 10}px ${spec.fontFamily}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(spec.code, 0, 0.5);
  });
}

export interface VenueLabelSpec {
  id: string;
  name: string;
  isStage: boolean;
  accent: string;
  fontFamily: string;
  version: number;
}

const LABEL_MAX_WIDTH = 112;
const LABEL_PAD_X = 7;
const LABEL_PAD_Y = 3;
const LABEL_SHADOW_OFFSET = 2;

function wrapWords(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  let line = "";

  for (const word of text.split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word;

    if (line && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }

  if (line) {
    lines.push(line);
  }

  return lines;
}

/**
 * A rounded navy pill with the venue name. Returns the texture key and its
 * size in world units so callers can position and hit-test it.
 */
export function venueLabelTexture(
  scene: Phaser.Scene,
  spec: VenueLabelSpec,
): { key: string; width: number; height: number } {
  const fontSize = spec.isStage ? 11 : 10;
  const lineHeight = Math.round(fontSize * 1.3);
  const font = `bold ${fontSize}px ${spec.fontFamily}`;
  const measure = document.createElement("canvas").getContext("2d");

  let lines = [spec.name];
  let textWidth = spec.name.length * fontSize * 0.6;

  if (measure) {
    measure.font = font;
    lines = wrapWords(measure, spec.name, LABEL_MAX_WIDTH);
    textWidth = Math.max(...lines.map((line) => measure.measureText(line).width));
  }

  const pillWidth = Math.ceil(textWidth) + LABEL_PAD_X * 2;
  const pillHeight = lines.length * lineHeight + LABEL_PAD_Y * 2;
  const width = pillWidth + 2;
  const height = pillHeight + LABEL_SHADOW_OFFSET + 2;
  const key = `fx-venue-label:${spec.id}:${spec.version}`;

  createCanvasTexture(scene, key, width, height, (ctx) => {
    const radius = Math.min(pillHeight / 2, 10);

    ctx.translate(1, 1);
    ctx.beginPath();
    ctx.roundRect(0, LABEL_SHADOW_OFFSET, pillWidth, pillHeight, radius);
    ctx.fillStyle = "rgba(28, 29, 58, 0.25)";
    ctx.fill();

    ctx.beginPath();
    ctx.roundRect(0, 0, pillWidth, pillHeight, radius);
    ctx.fillStyle = "rgba(44, 45, 111, 0.9)";
    ctx.fill();

    if (spec.isStage) {
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = spec.accent;
      ctx.globalAlpha = 0.9;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.font = font;
    ctx.fillStyle = spec.isStage ? "#edf2b5" : "#f7f3e8";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    lines.forEach((line, index) => {
      ctx.fillText(
        line,
        pillWidth / 2,
        LABEL_PAD_Y + lineHeight * index + lineHeight / 2 + 0.5,
      );
    });
  });

  return { key, width, height };
}
