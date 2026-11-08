import type Phaser from "phaser";

import type { GameEventBridge } from "@/game/event-bridge";
import { BeachScene } from "@/game/scenes/beach-scene";
import type { QuestShell } from "@/types/quest";

export interface CreateGameOptions {
  parent: HTMLElement;
  events: GameEventBridge;
  /** Optional venue to focus when the scene starts, usually from a deep link. */
  focusVenueId?: string | null;
  /** Today's shells and any already collected on this device. */
  shells?: readonly QuestShell[];
  collectedShellIds?: readonly string[];
}

// 2x keeps the map sharp on phones; 3x drew ~2.25x the pixels every frame
// for little visible gain and was the main GPU cost on mid-range Android.
const MAX_RENDER_SCALE = 2;
const MAX_RENDER_PIXELS = 12_000_000;

/**
 * Phones have a device pixel ratio of 2–3, but Phaser sizes its canvas in CSS
 * pixels by default. Rendering at device resolution keeps the map labels,
 * markers, and player crisp instead of upscaling a low-resolution canvas.
 */
function getRenderScale(width: number, height: number): number {
  if (typeof window === "undefined") {
    return 1;
  }

  const deviceScale = Math.min(window.devicePixelRatio || 1, MAX_RENDER_SCALE);
  const pixelBudgetScale = Math.sqrt(
    MAX_RENDER_PIXELS / Math.max(1, width * height),
  );

  return Math.max(1, Math.min(deviceScale, pixelBudgetScale));
}

function getParentSize(parent: HTMLElement): { width: number; height: number } {
  return {
    width: Math.max(1, parent.clientWidth || window.innerWidth),
    height: Math.max(1, parent.clientHeight || window.innerHeight),
  };
}

/**
 * Boots Phaser on the client. Phaser itself is imported dynamically so it is
 * never evaluated during the server render.
 */
export async function createGame({
  parent,
  events,
  focusVenueId = null,
  shells = [],
  collectedShellIds = [],
}: CreateGameOptions): Promise<Phaser.Game> {
  const { default: PhaserRuntime } = await import("phaser");

  const initialSize = getParentSize(parent);
  const initialScale = getRenderScale(initialSize.width, initialSize.height);

  const config: Phaser.Types.Core.GameConfig = {
    type: PhaserRuntime.AUTO,
    width: Math.round(initialSize.width * initialScale),
    height: Math.round(initialSize.height * initialScale),
    backgroundColor: "#2c2d6f",
    scene: [
      new BeachScene(events, focusVenueId, shells, collectedShellIds),
    ],
    render: {
      antialias: true,
      roundPixels: true,
    },
    // Movement uses real frame time (clamped in the scene), so a slow device
    // should not make the explorer walk in slow motion.
    fps: {
      smoothStep: false,
    },
    scale: {
      parent,
      // NONE lets us keep the drawing buffer at device resolution while the
      // CSS size stays in layout pixels. The scene divides by scale.zoom when
      // choosing its camera zoom.
      mode: PhaserRuntime.Scale.NONE,
      zoom: 1 / initialScale,
    },
    input: {
      keyboard: true,
      mouse: true,
      touch: true,
      gamepad: false,
    },
  };

  const game = new PhaserRuntime.Game(config);

  let resizeFrame = 0;

  const resize = () => {
    resizeFrame = 0;

    const size = getParentSize(parent);
    const renderScale = getRenderScale(size.width, size.height);

    if (game.scale.zoom !== 1 / renderScale) {
      game.scale.setZoom(1 / renderScale);
    }

    game.scale.resize(
      Math.round(size.width * renderScale),
      Math.round(size.height * renderScale),
    );
  };

  const scheduleResize = () => {
    if (resizeFrame !== 0) {
      return;
    }

    resizeFrame = window.requestAnimationFrame(resize);
  };

  const resizeObserver =
    typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(scheduleResize);

  resizeObserver?.observe(parent);
  window.addEventListener("resize", scheduleResize);

  game.events.once(PhaserRuntime.Core.Events.DESTROY, () => {
    resizeObserver?.disconnect();
    window.removeEventListener("resize", scheduleResize);

    if (resizeFrame !== 0) {
      window.cancelAnimationFrame(resizeFrame);
      resizeFrame = 0;
    }
  });

  return game;
}
